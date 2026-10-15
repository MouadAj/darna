import {ConflictException, ForbiddenException, Injectable, UnauthorizedException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {argon2id, hash, verify} from 'argon2';
import {createHash, randomBytes} from 'node:crypto';
import {EmailService} from './email.service.js';
import {PrismaService} from '../prisma/prisma.service.js';
import {toAppLocale, toLocale} from '../common/locale.js';

type Locale = 'en' | 'fr' | 'ar';

const verificationCopy: Record<Locale, {subject: string; text: string; action: string}> = {
  en: {subject: 'Confirm your HouseFamily email', text: 'Confirm your email to finish creating your private family account.', action: 'Confirm my email'},
  fr: {subject: 'Confirmez votre e-mail HouseFamily', text: 'Confirmez votre e-mail pour terminer la création de votre compte familial privé.', action: 'Confirmer mon e-mail'},
  ar: {subject: 'أكد بريدك الإلكتروني في HouseFamily', text: 'أكد بريدك الإلكتروني لإكمال إنشاء حساب عائلتك الخاص.', action: 'تأكيد بريدي الإلكتروني'},
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly email: EmailService) {}

  async register(name: string, rawEmail: string, password: string, locale: Locale = 'en') {
    const email = this.normalizeEmail(rawEmail);
    const existing = await this.prisma.user.findUnique({where: {email}});
    if (existing?.emailVerifiedAt) throw new ConflictException('An account already exists for this email');

    const passwordHash = await hash(password, {type: argon2id});
    const user = existing
      ? await this.prisma.user.update({where: {id: existing.id}, data: {name: name.trim(), passwordHash, preferredLocale: toAppLocale(locale)}})
      : await this.prisma.user.create({data: {name: name.trim(), email, passwordHash, preferredLocale: toAppLocale(locale)}});
    return this.sendVerification(user.id, user.name, user.email, locale);
  }

  async resendVerification(rawEmail: string, locale: Locale = 'en') {
    const user = await this.prisma.user.findUnique({where: {email: this.normalizeEmail(rawEmail)}});
    if (!user || user.emailVerifiedAt) return {message: 'If this account needs confirmation, a new email is on its way'};
    return this.sendVerification(user.id, user.name, user.email, locale);
  }

  async verifyEmail(token: string) {
    const authToken = await this.prisma.authToken.findUnique({where: {tokenHash: this.hashToken(token)}});
    if (!authToken || authToken.type !== 'EMAIL_VERIFICATION' || authToken.usedAt || authToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('This confirmation link is invalid or has expired');
    }

    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.authToken.updateMany({where: {id: authToken.id, usedAt: null}, data: {usedAt: new Date()}});
      if (!consumed.count) throw new UnauthorizedException('This confirmation link has already been used');
      await tx.user.update({where: {id: authToken.userId}, data: {emailVerifiedAt: new Date()}});
    });
    const user = await this.prisma.user.findUniqueOrThrow({where: {id: authToken.userId}, select: {preferredLocale: true}});
    return {userId: authToken.userId, preferredLocale: toLocale(user.preferredLocale)};
  }

  async login(rawEmail: string, password: string) {
    const user = await this.prisma.user.findUnique({where: {email: this.normalizeEmail(rawEmail)}});
    if (!user?.passwordHash || !(await verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    if (!user.emailVerifiedAt) throw new UnauthorizedException('Confirm your email before signing in');
    return {userId: user.id, preferredLocale: toLocale(user.preferredLocale)};
  }

  async devLogin(rawEmail: string) {
    if (!this.isDev()) throw new ForbiddenException('Development sign-in is disabled');
    const user = await this.prisma.user.findUnique({where: {email: this.normalizeEmail(rawEmail)}});
    if (!user) throw new UnauthorizedException('No development user has that email');
    return {userId: user.id, preferredLocale: toLocale(user.preferredLocale)};
  }

  private async sendVerification(userId: string, name: string, email: string, locale: Locale) {
    await this.prisma.authToken.updateMany({where: {userId, type: 'EMAIL_VERIFICATION', usedAt: null}, data: {usedAt: new Date()}});
    const token = randomBytes(32).toString('base64url');
    const minutes = this.config.get<number>('EMAIL_VERIFICATION_TTL_MINUTES', 30);
    await this.prisma.authToken.create({data: {
      userId,
      type: 'EMAIL_VERIFICATION',
      tokenHash: this.hashToken(token),
      expiresAt: new Date(Date.now() + minutes * 60_000),
    }});
    const url = `${this.webOrigin()}/${locale}/auth/verify-email?token=${encodeURIComponent(token)}`;
    const copy = verificationCopy[locale];
    await this.email.send({to: email, toName: name, subject: copy.subject, text: copy.text, actionUrl: url, actionLabel: copy.action});
    return {message: 'Check your email to confirm your account', ...(this.email.developmentPreviewEnabled() ? {developmentUrl: url} : {})};
  }

  private normalizeEmail(email: string) { return email.trim().toLowerCase(); }
  private hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
  private webOrigin() { return this.config.get('WEB_ORIGIN', 'http://localhost:3000').split(',')[0]; }
  private isDev() { return this.config.get('NODE_ENV') !== 'production' && this.config.get('DEV_AUTH_ENABLED', 'false') === 'true'; }
}
