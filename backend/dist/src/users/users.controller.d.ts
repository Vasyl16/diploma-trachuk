import type { User } from '@prisma/client';
import { S3StorageService } from '../storage/s3-storage.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    private readonly s3Storage;
    constructor(usersService: UsersService, s3Storage: S3StorageService);
    me(user: User | undefined): Promise<{
        name: string;
        id: string;
        clerkId: string;
        email: string;
        avatarUrl: string | null;
        isPremium: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    uploadAvatar(user: User | undefined, file: Express.Multer.File | undefined): Promise<{
        name: string;
        id: string;
        email: string;
        avatarUrl: string | null;
    }>;
    searchPeople(q?: string): Promise<{
        items: {
            id: string;
            name: string;
            avatarUrl: string | null;
        }[];
    }>;
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        name: string;
        id: string;
        clerkId: string;
        email: string;
        avatarUrl: string | null;
        isPremium: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    publicProfile(id: string): Promise<{
        name: string;
        id: string;
        avatarUrl: string | null;
    }>;
    findOne(id: string): Promise<{
        name: string;
        id: string;
        clerkId: string;
        email: string;
        avatarUrl: string | null;
        isPremium: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(body: CreateUserDto): Promise<{
        name: string;
        id: string;
        clerkId: string;
        email: string;
        avatarUrl: string | null;
        isPremium: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
