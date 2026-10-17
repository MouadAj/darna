import type {Prisma} from '@prisma/client';
import type {NotificationKind} from '@housefamily/shared';

/** Call inside the same transaction as the household action. */
export async function notifyHousehold(tx: Prisma.TransactionClient, householdId: string, actorId: string, kind: NotificationKind, subjectName?: string) {
  const recipients = await tx.householdMember.findMany({where: {householdId, userId: {not: actorId}}, select: {userId: true}});
  if (!recipients.length) return;
  const actor = await tx.user.findUniqueOrThrow({where: {id: actorId}, select: {name: true}});
  const title = {ITEM_NEEDED: 'New household need', ITEM_URGENT: 'Urgent household need', SHOPPING_STARTED: 'Shopping started', SHOPPING_COMPLETED: 'Shopping finished'}[kind];
  const body = kind === 'ITEM_NEEDED' ? `${actor.name} added ${subjectName} to Needs.` : kind === 'ITEM_URGENT' ? `${actor.name} marked ${subjectName} as urgent.` : `${actor.name} ${kind === 'SHOPPING_STARTED' ? 'started' : 'finished'} shopping.`;
  await tx.notification.createMany({data: recipients.map(({userId}) => ({householdId, userId, kind, title, body,
    data: {actorName: actor.name, ...(subjectName ? {subjectName} : {}), target: kind === 'SHOPPING_STARTED' ? 'shopping' : 'needs'},
  }))});
}
