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
        diets: string[];
        restrictions: string[];
    }>;
    private idsMatchingFeedTextSearch;
    private parseIngredientFilter;
    private normalizeDiet;
    private normalizeRestrictionsList;
    private idsMatchingIngredientIncludeAll;
    private idsMatchingIngredientExcludeAny;
    private idsMatchingRestrictionsIncludeAll;
    findPublishedFeed(currentUserId: string | undefined, params: {
        offset: number;
        limit: number;
        q?: string;
        tag?: string;
        category?: string;
        includeIng?: string;
        excludeIng?: string;
        diet?: string;
        restriction?: string;
    }): Promise<{
        items: {
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
    findLikedRecipesForUser(userId: string): Promise<{
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
    private assertRecipeAccessibleForComments;
    listRecipeComments(recipeId: string, viewerUserId?: string): Promise<{
        id: string;
        body: string;
        createdAt: Date;
        userId: string;
        user: {
            name: string;
            avatarUrl: string | null;
        };
    }[]>;
    createRecipeComment(recipeId: string, authorUserId: string, body: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        user: {
            name: string;
            avatarUrl: string | null;
        };
        body: string;
    }>;
    deleteRecipeComment(recipeId: string, commentId: string, viewerUserId: string): Promise<{
        deleted: true;
    }>;
    findMine(userId: string): Prisma.PrismaPromise<{
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
    }[]>;
    findById(id: string, viewerUserId?: string): Promise<{
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
    }>;
    findPublishedByUser(userId: string, viewerUserId?: string): Promise<{
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
    create(data: CreateRecipeDto, userId: string): Prisma.Prisma__RecipeClient<{
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
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    updateForUser(id: string, userId: string, dto: UpdateRecipeDto): Promise<{
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
    }>;
    generateAiRecipe(input: AiGenerateRecipeDto, userId: string): Promise<AiGenerateRecipeResult>;
    private parseImageDimension;
    uploadDishImageFromBase64(recipeId: string, userId: string, imageBase64Raw: string): Promise<{
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
    }>;
    deleteForUser(id: string, userId: string): Promise<{
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
    }>;
    publishForUser(id: string, userId: string): Promise<{
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
    }>;
    unpublishForUser(id: string, userId: string): Promise<{
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
    }>;
}
