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
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let MessagesService = class MessagesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    sortUserIds(a, b) {
        return a.localeCompare(b) <= 0 ? [a, b] : [b, a];
    }
    messagePreview(message) {
        if (!message)
            return null;
        if (message.text?.trim())
            return message.text;
        if (message.recipe?.title)
            return `Shared recipe: ${message.recipe.title}`;
        return null;
    }
    mapConversationSummary(conversation, currentUserId) {
        const other = conversation.firstUserId === currentUserId
            ? conversation.secondUser
            : conversation.firstUser;
        const lastMessage = conversation.messages?.[0];
        return {
            id: conversation.id,
            participant: other,
            lastMessageText: this.messagePreview(lastMessage),
            lastMessageAt: lastMessage?.createdAt ?? conversation.lastMessageAt ?? conversation.createdAt,
            updatedAt: conversation.updatedAt,
            blockedByMe: Boolean(conversation.blockedByMe),
            blockedMe: Boolean(conversation.blockedMe),
        };
    }
    async getBlockStatus(currentUserId, otherUserId) {
        const rows = await this.prisma.blockedUser.findMany({
            where: {
                OR: [
                    { blockerUserId: currentUserId, blockedUserId: otherUserId },
                    { blockerUserId: otherUserId, blockedUserId: currentUserId },
                ],
            },
            select: { blockerUserId: true, blockedUserId: true },
        });
        return {
            blockedByMe: rows.some((row) => row.blockerUserId === currentUserId &&
                row.blockedUserId === otherUserId),
            blockedMe: rows.some((row) => row.blockerUserId === otherUserId &&
                row.blockedUserId === currentUserId),
        };
    }
    async assertExistingOtherUser(currentUserId, otherUserId) {
        const targetUserId = otherUserId.trim();
        if (!targetUserId) {
            throw new common_1.BadRequestException('Select a user.');
        }
        if (targetUserId === currentUserId) {
            throw new common_1.BadRequestException('You cannot use this action on yourself.');
        }
        const other = await this.prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true },
        });
        if (!other) {
            throw new common_1.NotFoundException(`User with id ${targetUserId} not found`);
        }
        return targetUserId;
    }
    async findConversationByPair(firstUserId, secondUserId) {
        return this.prisma.directConversation.findUnique({
            where: {
                firstUserId_secondUserId: {
                    firstUserId,
                    secondUserId,
                },
            },
            include: {
                firstUser: {
                    select: { id: true, name: true, avatarUrl: true, isPremium: true },
                },
                secondUser: {
                    select: { id: true, name: true, avatarUrl: true, isPremium: true },
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        text: true,
                        createdAt: true,
                        recipe: { select: { title: true } },
                    },
                },
            },
        });
    }
    async getUserStatus(currentUserId, otherUserId) {
        const targetUserId = await this.assertExistingOtherUser(currentUserId, otherUserId);
        return this.getBlockStatus(currentUserId, targetUserId);
    }
    async blockUser(currentUserId, otherUserId) {
        const targetUserId = await this.assertExistingOtherUser(currentUserId, otherUserId);
        await this.prisma.blockedUser.upsert({
            where: {
                blockerUserId_blockedUserId: {
                    blockerUserId: currentUserId,
                    blockedUserId: targetUserId,
                },
            },
            update: {},
            create: {
                blockerUserId: currentUserId,
                blockedUserId: targetUserId,
            },
        });
        return this.getBlockStatus(currentUserId, targetUserId);
    }
    async unblockUser(currentUserId, otherUserId) {
        const targetUserId = await this.assertExistingOtherUser(currentUserId, otherUserId);
        await this.prisma.blockedUser.deleteMany({
            where: {
                blockerUserId: currentUserId,
                blockedUserId: targetUserId,
            },
        });
        return this.getBlockStatus(currentUserId, targetUserId);
    }
    async createOrGetConversation(currentUserId, otherUserId) {
        const targetUserId = await this.assertExistingOtherUser(currentUserId, otherUserId);
        const [firstUserId, secondUserId] = this.sortUserIds(currentUserId, targetUserId);
        const existing = await this.findConversationByPair(firstUserId, secondUserId);
        const blockStatus = await this.getBlockStatus(currentUserId, targetUserId);
        if (existing) {
            return this.mapConversationSummary({ ...existing, ...blockStatus }, currentUserId);
        }
        if (blockStatus.blockedByMe) {
            throw new common_1.BadRequestException('Unblock this user before starting a chat.');
        }
        if (blockStatus.blockedMe) {
            throw new common_1.BadRequestException('This user is not accepting your messages.');
        }
        try {
            const created = await this.prisma.directConversation.create({
                data: {
                    firstUserId,
                    secondUserId,
                },
                include: {
                    firstUser: {
                        select: { id: true, name: true, avatarUrl: true, isPremium: true },
                    },
                    secondUser: {
                        select: { id: true, name: true, avatarUrl: true, isPremium: true },
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: {
                            text: true,
                            createdAt: true,
                            recipe: { select: { title: true } },
                        },
                    },
                },
            });
            return this.mapConversationSummary({ ...created, ...blockStatus }, currentUserId);
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002') {
                const concurrent = await this.findConversationByPair(firstUserId, secondUserId);
                if (concurrent) {
                    return this.mapConversationSummary({ ...concurrent, ...blockStatus }, currentUserId);
                }
            }
            throw e;
        }
    }
    async listConversations(currentUserId) {
        const rows = await this.prisma.directConversation.findMany({
            where: {
                OR: [{ firstUserId: currentUserId }, { secondUserId: currentUserId }],
            },
            orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
            include: {
                firstUser: {
                    select: { id: true, name: true, avatarUrl: true, isPremium: true },
                },
                secondUser: {
                    select: { id: true, name: true, avatarUrl: true, isPremium: true },
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        text: true,
                        createdAt: true,
                        recipe: { select: { title: true } },
                    },
                },
            },
        });
        return Promise.all(rows.map(async (row) => {
            const otherUserId = row.firstUserId === currentUserId ? row.secondUserId : row.firstUserId;
            const blockStatus = await this.getBlockStatus(currentUserId, otherUserId);
            return this.mapConversationSummary({ ...row, ...blockStatus }, currentUserId);
        }));
    }
    async listMessages(conversationId, currentUserId) {
        const conversation = await this.prisma.directConversation.findFirst({
            where: {
                id: conversationId,
                OR: [{ firstUserId: currentUserId }, { secondUserId: currentUserId }],
            },
            include: {
                firstUser: {
                    select: { id: true, name: true, avatarUrl: true, isPremium: true },
                },
                secondUser: {
                    select: { id: true, name: true, avatarUrl: true, isPremium: true },
                },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                        id: true,
                        text: true,
                        createdAt: true,
                        senderId: true,
                        sender: {
                            select: {
                                id: true,
                                name: true,
                                avatarUrl: true,
                                isPremium: true,
                            },
                        },
                        recipe: {
                            select: {
                                id: true,
                                title: true,
                                imageUrl: true,
                                isPublished: true,
                                userId: true,
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found.');
        }
        const otherUserId = conversation.firstUserId === currentUserId
            ? conversation.secondUserId
            : conversation.firstUserId;
        const blockStatus = await this.getBlockStatus(currentUserId, otherUserId);
        return {
            conversation: this.mapConversationSummary({ ...conversation, ...blockStatus }, currentUserId),
            messages: conversation.messages,
        };
    }
    async sendMessage(conversationId, currentUserId, textRaw, recipeIdRaw) {
        const text = textRaw?.trim() || null;
        const recipeId = recipeIdRaw?.trim() || null;
        if (!text && !recipeId) {
            throw new common_1.BadRequestException('Message cannot be empty.');
        }
        const conversation = await this.prisma.directConversation.findFirst({
            where: {
                id: conversationId,
                OR: [{ firstUserId: currentUserId }, { secondUserId: currentUserId }],
            },
            select: {
                id: true,
                firstUserId: true,
                secondUserId: true,
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found.');
        }
        const otherUserId = conversation.firstUserId === currentUserId
            ? conversation.secondUserId
            : conversation.firstUserId;
        const blockStatus = await this.getBlockStatus(currentUserId, otherUserId);
        if (blockStatus.blockedByMe) {
            throw new common_1.BadRequestException('Unblock this user before sending messages.');
        }
        if (blockStatus.blockedMe) {
            throw new common_1.BadRequestException('This user is not accepting your messages.');
        }
        let sharedRecipeId = null;
        if (recipeId) {
            const recipe = await this.prisma.recipe.findFirst({
                where: {
                    id: recipeId,
                    isPublished: true,
                },
                select: { id: true },
            });
            if (!recipe) {
                throw new common_1.NotFoundException('Only published recipes can be shared.');
            }
            sharedRecipeId = recipe.id;
        }
        const [, message] = await this.prisma.$transaction([
            this.prisma.directConversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: new Date() },
            }),
            this.prisma.directMessage.create({
                data: {
                    conversationId,
                    senderId: currentUserId,
                    text,
                    recipeId: sharedRecipeId,
                },
                select: {
                    id: true,
                    text: true,
                    createdAt: true,
                    senderId: true,
                    sender: {
                        select: {
                            id: true,
                            name: true,
                            avatarUrl: true,
                            isPremium: true,
                        },
                    },
                    recipe: {
                        select: {
                            id: true,
                            title: true,
                            imageUrl: true,
                            isPublished: true,
                            userId: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            }),
        ]);
        return message;
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MessagesService);
//# sourceMappingURL=messages.service.js.map