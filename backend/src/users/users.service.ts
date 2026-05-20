import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  findAll() {
    return this.prisma.user.findMany();
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  /** Public profile card (no email) for author pages. */
  async findPublicById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, avatarUrl: true, isPremium: true },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  /** Search users by name (case-insensitive contains). Min 1 character after trim. */
  async searchByName(q: string) {
    const term = q.trim();
    if (term.length < 1) {
      return {
        items: [] as {
          id: string;
          name: string;
          avatarUrl: string | null;
          isPremium: boolean;
        }[],
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

  async create(data: CreateUserDto) {
    const byClerk = await this.prisma.user.findUnique({
      where: { clerkId: data.clerkId },
    });
    if (byClerk) {
      throw new ConflictException(
        'Cannot create user: a user with this Clerk id already exists.',
      );
    }
    const byEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (byEmail) {
      throw new ConflictException(
        'Cannot create user: a user with this email already exists.',
      );
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

  /**
   * Upsert user from Clerk: create if missing, otherwise refresh profile fields.
   */
  async syncFromClerk(params: {
    clerkId: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { clerkId: params.clerkId },
    });
    if (existing) {
      const emailOwner = await this.prisma.user.findUnique({
        where: { email: params.email },
      });
      if (emailOwner && emailOwner.id !== existing.id) {
        throw new ConflictException(
          'Cannot sync user: this email is already used by another account.',
        );
      }
      // Do not overwrite avatarUrl on sync — Clerk runs on every request and via
      // webhooks; custom uploads (POST /users/avatar) must persist.
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
      throw new ConflictException(
        'Cannot sync user: a user with this email already exists.',
      );
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

  async updateAvatar(userId: string, avatarUrl: string) {
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

  async removeByClerkId(clerkId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      include: { recipes: { select: { imageUrl: true } } },
    });
    if (!user) return;
    const urls = [
      user.avatarUrl,
      ...user.recipes.map((r) => r.imageUrl),
    ].filter((u): u is string => Boolean(u));
    await this.storage.deleteFiles(urls);
    await this.prisma.$transaction([
      this.prisma.recipe.deleteMany({ where: { userId: user.id } }),
      this.prisma.user.delete({ where: { id: user.id } }),
    ]);
  }
}
