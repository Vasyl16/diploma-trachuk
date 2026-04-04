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
const client_1 = require("@prisma/client");
const ai_service_1 = require("../ai/ai.service");
const prisma_service_1 = require("../prisma/prisma.service");
const s3_storage_service_1 = require("../storage/s3-storage.service");
let RecipesService = RecipesService_1 = class RecipesService {
    prisma;
    aiService;
    s3Storage;
    logger = new common_1.Logger(RecipesService_1.name);
    constructor(prisma, aiService, s3Storage) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.s3Storage = s3Storage;
    }
    async getPublishedFeedFacets() {
        const rows = await this.prisma.recipe.findMany({
            where: { isPublished: true },
            select: { category: true, tags: true },
        });
        const categories = [
            ...new Set(rows
                .map((r) => r.category)
                .filter((c) => Boolean(c?.trim()))),
        ].sort((a, b) => a.localeCompare(b));
        const tags = [...new Set(rows.flatMap((r) => r.tags))].sort((a, b) => a.localeCompare(b));
        return { categories, tags };
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
      )
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
        const qTrim = params.q?.trim();
        if (qTrim) {
            const ids = await this.idsMatchingFeedTextSearch(qTrim);
            if (ids.length === 0) {
                return { items: [], nextOffset: null };
            }
            parts.push({ id: { in: ids } });
        }
        const where = parts.length === 1 ? parts[0] : { AND: parts };
        const orderBy = [
            { createdAt: 'desc' },
            { id: 'desc' },
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
    mapFeedRow(r, likedByMe, savedByMe) {
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
            return rows.map((r) => mapRow(r, r.recipeLikes.length > 0, r.favorites.length > 0));
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
    create(data, userId) {
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
    async generateAiRecipe(input, userId) {
        const aiCount = await this.prisma.recipe.count({
            where: { userId, isAI: true },
        });
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (aiCount >= 1 && !user.isPremium) {
            throw new common_1.BadRequestException('Upgrade to premium');
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
                imageNote: 'Dish image was not created. Add OPENAI_API_KEY to backend/.env. DALL·E uses OpenAI’s Images API only (OpenRouter / OPENROUTER_API_KEY is for chat, not images). Check the API terminal logs for details.',
            };
        }
        try {
            const imageUrl = await this.s3Storage.uploadRecipeImage(imageBuffer, 'image/png', userId, recipe.id);
            const updated = await this.prisma.recipe.update({
                where: { id: recipe.id },
                data: { imageUrl },
            });
            return { recipe: updated };
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Upload failed';
            this.logger.error(`Recipe image upload failed: ${msg}`);
            return {
                recipe,
                imageNote: `Recipe saved, but storing the image failed: ${msg}`,
            };
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
        s3_storage_service_1.S3StorageService])
], RecipesService);
//# sourceMappingURL=recipes.service.js.map