import { ConfigService } from '@nestjs/config';
import { Prisma, type Recipe } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { AiGenerateRecipeDto } from './dto/ai-generate-recipe.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
export type AiGenerateRecipeResult = {
    recipe: Recipe;
    imageNote?: string;
};
export declare class RecipesService {
    private readonly prisma;
    private readonly aiService;
    private readonly storage;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, aiService: AiService, storage: StorageService, config: ConfigService);
    getPublishedFeedFacets(): Promise<{
        categories: string[];
        tags: string[];
    }>;
    private idsMatchingFeedTextSearch;
    private parseIngredientFilter;
    private idsMatchingIngredientIncludeAll;
    private idsMatchingIngredientExcludeAny;
    findPublishedFeed(currentUserId: string | undefined, params: {
        offset: number;
        limit: number;
        q?: string;
        tag?: string;
        category?: string;
        includeIng?: string;
        excludeIng?: string;
    }): Promise<{
        items: {
            id: string;
            title: string;
            ingredients: string[];
            steps: string[];
            category: string | null;
            tags: string[];
            imageUrl: string | null;
            isAI: boolean;
            isPublished: boolean;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            user: {
                name: string;
                avatarUrl: string | null;
            };
            likesCount: number;
            likedByMe: boolean;
            savedByMe: boolean;
        }[];
        nextOffset: number | null;
    }>;
    private mapFeedRow;
    findFavoritesForUser(userId: string): Promise<{
        id: string;
        title: string;
        ingredients: string[];
        steps: string[];
        category: string | null;
        tags: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        user: {
            name: string;
            avatarUrl: string | null;
        };
        likesCount: number;
        likedByMe: boolean;
        savedByMe: boolean;
    }[]>;
    findLikedRecipesForUser(userId: string): Promise<{
        id: string;
        title: string;
        ingredients: string[];
        steps: string[];
        category: string | null;
        tags: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        user: {
            name: string;
            avatarUrl: string | null;
        };
        likesCount: number;
        likedByMe: boolean;
        savedByMe: boolean;
    }[]>;
    likeRecipe(recipeId: string, userId: string): Promise<{
        likesCount: number;
        likedByMe: boolean;
    }>;
    unlikeRecipe(recipeId: string, userId: string): Promise<{
        likesCount: number;
        likedByMe: boolean;
    }>;
    saveRecipe(recipeId: string, userId: string): Promise<{
        savedByMe: boolean;
    }>;
    unsaveRecipe(recipeId: string, userId: string): Promise<{
        savedByMe: boolean;
    }>;
    findMine(userId: string): Prisma.PrismaPromise<{
        title: string;
        ingredients: string[];
        steps: string[];
        id: string;
        category: string | null;
        tags: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findById(id: string, viewerUserId?: string): Promise<{
        id: string;
        title: string;
        ingredients: string[];
        steps: string[];
        category: string | null;
        tags: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        user: {
            name: string;
            avatarUrl: string | null;
        };
        likesCount: number;
        likedByMe: boolean;
        savedByMe: boolean;
    }>;
    findPublishedByUser(userId: string, viewerUserId?: string): Promise<{
        id: string;
        title: string;
        ingredients: string[];
        steps: string[];
        category: string | null;
        tags: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        user: {
            name: string;
            avatarUrl: string | null;
        };
        likesCount: number;
        likedByMe: boolean;
        savedByMe: boolean;
    }[]>;
    create(data: CreateRecipeDto, userId: string): Prisma.Prisma__RecipeClient<{
        title: string;
        ingredients: string[];
        steps: string[];
        id: string;
        category: string | null;
        tags: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    updateForUser(id: string, userId: string, dto: UpdateRecipeDto): Promise<{
        title: string;
        ingredients: string[];
        steps: string[];
        id: string;
        category: string | null;
        tags: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    generateAiRecipe(input: AiGenerateRecipeDto, userId: string): Promise<AiGenerateRecipeResult>;
    private parseImageDimension;
    uploadDishImageFromBase64(recipeId: string, userId: string, imageBase64Raw: string): Promise<{
        title: string;
        ingredients: string[];
        steps: string[];
        id: string;
        category: string | null;
        tags: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteForUser(id: string, userId: string): Promise<{
        title: string;
        ingredients: string[];
        steps: string[];
        id: string;
        category: string | null;
        tags: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    publishForUser(id: string, userId: string): Promise<{
        title: string;
        ingredients: string[];
        steps: string[];
        id: string;
        category: string | null;
        tags: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    unpublishForUser(id: string, userId: string): Promise<{
        title: string;
        ingredients: string[];
        steps: string[];
        id: string;
        category: string | null;
        tags: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
