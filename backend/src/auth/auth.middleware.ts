import {
  ConflictException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, verifyToken } from '@clerk/backend';
import type { User as ClerkUser } from '@clerk/backend';
import type { NextFunction, Request, Response } from 'express';
import { UsersService } from '../users/users.service';

function bearer(req: Request): string | undefined {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7).trim() : undefined;
}

function primaryEmail(clerkUser: ClerkUser): string {
  if (clerkUser.primaryEmailAddressId) {
    const p = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );
    if (p) return p.emailAddress;
  }
  return clerkUser.emailAddresses[0]?.emailAddress ?? '';
}

function displayName(clerkUser: ClerkUser): string {
  const full = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (full) return full;
  if (clerkUser.username) return clerkUser.username;
  return 'User';
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    req.user = undefined;

    const token = bearer(req);
    const secretKey = this.config.get<string>('CLERK_SECRET_KEY');
    if (!token || !secretKey) {
      return next();
    }

    try {
      const { sub: clerkId } = await verifyToken(token, { secretKey });
      if (!clerkId) return next();

      const clerk = createClerkClient({ secretKey });
      const clerkUser = await clerk.users.getUser(clerkId);

      req.user = await this.usersService.syncFromClerk({
        clerkId,
        email: primaryEmail(clerkUser) || 'pending@user.local',
        name: displayName(clerkUser),
        avatarUrl: clerkUser.imageUrl || undefined,
      });
    } catch (err) {
      if (err instanceof ConflictException) {
        return next(err);
      }
      req.user = undefined;
    }

    next();
  }
}
