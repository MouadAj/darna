import {Injectable, NotFoundException} from '@nestjs/common';
import type {Prisma} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}
  async inbox(householdId: string | null, userId: string, cursor?: string) {
    if (!householdId) return {items: [], unreadCount: 0, nextCursor: null};
    const scope = {householdId, userId};
    let where: Prisma.NotificationWhereInput = scope;
    if (cursor) {
      const boundary = await this.prisma.notification.findFirst({where: {...scope, id: cursor}, select: {id: true, createdAt: true}});
      if (!boundary) throw new NotFoundException('Notification not found');
      where = {...scope, OR: [{createdAt: {lt: boundary.createdAt}}, {createdAt: boundary.createdAt, id: {lt: boundary.id}}]};
    }
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({where, orderBy: [{createdAt: 'desc'}, {id: 'desc'}], take: 31}),
      this.prisma.notification.count({where: {...scope, status: 'UNREAD'}}),
    ]);
    const items = rows.slice(0, 30);
    return {items, unreadCount, nextCursor: rows.length > 30 ? items[items.length - 1].id : null};
  }
  async read(householdId: string | null, userId: string, id: string) {
    if (!householdId) throw new NotFoundException('Notification not found');
    const result = await this.prisma.notification.updateMany({where: {id, householdId, userId}, data: {status: 'READ'}});
    if (!result.count) throw new NotFoundException('Notification not found');
    return {id, status: 'READ' as const};
  }
  async readAll(householdId: string | null, userId: string) {
    if (!householdId) return {updatedCount: 0};
    const result = await this.prisma.notification.updateMany({where: {householdId, userId, status: 'UNREAD'}, data: {status: 'READ'}});
    return {updatedCount: result.count};
  }
}
