import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {notifyHousehold} from '../notifications/household-notifications.js';
import type {Prisma} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service.js';
import type {CreateItemDto, ListItemsQuery, UpdateItemDto} from './dto.js';

const itemSelect = {
  id: true, name: true, visualKey: true, quantity: true, notes: true, status: true, priority: true, usual: true, updatedAt: true,
  category: {select: {id: true, name: true, key: true}},
  updatedBy: {select: {id: true, name: true}},
} satisfies Prisma.ItemSelect;

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  list(householdId: string, query: ListItemsQuery) {
    const where: Prisma.ItemWhereInput = {householdId};
    if (query.status) where.status = query.status;
    if (query.usual !== undefined) where.usual = query.usual;
    if (query.category) where.category = {key: query.category};
    if (query.search) where.name = {contains: query.search.trim(), mode: 'insensitive'};
    return this.prisma.item.findMany({where, select: itemSelect, orderBy: [{priority: 'desc'}, {name: 'asc'}]});
  }

  categories(householdId: string) {
    return this.prisma.category.findMany({where: {householdId}, select: {id: true, key: true, name: true}, orderBy: {sortOrder: 'asc'}});
  }

  async create(householdId: string, userId: string, dto: CreateItemDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.categoryId) {
        const category = await tx.category.findFirst({where: {id: dto.categoryId, householdId}});
        if (!category) throw new BadRequestException('Choose a category from your family home');
      }
      const item = await tx.item.create({
        data: {householdId, createdById: userId, updatedById: userId, name: dto.name.trim(), visualKey: dto.visualKey, quantity: dto.quantity, notes: dto.notes, categoryId: dto.categoryId, priority: dto.priority ?? 'NORMAL', usual: dto.usual ?? false, status: 'NEEDED'},
        select: itemSelect,
      });
      await tx.activity.create({data: {householdId, actorId: userId, type: 'ITEM_NEEDED', subjectName: item.name}});
      await notifyHousehold(tx, householdId, userId, item.priority === 'URGENT' ? 'ITEM_URGENT' : 'ITEM_NEEDED', item.name);
      return item;
    });
  }

  async update(householdId: string, userId: string, itemId: string, dto: UpdateItemDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Item" WHERE id = ${itemId}::uuid AND "householdId" = ${householdId}::uuid FOR UPDATE`;
      const existing = await tx.item.findFirst({where: {id: itemId, householdId}});
      if (!existing) throw new NotFoundException('Household item not found');
      const item = await tx.item.update({where: {id: existing.id}, data: {...dto, updatedById: userId}, select: itemSelect});
      if (dto.status && dto.status !== existing.status) {
        const type = dto.status === 'AVAILABLE' ? 'ITEM_AVAILABLE' : dto.status === 'LOW' ? 'ITEM_LOW' : 'ITEM_NEEDED';
        await tx.activity.create({data: {householdId, actorId: userId, type, subjectName: item.name}});
      }
      const becameNeeded = existing.status !== 'NEEDED' && item.status === 'NEEDED';
      const becameUrgent = existing.priority !== 'URGENT' && item.priority === 'URGENT' && item.status !== 'AVAILABLE';
      if (becameNeeded || becameUrgent) await notifyHousehold(tx, householdId, userId, item.priority === 'URGENT' ? 'ITEM_URGENT' : 'ITEM_NEEDED', item.name);
      return item;
    });
  }
}
