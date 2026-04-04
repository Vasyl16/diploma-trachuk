import {
  Controller,
  Get,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '@prisma/client';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RecipesService } from './recipes.service';

/**
 * Registered before `RecipesController` so static paths are not matched by
 * `GET /recipes/:id` (e.g. id = "favorites" / "liked").
 */
@Controller('recipes')
export class RecipeFavoritesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get('favorites')
  favorites(@CurrentUser() user: User | undefined) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.findFavoritesForUser(user.id);
  }

  @Get('liked')
  liked(@CurrentUser() user: User | undefined) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.findLikedRecipesForUser(user.id);
  }

  /** Published recipes by user — must stay before `GET /recipes/:id`. */
  @Get('user/:userId')
  publishedByUser(
    @Param('userId') userId: string,
    @CurrentUser() user: User | undefined,
  ) {
    return this.recipesService.findPublishedByUser(userId, user?.id);
  }
}
