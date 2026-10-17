import {ShoppingService} from './shopping.service.js';

describe('ShoppingService completion', () => {
  it('reads current item details in active trips', async () => {
    const prisma = {shoppingTrip: {findFirst: jest.fn().mockResolvedValue({items: [{item: {quantity: '500 g', notes: 'Fresh'}}]})}};
    const result = await new ShoppingService(prisma as never).active('household-a');
    expect(result!.items[0].item).toEqual({quantity: '500 g', notes: 'Fresh'});
    expect(prisma.shoppingTrip.findFirst).toHaveBeenCalledWith(expect.objectContaining({include: expect.objectContaining({items: expect.objectContaining({include: {item: {select: expect.objectContaining({quantity: true, notes: true})}}})})}));
  });
  it('marks only purchased items available and keeps the household predicate', async () => {
    const tx = {$queryRaw: jest.fn(), householdMember: {findMany: jest.fn().mockResolvedValue([])}, item: {updateMany: jest.fn()}, shoppingTrip: {findFirst: jest.fn().mockResolvedValue({id: 'trip', items: [{itemId: 'milk', purchased: true}, {itemId: 'bread', purchased: false}]}), update: jest.fn().mockResolvedValue({id: 'trip'})}, activity: {create: jest.fn()}};
    const prisma = {
      shoppingTrip: {findFirst: jest.fn().mockResolvedValue({id: 'trip', items: [{itemId: 'milk', purchased: true}, {itemId: 'bread', purchased: false}]})},
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new ShoppingService(prisma as never);
    await service.finish('household-a', 'shopper-a', 'trip');
    expect(tx.shoppingTrip.findFirst).toHaveBeenCalledWith(expect.objectContaining({where: {id: 'trip', householdId: 'household-a', status: 'ACTIVE'}}));
    expect(tx.item.updateMany).toHaveBeenCalledWith({where: {householdId: 'household-a', id: {in: ['milk']}}, data: {status: 'AVAILABLE', priority: 'NORMAL', updatedById: 'shopper-a'}});
  });
});
