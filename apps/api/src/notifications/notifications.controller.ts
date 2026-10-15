import {Body, Controller, Get, Post} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {CurrentUser, type AuthContext} from '../common/auth/auth-user.js';
import {PrismaService} from '../prisma/prisma.service.js';
import {SubscribePushDto} from './dto.js';
@ApiTags('notifications') @Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list(@CurrentUser() user: AuthContext) {
    if (!user.householdId) return [];
    return this.prisma.notification.findMany({where: {householdId: user.householdId, userId: user.id}, orderBy: {createdAt: 'desc'}, take: 30});
  }
  @Post('push-subscriptions') subscribe(@CurrentUser() user: AuthContext, @Body() dto: SubscribePushDto) {
    return this.prisma.pushSubscription.upsert({where: {endpoint: dto.endpoint}, update: {p256dh: dto.p256dh, auth: dto.auth, userId: user.id}, create: {...dto, userId: user.id}, select: {id: true, createdAt: true}});
  }
}
