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
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const node_crypto_1 = require("node:crypto");
const node_path_1 = require("node:path");
const ALLOWED_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);
const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024;
function extFromMime(mime) {
    const base = mime.split(';')[0]?.trim() ?? '';
    if (base === 'image/png')
        return 'png';
    if (base === 'image/webp')
        return 'webp';
    if (base === 'image/gif')
        return 'gif';
    return 'jpg';
}
let StorageService = StorageService_1 = class StorageService {
    configService;
    logger = new common_1.Logger(StorageService_1.name);
    s3Client;
    bucketName;
    publicBaseUrl;
    constructor(configService) {
        this.configService = configService;
        this.bucketName = this.requireEnv('AWS_BUCKET_NAME', this.configService.get('AWS_BUCKET_NAME'));
        this.publicBaseUrl = this.normalizeBaseUrl(this.resolvePublicBaseUrl());
        const region = this.configService.get('AWS_REGION')?.trim() ?? 'us-east-1';
        const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID')?.trim() ||
            this.configService.get('AWS_ACCESS_KEY')?.trim();
        const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY')?.trim() ||
            this.configService.get('AWS_SECRET_KEY')?.trim();
        if (!accessKeyId || !secretAccessKey) {
            throw new Error('Storage: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (or AWS_ACCESS_KEY / AWS_SECRET_KEY).');
        }
        const apiEndpoint = this.configService.get('AWS_S3_API_ENDPOINT')?.trim();
        this.s3Client = new client_s3_1.S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            ...(apiEndpoint
                ? { endpoint: apiEndpoint, forcePathStyle: true }
                : {}),
        });
    }
    requireEnv(name, value) {
        const v = value?.trim();
        if (!v) {
            throw new Error(`Storage: ${name} is required.`);
        }
        return v;
    }
    resolvePublicBaseUrl() {
        const explicit = this.configService.get('AWS_PUBLIC_BASE_URL')?.trim() ||
            this.configService.get('AWS_ENDPOINT')?.trim();
        if (explicit) {
            return explicit;
        }
        const bucket = this.bucketName;
        const region = this.configService.get('AWS_REGION')?.trim() ?? 'us-east-1';
        return `https://${bucket}.s3.${region}.amazonaws.com`;
    }
    normalizeBaseUrl(value) {
        return value.replace(/\/+$/, '');
    }
    async uploadAvatar(buffer, contentType, userId) {
        this.assertValidImageBuffer(buffer, contentType);
        const mime = contentType.split(';')[0]?.trim() ?? 'image/jpeg';
        const ext = extFromMime(mime);
        const folder = `avatars/${userId}`;
        const key = this.buildObjectKey(folder, `avatar.${ext}`);
        return this.putObject(key, buffer, mime);
    }
    async uploadRecipeImage(buffer, contentType, userId, recipeId) {
        this.assertValidImageBuffer(buffer, contentType);
        const mime = contentType.split(';')[0]?.trim() ?? 'image/png';
        const ext = extFromMime(mime);
        const key = `recipes/${userId}/${recipeId}.${ext}`;
        return this.putObject(key, buffer, mime);
    }
    async deleteFile(fileUrl) {
        const key = this.extractObjectKey(fileUrl);
        if (!key) {
            this.logger.warn(`Skipped deleting unmanaged file URL: ${fileUrl}`);
            return;
        }
        try {
            await this.s3Client.send(new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            }));
        }
        catch (error) {
            this.logger.warn(`Failed to delete S3 object "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async deleteFiles(fileUrls) {
        const unique = [...new Set(fileUrls.filter((u) => Boolean(u?.trim())))];
        await Promise.all(unique.map((url) => this.deleteFile(url)));
    }
    async putObject(key, body, contentType) {
        try {
            await this.s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: body,
                ContentType: contentType,
                CacheControl: 'public, max-age=31536000',
            }));
            return `${this.publicBaseUrl}/${key}`;
        }
        catch {
            throw new common_1.InternalServerErrorException('Failed to upload image');
        }
    }
    assertValidImageBuffer(buffer, contentType) {
        if (!buffer?.length) {
            throw new common_1.BadRequestException('Image data is required');
        }
        const mime = contentType.split(';')[0]?.trim() ?? '';
        if (!ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
            throw new common_1.BadRequestException('Unsupported image format');
        }
        if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
            throw new common_1.BadRequestException('Image size must not exceed 6MB');
        }
    }
    buildObjectKey(folder, originalName) {
        const extension = (0, node_path_1.extname)(originalName).toLowerCase() || '.jpg';
        const safeFolder = folder.replace(/^\/+|\/+$/g, '');
        return `${safeFolder}/${Date.now()}-${(0, node_crypto_1.randomUUID)()}${extension}`;
    }
    extractObjectKey(fileUrl) {
        const prefix = `${this.publicBaseUrl}/`;
        if (!fileUrl.startsWith(prefix)) {
            return null;
        }
        return fileUrl.slice(prefix.length);
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map