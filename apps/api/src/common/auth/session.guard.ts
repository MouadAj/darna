import {CanActivate, ExecutionContext, Injectable, UnauthorizedException} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {ConfigService} from '@nestjs/config';
import type {Request} from 'express';
import {createHash} from 'node:crypto';
import {PrismaService} from '../../prisma/prisma.service.js';
import {IS_PUBLIC_KEY} from './public.decorator.js';
import type {AuthenticatedRequest} from './auth-user.js';
import {toLocale} from '../locale.js';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const cookieName = this.config.get('SESSION_COOKIE_NAME', 'housefamily_session');
    const token = request.cookies?.[cookieName] as string | undefined;
    if (!token) throw new UnauthorizedException('Please sign in to continue');

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await this.prisma.session.findUnique({
      where: {tokenHash},
      include: {user: {include: {memberships: {include: {household: true}}}}},
    });
    if (!session || session.expiresAt <= new Date()) throw new UnauthorizedException('Your session has expired');
    if (!session.user.emailVerifiedAt) throw new UnauthorizedException('Confirm your email before continuing');
    const membership = session.user.memberships[0] ?? null;
    (request as AuthenticatedRequest).auth = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      preferredLocale: toLocale(session.user.preferredLocale),
      householdId: membership?.householdId ?? null,
      householdName: membership?.household.name ?? null,
      role: membership?.role ?? null,
    };
    return true;
  }
}
