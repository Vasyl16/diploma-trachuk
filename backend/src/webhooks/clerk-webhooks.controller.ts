import {
  BadRequestException,
  ConflictException,
  Controller,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { verifyWebhook } from '@clerk/backend/webhooks';
import type { Request as ExpressRequest } from 'express';

import { UsersService } from '../users/users.service';
import { clerkUserJsonToSyncParams } from './clerk-user-json';

@Controller('webhooks')
export class ClerkWebhooksController {
  private readonly logger = new Logger(ClerkWebhooksController.name);

  constructor(private readonly usersService: UsersService) {}

  /** Clerk Dashboard → Webhooks → URL: `https://<your-api>/webhooks/clerk` — subscribe to `user.*` */
  @Post('clerk')
  async clerk(@Req() req: RawBodyRequest<ExpressRequest>) {
    const raw = req.rawBody;
    if (!raw?.length) {
      throw new BadRequestException('Missing body');
    }

    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const request = new globalThis.Request(url, {
      method: 'POST',
      headers: req.headers as HeadersInit,
      body: raw.toString('utf8'),
    });

    let evt;
    try {
      evt = await verifyWebhook(request);
    } catch (e) {
      this.logger.warn(e instanceof Error ? e.message : 'verifyWebhook failed');
      throw new BadRequestException('Invalid webhook');
    }

    try {
      if (evt.type === 'user.created' || evt.type === 'user.updated') {
        await this.usersService.syncFromClerk(
          clerkUserJsonToSyncParams(evt.data),
        );
      } else if (evt.type === 'user.deleted' && evt.data.id) {
        await this.usersService.removeByClerkId(evt.data.id);
      }
    } catch (e) {
      if (e instanceof ConflictException) {
        return { ok: true };
      }
      if (e instanceof Error) this.logger.error(e.message);
      throw e;
    }

    return { ok: true };
  }
}
