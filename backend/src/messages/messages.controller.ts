import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '@prisma/client';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  conversations(@CurrentUser() user: User | undefined) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.messagesService.listConversations(user.id);
  }

  @Post('conversations')
  createConversation(
    @CurrentUser() user: User | undefined,
    @Body() body: CreateConversationDto,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.messagesService.createOrGetConversation(user.id, body.otherUserId);
  }

  @Get('conversations/:id/messages')
  messages(
    @CurrentUser() user: User | undefined,
    @Param('id') id: string,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.messagesService.listMessages(id, user.id);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @CurrentUser() user: User | undefined,
    @Param('id') id: string,
    @Body() body: SendMessageDto,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.messagesService.sendMessage(id, user.id, body.text, body.recipeId);
  }

  @Get('users/:id/status')
  userStatus(
    @CurrentUser() user: User | undefined,
    @Param('id') id: string,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.messagesService.getUserStatus(user.id, id);
  }

  @Post('users/:id/block')
  blockUser(
    @CurrentUser() user: User | undefined,
    @Param('id') id: string,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.messagesService.blockUser(user.id, id);
  }

  @Delete('users/:id/block')
  unblockUser(
    @CurrentUser() user: User | undefined,
    @Param('id') id: string,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.messagesService.unblockUser(user.id, id);
  }
}
