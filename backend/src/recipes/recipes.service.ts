import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type Recipe } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { AiGenerateRecipeDto } from './dto/ai-generate-recipe.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import {
  buildDishImagePrompt,
  fetchPollinationsDishImage,
} from './dish-image-pollinations';
import { parseCommaSeparatedFilter } from './feed-filters.util';

export type AiGenerateRecipeResult = {
  recipe: Recipe;
  /** Set when a dish image was requested but generation or upload failed. */
  imageNote?: string;
};

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  /** Distinct categories and tags from published recipes (for filter UI). */
  async getPublishedFeedFacets() {
    const rows = await this.prisma.recipe.findMany({
      where: { isPublished: true },
      select: { category: true, tags: true, diet: true, restrictions: true },
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
    const diets = [
      ...new Set(
        rows
          .map((r) => r.diet)
          .filter((d): d is string => Boolean(d?.trim())),
      ),
    ].sort((a, b) => a.localeCompare(b));
    const restrictions = [
      ...new Set(rows.flatMap((r) => r.restrictions)),
    ].sort((a, b) => a.localeCompare(b));
    return { categories, tags, diets, restrictions };
  }

  /**
   * Published recipe ids matching free-text `q` (title, category, any tag, or any ingredient line).
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
        OR EXISTS (
          SELECT 1 FROM unnest(r.ingredients) AS ing(line)
          WHERE line ILIKE ${pattern}
        )
        OR COALESCE(r.diet, '') ILIKE ${pattern}
        OR EXISTS (
          SELECT 1 FROM unnest(r.restrictions) AS res(line)
          WHERE line ILIKE ${pattern}
        )
      )
    `;
    return rows.map((r) => r.id);
  }

  private normalizeDiet(raw?: string | null): string | null {
    const t = raw?.trim().toLowerCase();
    return t?.length ? t : null;
  }

  private normalizeRestrictionsList(raw?: string[] | null): string[] {
    if (!raw?.length) return [];
    return [
      ...new Set(
        raw.map((s) => String(s).trim().toLowerCase()).filter(Boolean),
      ),
    ];
  }

  /** Recipes where every term appears as a substring in at least one ingredient line. */
  private async idsMatchingIngredientIncludeAll(
    terms: string[],
  ): Promise<string[]> {
    if (terms.length === 0) return [];
    const parts = terms.map(
      (term) =>
        Prisma.sql`EXISTS (
          SELECT 1 FROM unnest(r.ingredients) AS ing(line)
          WHERE line ILIKE ${`%${term}%`}
        )`,
    );
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT r.id FROM "Recipe" r
      WHERE r."isPublished" = true
      AND ${Prisma.join(parts, ' AND ')}
    `;
    return rows.map((r) => r.id);
  }

  /** Recipe ids that contain any excluded term in any ingredient line (to filter out). */
  private async idsMatchingIngredientExcludeAny(
    terms: string[],
  ): Promise<string[]> {
    if (terms.length === 0) return [];
    const parts = terms.map(
      (term) =>
        Prisma.sql`EXISTS (
          SELECT 1 FROM unnest(r.ingredients) AS ing(line)
          WHERE line ILIKE ${`%${term}%`}
        )`,
    );
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT r.id FROM "Recipe" r
      WHERE r."isPublished" = true
      AND (${Prisma.join(parts, ' OR ')})
    `;
    return rows.map((r) => r.id);
  }

  /** Recipes where every term matches at least one restriction label (substring, case-insensitive). */
  private async idsMatchingRestrictionsIncludeAll(
    terms: string[],
  ): Promise<string[]> {
    if (terms.length === 0) return [];
    const parts = terms.map(
      (term) =>
        Prisma.sql`EXISTS (
          SELECT 1 FROM unnest(r.restrictions) AS res(line)
          WHERE line ILIKE ${`%${term}%`}
        )`,
    );
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT r.id FROM "Recipe" r
      WHERE r."isPublished" = true
      AND ${Prisma.join(parts, ' AND ')}
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
      includeIng?: string;
      excludeIng?: string;
      diet?: string;
      restriction?: string;
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
    const dietTrim = params.diet?.trim().toLowerCase();
    if (dietTrim) {
      parts.push({ diet: { equals: dietTrim, mode: 'insensitive' } });
    }
    const qTrim = params.q?.trim();
    if (qTrim) {
      const ids = await this.idsMatchingFeedTextSearch(qTrim);
      if (ids.length === 0) {
        return { items: [], nextOffset: null };
      }
      parts.push({ id: { in: ids } });
    }
    const includeTerms = parseCommaSeparatedFilter(params.includeIng);
    if (includeTerms.length > 0) {
      const ids = await this.idsMatchingIngredientIncludeAll(includeTerms);
      if (ids.length === 0) {
        return { items: [], nextOffset: null };
      }
      parts.push({ id: { in: ids } });
    }
    const excludeTerms = parseCommaSeparatedFilter(params.excludeIng);
    if (excludeTerms.length > 0) {
      const excludeIds = await this.idsMatchingIngredientExcludeAny(
        excludeTerms,
      );
      if (excludeIds.length > 0) {
        parts.push({ id: { notIn: excludeIds } });
      }
    }
    const restrictionTerms = parseCommaSeparatedFilter(params.restriction);
    if (restrictionTerms.length > 0) {
      const ids = await this.idsMatchingRestrictionsIncludeAll(
        restrictionTerms,
      );
      if (ids.length === 0) {
        return { items: [], nextOffset: null };
      }
      parts.push({ id: { in: ids } });
    }
    const where: Prisma.RecipeWhereInput =
      parts.length === 1 ? parts[0] : { AND: parts };
    const orderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
    const { offset, limit } = params;
    const take = limit + 1;

    if (currentUserId) {
      const rows = await this.prisma.recipe.findMany({
        where,
        orderBy,
        skip: offset,
        take,
        include: {
          user: { select: { name: true, avatarUrl: true, isPremium: true } },
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
        this.mapFeedRow(r, r.recipeLikes.length > 0, r.favorites.length > 0),
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
        user: { select: { name: true, avatarUrl: true, isPremium: true } },
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
      diet: string | null;
      restrictions: string[];
      imageUrl: string | null;
      isAI: boolean;
      isPublished: boolean;
      userId: string;
      createdAt: Date;
      updatedAt: Date;
      user: { name: string; avatarUrl: string | null; isPremium: boolean };
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
      diet: r.diet,
      restrictions: r.restrictions,
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
            user: { select: { name: true, avatarUrl: true, isPremium: true } },
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
        diet: r.diet,
        restrictions: r.restrictions,
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
            user: { select: { name: true, avatarUrl: true, isPremium: true } },
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
        diet: r.diet,
        restrictions: r.restrictions,
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

  /** Same visibility as GET /recipes/:id — published for everyone, draft for owner only. */
  private async assertRecipeAccessibleForComments(
    recipeId: string,
    viewerUserId?: string,
  ): Promise<{ id: string; userId: string; isPublished: boolean }> {
    if (recipeId === 'favorites' || recipeId === 'my' || recipeId === 'liked') {
      throw new NotFoundException('Recipe not found');
    }
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true, userId: true, isPublished: true },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${recipeId} not found`);
    }
    if (!recipe.isPublished) {
      if (!viewerUserId || recipe.userId !== viewerUserId) {
        throw new ForbiddenException('This recipe is not published');
      }
    }
    return recipe;
  }

  async listRecipeComments(recipeId: string, viewerUserId?: string) {
    await this.assertRecipeAccessibleForComments(recipeId, viewerUserId);
    const rows = await this.prisma.recipeComment.findMany({
      where: { recipeId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        body: true,
        createdAt: true,
        userId: true,
        user: { select: { name: true, avatarUrl: true } },
      },
    });
    return rows.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      userId: c.userId,
      user: c.user,
    }));
  }

  async createRecipeComment(
    recipeId: string,
    authorUserId: string,
    body: string,
  ) {
    await this.assertRecipeAccessibleForComments(recipeId, authorUserId);
    const text = body.trim();
    if (!text.length) {
      throw new BadRequestException('Comment cannot be empty');
    }
    return this.prisma.recipeComment.create({
      data: {
        recipeId,
        userId: authorUserId,
        body: text,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        userId: true,
        user: { select: { name: true, avatarUrl: true } },
      },
    });
  }

  async deleteRecipeComment(
    recipeId: string,
    commentId: string,
    viewerUserId: string,
  ) {
    const comment = await this.prisma.recipeComment.findFirst({
      where: { id: commentId, recipeId },
      include: { recipe: { select: { userId: true } } },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (
      comment.userId !== viewerUserId &&
      comment.recipe.userId !== viewerUserId
    ) {
      throw new ForbiddenException('You cannot delete this comment');
    }
    await this.prisma.recipeComment.delete({ where: { id: commentId } });
    return { deleted: true as const };
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
        user: { select: { name: true, avatarUrl: true, isPremium: true } },
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
      diet: recipe.diet,
      restrictions: recipe.restrictions,
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
        diet: string | null;
        restrictions: string[];
        imageUrl: string | null;
        isAI: boolean;
        isPublished: boolean;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        user: { name: string; avatarUrl: string | null; isPremium: boolean };
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
      diet: r.diet,
      restrictions: r.restrictions,
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
          user: { select: { name: true, avatarUrl: true, isPremium: true } },
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
        mapRow(r, r.recipeLikes.length > 0, r.favorites.length > 0),
      );
    }

    const rows = await this.prisma.recipe.findMany({
      where,
      orderBy,
      include: {
        user: { select: { name: true, avatarUrl: true, isPremium: true } },
        _count: { select: { recipeLikes: true } },
      },
    });
    return rows.map((r) => mapRow(r, false, false));
  }

  create(data: CreateRecipeDto, userId: string) {
    const tags = (data.tags ?? [])
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const restrictions = this.normalizeRestrictionsList(data.restrictions);
    const diet = this.normalizeDiet(data.diet);
    return this.prisma.recipe.create({
      data: {
        title: data.title,
        ingredients: data.ingredients,
        steps: data.steps,
        isAI: data.isAI ?? false,
        category: data.category?.trim() || null,
        tags,
        diet,
        restrictions,
        userId,
      },
    });
  }

  async updateForUser(id: string, userId: string, dto: UpdateRecipeDto) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${id} not found`);
    }
    if (recipe.userId !== userId) {
      throw new ForbiddenException('You can only edit your own recipes');
    }

    const data: Prisma.RecipeUpdateInput = {};

    if (dto.title !== undefined) {
      const t = dto.title.trim();
      if (!t) {
        throw new BadRequestException('Title cannot be empty');
      }
      data.title = t;
    }
    if (dto.ingredients !== undefined) {
      const ing = dto.ingredients
        .map((s) => String(s).trim())
        .filter(Boolean);
      if (!ing.length) {
        throw new BadRequestException('Ingredients cannot be empty');
      }
      data.ingredients = ing;
    }
    if (dto.steps !== undefined) {
      const st = dto.steps.map((s) => String(s).trim()).filter(Boolean);
      if (!st.length) {
        throw new BadRequestException('Steps cannot be empty');
      }
      data.steps = st;
    }
    if (dto.category !== undefined) {
      const c = dto.category.trim();
      data.category = c.length ? c : null;
    }
    if (dto.tags !== undefined) {
      data.tags = dto.tags
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
    }
    if (dto.diet !== undefined) {
      data.diet =
        dto.diet === null || !String(dto.diet).trim()
          ? null
          : this.normalizeDiet(dto.diet);
    }
    if (dto.restrictions !== undefined) {
      data.restrictions = this.normalizeRestrictionsList(dto.restrictions);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No changes provided');
    }

    return this.prisma.recipe.update({ where: { id }, data });
  }

  async generateAiRecipe(
    input: AiGenerateRecipeDto,
    userId: string,
  ): Promise<AiGenerateRecipeResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.isPremium) {
      throw new BadRequestException('Upgrade to premium');
    }

    const generated = await this.aiService.generateRecipe({
      ingredients: input.ingredients,
      dishType: input.dishType,
      complexity: input.complexity,
      diet: this.normalizeDiet(input.diet) ?? undefined,
      restrictions: this.normalizeRestrictionsList(input.restrictions),
      avoidIngredients: (input.avoidIngredients ?? [])
        .map((s) => String(s).trim().toLowerCase())
        .filter(Boolean),
    });

    const dish = (input.dishType ?? 'general')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
    const aiTags = [dish, 'ai'].filter(Boolean);
    const dietStored = this.normalizeDiet(input.diet);
    const restrictionsStored = this.normalizeRestrictionsList(
      input.restrictions,
    );
    const recipe = await this.prisma.recipe.create({
      data: {
        title: generated.title,
        ingredients: generated.ingredients,
        steps: generated.steps,
        isAI: true,
        category: input.dishType?.trim() || 'AI',
        tags: aiTags,
        diet: dietStored,
        restrictions: restrictionsStored,
        userId,
      },
    });

    const wantsImage = Boolean(input.generateImage);
    if (!wantsImage) {
      return { recipe };
    }

    try {
      const prompt = buildDishImagePrompt(generated.title, input.dishType);
      const width = this.parseImageDimension('DISH_IMAGE_WIDTH', 1024);
      const height = this.parseImageDimension('DISH_IMAGE_HEIGHT', 1024);
      const model =
        this.config.get<string>('DISH_IMAGE_POLLINATIONS_MODEL')?.trim() ||
        'flux';

      const { buffer, contentType } = await fetchPollinationsDishImage(prompt, {
        width,
        height,
        model,
      });
      const imageUrl = await this.storage.uploadRecipeImage(
        buffer,
        contentType,
        userId,
        recipe.id,
      );
      const updated = await this.prisma.recipe.update({
        where: { id: recipe.id },
        data: { imageUrl },
      });
      return { recipe: updated };
    } catch (e) {
      this.logger.warn(
        `Failed to attach dish image for recipe ${recipe.id}`,
        e instanceof Error ? e.stack : e,
      );
      return {
        recipe,
        imageNote:
          'Could not generate a dish image automatically. You can add one later from your profile.',
      };
    }
  }

  private parseImageDimension(envKey: string, fallback: number): number {
    const raw = this.config.get<string>(envKey)?.trim();
    const n = raw ? parseInt(raw, 10) : NaN;
    if (!Number.isFinite(n)) return fallback;
    return Math.min(2048, Math.max(256, n));
  }

  /**
   * Attach a dish image (base64 or data URL) for any recipe the user owns.
   */
  async uploadDishImageFromBase64(
    recipeId: string,
    userId: string,
    imageBase64Raw: string,
  ) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${recipeId} not found`);
    }
    if (recipe.userId !== userId) {
      throw new ForbiddenException('You can only update your own recipes');
    }

    const stripped = imageBase64Raw.trim();
    const parsedMime = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(
      stripped,
    );
    let buffer: Buffer;
    let mime = 'image/png';
    if (parsedMime) {
      mime = parsedMime[1].toLowerCase();
      const base64 = parsedMime[2].replace(/\s/g, '');
      try {
        buffer = Buffer.from(base64, 'base64');
      } catch {
        throw new BadRequestException('Invalid base64 image data');
      }
    } else {
      const base64 = stripped.replace(/\s/g, '');
      try {
        buffer = Buffer.from(base64, 'base64');
      } catch {
        throw new BadRequestException('Invalid base64 image data');
      }
    }

    const maxBytes = 6 * 1024 * 1024;
    if (buffer.length === 0 || buffer.length > maxBytes) {
      throw new BadRequestException(
        'Image data is empty or too large (max 6MB)',
      );
    }

    if (recipe.imageUrl) {
      await this.storage.deleteFile(recipe.imageUrl);
    }

    try {
      const imageUrl = await this.storage.uploadRecipeImage(
        buffer,
        mime,
        userId,
        recipeId,
      );
      return this.prisma.recipe.update({
        where: { id: recipeId },
        data: { imageUrl },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      this.logger.error(`Recipe dish image upload failed: ${msg}`);
      throw new BadRequestException(msg);
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
    if (recipe.imageUrl) {
      await this.storage.deleteFile(recipe.imageUrl);
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
