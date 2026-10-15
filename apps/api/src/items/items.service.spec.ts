import {NotFoundException} from '@nestjs/common';
import {ItemsService} from './items.service.js';

describe('ItemsService household isolation', () => {
  const prisma = {item: {findFirst: jest.fn(), update: jest.fn()}, activity: {create: jest.fn()}};
  const service = new ItemsService(prisma as never);
  beforeEach(() => jest.clearAllMocks());

  it('requires both item id and authenticated household id', async () => {
    prisma.item.findFirst.mockResolvedValue(null);
    await expect(service.update('household-a', 'user-a', 'item-from-b', {status: 'NEEDED'})).rejects.toBeInstanceOf(NotFoundException);
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
});
