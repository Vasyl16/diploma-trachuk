import type { User } from '@prisma/client';
import { CreateRecipeCommentDto } from './dto/create-recipe-comment.dto';
import { RecipesService } from './recipes.service';
export declare class RecipeCommentsController {
    private readonly recipesService;
    constructor(recipesService: RecipesService);
    listComments(recipeId: string, user: User | undefined): Promise<{
        id: string;
        body: string;
        createdAt: Date;
        userId: string;
        user: {
            name: string;
            avatarUrl: string | null;
        };
    }[]>;
    createComment(recipeId: string, user: User | undefined, body: CreateRecipeCommentDto): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        user: {
            name: string;
            avatarUrl: string | null;
        };
        body: string;
    }>;
    deleteComment(recipeId: string, commentId: string, user: User | undefined): Promise<{
        deleted: true;
    }>;
}
