import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '@prisma/client';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateRecipeCommentDto } from './dto/create-recipe-comment.dto';
import { RecipesService } from './recipes.service';

/**
 * Full paths (`recipes/:id/comments`) avoid any router ambiguity with
 * `@Get(':id')` elsewhere on `@Controller('recipes')`.
 */
@Controller()
export class RecipeCommentsController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get('recipes/:recipeId/comments')
  listComments(
    @Param('recipeId') recipeId: string,
    @CurrentUser() user: User | undefined,
  ) {
    return this.recipesService.listRecipeComments(recipeId, user?.id);
  }

  @Post('recipes/:recipeId/comments')
  createComment(
    @Param('recipeId') recipeId: string,
    @CurrentUser() user: User | undefined,
    @Body() body: CreateRecipeCommentDto,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.createRecipeComment(
      recipeId,
      user.id,
      body.body,
    );
  }

  @Delete('recipes/:recipeId/comments/:commentId')
  deleteComment(
    @Param('recipeId') recipeId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: User | undefined,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.deleteRecipeComment(
      recipeId,
      commentId,
      user.id,
    );
  }
}
