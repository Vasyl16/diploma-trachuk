import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { User } from '@prisma/client';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StorageService } from '../storage/storage.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storage: StorageService,
  ) {}

  /** Current user profile (DB avatar for feed/profile UI). */
  @Get('me')
  me(@CurrentUser() user: User | undefined) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    return this.usersService.findById(user.id);
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async uploadAvatar(
    @CurrentUser() user: User | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Send a valid Clerk session token (Authorization: Bearer or __session cookie).',
      );
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Missing image file (field name: file)');
    }
    try {
      if (user.avatarUrl) {
        await this.storage.deleteFile(user.avatarUrl);
      }
      const avatarUrl = await this.storage.uploadAvatar(
        file.buffer,
        file.mimetype,
        user.id,
      );
      return this.usersService.updateAvatar(user.id, avatarUrl);
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : 'Upload failed';
      throw new BadRequestException(msg);
    }
  }

  /** Search people by name (no email in response). Static path before `GET :id`. */
  @Get('search')
  searchPeople(@Query('q') q?: string) {
    return this.usersService.searchByName(q ?? '');
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  /** Public author info (name, avatar) — must be before `GET :id`. */
  @Get('public/:id')
  publicProfile(@Param('id') id: string) {
    return this.usersService.findPublicById(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }
}
