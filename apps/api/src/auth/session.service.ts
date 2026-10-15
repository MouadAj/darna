import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import type {Request, Response} from 'express';
import {createHash, randomBytes} from 'node:crypto';
import {PrismaService} from '../prisma/prisma.service.js';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async create(userId: string, response: Response): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const days = this.config.get<number>('SESSION_TTL_DAYS', 30);
    const expiresAt = new Date(Date.now() + days * 86_400_000);
    await this.prisma.session.create({data: {userId, tokenHash, expiresAt}});
    response.cookie(this.config.get('SESSION_COOKIE_NAME', 'housefamily_session'), token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV') === 'production',
      expires: expiresAt,
      path: '/',
    });
  }

  async destroy(request: Request, response: Response): Promise<void> {
    const cookieName = this.config.get('SESSION_COOKIE_NAME', 'housefamily_session');
    const token = request.cookies?.[cookieName] as string | undefined;
    if (token) await this.prisma.session.deleteMany({where: {tokenHash: createHash('sha256').update(token).digest('hex')}});
    response.clearCookie(this.config.get('SESSION_COOKIE_NAME', 'housefamily_session'), {path: '/'});
  }
}
