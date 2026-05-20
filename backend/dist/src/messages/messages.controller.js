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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_conversation_dto_1 = require("./dto/create-conversation.dto");
const send_message_dto_1 = require("./dto/send-message.dto");
const messages_service_1 = require("./messages.service");
let MessagesController = class MessagesController {
    messagesService;
    constructor(messagesService) {
        this.messagesService = messagesService;
    }
    conversations(user) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.messagesService.listConversations(user.id);
    }
    createConversation(user, body) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.messagesService.createOrGetConversation(user.id, body.otherUserId);
    }
    messages(user, id) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.messagesService.listMessages(id, user.id);
    }
    sendMessage(user, id, body) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.messagesService.sendMessage(id, user.id, body.text, body.recipeId);
    }
    userStatus(user, id) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.messagesService.getUserStatus(user.id, id);
    }
    blockUser(user, id) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.messagesService.blockUser(user.id, id);
    }
    unblockUser(user, id) {
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).');
        }
        return this.messagesService.unblockUser(user.id, id);
    }
};
exports.MessagesController = MessagesController;
__decorate([
    (0, common_1.Get)('conversations'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "conversations", null);
__decorate([
    (0, common_1.Post)('conversations'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_conversation_dto_1.CreateConversationDto]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "createConversation", null);
__decorate([
    (0, common_1.Get)('conversations/:id/messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "messages", null);
__decorate([
    (0, common_1.Post)('conversations/:id/messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, send_message_dto_1.SendMessageDto]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('users/:id/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "userStatus", null);
__decorate([
    (0, common_1.Post)('users/:id/block'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "blockUser", null);
__decorate([
    (0, common_1.Delete)('users/:id/block'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "unblockUser", null);
exports.MessagesController = MessagesController = __decorate([
    (0, common_1.Controller)('messages'),
    __metadata("design:paramtypes", [messages_service_1.MessagesService])
], MessagesController);
//# sourceMappingURL=messages.controller.js.map