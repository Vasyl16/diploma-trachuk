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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const backend_1 = require("@clerk/backend");
const users_service_1 = require("../users/users.service");
function bearer(req) {
    const h = req.headers.authorization;
    return h?.startsWith('Bearer ') ? h.slice(7).trim() : undefined;
}
function primaryEmail(clerkUser) {
    if (clerkUser.primaryEmailAddressId) {
        const p = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId);
        if (p)
            return p.emailAddress;
    }
    return clerkUser.emailAddresses[0]?.emailAddress ?? '';
}
function displayName(clerkUser) {
    const full = [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
    if (full)
        return full;
    if (clerkUser.username)
        return clerkUser.username;
    return 'User';
}
let AuthMiddleware = class AuthMiddleware {
    config;
    usersService;
    constructor(config, usersService) {
        this.config = config;
        this.usersService = usersService;
    }
    async use(req, res, next) {
        req.user = undefined;
        const token = bearer(req);
        const secretKey = this.config.get('CLERK_SECRET_KEY');
        if (!token || !secretKey) {
            return next();
        }
        try {
            const { sub: clerkId } = await (0, backend_1.verifyToken)(token, { secretKey });
            if (!clerkId)
                return next();
            const clerk = (0, backend_1.createClerkClient)({ secretKey });
            const clerkUser = await clerk.users.getUser(clerkId);
            req.user = await this.usersService.syncFromClerk({
                clerkId,
                email: primaryEmail(clerkUser) || 'pending@user.local',
                name: displayName(clerkUser),
                avatarUrl: clerkUser.imageUrl || undefined,
            });
        }
        catch (err) {
            if (err instanceof common_1.ConflictException) {
                return next(err);
            }
            req.user = undefined;
        }
        next();
    }
};
exports.AuthMiddleware = AuthMiddleware;
exports.AuthMiddleware = AuthMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        users_service_1.UsersService])
], AuthMiddleware);
//# sourceMappingURL=auth.middleware.js.map