import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import type { Recipe, User } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiGenerateRecipeDto } from './dto/ai-generate-recipe.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { UploadRecipeDishImageDto } from './dto/upload-dish-image.dto';
import { type AiGenerateRecipeResult, RecipesService } from './recipes.service';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  /** Distinct categories and tags for published recipes (feed filters). */
  @Get('facets')
  feedFacets() {
    return this.recipesService.getPublishedFeedFacets();
  }

  @Get()
  feed(
    @CurrentUser() user: User | undefined,
    @Query('offset') offsetRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('q') q?: string,
    @Query('tag') tag?: string,
    @Query('category') category?: string,
    /** Comma-separated substrings; recipe must match every term in ingredient lines. */
    @Query('includeIng') includeIng?: string,
    /** Comma-separated substrings; recipes containing any term in ingredients are excluded. */
    @Query('excludeIng') excludeIng?: string,
    /** Diet style (e.g. vegan) — case-insensitive match on stored diet. */
    @Query('diet') diet?: string,
    /** Comma-separated; recipe must match every term against its restrictions labels (substring, case-insensitive). */
    @Query('restriction') restriction?: string,
  ) {
    const offset = Math.max(0, parseInt(offsetRaw ?? '0', 10) || 0);
    const limit = Math.min(50, Math.max(1, parseInt(limitRaw ?? '12', 10) || 12));
    return this.recipesService.findPublishedFeed(user?.id, {
      offset,
      limit,
      q,
      tag,
      category,
      includeIng,
      excludeIng,
      diet,
      restriction,
    });
  }

  @Get('my')
  myRecipes(@CurrentUser() user: User | undefined) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.findMine(user.id);
  }

  @Post('ai-generate')
  async aiGenerate(
    @CurrentUser() user: User | undefined,
    @Body() body: AiGenerateRecipeDto,
  ): Promise<AiGenerateRecipeResult> {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return await this.recipesService.generateAiRecipe(body, user.id);
  }

  /** Client-uploaded dish image as base64 (optional manual upload). */
  @Post(':id/dish-image')
  uploadDishImage(
    @Param('id') id: string,
    @CurrentUser() user: User | undefined,
    @Body() body: UploadRecipeDishImageDto,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.uploadDishImageFromBase64(
      id,
      user.id,
      body.imageBase64,
    );
  }

  @Post()
  create(@CurrentUser() user: User | undefined, @Body() body: CreateRecipeDto) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.create(body, user.id);
  }

  @Patch(':id/publish')
  publish(
    @Param('id') id: string,
    @CurrentUser() user: User | undefined,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.publishForUser(id, user.id);
  }

  @Patch(':id/unpublish')
  unpublish(
    @Param('id') id: string,
    @CurrentUser() user: User | undefined,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.unpublishForUser(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: User | undefined,
    @Body() body: UpdateRecipeDto,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.updateForUser(id, user.id, body);
  }

  @Post(':id/like')
  like(
    @Param('id') id: string,
    @CurrentUser() user: User | undefined,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.likeRecipe(id, user.id);
  }

  @Delete(':id/like')
  unlike(
    @Param('id') id: string,
    @CurrentUser() user: User | undefined,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.unlikeRecipe(id, user.id);
  }

  @Post(':id/save')
  save(
    @Param('id') id: string,
    @CurrentUser() user: User | undefined,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.saveRecipe(id, user.id);
  }

  @Delete(':id/save')
  unsave(
    @Param('id') id: string,
    @CurrentUser() user: User | undefined,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.unsaveRecipe(id, user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: User | undefined,
  ) {
    return this.recipesService.findById(id, user?.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User | undefined) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.recipesService.deleteForUser(id, user.id);
  }
}
