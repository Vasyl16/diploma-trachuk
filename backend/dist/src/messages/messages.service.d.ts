import { PrismaService } from '../prisma/prisma.service';
export declare class MessagesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private sortUserIds;
    private messagePreview;
    private mapConversationSummary;
    private getBlockStatus;
    private assertExistingOtherUser;
    private findConversationByPair;
    getUserStatus(currentUserId: string, otherUserId: string): Promise<{
        blockedByMe: boolean;
        blockedMe: boolean;
    }>;
    blockUser(currentUserId: string, otherUserId: string): Promise<{
        blockedByMe: boolean;
        blockedMe: boolean;
    }>;
    unblockUser(currentUserId: string, otherUserId: string): Promise<{
        blockedByMe: boolean;
        blockedMe: boolean;
    }>;
    createOrGetConversation(currentUserId: string, otherUserId: string): Promise<{
        id: string;
        participant: {
            id: string;
            name: string;
            avatarUrl: string | null;
            isPremium: boolean;
        };
        lastMessageText: string | null;
        lastMessageAt: Date;
        updatedAt: Date;
        blockedByMe: boolean;
        blockedMe: boolean;
    }>;
    listConversations(currentUserId: string): Promise<{
        id: string;
        participant: {
            id: string;
            name: string;
            avatarUrl: string | null;
            isPremium: boolean;
        };
        lastMessageText: string | null;
        lastMessageAt: Date;
        updatedAt: Date;
        blockedByMe: boolean;
        blockedMe: boolean;
    }[]>;
    listMessages(conversationId: string, currentUserId: string): Promise<{
        conversation: {
            id: string;
            participant: {
                id: string;
                name: string;
                avatarUrl: string | null;
                isPremium: boolean;
            };
            lastMessageText: string | null;
            lastMessageAt: Date;
            updatedAt: Date;
            blockedByMe: boolean;
            blockedMe: boolean;
        };
        messages: {
            recipe: {
                id: string;
                title: string;
                imageUrl: string | null;
                isPublished: boolean;
                userId: string;
                user: {
                    id: string;
                    name: string;
                };
            } | null;
            id: string;
            createdAt: Date;
            text: string | null;
            senderId: string;
            sender: {
                id: string;
                name: string;
                avatarUrl: string | null;
                isPremium: boolean;
            };
        }[];
    }>;
    sendMessage(conversationId: string, currentUserId: string, textRaw: string | undefined, recipeIdRaw?: string): Promise<{
        recipe: {
            id: string;
            title: string;
            imageUrl: string | null;
            isPublished: boolean;
            userId: string;
            user: {
                id: string;
                name: string;
            };
        } | null;
        id: string;
        createdAt: Date;
        text: string | null;
        senderId: string;
        sender: {
            id: string;
            name: string;
            avatarUrl: string | null;
            isPremium: boolean;
        };
    }>;
}
