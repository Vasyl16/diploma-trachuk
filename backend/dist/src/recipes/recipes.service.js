"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RecipesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const ai_service_1 = require("../ai/ai.service");
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
const dish_image_pollinations_1 = require("./dish-image-pollinations");
let RecipesService = RecipesService_1 = class RecipesService {
    prisma;
    aiService;
    storage;
    config;
    logger = new common_1.Logger(RecipesService_1.name);
    constructor(prisma, aiService, storage, config) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.storage = storage;
        this.config = config;
    }
    async getPublishedFeedFacets() {
        const rows = await this.prisma.recipe.findMany({
            where: { isPublished: true },
            select: { category: true, tags: true, diet: true, restrictions: true },
        });
        const categories = [
            ...new Set(rows
                .map((r) => r.category)
                .filter((c) => Boolean(c?.trim()))),
        ].sort((a, b) => a.localeCompare(b));
        const tags = [...new Set(rows.flatMap((r) => r.tags))].sort((a, b) => a.localeCompare(b));
        const diets = [
            ...new Set(rows
                .map((r) => r.diet)
                .filter((d) => Boolean(d?.trim()))),
        ].sort((a, b) => a.localeCompare(b));
        const restrictions = [
            ...new Set(rows.flatMap((r) => r.restrictions)),
        ].sort((a, b) => a.localeCompare(b));
        return { categories, tags, diets, restrictions };
    }
    async idsMatchingFeedTextSearch(q) {
        const trimmed = q.trim();
        if (!trimmed)
            return [];
        const pattern = `%${trimmed}%`;
        const rows = await this.prisma.$queryRaw `
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
    parseIngredientFilter(raw) {
        if (!raw?.trim())
            return [];
        return raw
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    }
    normalizeDiet(raw) {
        const t = raw?.trim().toLowerCase();
        return t?.length ? t : null;
    }
    normalizeRestrictionsList(raw) {
        if (!raw?.length)
            return [];
        return [
            ...new Set(raw.map((s) => String(s).trim().toLowerCase()).filter(Boolean)),
        ];
    }
    async idsMatchingIngredientIncludeAll(terms) {
        if (terms.length === 0)
            return [];
        const parts = terms.map((term) => client_1.Prisma.sql `EXISTS (
          SELECT 1 FROM unnest(r.ingredients) AS ing(line)
          WHERE line ILIKE ${`%${term}%`}
        )`);
        const rows = await this.prisma.$queryRaw `
      SELECT r.id FROM "Recipe" r
      WHERE r."isPublished" = true
      AND ${client_1.Prisma.join(parts, ' AND ')}
    `;
        return rows.map((r) => r.id);
    }
    async idsMatchingIngredientExcludeAny(terms) {
        if (terms.length === 0)
            return [];
        const parts = terms.map((term) => client_1.Prisma.sql `EXISTS (
          SELECT 1 FROM unnest(r.ingredients) AS ing(line)
          WHERE line ILIKE ${`%${term}%`}
        )`);
        const rows = await this.prisma.$queryRaw `
      SELECT r.id FROM "Recipe" r
      WHERE r."isPublished" = true
      AND (${client_1.Prisma.join(parts, ' OR ')})
    `;
        return rows.map((r) => r.id);
    }
    async idsMatchingRestrictionsIncludeAll(terms) {
        if (terms.length === 0)
            return [];
        const parts = terms.map((term) => client_1.Prisma.sql `EXISTS (
          SELECT 1 FROM unnest(r.restrictions) AS res(line)
          WHERE line ILIKE ${`%${term}%`}
        )`);
        const rows = await this.prisma.$queryRaw `
      SELECT r.id FROM "Recipe" r
      WHERE r."isPublished" = true
      AND ${client_1.Prisma.join(parts, ' AND ')}
    `;
        return rows.map((r) => r.id);
    }
    async findPublishedFeed(currentUserId, params) {
        const parts = [{ isPublished: true }];
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
        const includeTerms = this.parseIngredientFilter(params.includeIng);
        if (includeTerms.length > 0) {
            const ids = await this.idsMatchingIngredientIncludeAll(includeTerms);
            if (ids.length === 0) {
                return { items: [], nextOffset: null };
            }
            parts.push({ id: { in: ids } });
        }
        const excludeTerms = this.parseIngredientFilter(params.excludeIng);
        if (excludeTerms.length > 0) {
            const excludeIds = await this.idsMatchingIngredientExcludeAny(excludeTerms);
            if (excludeIds.length > 0) {
                parts.push({ id: { notIn: excludeIds } });
            }
        }
        const restrictionTerms = this.parseIngredientFilter(params.restriction);
        if (restrictionTerms.length > 0) {
            const ids = await this.idsMatchingRestrictionsIncludeAll(restrictionTerms);
            if (ids.length === 0) {
                return { items: [], nextOffset: null };
            }
            parts.push({ id: { in: ids } });
        }
        const where = parts.length === 1 ? parts[0] : { AND: parts };
        const orderBy = [{ createdAt: 'desc' }, { id: 'desc' }];
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
            const items = slice.map((r) => this.mapFeedRow(r, r.recipeLikes.length > 0, r.favorites.length > 0));
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
    mapFeedRow(r, likedByMe, savedByMe) {
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
    async findFavoritesForUser(userId) {
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
    async findLikedRecipesForUser(userId) {
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
    async likeRecipe(recipeId, userId) {
        const recipe = await this.prisma.recipe.findFirst({
            where: { id: recipeId, isPublished: true },
        });
        if (!recipe) {
            throw new common_1.NotFoundException(`Recipe with id ${recipeId} not found`);
        }
        try {
            await this.prisma.recipeLike.create({
                data: { userId, recipeId },
            });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002') {
            }
            else {
                throw e;
            }
        }
        const likesCount = await this.prisma.recipeLike.count({
            where: { recipeId },
        });
        return { likesCount, likedByMe: true };
    }
    async unlikeRecipe(recipeId, userId) {
        const recipe = await this.prisma.recipe.findFirst({
            where: { id: recipeId, isPublished: true },
        });
        if (!recipe) {
            throw new common_1.NotFoundException(`Recipe with id ${recipeId} not found`);
        }
        await this.prisma.recipeLike.deleteMany({
            where: { userId, recipeId },
        });
        const likesCount = await this.prisma.recipeLike.count({
            where: { recipeId },
        });
        return { likesCount, likedByMe: false };
    }
    async saveRecipe(recipeId, userId) {
        const recipe = await this.prisma.recipe.findFirst({
            where: { id: recipeId, isPublished: true },
        });
        if (!recipe) {
            throw new common_1.NotFoundException(`Recipe with id ${recipeId} not found`);
        }
        try {
            await this.prisma.favorite.create({
                data: { userId, recipeId },
            });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002') {
            }
            else {
                throw e;
            }
        }
        return { savedByMe: true };
    }
    async unsaveRecipe(recipeId, userId) {
        const recipe = await this.prisma.recipe.findFirst({
            where: { id: recipeId, isPublished: true },
        });
        if (!recipe) {
            throw new common_1.NotFoundException(`Recipe with id ${recipeId} not found`);
        }
        await this.prisma.favorite.deleteMany({
            where: { userId, recipeId },
        });
        return { savedByMe: false };
    }
    async assertRecipeAccessibleForComments(recipeId, viewerUserId) {
        if (recipeId === 'favorites' || recipeId === 'my' || recipeId === 'liked') {
            throw new common_1.NotFoundException('Recipe not found');
        }
        const recipe = await this.prisma.recipe.findUnique({
            where: { id: recipeId },
            select: { id: true, userId: true, isPublished: true },
        });
        if (!recipe) {
            throw new common_1.NotFoundException(`Recipe with id ${recipeId} not found`);
        }
        if (!recipe.isPublished) {
            if (!viewerUserId || recipe.userId !== viewerUserId) {
                throw new common_1.ForbiddenException('This recipe is not published');
            }
        }
        return recipe;
    }
    async listRecipeComments(recipeId, viewerUserId) {
        await this.assertRecipeAccessibleForComments(recipeId, viewerUserId);
        const rows = await this.prisma.recipeComment.findMany({
            where: { recipeId },
            orderBy: { createdAt: 'asc' },
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
    async createRecipeComment(recipeId, authorUserId, body) {
        await this.assertRecipeAccessibleForComments(recipeId, authorUserId);
        const text = body.trim();
        if (!text.length) {
            throw new common_1.BadRequestException('Comment cannot be empty');
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
    async deleteRecipeComment(recipeId, commentId, viewerUserId) {
        const comment = await this.prisma.recipeComment.findFirst({
            where: { id: commentId, recipeId },
            include: { recipe: { select: { userId: true } } },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        if (comment.userId !== viewerUserId &&
            comment.recipe.userId !== viewerUserId) {
            throw new common_1.ForbiddenException('You cannot delete this comment');
        }
        await this.prisma.recipeComment.delete({ where: { id: commentId } });
        return { deleted: true };
    }
    findMine(userId) {
        return this.prisma.recipe.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findById(id, viewerUserId) {
        if (id === 'favorites' || id === 'my' || id === 'liked') {
            throw new common_1.NotFoundException('Recipe not found');
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
            throw new common_1.NotFoundException(`Recipe with id ${id} not found`);
        }
        if (!recipe.isPublished) {
            if (!viewerUserId || recipe.userId !== viewerUserId) {
                throw new common_1.ForbiddenException('This recipe is not published');
            }
        }
        const likedByMe = viewerUserId && 'recipeLikes' in recipe
            ? recipe.recipeLikes.length > 0
            : false;
        const savedByMe = viewerUserId && 'favorites' in recipe
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
    async findPublishedByUser(userId, viewerUserId) {
        const owner = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!owner) {
            throw new common_1.NotFoundException(`User with id ${userId} not found`);
        }
        const where = { userId, isPublished: true };
        const orderBy = { createdAt: 'desc' };
        const mapRow = (r, likedByMe, savedByMe) => ({
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
            return rows.map((r) => mapRow(r, r.recipeLikes.length > 0, r.favorites.length > 0));
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
    create(data, userId) {
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
    async updateForUser(id, userId, dto) {
        const recipe = await this.prisma.recipe.findUnique({ where: { id } });
        if (!recipe) {
            throw new common_1.NotFoundException(`Recipe with id ${id} not found`);
        }
        if (recipe.userId !== userId) {
            throw new common_1.ForbiddenException('You can only edit your own recipes');
        }
        const data = {};
        if (dto.title !== undefined) {
            const t = dto.title.trim();
            if (!t) {
                throw new common_1.BadRequestException('Title cannot be empty');
            }
            data.title = t;
        }
        if (dto.ingredients !== undefined) {
            const ing = dto.ingredients
                .map((s) => String(s).trim())
                .filter(Boolean);
            if (!ing.length) {
                throw new common_1.BadRequestException('Ingredients cannot be empty');
            }
            data.ingredients = ing;
        }
        if (dto.steps !== undefined) {
            const st = dto.steps.map((s) => String(s).trim()).filter(Boolean);
            if (!st.length) {
                throw new common_1.BadRequestException('Steps cannot be empty');
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
            throw new common_1.BadRequestException('No changes provided');
        }
        return this.prisma.recipe.update({ where: { id }, data });
    }
    async generateAiRecipe(input, userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.isPremium) {
            throw new common_1.BadRequestException('Upgrade to premium');
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
        const restrictionsStored = this.normalizeRestrictionsList(input.restrictions);
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
            const prompt = (0, dish_image_pollinations_1.buildDishImagePrompt)(generated.title, input.dishType);
            const width = this.parseImageDimension('DISH_IMAGE_WIDTH', 1024);
            const height = this.parseImageDimension('DISH_IMAGE_HEIGHT', 1024);
            const model = this.config.get('DISH_IMAGE_POLLINATIONS_MODEL')?.trim() ||
                'flux';
            const { buffer, contentType } = await (0, dish_image_pollinations_1.fetchPollinationsDishImage)(prompt, {
                width,
                height,
                model,
            });
            const imageUrl = await this.storage.uploadRecipeImage(buffer, contentType, userId, recipe.id);
            const updated = await this.prisma.recipe.update({
                where: { id: recipe.id },
                data: { imageUrl },
            });
            return { recipe: updated };
        }
        catch (e) {
            this.logger.warn(`Failed to attach dish image for recipe ${recipe.id}`, e instanceof Error ? e.stack : e);
            return {
                recipe,
                imageNote: 'Could not generate a dish image automatically. You can add one later from your profile.',
            };
        }
    }
    parseImageDimension(envKey, fallback) {
        const raw = this.config.get(envKey)?.trim();
        const n = raw ? parseInt(raw, 10) : NaN;
        if (!Number.isFinite(n))
            return fallback;
        return Math.min(2048, Math.max(256, n));
    }
    async uploadDishImageFromBase64(recipeId, userId, imageBase64Raw) {
        const recipe = await this.prisma.recipe.findUnique({
            where: { id: recipeId },
        });
        if (!recipe) {
            throw new common_1.NotFoundException(`Recipe with id ${recipeId} not found`);
        }
        if (recipe.userId !== userId) {
            throw new common_1.ForbiddenException('You can only update your own recipes');
        }
        const stripped = imageBase64Raw.trim();
        const parsedMime = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(stripped);
        let buffer;
        let mime = 'image/png';
        if (parsedMime) {
            mime = parsedMime[1].toLowerCase();
            const base64 = parsedMime[2].replace(/\s/g, '');
            try {
                buffer = Buffer.from(base64, 'base64');
            }
            catch {
                throw new common_1.BadRequestException('Invalid base64 image data');
            }
        }
        else {
            const base64 = stripped.replace(/\s/g, '');
            try {
                buffer = Buffer.from(base64, 'base64');
            }
            catch {
                throw new common_1.BadRequestException('Invalid base64 image data');
            }
        }
        const maxBytes = 6 * 1024 * 1024;
        if (buffer.length === 0 || buffer.length > maxBytes) {
            throw new common_1.BadRequestException('Image data is empty or too large (max 6MB)');
        }
        if (recipe.imageUrl) {
            await this.storage.deleteFile(recipe.imageUrl);
        }
        try {
            const imageUrl = await this.storage.uploadRecipeImage(buffer, mime, userId, recipeId);
            return this.prisma.recipe.update({
                where: { id: recipeId },
                data: { imageUrl },
            });
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Upload failed';
            this.logger.error(`Recipe dish image upload failed: ${msg}`);
            throw new common_1.BadRequestException(msg);
        }
    }
    async deleteForUser(id, userId) {
        const recipe = await this.prisma.recipe.findUnique({ where: { id } });
        if (!recipe) {
            throw new common_1.NotFoundException(`Recipe with id ${id} not found`);
        }
        if (recipe.userId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own recipes');
        }
        if (recipe.imageUrl) {
            await this.storage.deleteFile(recipe.imageUrl);
        }
        return this.prisma.recipe.delete({ where: { id } });
    }
    async publishForUser(id, userId) {
        const recipe = await this.prisma.recipe.findUnique({ where: { id } });
        if (!recipe) {
            throw new common_1.NotFoundException(`Recipe with id ${id} not found`);
        }
        if (recipe.userId !== userId) {
            throw new common_1.ForbiddenException('You can only publish your own recipes');
        }
        return this.prisma.recipe.update({
            where: { id },
            data: { isPublished: true },
        });
    }
    async unpublishForUser(id, userId) {
        const recipe = await this.prisma.recipe.findUnique({ where: { id } });
        if (!recipe) {
            throw new common_1.NotFoundException(`Recipe with id ${id} not found`);
        }
        if (recipe.userId !== userId) {
            throw new common_1.ForbiddenException('You can only unpublish your own recipes');
        }
        return this.prisma.recipe.update({
            where: { id },
            data: { isPublished: false },
        });
    }
};
exports.RecipesService = RecipesService;
exports.RecipesService = RecipesService = RecipesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService,
        storage_service_1.StorageService,
        config_1.ConfigService])
], RecipesService);
//# sourceMappingURL=recipes.service.js.map