"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ClerkWebhooksController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkWebhooksController = void 0;
const common_1 = require("@nestjs/common");
const webhooks_1 = require("@clerk/backend/webhooks");
const users_service_1 = require("../users/users.service");
const clerk_user_json_1 = require("./clerk-user-json");
let ClerkWebhooksController = ClerkWebhooksController_1 = class ClerkWebhooksController {
    usersService;
    logger = new common_1.Logger(ClerkWebhooksController_1.name);
    constructor(usersService) {
        this.usersService = usersService;
    }
    async clerk(req) {
        const raw = req.rawBody;
        if (!raw?.length) {
            throw new common_1.BadRequestException('Missing body');
        }
        const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        const request = new globalThis.Request(url, {
            method: 'POST',
            headers: req.headers,
            body: raw.toString('utf8'),
        });
        let evt;
        try {
            evt = await (0, webhooks_1.verifyWebhook)(request);
        }
        catch (e) {
            this.logger.warn(e instanceof Error ? e.message : 'verifyWebhook failed');
            throw new common_1.BadRequestException('Invalid webhook');
        }
        try {
            if (evt.type === 'user.created' || evt.type === 'user.updated') {
                await this.usersService.syncFromClerk((0, clerk_user_json_1.clerkUserJsonToSyncParams)(evt.data));
            }
            else if (evt.type === 'user.deleted' && evt.data.id) {
                await this.usersService.removeByClerkId(evt.data.id);
            }
        }
        catch (e) {
            if (e instanceof common_1.ConflictException) {
                return { ok: true };
            }
            if (e instanceof Error)
                this.logger.error(e.message);
            throw e;
        }
        return { ok: true };
    }
};
exports.ClerkWebhooksController = ClerkWebhooksController;
__decorate([
    (0, common_1.Post)('clerk'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClerkWebhooksController.prototype, "clerk", null);
exports.ClerkWebhooksController = ClerkWebhooksController = ClerkWebhooksController_1 = __decorate([
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], ClerkWebhooksController);
//# sourceMappingURL=clerk-webhooks.controller.js.map