"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const node_path_1 = require("node:path");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_middleware_1 = require("./auth/auth.middleware");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const messages_module_1 = require("./messages/messages.module");
const payments_module_1 = require("./payments/payments.module");
const prisma_module_1 = require("./prisma/prisma.module");
const recipes_module_1 = require("./recipes/recipes.module");
const users_module_1 = require("./users/users.module");
const webhooks_module_1 = require("./webhooks/webhooks.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(auth_middleware_1.AuthMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: (0, node_path_1.join)(__dirname, '..', '.env'),
            }),
            prisma_module_1.PrismaModule,
            users_module_1.UsersModule,
            recipes_module_1.RecipesModule,
            messages_module_1.MessagesModule,
            webhooks_module_1.WebhooksModule,
            payments_module_1.PaymentsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService, auth_middleware_1.AuthMiddleware],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map