"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const StripeModule = __importStar(require("stripe"));
const prisma_service_1 = require("../prisma/prisma.service");
function createStripeClient(secret) {
    const Ctor = StripeModule.default;
    return new Ctor(secret, { apiVersion: '2026-03-25.dahlia' });
}
let PaymentsService = class PaymentsService {
    config;
    prisma;
    stripe;
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        const secret = this.config.getOrThrow('STRIPE_SECRET_KEY');
        this.stripe = createStripeClient(secret);
    }
    async createCheckoutSession(userId) {
        const frontendRaw = this.config.get('FRONTEND_URL') ?? 'http://localhost:3000';
        const frontend = frontendRaw.replace(/\/$/, '');
        const amountRaw = this.config.get('STRIPE_PREMIUM_AMOUNT_CENTS');
        const unitAmount = amountRaw !== undefined && amountRaw !== ''
            ? Number(amountRaw)
            : 999;
        if (!Number.isFinite(unitAmount) || unitAmount < 50) {
            throw new common_1.InternalServerErrorException('Invalid STRIPE_PREMIUM_AMOUNT_CENTS (min 50 cents)');
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
            throw new common_1.BadRequestException('Could not create checkout session');
        }
        return { url: session.url };
    }
    async handleWebhook(rawBody, signature) {
        const whSecret = this.config.getOrThrow('STRIPE_WEBHOOK_SECRET');
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(rawBody, signature, whSecret);
        }
        catch {
            throw new common_1.BadRequestException('Invalid webhook signature');
        }
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            if (session.payment_status !== 'paid') {
                return;
            }
            const userId = session.client_reference_id ?? session.metadata?.userId ?? null;
            if (!userId) {
                return;
            }
            await this.prisma.user.update({
                where: { id: userId },
                data: { isPremium: true },
            });
        }
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map