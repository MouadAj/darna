import {ConflictException, ForbiddenException, Injectable, UnauthorizedException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {argon2id, hash, verify} from 'argon2';
import {PrismaService} from '../prisma/prisma.service.js';
import {toAppLocale, toLocale} from '../common/locale.js';

type Locale = 'en' | 'fr' | 'ar';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async register(name: string, rawEmail: string, password: string, locale: Locale = 'en') {
    const email = this.normalizeEmail(rawEmail);
    const existing = await this.prisma.user.findUnique({where: {email}});
    if (existing) throw new ConflictException('An account already exists for this email. Please log in.');

    const passwordHash = await hash(password, {type: argon2id});
    try {
      const user = await this.prisma.user.create({data: {
        name: name.trim(), email, passwordHash, preferredLocale: toAppLocale(locale),
      }});
      return {userId: user.id, preferredLocale: toLocale(user.preferredLocale)};
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('An account already exists for this email. Please log in.');
      }
      throw error;
    }
  }

  async login(rawEmail: string, password: string) {
    const user = await this.prisma.user.findUnique({where: {email: this.normalizeEmail(rawEmail)}});
    if (!user?.passwordHash || !(await verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    return {userId: user.id, preferredLocale: toLocale(user.preferredLocale)};
  }

  async devLogin(rawEmail: string) {
    if (!this.isDev()) throw new ForbiddenException('Development sign-in is disabled');
    const user = await this.prisma.user.findUnique({where: {email: this.normalizeEmail(rawEmail)}});
    if (!user) throw new UnauthorizedException('No development user has that email');
    return {userId: user.id, preferredLocale: toLocale(user.preferredLocale)};
  }

  private normalizeEmail(email: string) { return email.trim().toLowerCase(); }
  private isDev() { return this.config.get('NODE_ENV') !== 'production' && this.config.get('DEV_AUTH_ENABLED', 'false') === 'true'; }
}
