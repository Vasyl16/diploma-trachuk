import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class PaymentsService {
    private readonly config;
    private readonly prisma;
    private readonly stripe;
    constructor(config: ConfigService, prisma: PrismaService);
    createCheckoutSession(userId: string): Promise<{
        url: string;
    }>;
    handleWebhook(rawBody: Buffer, signature: string): Promise<void>;
}
