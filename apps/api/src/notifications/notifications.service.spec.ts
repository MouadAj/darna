import {NotFoundException} from '@nestjs/common';
import {NotificationsService} from './notifications.service.js';
import {notifyHousehold} from './household-notifications.js';

describe('NotificationsService isolation and pagination', () => {
  const notification = {findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), updateMany: jest.fn()};
  const service = new NotificationsService({notification} as never);
  beforeEach(() => {jest.clearAllMocks();notification.findMany.mockResolvedValue([]);notification.count.mockResolvedValue(0);});
  it('returns an empty inbox without querying when the user has no household', async () => {
    expect(await service.inbox(null, 'user')).toEqual({items: [], unreadCount: 0, nextCursor: null});
    expect(notification.findMany).not.toHaveBeenCalled();
  });
  it('limits both the inbox and unread count to the recipient and their household', async () => {
    await service.inbox('home-a', 'user-a');
    expect(notification.findMany).toHaveBeenCalledWith(expect.objectContaining({where: {householdId: 'home-a', userId: 'user-a'}, take: 31}));
    expect(notification.count).toHaveBeenCalledWith({where: {householdId: 'home-a', userId: 'user-a', status: 'UNREAD'}});
  });
  it('returns 30 entries and a cursor when more entries exist', async () => {
    notification.findMany.mockResolvedValue(Array.from({length: 31}, (_, i) => ({id: String(i)})));
    const result = await service.inbox('home-a', 'user-a');
    expect(result.items).toHaveLength(30);expect(result.nextCursor).toBe('29');
  });
  it('rejects a foreign cursor without reading another household inbox', async () => {
    notification.findFirst.mockResolvedValue(null);
    await expect(service.inbox('home-a', 'user-a', 'foreign')).rejects.toBeInstanceOf(NotFoundException);
    expect(notification.findFirst).toHaveBeenCalledWith(expect.objectContaining({where: {id: 'foreign', householdId: 'home-a', userId: 'user-a'}}));
    expect(notification.findMany).not.toHaveBeenCalled();
  });
  it('uses both timestamp and id for stable pagination', async () => {
    const createdAt = new Date();notification.findFirst.mockResolvedValue({id: 'cursor', createdAt});
    await service.inbox('home-a', 'user-a', 'cursor');
    expect(notification.findMany).toHaveBeenCalledWith(expect.objectContaining({where: {householdId: 'home-a', userId: 'user-a', OR: [{createdAt: {lt: createdAt}}, {createdAt, id: {lt: 'cursor'}}]}}));
  });
  it('never marks another user or household notification read', async () => {
    notification.updateMany.mockResolvedValue({count: 0});
    await expect(service.read('home-a', 'user-a', 'foreign')).rejects.toBeInstanceOf(NotFoundException);
    expect(notification.updateMany).toHaveBeenCalledWith({where: {id: 'foreign', householdId: 'home-a', userId: 'user-a'}, data: {status: 'READ'}});
  });
  it('marks all unread entries read only for the current recipient', async () => {
    notification.updateMany.mockResolvedValue({count: 4});
    expect(await service.readAll('home-a', 'user-a')).toEqual({updatedCount: 4});
    expect(notification.updateMany).toHaveBeenCalledWith({where: {householdId: 'home-a', userId: 'user-a', status: 'UNREAD'}, data: {status: 'READ'}});
  });
});

describe('household notification recipients', () => {
  it('notifies only other members returned by the household-scoped membership query', async () => {
    const tx = {householdMember: {findMany: jest.fn().mockResolvedValue([{userId: 'owner'}, {userId: 'member'}])}, user: {findUniqueOrThrow: jest.fn().mockResolvedValue({name: 'Mouad'})}, notification: {createMany: jest.fn()}};
    await notifyHousehold(tx as never, 'home-a', 'actor', 'ITEM_NEEDED', 'Milk');
    expect(tx.householdMember.findMany).toHaveBeenCalledWith({where: {householdId: 'home-a', userId: {not: 'actor'}}, select: {userId: true}});
    expect(tx.notification.createMany).toHaveBeenCalledWith({data: ['owner', 'member'].map(userId => expect.objectContaining({householdId: 'home-a', userId, kind: 'ITEM_NEEDED', data: {actorName: 'Mouad', subjectName: 'Milk', target: 'needs'}}))});
  });
  it('creates no alerts when there are no other current members', async () => {
    const tx = {householdMember: {findMany: jest.fn().mockResolvedValue([])}, notification: {createMany: jest.fn()}};
    await notifyHousehold(tx as never, 'home-a', 'actor', 'SHOPPING_STARTED');
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });
});
