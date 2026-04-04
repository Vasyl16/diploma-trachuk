import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function extFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

@Injectable()
export class S3StorageService {
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  private isS3Configured(): boolean {
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    const bucket = this.config.get<string>('AWS_BUCKET_NAME');
    return Boolean(
      accessKeyId?.trim() &&
        secretAccessKey?.trim() &&
        bucket?.trim(),
    );
  }

  /** Builds S3 client on first use. */
  private getS3Client(): S3Client {
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.config.get<string>('AWS_REGION') ?? 'us-east-1';
    if (!accessKeyId?.trim() || !secretAccessKey?.trim()) {
      throw new BadRequestException('S3 credentials are incomplete');
    }
    if (!this.client) {
      this.client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
    return this.client;
  }

  private publicApiBase(): string {
    const fromEnv =
      this.config.get<string>('API_PUBLIC_URL') ??
      this.config.get<string>('BACKEND_PUBLIC_URL');
    if (fromEnv?.trim()) {
      return fromEnv.replace(/\/$/, '');
    }
    const port = this.config.get<string>('PORT') ?? process.env.PORT ?? '3000';
    return `http://localhost:${port}`;
  }

  /** Save under ./uploads when AWS is not configured (local dev). */
  private async uploadAvatarLocal(
    buffer: Buffer,
    contentType: string,
    userId: string,
  ): Promise<string> {
    const mime = contentType.split(';')[0]?.trim() ?? '';
    if (!ALLOWED_MIME.has(mime)) {
      throw new BadRequestException(`Unsupported image type: ${contentType}`);
    }
    const ext = extFromMime(mime);
    const fileName = `${randomUUID()}.${ext}`;
    const relativeDir = join('avatars', userId);
    const absoluteDir = join(process.cwd(), 'uploads', relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    await writeFile(join(absoluteDir, fileName), buffer);
    return `${this.publicApiBase()}/uploads/${relativeDir.replace(/\\/g, '/')}/${fileName}`;
  }

  private async uploadAvatarS3(
    buffer: Buffer,
    contentType: string,
    userId: string,
  ): Promise<string> {
    const mime = contentType.split(';')[0]?.trim() ?? '';
    if (!ALLOWED_MIME.has(mime)) {
      throw new BadRequestException(`Unsupported image type: ${contentType}`);
    }

    const bucket = this.config.get<string>('AWS_BUCKET_NAME');
    const region = this.config.get<string>('AWS_REGION') ?? 'us-east-1';
    if (!bucket?.trim()) {
      throw new BadRequestException('AWS_BUCKET_NAME is not set');
    }

    const key = `avatars/${userId}/${randomUUID()}.${extFromMime(mime)}`;

    await this.getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mime,
        CacheControl: 'public, max-age=31536000',
      }),
    );

    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  /**
   * Upload avatar: uses S3 when AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and
   * AWS_BUCKET_NAME are set; otherwise stores files under ./uploads and serves them
   * at /uploads/... (see main.ts).
   */
  async uploadAvatar(
    buffer: Buffer,
    contentType: string,
    userId: string,
  ): Promise<string> {
    if (this.isS3Configured()) {
      return this.uploadAvatarS3(buffer, contentType, userId);
    }
    return this.uploadAvatarLocal(buffer, contentType, userId);
  }

  private async uploadRecipeImageLocal(
    buffer: Buffer,
    contentType: string,
    userId: string,
    recipeId: string,
  ): Promise<string> {
    const mime = contentType.split(';')[0]?.trim() ?? 'image/png';
    if (!ALLOWED_MIME.has(mime)) {
      throw new BadRequestException(`Unsupported image type: ${contentType}`);
    }
    const ext = extFromMime(mime);
    const relativeDir = join('recipes', userId);
    const absoluteDir = join(process.cwd(), 'uploads', relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    const fileName = `${recipeId}.${ext}`;
    await writeFile(join(absoluteDir, fileName), buffer);
    return `${this.publicApiBase()}/uploads/${relativeDir.replace(/\\/g, '/')}/${fileName}`;
  }

  private async uploadRecipeImageS3(
    buffer: Buffer,
    contentType: string,
    userId: string,
    recipeId: string,
  ): Promise<string> {
    const mime = contentType.split(';')[0]?.trim() ?? 'image/png';
    if (!ALLOWED_MIME.has(mime)) {
      throw new BadRequestException(`Unsupported image type: ${contentType}`);
    }
    const bucket = this.config.get<string>('AWS_BUCKET_NAME');
    const region = this.config.get<string>('AWS_REGION') ?? 'us-east-1';
    if (!bucket?.trim()) {
      throw new BadRequestException('AWS_BUCKET_NAME is not set');
    }
    const ext = extFromMime(mime);
    const key = `recipes/${userId}/${recipeId}.${ext}`;
    await this.getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mime,
        CacheControl: 'public, max-age=31536000',
      }),
    );
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  /** AI dish image — same storage rules as avatars. */
  async uploadRecipeImage(
    buffer: Buffer,
    contentType: string,
    userId: string,
    recipeId: string,
  ): Promise<string> {
    if (this.isS3Configured()) {
      return this.uploadRecipeImageS3(buffer, contentType, userId, recipeId);
    }
    return this.uploadRecipeImageLocal(buffer, contentType, userId, recipeId);
  }
}
