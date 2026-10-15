import {config} from 'dotenv';
import {createHash, randomBytes} from 'node:crypto';
import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '@prisma/client';
import {argon2id, hash} from 'argon2';
import {DEFAULT_CATALOG} from '../src/households/catalog.js';

config({path: '../../.env'});
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required to seed HouseFamily');
const prisma = new PrismaClient({adapter: new PrismaPg({connectionString})});

async function main() {
  await prisma.$transaction([
    prisma.pushSubscription.deleteMany(), prisma.notification.deleteMany(), prisma.activity.deleteMany(),
    prisma.homeIssue.deleteMany(), prisma.shoppingTripItem.deleteMany(), prisma.shoppingTrip.deleteMany(),
    prisma.item.deleteMany(), prisma.category.deleteMany(), prisma.invitation.deleteMany(),
    prisma.authToken.deleteMany(), prisma.session.deleteMany(), prisma.householdMember.deleteMany(),
    prisma.household.deleteMany(), prisma.user.deleteMany(),
  ]);

  const passwordHash = await hash('HouseFamily2026!', {type: argon2id});
  const verified = new Date();
  const [mouad, fatima, ahmed, sara] = await Promise.all([
    prisma.user.create({data: {name: 'Mouad', email: 'mouad@housefamily.local', passwordHash, emailVerifiedAt: verified}}),
    prisma.user.create({data: {name: 'Fatima', email: 'fatima@housefamily.local', passwordHash, emailVerifiedAt: verified}}),
    prisma.user.create({data: {name: 'Ahmed', email: 'ahmed@housefamily.local', passwordHash, emailVerifiedAt: verified}}),
    prisma.user.create({data: {name: 'Sara', email: 'sara@housefamily.local', passwordHash, emailVerifiedAt: verified}}),
  ]);
  const household = await prisma.household.create({data: {name: 'Ajmani Family', ownerId: mouad.id}});
  await prisma.householdMember.createMany({data: [
    {householdId: household.id, userId: mouad.id, role: 'OWNER'},
    {householdId: household.id, userId: fatima.id, role: 'MEMBER'},
    {householdId: household.id, userId: ahmed.id, role: 'MEMBER'},
    {householdId: household.id, userId: sara.id, role: 'MEMBER'},
  ]});

  const state: Record<string, {status: 'AVAILABLE'|'LOW'|'NEEDED'; priority?: 'NORMAL'|'SOON'|'URGENT'; usual?: boolean; updater?: string}> = {
    Milk: {status: 'NEEDED', priority: 'URGENT', usual: true, updater: fatima.id},
    Bread: {status: 'AVAILABLE', usual: true}, Water: {status: 'LOW', priority: 'SOON', usual: true, updater: ahmed.id},
    Oil: {status: 'AVAILABLE', usual: true}, Shampoo: {status: 'NEEDED', priority: 'SOON', usual: true, updater: sara.id},
    Detergent: {status: 'LOW', usual: true, updater: fatima.id}, 'Toilet paper': {status: 'NEEDED', usual: true, updater: ahmed.id},
  };
  for (const [sortOrder, category] of DEFAULT_CATALOG.entries()) {
    const created = await prisma.category.create({data: {householdId: household.id, key: category.key, name: category.name, sortOrder}});
    for (const [name, visualKey] of category.items) {
      const itemState = state[name] ?? {status: 'AVAILABLE' as const, usual: false};
      await prisma.item.create({data: {
        householdId: household.id, createdById: mouad.id, updatedById: itemState.updater ?? mouad.id,
        categoryId: created.id, name, visualKey, status: itemState.status,
        priority: itemState.priority ?? 'NORMAL', usual: itemState.usual ?? false,
      }});
    }
  }

  await prisma.homeIssue.createMany({data: [
    {householdId: household.id, createdById: fatima.id, title: 'Bathroom tap is leaking', visualKey: 'tap', status: 'IN_PROGRESS', handledById: ahmed.id},
    {householdId: household.id, createdById: mouad.id, title: 'Kitchen light is flickering', visualKey: 'light-bulb', status: 'OPEN'},
  ]});
  await prisma.activity.createMany({data: [
    {householdId: household.id, actorId: fatima.id, type: 'ITEM_NEEDED', subjectName: 'Milk', createdAt: new Date(Date.now() - 25 * 60_000)},
    {householdId: household.id, actorId: ahmed.id, type: 'ITEM_LOW', subjectName: 'Water', createdAt: new Date(Date.now() - 72 * 60_000)},
    {householdId: household.id, actorId: sara.id, type: 'ITEM_NEEDED', subjectName: 'Shampoo', createdAt: new Date(Date.now() - 21 * 3_600_000)},
    {householdId: household.id, actorId: ahmed.id, type: 'ISSUE_CLAIMED', subjectName: 'Bathroom tap is leaking', createdAt: new Date(Date.now() - 26 * 3_600_000)},
  ]});

  const inviteToken = randomBytes(32).toString('base64url');
  await prisma.invitation.create({data: {
    householdId: household.id, invitedName: 'Yasmine', invitedEmail: 'yasmine@example.com',
    tokenHash: createHash('sha256').update(inviteToken).digest('hex'), expiresAt: new Date(Date.now() + 7 * 86_400_000),
  }});
  console.info('Seeded Ajmani Family');
  console.info('Development sign-in: mouad@housefamily.local / HouseFamily2026!');
  console.info(`Development invitation: http://localhost:3000/en/invite/${inviteToken}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
