import {Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Post, Res} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import type {Response} from 'express';
import {SessionService} from '../auth/session.service.js';
import {CurrentUser, type AuthContext} from '../common/auth/auth-user.js';
import {Public} from '../common/auth/public.decorator.js';
import {AcceptInvitationDto, CreateInvitationDto} from './dto.js';
import {InvitationsService} from './invitations.service.js';

@ApiTags('invitations') @Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService, private readonly sessions: SessionService) {}
  @Post() create(@CurrentUser() user: AuthContext, @Body() dto: CreateInvitationDto) {
    if (!user.householdId || user.role !== 'OWNER') throw new ForbiddenException('Only the household owner can invite family');
    return this.invitations.create(user.householdId, user.name, dto.name, dto.email, dto.locale ?? 'en');
  }
  @Public() @Get('preview/:token') preview(@Param('token') token: string) { return this.invitations.preview(token); }
  @Public() @Post('accept') @HttpCode(200)
  async accept(@Body() dto: AcceptInvitationDto, @Res({passthrough: true}) response: Response) {
    const result = await this.invitations.accept(dto.token, dto.password, dto.locale);
    await this.sessions.create(result.userId, response);
    return {message: 'Welcome to your family home', preferredLocale: result.preferredLocale};
  }
  @Post(':id/resend') resend(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    if (!user.householdId || user.role !== 'OWNER') throw new ForbiddenException('Only the household owner can manage invitations');
    return this.invitations.resend(user.householdId, id, user.name);
  }
  @Delete(':id') revoke(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    if (!user.householdId || user.role !== 'OWNER') throw new ForbiddenException('Only the household owner can manage invitations');
    return this.invitations.revoke(user.householdId, id);
  }
}
