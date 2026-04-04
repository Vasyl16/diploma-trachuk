import { ConfigService } from '@nestjs/config';
export declare class S3StorageService {
    private readonly config;
    private client;
    constructor(config: ConfigService);
    private isS3Configured;
    private getS3Client;
    private publicApiBase;
    private uploadAvatarLocal;
    private uploadAvatarS3;
    uploadAvatar(buffer: Buffer, contentType: string, userId: string): Promise<string>;
    private uploadRecipeImageLocal;
    private uploadRecipeImageS3;
    uploadRecipeImage(buffer: Buffer, contentType: string, userId: string, recipeId: string): Promise<string>;
}
