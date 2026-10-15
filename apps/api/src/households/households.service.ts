import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service.js';
import {DEFAULT_CATALOG} from './catalog.js';

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name: string) {
    const existing = await this.prisma.householdMember.findUnique({where: {userId}});
    if (existing) throw new BadRequestException('You already belong to a family home');
    return this.prisma.$transaction(async (tx) => {
      const household = await tx.household.create({data: {name: name.trim(), ownerId: userId}});
      await tx.householdMember.create({data: {householdId: household.id, userId, role: 'OWNER'}});
      for (const [sortOrder, category] of DEFAULT_CATALOG.entries()) {
        const created = await tx.category.create({data: {householdId: household.id, key: category.key, name: category.name, sortOrder}});
        await tx.item.createMany({data: category.items.map(([itemName, visualKey], index) => ({
          householdId: household.id, createdById: userId, updatedById: userId, categoryId: created.id,
          name: itemName, visualKey, usual: index < 3, status: 'AVAILABLE' as const,
        }))});
      }
      await tx.activity.create({data: {householdId: household.id, actorId: userId, type: 'HOUSEHOLD_CREATED', subjectName: household.name}});
      return household;
    });
  }

  async family(householdId: string) {
    return this.prisma.household.findUniqueOrThrow({
      where: {id: householdId},
      select: {
        id: true, name: true,
        members: {orderBy: [{role: 'asc'}, {joinedAt: 'asc'}], select: {id: true, role: true, joinedAt: true, user: {select: {id: true, name: true, email: true}}}},
        invitations: {where: {status: 'PENDING'}, orderBy: {createdAt: 'desc'}, select: {id: true, invitedName: true, invitedEmail: true, expiresAt: true, status: true}},
      },
    });
  }

  async removeMember(householdId: string, ownerId: string, membershipId: string) {
    const membership = await this.prisma.householdMember.findFirst({where: {id: membershipId, householdId}});
    if (!membership) throw new NotFoundException('Family member not found');
    if (membership.userId === ownerId || membership.role === 'OWNER') throw new ForbiddenException('The household owner cannot be removed');
    await this.prisma.householdMember.delete({where: {id: membership.id}});
    await this.prisma.session.deleteMany({where: {userId: membership.userId}});
    return {message: 'Family member access removed'};
  }
}
