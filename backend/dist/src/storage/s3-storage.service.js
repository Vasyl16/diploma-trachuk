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
exports.S3StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const ALLOWED_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);
function extFromMime(mime) {
    if (mime === 'image/png')
        return 'png';
    if (mime === 'image/webp')
        return 'webp';
    if (mime === 'image/gif')
        return 'gif';
    return 'jpg';
}
let S3StorageService = class S3StorageService {
    config;
    client = null;
    constructor(config) {
        this.config = config;
    }
    isS3Configured() {
        const accessKeyId = this.config.get('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY');
        const bucket = this.config.get('AWS_BUCKET_NAME');
        return Boolean(accessKeyId?.trim() &&
            secretAccessKey?.trim() &&
            bucket?.trim());
    }
    getS3Client() {
        const accessKeyId = this.config.get('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY');
        const region = this.config.get('AWS_REGION') ?? 'us-east-1';
        if (!accessKeyId?.trim() || !secretAccessKey?.trim()) {
            throw new common_1.BadRequestException('S3 credentials are incomplete');
        }
        if (!this.client) {
            this.client = new client_s3_1.S3Client({
                region,
                credentials: { accessKeyId, secretAccessKey },
            });
        }
        return this.client;
    }
    publicApiBase() {
        const fromEnv = this.config.get('API_PUBLIC_URL') ??
            this.config.get('BACKEND_PUBLIC_URL');
        if (fromEnv?.trim()) {
            return fromEnv.replace(/\/$/, '');
        }
        const port = this.config.get('PORT') ?? process.env.PORT ?? '3000';
        return `http://localhost:${port}`;
    }
    async uploadAvatarLocal(buffer, contentType, userId) {
        const mime = contentType.split(';')[0]?.trim() ?? '';
        if (!ALLOWED_MIME.has(mime)) {
            throw new common_1.BadRequestException(`Unsupported image type: ${contentType}`);
        }
        const ext = extFromMime(mime);
        const fileName = `${(0, node_crypto_1.randomUUID)()}.${ext}`;
        const relativeDir = (0, node_path_1.join)('avatars', userId);
        const absoluteDir = (0, node_path_1.join)(process.cwd(), 'uploads', relativeDir);
        await (0, promises_1.mkdir)(absoluteDir, { recursive: true });
        await (0, promises_1.writeFile)((0, node_path_1.join)(absoluteDir, fileName), buffer);
        return `${this.publicApiBase()}/uploads/${relativeDir.replace(/\\/g, '/')}/${fileName}`;
    }
    async uploadAvatarS3(buffer, contentType, userId) {
        const mime = contentType.split(';')[0]?.trim() ?? '';
        if (!ALLOWED_MIME.has(mime)) {
            throw new common_1.BadRequestException(`Unsupported image type: ${contentType}`);
        }
        const bucket = this.config.get('AWS_BUCKET_NAME');
        const region = this.config.get('AWS_REGION') ?? 'us-east-1';
        if (!bucket?.trim()) {
            throw new common_1.BadRequestException('AWS_BUCKET_NAME is not set');
        }
        const key = `avatars/${userId}/${(0, node_crypto_1.randomUUID)()}.${extFromMime(mime)}`;
        await this.getS3Client().send(new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: mime,
            CacheControl: 'public, max-age=31536000',
        }));
        return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
    async uploadAvatar(buffer, contentType, userId) {
        if (this.isS3Configured()) {
            return this.uploadAvatarS3(buffer, contentType, userId);
        }
        return this.uploadAvatarLocal(buffer, contentType, userId);
    }
    async uploadRecipeImageLocal(buffer, contentType, userId, recipeId) {
        const mime = contentType.split(';')[0]?.trim() ?? 'image/png';
        if (!ALLOWED_MIME.has(mime)) {
            throw new common_1.BadRequestException(`Unsupported image type: ${contentType}`);
        }
        const ext = extFromMime(mime);
        const relativeDir = (0, node_path_1.join)('recipes', userId);
        const absoluteDir = (0, node_path_1.join)(process.cwd(), 'uploads', relativeDir);
        await (0, promises_1.mkdir)(absoluteDir, { recursive: true });
        const fileName = `${recipeId}.${ext}`;
        await (0, promises_1.writeFile)((0, node_path_1.join)(absoluteDir, fileName), buffer);
        return `${this.publicApiBase()}/uploads/${relativeDir.replace(/\\/g, '/')}/${fileName}`;
    }
    async uploadRecipeImageS3(buffer, contentType, userId, recipeId) {
        const mime = contentType.split(';')[0]?.trim() ?? 'image/png';
        if (!ALLOWED_MIME.has(mime)) {
            throw new common_1.BadRequestException(`Unsupported image type: ${contentType}`);
        }
        const bucket = this.config.get('AWS_BUCKET_NAME');
        const region = this.config.get('AWS_REGION') ?? 'us-east-1';
        if (!bucket?.trim()) {
            throw new common_1.BadRequestException('AWS_BUCKET_NAME is not set');
        }
        const ext = extFromMime(mime);
        const key = `recipes/${userId}/${recipeId}.${ext}`;
        await this.getS3Client().send(new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: mime,
            CacheControl: 'public, max-age=31536000',
        }));
        return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
    async uploadRecipeImage(buffer, contentType, userId, recipeId) {
        if (this.isS3Configured()) {
            return this.uploadRecipeImageS3(buffer, contentType, userId, recipeId);
        }
        return this.uploadRecipeImageLocal(buffer, contentType, userId, recipeId);
    }
};
exports.S3StorageService = S3StorageService;
exports.S3StorageService = S3StorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], S3StorageService);
//# sourceMappingURL=s3-storage.service.js.map