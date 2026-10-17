import {Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {CurrentUser, type AuthContext} from '../common/auth/auth-user.js';
import {PrismaService} from '../prisma/prisma.service.js';
import {NotificationsService} from './notifications.service.js';
import {InboxQuery, SubscribePushDto} from './dto.js';
@ApiTags('notifications') @Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}
  @Get() list(@CurrentUser() user: AuthContext) {
    if (!user.householdId) return [];
    return this.prisma.notification.findMany({where: {householdId: user.householdId, userId: user.id}, orderBy: {createdAt: 'desc'}, take: 30});
  }
  @Get('inbox') inbox(@CurrentUser() user: AuthContext, @Query() query: InboxQuery) {
    return this.notifications.inbox(user.householdId, user.id, query.cursor);
  }
  @Patch('read-all') readAll(@CurrentUser() user: AuthContext) { return this.notifications.readAll(user.householdId, user.id); }
  @Patch(':id/read') read(@CurrentUser() user: AuthContext, @Param('id', ParseUUIDPipe) id: string) { return this.notifications.read(user.householdId, user.id, id); }
  @Post('push-subscriptions') subscribe(@CurrentUser() user: AuthContext, @Body() dto: SubscribePushDto) {
    return this.prisma.pushSubscription.upsert({where: {endpoint: dto.endpoint}, update: {p256dh: dto.p256dh, auth: dto.auth, userId: user.id}, create: {...dto, userId: user.id}, select: {id: true, createdAt: true}});
  }
}
