import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024;

function extFromMime(mime: string): string {
  const base = mime.split(';')[0]?.trim() ?? '';
  if (base === 'image/png') return 'png';
  if (base === 'image/webp') return 'webp';
  if (base === 'image/gif') return 'gif';
  return 'jpg';
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.requireEnv(
      'AWS_BUCKET_NAME',
      this.configService.get<string>('AWS_BUCKET_NAME'),
    );
    this.publicBaseUrl = this.normalizeBaseUrl(this.resolvePublicBaseUrl());

    const region = this.configService.get<string>('AWS_REGION')?.trim() ?? 'us-east-1';
    const accessKeyId =
      this.configService.get<string>('AWS_ACCESS_KEY_ID')?.trim() ||
      this.configService.get<string>('AWS_ACCESS_KEY')?.trim();
    const secretAccessKey =
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY')?.trim() ||
      this.configService.get<string>('AWS_SECRET_KEY')?.trim();

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'Storage: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (or AWS_ACCESS_KEY / AWS_SECRET_KEY).',
      );
    }

    const apiEndpoint = this.configService.get<string>('AWS_S3_API_ENDPOINT')?.trim();

    this.s3Client = new S3Client({
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

  private requireEnv(name: string, value: string | undefined): string {
    const v = value?.trim();
    if (!v) {
      throw new Error(`Storage: ${name} is required.`);
    }
    return v;
  }

  /** Public URL prefix for uploaded objects (bucket website or virtual-hosted–style URL). */
  private resolvePublicBaseUrl(): string {
    const explicit =
      this.configService.get<string>('AWS_PUBLIC_BASE_URL')?.trim() ||
      this.configService.get<string>('AWS_ENDPOINT')?.trim();
    if (explicit) {
      return explicit;
    }
    const bucket = this.bucketName;
    const region = this.configService.get<string>('AWS_REGION')?.trim() ?? 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com`;
  }

  private normalizeBaseUrl(value: string): string {
    return value.replace(/\/+$/, '');
  }

  async uploadAvatar(
    buffer: Buffer,
    contentType: string,
    userId: string,
  ): Promise<string> {
    this.assertValidImageBuffer(buffer, contentType);
    const mime = contentType.split(';')[0]?.trim() ?? 'image/jpeg';
    const ext = extFromMime(mime);
    const folder = `avatars/${userId}`;
    const key = this.buildObjectKey(folder, `avatar.${ext}`);
    return this.putObject(key, buffer, mime);
  }

  async uploadRecipeImage(
    buffer: Buffer,
    contentType: string,
    userId: string,
    recipeId: string,
  ): Promise<string> {
    this.assertValidImageBuffer(buffer, contentType);
    const mime = contentType.split(';')[0]?.trim() ?? 'image/png';
    const ext = extFromMime(mime);
    const key = `recipes/${userId}/${recipeId}.${ext}`;
    return this.putObject(key, buffer, mime);
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const key = this.extractObjectKey(fileUrl);
    if (!key) {
      this.logger.warn(`Skipped deleting unmanaged file URL: ${fileUrl}`);
      return;
    }
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to delete S3 object "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async deleteFiles(fileUrls: (string | null | undefined)[]): Promise<void> {
    const unique = [...new Set(fileUrls.filter((u): u is string => Boolean(u?.trim())))];
    await Promise.all(unique.map((url) => this.deleteFile(url)));
  }

  private async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000',
        }),
      );
      return `${this.publicBaseUrl}/${key}`;
    } catch {
      throw new InternalServerErrorException('Failed to upload image');
    }
  }

  private assertValidImageBuffer(buffer: Buffer, contentType: string): void {
    if (!buffer?.length) {
      throw new BadRequestException('Image data is required');
    }
    const mime = contentType.split(';')[0]?.trim() ?? '';
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
      throw new BadRequestException('Unsupported image format');
    }
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('Image size must not exceed 6MB');
    }
  }

  private buildObjectKey(folder: string, originalName: string): string {
    const extension = extname(originalName).toLowerCase() || '.jpg';
    const safeFolder = folder.replace(/^\/+|\/+$/g, '');
    return `${safeFolder}/${Date.now()}-${randomUUID()}${extension}`;
  }

  private extractObjectKey(fileUrl: string): string | null {
    const prefix = `${this.publicBaseUrl}/`;
    if (!fileUrl.startsWith(prefix)) {
      return null;
    }
    return fileUrl.slice(prefix.length);
  }
}
