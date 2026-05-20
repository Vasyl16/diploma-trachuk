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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
let UsersService = class UsersService {
    prisma;
    storage;
    constructor(prisma, storage) {
        this.prisma = prisma;
        this.storage = storage;
    }
    findAll() {
        return this.prisma.user.findMany();
    }
    async findById(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException(`User with id ${id} not found`);
        }
        return user;
    }
    async findPublicById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: { id: true, name: true, avatarUrl: true, isPremium: true },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with id ${id} not found`);
        }
        return user;
    }
    async searchByName(q) {
        const term = q.trim();
        if (term.length < 1) {
            return {
                items: [],
            };
        }
        const items = await this.prisma.user.findMany({
            where: {
                name: { contains: term, mode: 'insensitive' },
            },
            take: 30,
            orderBy: { name: 'asc' },
            select: { id: true, name: true, avatarUrl: true, isPremium: true },
        });
        return { items };
    }
    async create(data) {
        const byClerk = await this.prisma.user.findUnique({
            where: { clerkId: data.clerkId },
        });
        if (byClerk) {
            throw new common_1.ConflictException('Cannot create user: a user with this Clerk id already exists.');
        }
        const byEmail = await this.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (byEmail) {
            throw new common_1.ConflictException('Cannot create user: a user with this email already exists.');
        }
        return this.prisma.user.create({
            data: {
                clerkId: data.clerkId,
                email: data.email,
                name: data.name,
                avatarUrl: data.avatarUrl,
            },
        });
    }
    async syncFromClerk(params) {
        const existing = await this.prisma.user.findUnique({
            where: { clerkId: params.clerkId },
        });
        if (existing) {
            const emailOwner = await this.prisma.user.findUnique({
                where: { email: params.email },
            });
            if (emailOwner && emailOwner.id !== existing.id) {
                throw new common_1.ConflictException('Cannot sync user: this email is already used by another account.');
            }
            return this.prisma.user.update({
                where: { id: existing.id },
                data: {
                    email: params.email,
                    name: params.name,
                },
            });
        }
        const emailTaken = await this.prisma.user.findUnique({
            where: { email: params.email },
        });
        if (emailTaken) {
            throw new common_1.ConflictException('Cannot sync user: a user with this email already exists.');
        }
        return this.prisma.user.create({
            data: {
                clerkId: params.clerkId,
                email: params.email,
                name: params.name,
                avatarUrl: params.avatarUrl ?? undefined,
            },
        });
    }
    async updateAvatar(userId, avatarUrl) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
            },
        });
    }
    async removeByClerkId(clerkId) {
        const user = await this.prisma.user.findUnique({
            where: { clerkId },
            include: { recipes: { select: { imageUrl: true } } },
        });
        if (!user)
            return;
        const urls = [
            user.avatarUrl,
            ...user.recipes.map((r) => r.imageUrl),
        ].filter((u) => Boolean(u));
        await this.storage.deleteFiles(urls);
        await this.prisma.$transaction([
            this.prisma.recipe.deleteMany({ where: { userId: user.id } }),
            this.prisma.user.delete({ where: { id: user.id } }),
        ]);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService])
], UsersService);
//# sourceMappingURL=users.service.js.map