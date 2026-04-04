import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StripeModule from 'stripe';

import { PrismaService } from '../prisma/prisma.service';

/** Narrow SDK surface — avoids broken `default` constructor typings under `moduleResolution: nodenext`. */
type StripeSdk = {
  checkout: {
    sessions: {
      create: (params: unknown) => Promise<{ url: string | null }>;
    };
  };
  webhooks: {
    constructEvent: (
      payload: Buffer,
      signature: string,
      secret: string,
    ) => unknown;
  };
};

function createStripeClient(secret: string): StripeSdk {
  const Ctor = StripeModule.default as unknown as new (
    key: string,
    opts: { apiVersion: '2026-03-25.dahlia' },
  ) => StripeSdk;
  return new Ctor(secret, { apiVersion: '2026-03-25.dahlia' });
}

@Injectable()
export class PaymentsService {
  private readonly stripe: StripeSdk;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = this.config.getOrThrow<string>('STRIPE_SECRET_KEY');
    this.stripe = createStripeClient(secret);
  }

  async createCheckoutSession(userId: string): Promise<{ url: string }> {
    const frontendRaw =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const frontend = frontendRaw.replace(/\/$/, '');
    const amountRaw = this.config.get<string>('STRIPE_PREMIUM_AMOUNT_CENTS');
    const unitAmount =
      amountRaw !== undefined && amountRaw !== ''
        ? Number(amountRaw)
        : 999;
    if (!Number.isFinite(unitAmount) || unitAmount < 50) {
      throw new InternalServerErrorException(
        'Invalid STRIPE_PREMIUM_AMOUNT_CENTS (min 50 cents)',
      );
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: userId,
      metadata: { userId },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: unitAmount,
            product_data: {
              name: 'Premium - unlimited AI recipes',
            },
          },
        },
      ],
      success_url: `${frontend}/recipes/new?checkout=success`,
      cancel_url: `${frontend}/recipes/new?checkout=cancelled`,
    });

    if (!session.url) {
      throw new BadRequestException('Could not create checkout session');
    }
    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const whSecret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
    let event: { type: string; data: { object: unknown } };
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        whSecret,
      ) as { type: string; data: { object: unknown } };
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        payment_status?: string | null;
        client_reference_id?: string | null;
        metadata?: { userId?: string } | null;
      };
      if (session.payment_status !== 'paid') {
        return;
      }
      const userId =
        session.client_reference_id ?? session.metadata?.userId ?? null;
      if (!userId) {
        return;
      }
      await this.prisma.user.update({
        where: { id: userId },
        data: { isPremium: true },
      });
    }
  }
}
