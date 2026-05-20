import type { User } from '@prisma/client';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';
export declare class MessagesController {
    private readonly messagesService;
    constructor(messagesService: MessagesService);
    conversations(user: User | undefined): Promise<{
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
    createConversation(user: User | undefined, body: CreateConversationDto): Promise<{
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
    messages(user: User | undefined, id: string): Promise<{
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
    sendMessage(user: User | undefined, id: string, body: SendMessageDto): Promise<{
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
    userStatus(user: User | undefined, id: string): Promise<{
        blockedByMe: boolean;
        blockedMe: boolean;
    }>;
    blockUser(user: User | undefined, id: string): Promise<{
        blockedByMe: boolean;
        blockedMe: boolean;
    }>;
    unblockUser(user: User | undefined, id: string): Promise<{
        blockedByMe: boolean;
        blockedMe: boolean;
    }>;
}
