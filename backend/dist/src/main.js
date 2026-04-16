"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        rawBody: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.enableShutdownHooks();
    app.enableCors({
        origin: process.env.FRONTEND_URL ?? true,
        credentials: true,
    });
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
}
void bootstrap();
//# sourceMappingURL=main.js.map