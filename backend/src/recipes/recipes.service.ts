import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Recipe } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3StorageService } from '../storage/s3-storage.service';
import type { AiGenerateRecipeDto } from './dto/ai-generate-recipe.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';

export type AiGenerateRecipeResult = {
  recipe: Recipe;
  /** Set when the client asked for an image but it could not be stored. */
  imageNote?: string;
};

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly s3Storage: S3StorageService,
  ) {}

  /** Distinct categories and tags from published recipes (for filter UI). */
  async getPublishedFeedFacets() {
    const rows = await this.prisma.recipe.findMany({
      where: { isPublished: true },
      select: { category: true, tags: true },
    });
    const categories = [
      ...new Set(
        rows
          .map((r) => r.category)
          .filter((c): c is string => Boolean(c?.trim())),
      ),
    ].sort((a, b) => a.localeCompare(b));
    const tags = [...new Set(rows.flatMap((r) => r.tags))].sort((a, b) =>
      a.localeCompare(b),
    );
    return { categories, tags };
  }

  /**
   * Published recipe ids matching free-text `q` (title, category, or any tag substring).
   */
  private async idsMatchingFeedTextSearch(q: string): Promise<string[]> {
    const trimmed = q.trim();
    if (!trimmed) return [];
    const pattern = `%${trimmed}%`;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT r.id FROM "Recipe" r
      WHERE r."isPublished" = true
      AND (
        r.title ILIKE ${pattern}
        OR COALESCE(r.category, '') ILIKE ${pattern}
        OR EXISTS (
          SELECT 1 FROM unnest(r.tags) AS t(tag)
          WHERE tag ILIKE ${pattern}
        )
      )
    `;
    return rows.map((r) => r.id);
  }

  /** Paginated public feed (`offset` + `limit`; `nextOffset` is null when no more pages). */
  async findPublishedFeed(
    currentUserId: string | undefined,
    params: {
      offset: number;
      limit: number;
      q?: string;
      tag?: string;
      category?: string;
    },
  ) {
    const parts: Prisma.RecipeWhereInput[] = [{ isPublished: true }];
    const cat = params.category?.trim();
    if (cat) {
      parts.push({ category: { equals: cat, mode: 'insensitive' } });
    }
    const tag = params.tag?.trim().toLowerCase();
    if (tag) {
      parts.push({ tags: { has: tag } });
    }
    const qTrim = params.q?.trim();
    if (qTrim) {
      const ids = await this.idsMatchingFeedTextSearch(qTrim);
      if (ids.length === 0) {
        return { items: [], nextOffset: null };
      }
      parts.push({ id: { in: ids } });
    }
    const where: Prisma.RecipeWhereInput =
      parts.length === 1 ? parts[0]! : { AND: parts };
    const orderBy = [
      { createdAt: 'desc' as const },
      { id: 'desc' as const },
    ];
    const { offset, limit } = params;
    const take = limit + 1;

    if (currentUserId) {
      const rows = await this.prisma.recipe.findMany({
        where,
        orderBy,
        skip: offset,
        take,
        include: {
          user: { select: { name: true, avatarUrl: true } },
          _count: { select: { recipeLikes: true } },
          recipeLikes: {
            where: { userId: currentUserId },
            take: 1,
            select: { id: true },
          },
          favorites: {
            where: { userId: currentUserId },
            take: 1,
            select: { id: true },
          },
        },
      });
      const hasMore = rows.length > limit;
      const slice = hasMore ? rows.slice(0, limit) : rows;
      const items = slice.map((r) =>
        this.mapFeedRow(
          r,
          r.recipeLikes.length > 0,
          r.favorites.length > 0,
        ),
      );
      return {
        items,
        nextOffset: hasMore ? offset + limit : null,
      };
    }

    const rows = await this.prisma.recipe.findMany({
      where,
      orderBy,
      skip: offset,
      take,
      include: {
        user: { select: { name: true, avatarUrl: true } },
        _count: { select: { recipeLikes: true } },
      },
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const items = slice.map((r) => this.mapFeedRow(r, false, false));
    return {
      items,
      nextOffset: hasMore ? offset + limit : null,
    };
  }

  private mapFeedRow(
    r: {
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
      user: { name: string; avatarUrl: string | null };
      _count: { recipeLikes: number };
    },
    likedByMe: boolean,
    savedByMe: boolean,
  ) {
    return {
      id: r.id,
      title: r.title,
      ingredients: r.ingredients,
      steps: r.steps,
      category: r.category,
      tags: r.tags,
      imageUrl: r.imageUrl,
      isAI: r.isAI,
      isPublished: r.isPublished,
      userId: r.userId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: r.user,
      likesCount: r._count.recipeLikes,
      likedByMe,
      savedByMe,
    };
  }

  /** Saved (bookmark) recipes — `Favorite` rows. */
  async findFavoritesForUser(userId: string) {
    const rows = await this.prisma.favorite.findMany({
      where: {
        userId,
        recipe: { isPublished: true },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        recipe: {
          include: {
            user: { select: { name: true, avatarUrl: true } },
            _count: { select: { recipeLikes: true } },
            recipeLikes: {
              where: { userId },
              take: 1,
              select: { id: true },
            },
          },
        },
      },
    });

    return rows.map((f) => {
      const r = f.recipe;
      return {
        id: r.id,
        title: r.title,
        ingredients: r.ingredients,
        steps: r.steps,
        category: r.category,
        tags: r.tags,
        imageUrl: r.imageUrl,
        isAI: r.isAI,
        isPublished: r.isPublished,
        userId: r.userId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        user: r.user,
        likesCount: r._count.recipeLikes,
        likedByMe: r.recipeLikes.length > 0,
        savedByMe: true,
      };
    });
  }

  /** Recipes the user liked — `RecipeLike` rows. */
  async findLikedRecipesForUser(userId: string) {
    const rows = await this.prisma.recipeLike.findMany({
      where: {
        userId,
        recipe: { isPublished: true },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        recipe: {
          include: {
            user: { select: { name: true, avatarUrl: true } },
            _count: { select: { recipeLikes: true } },
            favorites: {
              where: { userId },
              take: 1,
              select: { id: true },
            },
          },
        },
      },
    });

    return rows.map((row) => {
      const r = row.recipe;
      return {
        id: r.id,
        title: r.title,
        ingredients: r.ingredients,
        steps: r.steps,
        category: r.category,
        tags: r.tags,
        imageUrl: r.imageUrl,
        isAI: r.isAI,
        isPublished: r.isPublished,
        userId: r.userId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        user: r.user,
        likesCount: r._count.recipeLikes,
        likedByMe: true,
        savedByMe: r.favorites.length > 0,
      };
    });
  }

  async likeRecipe(recipeId: string, userId: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, isPublished: true },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${recipeId} not found`);
    }
    try {
      await this.prisma.recipeLike.create({
        data: { userId, recipeId },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        // already liked
      } else {
        throw e;
      }
    }
    const likesCount = await this.prisma.recipeLike.count({
      where: { recipeId },
    });
    return { likesCount, likedByMe: true };
  }

  async unlikeRecipe(recipeId: string, userId: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, isPublished: true },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${recipeId} not found`);
    }
    await this.prisma.recipeLike.deleteMany({
      where: { userId, recipeId },
    });
    const likesCount = await this.prisma.recipeLike.count({
      where: { recipeId },
    });
    return { likesCount, likedByMe: false };
  }

  async saveRecipe(recipeId: string, userId: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, isPublished: true },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${recipeId} not found`);
    }
    try {
      await this.prisma.favorite.create({
        data: { userId, recipeId },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        // already saved
      } else {
        throw e;
      }
    }
    return { savedByMe: true };
  }

  async unsaveRecipe(recipeId: string, userId: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, isPublished: true },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${recipeId} not found`);
    }
    await this.prisma.favorite.deleteMany({
      where: { userId, recipeId },
    });
    return { savedByMe: false };
  }

  findMine(userId: string) {
    return this.prisma.recipe.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Single recipe: published = public. Unpublished = owner only (send viewerUserId from auth).
   * Includes like/save counts and viewer flags (same shape as feed items when viewer is logged in).
   */
  async findById(id: string, viewerUserId?: string) {
    if (id === 'favorites' || id === 'my' || id === 'liked') {
      throw new NotFoundException('Recipe not found');
    }
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        _count: { select: { recipeLikes: true } },
        ...(viewerUserId
          ? {
              recipeLikes: {
                where: { userId: viewerUserId },
                take: 1,
                select: { id: true },
              },
              favorites: {
                where: { userId: viewerUserId },
                take: 1,
                select: { id: true },
              },
            }
          : {}),
      },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${id} not found`);
    }
    if (!recipe.isPublished) {
      if (!viewerUserId || recipe.userId !== viewerUserId) {
        throw new ForbiddenException('This recipe is not published');
      }
    }
    const likedByMe =
      viewerUserId && 'recipeLikes' in recipe
        ? recipe.recipeLikes.length > 0
        : false;
    const savedByMe =
      viewerUserId && 'favorites' in recipe
        ? recipe.favorites.length > 0
        : false;
    return {
      id: recipe.id,
      title: recipe.title,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      category: recipe.category,
      tags: recipe.tags,
      imageUrl: recipe.imageUrl,
      isAI: recipe.isAI,
      isPublished: recipe.isPublished,
      userId: recipe.userId,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      user: recipe.user,
      likesCount: recipe._count.recipeLikes,
      likedByMe,
      savedByMe,
    };
  }

  /** Published recipes by a user — same shape as the main feed. */
  async findPublishedByUser(userId: string, viewerUserId?: string) {
    const owner = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!owner) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const where = { userId, isPublished: true as const };
    const orderBy = { createdAt: 'desc' as const };
    const mapRow = (
      r: {
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
        user: { name: string; avatarUrl: string | null };
        _count: { recipeLikes: number };
      },
      likedByMe: boolean,
      savedByMe: boolean,
    ) => ({
      id: r.id,
      title: r.title,
      ingredients: r.ingredients,
      steps: r.steps,
      category: r.category,
      tags: r.tags,
      imageUrl: r.imageUrl,
      isAI: r.isAI,
      isPublished: r.isPublished,
      userId: r.userId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: r.user,
      likesCount: r._count.recipeLikes,
      likedByMe,
      savedByMe,
    });

    if (viewerUserId) {
      const rows = await this.prisma.recipe.findMany({
        where,
        orderBy,
        include: {
          user: { select: { name: true, avatarUrl: true } },
          _count: { select: { recipeLikes: true } },
          recipeLikes: {
            where: { userId: viewerUserId },
            take: 1,
            select: { id: true },
          },
          favorites: {
            where: { userId: viewerUserId },
            take: 1,
            select: { id: true },
          },
        },
      });
      return rows.map((r) =>
        mapRow(
          r,
          r.recipeLikes.length > 0,
          r.favorites.length > 0,
        ),
      );
    }

    const rows = await this.prisma.recipe.findMany({
      where,
      orderBy,
      include: {
        user: { select: { name: true, avatarUrl: true } },
        _count: { select: { recipeLikes: true } },
      },
    });
    return rows.map((r) => mapRow(r, false, false));
  }

  create(data: CreateRecipeDto, userId: string) {
    const tags = (data.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
    return this.prisma.recipe.create({
      data: {
        title: data.title,
        ingredients: data.ingredients,
        steps: data.steps,
        isAI: data.isAI,
        category: data.category?.trim() || null,
        tags,
        userId,
      },
    });
  }

  async generateAiRecipe(
    input: AiGenerateRecipeDto,
    userId: string,
  ): Promise<AiGenerateRecipeResult> {
    const aiCount = await this.prisma.recipe.count({
      where: { userId, isAI: true },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (aiCount >= 1 && !user.isPremium) {
      throw new BadRequestException('Upgrade to premium');
    }

    const generated = await this.aiService.generateRecipe({
      ingredients: input.ingredients,
      dishType: input.dishType,
      complexity: input.complexity,
    });

    const dish = (input.dishType ?? 'general').trim().toLowerCase().replace(/\s+/g, '-');
    const aiTags = [dish, 'ai'].filter(Boolean);
    const recipe = await this.prisma.recipe.create({
      data: {
        title: generated.title,
        ingredients: generated.ingredients,
        steps: generated.steps,
        isAI: true,
        category: input.dishType?.trim() || 'AI',
        tags: aiTags,
        userId,
      },
    });

    const wantsImage = Boolean(input.generateImage);
    if (!wantsImage) {
      return { recipe };
    }

    const imageBuffer = await this.aiService.generateDishImage({
      title: generated.title,
      dishType: input.dishType,
    });

    if (!imageBuffer) {
      return {
        recipe,
        imageNote:
          'Dish image was not created. Add OPENAI_API_KEY to backend/.env. DALL·E uses OpenAI’s Images API only (OpenRouter / OPENROUTER_API_KEY is for chat, not images). Check the API terminal logs for details.',
      };
    }

    try {
      const imageUrl = await this.s3Storage.uploadRecipeImage(
        imageBuffer,
        'image/png',
        userId,
        recipe.id,
      );
      const updated = await this.prisma.recipe.update({
        where: { id: recipe.id },
        data: { imageUrl },
      });
      return { recipe: updated };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      this.logger.error(`Recipe image upload failed: ${msg}`);
      return {
        recipe,
        imageNote: `Recipe saved, but storing the image failed: ${msg}`,
      };
    }
  }

  async deleteForUser(id: string, userId: string) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${id} not found`);
    }
    if (recipe.userId !== userId) {
      throw new ForbiddenException('You can only delete your own recipes');
    }
    return this.prisma.recipe.delete({ where: { id } });
  }

  async publishForUser(id: string, userId: string) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${id} not found`);
    }
    if (recipe.userId !== userId) {
      throw new ForbiddenException('You can only publish your own recipes');
    }
    return this.prisma.recipe.update({
      where: { id },
      data: { isPublished: true },
    });
  }

  async unpublishForUser(id: string, userId: string) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${id} not found`);
    }
    if (recipe.userId !== userId) {
      throw new ForbiddenException('You can only unpublish your own recipes');
    }
    return this.prisma.recipe.update({
      where: { id },
      data: { isPublished: false },
    });
  }
}
