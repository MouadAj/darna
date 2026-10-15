import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import type {Prisma} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';
import type {CreateItemDto, ListItemsQuery, UpdateItemDto} from './dto';

const itemSelect = {
  id: true, name: true, visualKey: true, status: true, priority: true, usual: true, updatedAt: true,
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
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({where: {id: dto.categoryId, householdId}});
      if (!category) throw new BadRequestException('Choose a category from your family home');
    }
    const item = await this.prisma.item.create({
      data: {householdId, createdById: userId, updatedById: userId, name: dto.name.trim(), visualKey: dto.visualKey, categoryId: dto.categoryId, priority: dto.priority ?? 'NORMAL', usual: dto.usual ?? false, status: 'NEEDED'},
      select: itemSelect,
    });
    await this.prisma.activity.create({data: {householdId, actorId: userId, type: 'ITEM_NEEDED', subjectName: item.name}});
    return item;
  }

  async update(householdId: string, userId: string, itemId: string, dto: UpdateItemDto) {
    const existing = await this.prisma.item.findFirst({where: {id: itemId, householdId}});
    if (!existing) throw new NotFoundException('Household item not found');
    const item = await this.prisma.item.update({where: {id: existing.id}, data: {...dto, updatedById: userId}, select: itemSelect});
    if (dto.status && dto.status !== existing.status) {
      const type = dto.status === 'AVAILABLE' ? 'ITEM_AVAILABLE' : dto.status === 'LOW' ? 'ITEM_LOW' : 'ITEM_NEEDED';
      await this.prisma.activity.create({data: {householdId, actorId: userId, type, subjectName: item.name}});
    }
    return item;
  }
}
