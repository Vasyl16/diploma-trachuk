import type { RawBodyRequest } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { UsersService } from '../users/users.service';
export declare class ClerkWebhooksController {
    private readonly usersService;
    private readonly logger;
    constructor(usersService: UsersService);
    clerk(req: RawBodyRequest<ExpressRequest>): Promise<{
        ok: boolean;
    }>;
}
