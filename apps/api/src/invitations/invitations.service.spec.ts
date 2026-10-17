import {BadRequestException, UnauthorizedException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {hash} from 'argon2';
import {InvitationsService} from './invitations.service.js';

describe('InvitationsService acceptance', () => {
  it('creates the invited membership and accepts the one-time invitation', async () => {
    const token = 'a'.repeat(40);
    const invitation = {id: 'invite-a', householdId: 'household-a', invitedName: 'Fatima', invitedEmail: 'fatima@example.com', status: 'PENDING', expiresAt: new Date(Date.now() + 60_000), household: {name: 'Darna Home'}};
    const tx = {
      user: {findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({id: 'user-f', name: 'Fatima', preferredLocale: 'FR'})},
      householdMember: {findUnique: jest.fn().mockResolvedValue(null), create: jest.fn()},
      invitation: {updateMany: jest.fn().mockResolvedValue({count: 1})}, activity: {create: jest.fn()},
    };
    const prisma = {invitation: {findUnique: jest.fn().mockResolvedValue(invitation)}, user: {findUnique: jest.fn().mockResolvedValue(null)}, $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx))};
    const service = new InvitationsService(prisma as never, {get: jest.fn()} as never);
    await expect(service.accept(token, 'a-secure-password', 'fr')).resolves.toEqual({userId: 'user-f', preferredLocale: 'fr'});
    expect(prisma.invitation.findUnique).toHaveBeenCalledWith({where: {tokenHash: createHash('sha256').update(token).digest('hex')}, include: {household: true}});
    expect(tx.householdMember.create).toHaveBeenCalledWith({data: {householdId: 'household-a', userId: 'user-f', role: 'MEMBER'}});
    expect(tx.invitation.updateMany).toHaveBeenCalledWith({where: {id: 'invite-a', status: 'PENDING', expiresAt: {gt: expect.any(Date)}}, data: expect.objectContaining({status: 'ACCEPTED', acceptedById: 'user-f'})});
  });

  it('rejects an account that already belongs to another household', async () => {
    const invitation = {id: 'i', householdId: 'a', invitedName: 'F', invitedEmail: 'f@x.test', status: 'PENDING', expiresAt: new Date(Date.now() + 60_000), household: {name: 'A'}};
    const existingUser = {id: 'u', passwordHash: null, emailVerifiedAt: null};
    const tx = {user: {findUnique: jest.fn().mockResolvedValue(existingUser), update: jest.fn().mockResolvedValue({...existingUser, passwordHash: 'hash', emailVerifiedAt: new Date()})}, householdMember: {findUnique: jest.fn().mockResolvedValue({householdId: 'b'})}};
    const prisma = {invitation: {findUnique: jest.fn().mockResolvedValue(invitation)}, user: {findUnique: jest.fn().mockResolvedValue(existingUser)}, $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx))};
    const service = new InvitationsService(prisma as never, {get: jest.fn()} as never);
    await expect(service.accept('b'.repeat(40), 'a-secure-password', 'en')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('shareable invitations without email', () => {
  const config = {get: (_key: string, fallback?: unknown) => fallback};
  it('returns a private link in production and stores only its hash', async () => {
    const prisma = {householdMember: {findFirst: jest.fn().mockResolvedValue(null)}, invitation: {updateMany: jest.fn(), create: jest.fn().mockResolvedValue({id: 'i', invitedName: 'Fatima'})}};
    const result = await new InvitationsService(prisma as never, config as never).create('home', 'Fatima', 'F@example.test', 'fr');
    const token = new URL(result.invitationUrl).pathname.split('/').pop()!;
    expect(result.invitationUrl).toContain('/fr/invite/');
    expect(prisma.invitation.create.mock.calls[0][0].data).toMatchObject({invitedEmail: 'f@example.test', tokenHash: createHash('sha256').update(token).digest('hex')});
  });

  it('replaces an invitation token and returns the new link', async () => {
    const prisma = {invitation: {findFirst: jest.fn().mockResolvedValue({id: 'i'}), update: jest.fn()}};
    const result = await new InvitationsService(prisma as never, config as never).refreshLink('home', 'i', 'ar');
    expect(result.invitationUrl).toContain('/ar/invite/');
    expect(prisma.invitation.findFirst).toHaveBeenCalledWith({where: {id: 'i', householdId: 'home', status: 'PENDING'}, include: {household: true}});
    expect(prisma.invitation.update).toHaveBeenCalledWith({where: {id: 'i'}, data: expect.objectContaining({tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/)})});
  });

  it('requires the existing password even for a previously unconfirmed account', async () => {
    const user = {id: 'u', emailVerifiedAt: null, passwordHash: await hash('original-password')};
    const tx = {user: {findUnique: jest.fn().mockResolvedValue(user), update: jest.fn()}};
    const prisma = {invitation: {findUnique: jest.fn().mockResolvedValue({status: 'PENDING', expiresAt: new Date(Date.now()+60_000), invitedEmail: 'f@example.test'})}, $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx))};
    await expect(new InvitationsService(prisma as never, config as never).accept('token', 'different-password', 'en')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
