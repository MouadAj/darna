import {BadRequestException, Injectable, NotFoundException, UnauthorizedException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {argon2id, hash, verify} from 'argon2';
import {createHash, randomBytes} from 'node:crypto';
import {PrismaService} from '../prisma/prisma.service.js';
import type {Locale} from '@housefamily/shared';
import {toAppLocale, toLocale} from '../common/locale.js';

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async create(householdId: string, rawName: string, rawEmail: string, locale: string) {
    const email = rawEmail.trim().toLowerCase();
    const member = await this.prisma.householdMember.findFirst({where: {householdId, user: {email}}});
    if (member) throw new BadRequestException('This person is already part of your family home');
    await this.prisma.invitation.updateMany({where: {householdId, invitedEmail: email, status: 'PENDING'}, data: {status: 'REVOKED'}});
    const {token, tokenHash, expiresAt} = this.newToken();
    const invitation = await this.prisma.invitation.create({data: {householdId, invitedName: rawName.trim(), invitedEmail: email, tokenHash, expiresAt}, include: {household: true}});
    const url = this.url(token, locale);
    return {id: invitation.id, invitedName: invitation.invitedName, invitedEmail: email, expiresAt, invitationUrl: url};
  }

  async preview(token: string) {
    const invitation = await this.findActive(token);
    return {invitedName: invitation.invitedName, householdName: invitation.household.name, expiresAt: invitation.expiresAt};
  }

  async accept(token: string, password: string, locale: Locale) {
    const invitation = await this.findActive(token);
    return this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({where: {email: invitation.invitedEmail}});
      if (user?.passwordHash && !(await verify(user.passwordHash, password))) {
        throw new UnauthorizedException('The password for this email is incorrect');
      }
      if (!user) user = await tx.user.create({data: {
        name: invitation.invitedName, email: invitation.invitedEmail,
        passwordHash: await hash(password, {type: argon2id}), preferredLocale: toAppLocale(locale),
      }});
      else user = await tx.user.update({where: {id: user.id}, data: {
        preferredLocale: toAppLocale(locale),
        ...(!user.passwordHash ? {passwordHash: await hash(password, {type: argon2id})} : {}),
      }});
      const membership = await tx.householdMember.findUnique({where: {userId: user.id}});
      if (membership && membership.householdId !== invitation.householdId) throw new BadRequestException('This account already belongs to another family home');
      if (!membership) await tx.householdMember.create({data: {householdId: invitation.householdId, userId: user.id, role: 'MEMBER'}});
      const consumed = await tx.invitation.updateMany({where: {id: invitation.id, status: 'PENDING', expiresAt: {gt: new Date()}}, data: {status: 'ACCEPTED', acceptedAt: new Date(), acceptedById: user.id}});
      if (!consumed.count) throw new BadRequestException('This invitation is no longer available');
      await tx.activity.create({data: {householdId: invitation.householdId, actorId: user.id, type: 'MEMBER_JOINED', subjectName: user.name}});
      return {userId: user.id, preferredLocale: toLocale(user.preferredLocale)};
    });
  }

  async refreshLink(householdId: string, invitationId: string, locale: string) {
    const invitation = await this.prisma.invitation.findFirst({where: {id: invitationId, householdId, status: 'PENDING'}, include: {household: true}});
    if (!invitation) throw new NotFoundException('Pending invitation not found');
    const {token, tokenHash, expiresAt} = this.newToken();
    await this.prisma.invitation.update({where: {id: invitation.id}, data: {tokenHash, expiresAt}});
    const url = this.url(token, locale);
    return {message: 'New invitation link created', expiresAt, invitationUrl: url};
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
}
