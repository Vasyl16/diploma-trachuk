import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { Request as ExpressRequest } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-checkout-session')
  async createCheckoutSession(@CurrentUser() user: User | undefined) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.paymentsService.createCheckoutSession(user.id);
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: RawBodyRequest<ExpressRequest>) {
    const sig = req.headers['stripe-signature'];
    if (typeof sig !== 'string') {
      throw new BadRequestException('Missing stripe-signature header');
    }
    const raw = req.rawBody;
    if (!raw?.length) {
      throw new BadRequestException('Missing body');
    }
    await this.paymentsService.handleWebhook(raw, sig);
    return { received: true };
  }
}
