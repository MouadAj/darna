import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {notifyHousehold} from '../notifications/household-notifications.js';
import {PrismaService} from '../prisma/prisma.service.js';

const tripInclude = {
  shopper: {select: {id: true, name: true}},
  items: {orderBy: {item: {name: 'asc'}}, include: {item: {select: {id: true, name: true, visualKey: true, quantity: true, notes: true, priority: true, status: true}}}},
} as const;

@Injectable()
export class ShoppingService {
  constructor(private readonly prisma: PrismaService) {}

  active(householdId: string) {
    return this.prisma.shoppingTrip.findFirst({where: {householdId, status: 'ACTIVE'}, include: tripInclude});
  }

  async start(householdId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Household" WHERE id = ${householdId}::uuid FOR UPDATE`;
      const active = await tx.shoppingTrip.findFirst({where: {householdId, status: 'ACTIVE'}, include: tripInclude});
      if (active) return active;
      const needed = await tx.item.findMany({where: {householdId, status: {in: ['LOW', 'NEEDED']}}, select: {id: true}});
      if (!needed.length) throw new BadRequestException('Everything looks good — there is nothing to shop for yet');
      const trip = await tx.shoppingTrip.create({data: {householdId, shopperId: userId, items: {create: needed.map(({id}) => ({itemId: id}))}}, include: tripInclude});
      await tx.activity.create({data: {householdId, actorId: userId, type: 'SHOPPING_STARTED'}});
      await notifyHousehold(tx, householdId, userId, 'SHOPPING_STARTED');
      return trip;
    });
  }

  async toggle(householdId: string, userId: string, tripItemId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT t.id FROM "ShoppingTrip" t JOIN "ShoppingTripItem" i ON i."shoppingTripId" = t.id WHERE i.id = ${tripItemId}::uuid AND t."householdId" = ${householdId}::uuid FOR UPDATE OF t`;
      const tripItem = await tx.shoppingTripItem.findFirst({where: {id: tripItemId, shoppingTrip: {householdId, status: 'ACTIVE'}}, include: {item: true}});
      if (!tripItem) throw new NotFoundException('Shopping item not found');
      const purchased = !tripItem.purchased;
      const updated = await tx.shoppingTripItem.update({where: {id: tripItem.id}, data: {purchased, purchasedAt: purchased ? new Date() : null, purchasedById: purchased ? userId : null}, include: {item: true}});
      if (purchased) await tx.activity.create({data: {householdId, actorId: userId, type: 'ITEM_PURCHASED', subjectName: tripItem.item.name}});
      return updated;
    });
  }

  async finish(householdId: string, userId: string, tripId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Household" WHERE id = ${householdId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "ShoppingTrip" WHERE id = ${tripId}::uuid AND "householdId" = ${householdId}::uuid FOR UPDATE`;
      const trip = await tx.shoppingTrip.findFirst({where: {id: tripId, householdId, status: 'ACTIVE'}, include: {items: true}});
      if (!trip) throw new NotFoundException('Active shopping trip not found');
      const purchasedIds = trip.items.filter((entry) => entry.purchased).map((entry) => entry.itemId);
      if (purchasedIds.length) await tx.item.updateMany({where: {householdId, id: {in: purchasedIds}}, data: {status: 'AVAILABLE', priority: 'NORMAL', updatedById: userId}});
      const completed = await tx.shoppingTrip.update({where: {id: trip.id}, data: {status: 'COMPLETED', completedAt: new Date()}});
      await tx.activity.create({data: {householdId, actorId: userId, type: 'SHOPPING_COMPLETED', metadata: {purchasedCount: purchasedIds.length}}});
      await notifyHousehold(tx, householdId, userId, 'SHOPPING_COMPLETED');
      return completed;
    });
  }
}
