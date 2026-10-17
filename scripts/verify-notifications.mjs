// Run after build:api and db:migrate. Only generated verification records are removed.
import assert from 'node:assert/strict';
import {ConfigService} from '@nestjs/config';
import {config} from 'dotenv';
import {PrismaService} from '../apps/api/dist/prisma/prisma.service.js';
import {ItemsService} from '../apps/api/dist/items/items.service.js';
import {ShoppingService} from '../apps/api/dist/shopping/shopping.service.js';
import {NotificationsService} from '../apps/api/dist/notifications/notifications.service.js';
config({quiet: true});
const prisma = new PrismaService(new ConfigService());
const fixtures = {users: [], homes: []};
try {
  await prisma.$transaction(async tx => {
    for (let index = 0; index < 4; index++) fixtures.users.push(await tx.user.create({data: {name: 'Notification verification', email: `notification-${crypto.randomUUID()}@example.test`}}));
    for (let index = 0; index < 2; index++) fixtures.homes.push(await tx.household.create({data: {name: 'Notification verification', ownerId: fixtures.users[index * 3].id}}));
    await tx.householdMember.createMany({data: fixtures.users.map((u, i) => ({userId: u.id, householdId: fixtures.homes[i < 3 ? 0 : 1].id, role: i % 3 === 0 ? 'OWNER' : 'MEMBER'}))});
  });
  const [actor, member, otherMember, outsider] = fixtures.users;
  const [home, otherHome] = fixtures.homes;
  const items = new ItemsService(prisma); const shopping = new ShoppingService(prisma); const notifications = new NotificationsService(prisma);
  const item = await items.create(home.id, actor.id, {name: 'Milk', visualKey: 'milk', priority: 'URGENT'});
  let rows = await prisma.notification.findMany({where: {householdId: home.id}});
  assert.equal(rows.length, 2); assert(rows.every(n => n.kind === 'ITEM_URGENT' && n.userId !== actor.id));
  assert.deepEqual(new Set(rows.map(n => n.userId)), new Set([member.id, otherMember.id]));
  assert.equal((await notifications.inbox(otherHome.id, outsider.id)).unreadCount, 0);
  await assert.rejects(notifications.read(otherHome.id, outsider.id, rows[0].id), {status: 404});
  await assert.rejects(notifications.inbox(otherHome.id, outsider.id, rows[0].id), {status: 404});
  await items.update(home.id, actor.id, item.id, {status: 'NEEDED', notes: 'Fresh'});
  assert.equal(await prisma.notification.count({where: {householdId: home.id}}), 2);
  await items.update(home.id, actor.id, item.id, {status: 'AVAILABLE', priority: 'NORMAL'});
  await Promise.all([items.update(home.id, actor.id, item.id, {status: 'NEEDED'}), items.update(home.id, actor.id, item.id, {status: 'NEEDED'})]);
  assert.equal(await prisma.notification.count({where: {householdId: home.id, kind: 'ITEM_NEEDED'}}), 2);
  await items.update(home.id, actor.id, item.id, {priority: 'URGENT'});
  assert.equal(await prisma.notification.count({where: {householdId: home.id, kind: 'ITEM_URGENT'}}), 4);
  const trips = await Promise.all([shopping.start(home.id, actor.id), shopping.start(home.id, actor.id)]);
  assert.equal(trips[0].id, trips[1].id);
  assert.equal(await prisma.notification.count({where: {householdId: home.id, kind: 'SHOPPING_STARTED'}}), 2);
  await shopping.toggle(home.id, actor.id, trips[0].items[0].id);
  assert.equal(await prisma.notification.count({where: {householdId: home.id}}), 8);
  const finishes = await Promise.allSettled([shopping.finish(home.id, actor.id, trips[0].id), shopping.finish(home.id, actor.id, trips[0].id)]);
  assert.equal(finishes.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await prisma.notification.count({where: {householdId: home.id, kind: 'SHOPPING_COMPLETED'}}), 2);
  let inbox = await notifications.inbox(home.id, member.id);
  assert.equal(inbox.unreadCount, 5);
  await notifications.read(home.id, member.id, inbox.items[0].id);
  assert.equal((await notifications.inbox(home.id, member.id)).unreadCount, 4);
  assert.equal((await notifications.inbox(home.id, otherMember.id)).unreadCount, 5);
  await notifications.readAll(home.id, member.id);
  assert.equal((await notifications.inbox(home.id, member.id)).unreadCount, 0);
  // Same timestamps test the id tie-breaker across every page.
  await prisma.notification.createMany({data: Array.from({length: 35}, () => ({householdId: home.id, userId: member.id, title: 'Verification', body: 'Verification', kind: 'ITEM_NEEDED', createdAt: new Date('2026-10-17T10:00:00Z')}))});
  inbox = await notifications.inbox(home.id, member.id);
  const older = await notifications.inbox(home.id, member.id, inbox.nextCursor);
  assert.equal(inbox.items.length, 30); assert.equal(older.items.length, 10);
  assert.equal(new Set([...inbox.items, ...older.items].map(n => n.id)).size, 40);
  // A notification failure must roll back the item and its activity too.
  const before = await prisma.item.count({where: {householdId: home.id}});
  const faulty = new ItemsService({$transaction: callback => prisma.$transaction(tx => callback({...tx, notification: {...tx.notification, createMany: () => {throw new Error('Simulated delivery persistence failure');}}}))});
  await assert.rejects(faulty.create(home.id, actor.id, {name: 'Must roll back', visualKey: 'milk'}));
  assert.equal(await prisma.item.count({where: {householdId: home.id}}), before);
  assert.equal(await prisma.activity.count({where: {householdId: home.id, subjectName: 'Must roll back'}}), 0);
  // Former members cannot retrieve old-house notifications after removal.
  await prisma.householdMember.delete({where: {userId: member.id}});
  assert.equal((await notifications.inbox(null, member.id)).items.length, 0);
  assert.equal((await notifications.inbox(otherHome.id, member.id)).items.length, 0);
  console.log('Notifications verified: same-home recipients, sender exclusion, transitions, concurrent requests, read states, pagination and atomic rollback.');
} finally {
  await prisma.$transaction(async tx => {
    const households = {in: fixtures.homes.map(h => h.id)};
    await tx.shoppingTrip.deleteMany({where: {householdId: households}});
    await tx.household.deleteMany({where: {id: households}});
    await tx.user.deleteMany({where: {id: {in: fixtures.users.map(u => u.id)}}});
  });
  await prisma.$disconnect();
  console.log('Notification verification records removed.');
}
