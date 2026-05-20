import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateUserDto } from './dto/create-user.dto';
export declare class UsersService {
    private readonly prisma;
    private readonly storage;
    constructor(prisma: PrismaService, storage: StorageService);
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clerkId: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        isPremium: boolean;
    }[]>;
    findById(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clerkId: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        isPremium: boolean;
    }>;
    findPublicById(id: string): Promise<{
        id: string;
        name: string;
        avatarUrl: string | null;
        isPremium: boolean;
    }>;
    searchByName(q: string): Promise<{
        items: {
            id: string;
            name: string;
            avatarUrl: string | null;
            isPremium: boolean;
        }[];
    }>;
    create(data: CreateUserDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clerkId: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        isPremium: boolean;
    }>;
    syncFromClerk(params: {
        clerkId: string;
        email: string;
        name: string;
        avatarUrl?: string | null;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clerkId: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        isPremium: boolean;
    }>;
    updateAvatar(userId: string, avatarUrl: string): Promise<{
        id: string;
        email: string;
        name: string;
        avatarUrl: string | null;
    }>;
    removeByClerkId(clerkId: string): Promise<void>;
}
