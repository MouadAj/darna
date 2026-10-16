// Run after build:api and db:migrate. All verification records roll back.
import assert from 'node:assert/strict';
import {ConfigService} from '@nestjs/config';
import {config} from 'dotenv';
import {PrismaService} from '../apps/api/dist/prisma/prisma.service.js';
import {ItemsService} from '../apps/api/dist/items/items.service.js';
import {ShoppingService} from '../apps/api/dist/shopping/shopping.service.js';
config({quiet: true});
const prisma = new PrismaService(new ConfigService());
const rollback = new Error('verification rollback');
try {
  await prisma.$transaction(async tx => {
    const user = await tx.user.create({data: {name: 'Details verification', email: `details-${crypto.randomUUID()}@example.test`}});
    const home = await tx.household.create({data: {name: 'Details verification', ownerId: user.id}});
    const items = new ItemsService(tx);
    const shopping = new ShoppingService({...tx, $transaction: callback => callback(tx)});
    const old = await items.create(home.id, user.id, {name: 'Existing client', visualKey: 'milk'});
    assert.equal(old.quantity, null); assert.equal(old.notes, null);
    const item = await items.create(home.id, user.id, {name: 'Milk', visualKey: 'milk', quantity: '2 bottles', notes: '<b>Organic</b>'});
    await items.update(home.id, user.id, item.id, {status: 'LOW'});
    assert.equal((await items.list(home.id, {})).find(row => row.id === item.id).quantity, '2 bottles');
    await assert.rejects(items.update(crypto.randomUUID(), user.id, item.id, {notes: 'forbidden'}), {status: 404});
    const trip = await shopping.start(home.id, user.id);
    await items.update(home.id, user.id, item.id, {quantity: '500 g', notes: 'Fresh'});
    const current = await shopping.active(home.id);
    const entry = current.items.find(row => row.item.id === item.id);
    assert.equal(entry.item.quantity, '500 g'); assert.equal(entry.item.notes, 'Fresh');
    const purchased = await shopping.toggle(home.id, user.id, entry.id);
    assert.equal(purchased.item.notes, 'Fresh');
    await shopping.finish(home.id, user.id, trip.id);
    const saved = await tx.item.findUniqueOrThrow({where: {id: item.id}});
    assert.equal(saved.status, 'AVAILABLE'); assert.equal(saved.quantity, '500 g'); assert.equal(saved.notes, 'Fresh');
    await items.update(home.id, user.id, item.id, {quantity: null, notes: null});
    const cleared = await tx.item.findUniqueOrThrow({where: {id: item.id}});
    assert.equal(cleared.quantity, null); assert.equal(cleared.notes, null);
    throw rollback;
  }, {timeout: 30000});
} catch (error) {
  if (error !== rollback) throw error;
  console.log('Item details database verification passed; all fixtures rolled back.');
} finally { await prisma.$disconnect(); }
