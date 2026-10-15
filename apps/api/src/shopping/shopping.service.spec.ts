import {ShoppingService} from './shopping.service';

describe('ShoppingService completion', () => {
  it('marks only purchased items available and keeps the household predicate', async () => {
    const tx = {item: {updateMany: jest.fn()}, shoppingTrip: {update: jest.fn().mockResolvedValue({id: 'trip'})}, activity: {create: jest.fn()}};
    const prisma = {
      shoppingTrip: {findFirst: jest.fn().mockResolvedValue({id: 'trip', items: [{itemId: 'milk', purchased: true}, {itemId: 'bread', purchased: false}]})},
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new ShoppingService(prisma as never);
    await service.finish('household-a', 'shopper-a', 'trip');
    expect(prisma.shoppingTrip.findFirst).toHaveBeenCalledWith(expect.objectContaining({where: {id: 'trip', householdId: 'household-a', status: 'ACTIVE'}}));
    expect(tx.item.updateMany).toHaveBeenCalledWith({where: {householdId: 'household-a', id: {in: ['milk']}}, data: {status: 'AVAILABLE', priority: 'NORMAL', updatedById: 'shopper-a'}});
  });
});
