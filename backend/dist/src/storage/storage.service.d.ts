import { ConfigService } from '@nestjs/config';
export declare class StorageService {
    private readonly configService;
    private readonly logger;
    private readonly s3Client;
    private readonly bucketName;
    private readonly publicBaseUrl;
    constructor(configService: ConfigService);
    private requireEnv;
    private resolvePublicBaseUrl;
    private normalizeBaseUrl;
    uploadAvatar(buffer: Buffer, contentType: string, userId: string): Promise<string>;
    uploadRecipeImage(buffer: Buffer, contentType: string, userId: string, recipeId: string): Promise<string>;
    deleteFile(fileUrl: string): Promise<void>;
    deleteFiles(fileUrls: (string | null | undefined)[]): Promise<void>;
    private putObject;
    private assertValidImageBuffer;
    private buildObjectKey;
    private extractObjectKey;
}
