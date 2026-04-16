import type { User } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    private readonly storage;
    constructor(usersService: UsersService, storage: StorageService);
    me(user: User | undefined): Promise<{
        id: string;
        clerkId: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        isPremium: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    uploadAvatar(user: User | undefined, file: Express.Multer.File | undefined): Promise<{
        id: string;
        email: string;
        name: string;
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
        id: string;
        clerkId: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        isPremium: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    publicProfile(id: string): Promise<{
        id: string;
        name: string;
        avatarUrl: string | null;
    }>;
    findOne(id: string): Promise<{
        id: string;
        clerkId: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        isPremium: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(body: CreateUserDto): Promise<{
        id: string;
        clerkId: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        isPremium: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
