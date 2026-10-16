import {NotFoundException} from '@nestjs/common';
import {ItemsService} from './items.service.js';

describe('ItemsService household isolation', () => {
  const prisma = {item: {findFirst: jest.fn(), create: jest.fn(), update: jest.fn()}, activity: {create: jest.fn()}};
  const service = new ItemsService(prisma as never);
  beforeEach(() => jest.clearAllMocks());

  it('requires both item id and authenticated household id', async () => {
    prisma.item.findFirst.mockResolvedValue(null);
    await expect(service.update('household-a', 'user-a', 'item-from-b', {quantity: '2 bottles', notes: 'Private'})).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.item.findFirst).toHaveBeenCalledWith({where: {id: 'item-from-b', householdId: 'household-a'}});
    expect(prisma.item.update).not.toHaveBeenCalled();
  });

  it('records an item status transition for the same household', async () => {
    prisma.item.findFirst.mockResolvedValue({id: 'item-a', status: 'AVAILABLE'});
    prisma.item.update.mockResolvedValue({id: 'item-a', name: 'Milk', status: 'NEEDED'});
    await service.update('household-a', 'user-a', 'item-a', {status: 'NEEDED'});
    expect(prisma.item.update).toHaveBeenCalledWith(expect.objectContaining({where: {id: 'item-a'}, data: {status: 'NEEDED', updatedById: 'user-a'}}));
    expect(prisma.activity.create).toHaveBeenCalledWith({data: expect.objectContaining({householdId: 'household-a', type: 'ITEM_NEEDED'})});
  });
  it('saves and returns optional details without creating status activity', async () => {
    prisma.item.findFirst.mockResolvedValue({id: 'item-a', status: 'NEEDED'});
    prisma.item.update.mockResolvedValue({id: 'item-a', quantity: null, notes: 'Organic'});
    const result = await service.update('household-a', 'user-a', 'item-a', {quantity: null, notes: 'Organic'});
    expect(result).toMatchObject({quantity: null, notes: 'Organic'});
    expect(prisma.item.update).toHaveBeenCalledWith(expect.objectContaining({data: {quantity: null, notes: 'Organic', updatedById: 'user-a'}, select: expect.objectContaining({quantity: true, notes: true})}));
    expect(prisma.activity.create).not.toHaveBeenCalled();
  });
  it('creates a needed item with optional details', async () => {
    prisma.item.create.mockResolvedValue({id: 'new', name: 'Milk', quantity: '2 bottles', notes: 'Organic'});
    await service.create('household-a', 'user-a', {name: 'Milk', visualKey: 'milk', quantity: '2 bottles', notes: 'Organic'});
    expect(prisma.item.create).toHaveBeenCalledWith(expect.objectContaining({data: expect.objectContaining({householdId: 'household-a', quantity: '2 bottles', notes: 'Organic', status: 'NEEDED'})}));
  });

});
