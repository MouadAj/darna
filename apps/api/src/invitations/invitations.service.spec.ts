import {BadRequestException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {InvitationsService} from './invitations.service';

describe('InvitationsService acceptance', () => {
  it('creates the invited membership and accepts the one-time invitation', async () => {
    const token = 'a'.repeat(40);
    const invitation = {id: 'invite-a', householdId: 'household-a', invitedName: 'Fatima', invitedEmail: 'fatima@example.com', status: 'PENDING', expiresAt: new Date(Date.now() + 60_000), household: {name: 'Ajmani Family'}};
    const tx = {
      user: {findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({id: 'user-f', name: 'Fatima', preferredLocale: 'FR'})},
      householdMember: {findUnique: jest.fn().mockResolvedValue(null), create: jest.fn()},
      invitation: {update: jest.fn()}, activity: {create: jest.fn()},
    };
    const prisma = {invitation: {findUnique: jest.fn().mockResolvedValue(invitation)}, user: {findUnique: jest.fn().mockResolvedValue(null)}, $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx))};
    const service = new InvitationsService(prisma as never, {get: jest.fn()} as never, {send: jest.fn()} as never);
    await expect(service.accept(token, 'a-secure-password', 'fr')).resolves.toEqual({userId: 'user-f', preferredLocale: 'fr'});
    expect(prisma.invitation.findUnique).toHaveBeenCalledWith({where: {tokenHash: createHash('sha256').update(token).digest('hex')}, include: {household: true}});
    expect(tx.householdMember.create).toHaveBeenCalledWith({data: {householdId: 'household-a', userId: 'user-f', role: 'MEMBER'}});
    expect(tx.invitation.update).toHaveBeenCalledWith({where: {id: 'invite-a'}, data: expect.objectContaining({status: 'ACCEPTED', acceptedById: 'user-f'})});
  });

  it('rejects an account that already belongs to another household', async () => {
    const invitation = {id: 'i', householdId: 'a', invitedName: 'F', invitedEmail: 'f@x.test', status: 'PENDING', expiresAt: new Date(Date.now() + 60_000), household: {name: 'A'}};
    const existingUser = {id: 'u', passwordHash: null, emailVerifiedAt: null};
    const tx = {user: {findUnique: jest.fn().mockResolvedValue(existingUser), update: jest.fn().mockResolvedValue({...existingUser, passwordHash: 'hash', emailVerifiedAt: new Date()})}, householdMember: {findUnique: jest.fn().mockResolvedValue({householdId: 'b'})}};
    const prisma = {invitation: {findUnique: jest.fn().mockResolvedValue(invitation)}, user: {findUnique: jest.fn().mockResolvedValue(existingUser)}, $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx))};
    const service = new InvitationsService(prisma as never, {get: jest.fn()} as never, {send: jest.fn()} as never);
    await expect(service.accept('b'.repeat(40), 'a-secure-password', 'en')).rejects.toBeInstanceOf(BadRequestException);
  });
});
