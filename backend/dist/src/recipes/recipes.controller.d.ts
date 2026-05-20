import type { User } from '@prisma/client';
import { AiGenerateRecipeDto } from './dto/ai-generate-recipe.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { UploadRecipeDishImageDto } from './dto/upload-dish-image.dto';
import { type AiGenerateRecipeResult, RecipesService } from './recipes.service';
export declare class RecipesController {
    private readonly recipesService;
    constructor(recipesService: RecipesService);
    feedFacets(): Promise<{
        categories: string[];
        tags: string[];
        diets: string[];
        restrictions: string[];
    }>;
    feed(user: User | undefined, offsetRaw?: string, limitRaw?: string, q?: string, tag?: string, category?: string, includeIng?: string, excludeIng?: string, diet?: string, restriction?: string): Promise<{
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
    myRecipes(user: User | undefined): import("@prisma/client").Prisma.PrismaPromise<{
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
    aiGenerate(user: User | undefined, body: AiGenerateRecipeDto): Promise<AiGenerateRecipeResult>;
    uploadDishImage(id: string, user: User | undefined, body: UploadRecipeDishImageDto): Promise<{
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
    create(user: User | undefined, body: CreateRecipeDto): import("@prisma/client").Prisma.Prisma__RecipeClient<{
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
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    publish(id: string, user: User | undefined): Promise<{
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
    unpublish(id: string, user: User | undefined): Promise<{
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
    update(id: string, user: User | undefined, body: UpdateRecipeDto): Promise<{
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
    like(id: string, user: User | undefined): Promise<{
        likesCount: number;
        likedByMe: boolean;
    }>;
    unlike(id: string, user: User | undefined): Promise<{
        likesCount: number;
        likedByMe: boolean;
    }>;
    save(id: string, user: User | undefined): Promise<{
        savedByMe: boolean;
    }>;
    unsave(id: string, user: User | undefined): Promise<{
        savedByMe: boolean;
    }>;
    findOne(id: string, user: User | undefined): Promise<{
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
    remove(id: string, user: User | undefined): Promise<{
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
