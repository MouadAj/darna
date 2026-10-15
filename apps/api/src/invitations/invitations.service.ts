import {BadRequestException, Injectable, NotFoundException, UnauthorizedException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {argon2id, hash, verify} from 'argon2';
import {createHash, randomBytes} from 'node:crypto';
import {EmailService} from '../auth/email.service';
import {PrismaService} from '../prisma/prisma.service';
import type {Locale} from '@housefamily/shared';
import {toAppLocale, toLocale} from '../common/locale';

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly email: EmailService) {}

  async create(householdId: string, inviterName: string, rawName: string, rawEmail: string, locale: string) {
    const email = rawEmail.trim().toLowerCase();
    const member = await this.prisma.householdMember.findFirst({where: {householdId, user: {email}}});
    if (member) throw new BadRequestException('This person is already part of your family home');
    await this.prisma.invitation.updateMany({where: {householdId, invitedEmail: email, status: 'PENDING'}, data: {status: 'REVOKED'}});
    const {token, tokenHash, expiresAt} = this.newToken();
    const invitation = await this.prisma.invitation.create({data: {householdId, invitedName: rawName.trim(), invitedEmail: email, tokenHash, expiresAt}, include: {household: true}});
    const url = this.url(token, locale);
    await this.email.send({to: email, toName: invitation.invitedName, subject: `${inviterName} invited you to ${invitation.household.name}`, text: `Hello ${invitation.invitedName}, your family home is waiting for you.`, actionUrl: url, actionLabel: 'Open my invitation'});
    return {id: invitation.id, invitedName: invitation.invitedName, invitedEmail: email, expiresAt, ...(this.isDev() ? {developmentUrl: url} : {})};
  }

  async preview(token: string) {
    const invitation = await this.findActive(token);
    return {invitedName: invitation.invitedName, householdName: invitation.household.name, expiresAt: invitation.expiresAt};
  }

  async accept(token: string, password: string, locale: Locale) {
    const invitation = await this.findActive(token);
    const existingUser = await this.prisma.user.findUnique({where: {email: invitation.invitedEmail}});
    if (existingUser?.passwordHash && existingUser.emailVerifiedAt && !(await verify(existingUser.passwordHash, password))) {
      throw new UnauthorizedException('The password for this email is incorrect');
    }
    const passwordHash = existingUser?.passwordHash && existingUser.emailVerifiedAt ? existingUser.passwordHash : await hash(password, {type: argon2id});
    return this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({where: {email: invitation.invitedEmail}});
      if (!user) user = await tx.user.create({data: {name: invitation.invitedName, email: invitation.invitedEmail, passwordHash, emailVerifiedAt: new Date(), preferredLocale: toAppLocale(locale)}});
      else user = await tx.user.update({where: {id: user.id}, data: {
        preferredLocale: toAppLocale(locale),
        ...(!user.emailVerifiedAt || !user.passwordHash ? {passwordHash, emailVerifiedAt: new Date()} : {}),
      }});
      const membership = await tx.householdMember.findUnique({where: {userId: user.id}});
      if (membership && membership.householdId !== invitation.householdId) throw new BadRequestException('This account already belongs to another family home');
      if (!membership) await tx.householdMember.create({data: {householdId: invitation.householdId, userId: user.id, role: 'MEMBER'}});
      await tx.invitation.update({where: {id: invitation.id}, data: {status: 'ACCEPTED', acceptedAt: new Date(), acceptedById: user.id}});
      await tx.activity.create({data: {householdId: invitation.householdId, actorId: user.id, type: 'MEMBER_JOINED', subjectName: user.name}});
      return {userId: user.id, preferredLocale: toLocale(user.preferredLocale)};
    });
  }

  async resend(householdId: string, invitationId: string, inviterName: string) {
    const invitation = await this.prisma.invitation.findFirst({where: {id: invitationId, householdId, status: 'PENDING'}, include: {household: true}});
    if (!invitation) throw new NotFoundException('Pending invitation not found');
    const {token, tokenHash, expiresAt} = this.newToken();
    await this.prisma.invitation.update({where: {id: invitation.id}, data: {tokenHash, expiresAt}});
    const url = this.url(token, 'en');
    await this.email.send({to: invitation.invitedEmail, toName: invitation.invitedName, subject: `${inviterName} invited you to ${invitation.household.name}`, text: `Hello ${invitation.invitedName}, here is your new invitation link.`, actionUrl: url, actionLabel: 'Open my invitation'});
    return {message: 'Invitation sent again', expiresAt, ...(this.isDev() ? {developmentUrl: url} : {})};
  }

  async revoke(householdId: string, invitationId: string) {
    const result = await this.prisma.invitation.updateMany({where: {id: invitationId, householdId, status: 'PENDING'}, data: {status: 'REVOKED'}});
    if (!result.count) throw new NotFoundException('Pending invitation not found');
    return {message: 'Invitation cancelled'};
  }

  private async findActive(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const invitation = await this.prisma.invitation.findUnique({where: {tokenHash}, include: {household: true}});
    if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt <= new Date()) throw new NotFoundException('This invitation is invalid or has expired');
    return invitation;
  }
  private newToken() {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const days = this.config.get<number>('INVITATION_TTL_DAYS', 7);
    return {token, tokenHash, expiresAt: new Date(Date.now() + days * 86_400_000)};
  }
  private url(token: string, locale: string) { return `${this.config.get('WEB_ORIGIN', 'http://localhost:3000').split(',')[0]}/${locale}/invite/${encodeURIComponent(token)}`; }
  private isDev() { return this.config.get('DEV_AUTH_ENABLED', 'false') === 'true'; }
}
