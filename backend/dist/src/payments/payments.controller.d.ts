import type { RawBodyRequest } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { Request as ExpressRequest } from 'express';
import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createCheckoutSession(user: User | undefined): Promise<{
        url: string;
    }>;
    webhook(req: RawBodyRequest<ExpressRequest>): Promise<{
        received: boolean;
    }>;
}
