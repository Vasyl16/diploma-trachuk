import { NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { UsersService } from '../users/users.service';
export declare class AuthMiddleware implements NestMiddleware {
    private readonly config;
    private readonly usersService;
    constructor(config: ConfigService, usersService: UsersService);
    use(req: Request, res: Response, next: NextFunction): Promise<void>;
}
