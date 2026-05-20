import type { User } from '@prisma/client';
import { RecipesService } from './recipes.service';
export declare class RecipeFavoritesController {
    private readonly recipesService;
    constructor(recipesService: RecipesService);
    favorites(user: User | undefined): Promise<{
        id: string;
        title: string;
        ingredients: string[];
        steps: string[];
        category: string | null;
        tags: string[];
        diet: string | null;
        restrictions: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        user: {
            name: string;
            avatarUrl: string | null;
            isPremium: boolean;
        };
        likesCount: number;
        likedByMe: boolean;
        savedByMe: boolean;
    }[]>;
    liked(user: User | undefined): Promise<{
        id: string;
        title: string;
        ingredients: string[];
        steps: string[];
        category: string | null;
        tags: string[];
        diet: string | null;
        restrictions: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        user: {
            name: string;
            avatarUrl: string | null;
            isPremium: boolean;
        };
        likesCount: number;
        likedByMe: boolean;
        savedByMe: boolean;
    }[]>;
    publishedByUser(userId: string, user: User | undefined): Promise<{
        id: string;
        title: string;
        ingredients: string[];
        steps: string[];
        category: string | null;
        tags: string[];
        diet: string | null;
        restrictions: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        user: {
            name: string;
            avatarUrl: string | null;
            isPremium: boolean;
        };
        likesCount: number;
        likedByMe: boolean;
        savedByMe: boolean;
    }[]>;
}
