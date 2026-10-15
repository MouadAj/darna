import {ConflictException, ForbiddenException, UnauthorizedException} from '@nestjs/common';
import {argon2id, hash, verify} from 'argon2';
import {AuthService} from './auth.service.js';

describe('password authentication without email confirmation', () => {
  const config = {get: (_key: string, fallback?: unknown) => fallback};

  it('registers a password hash and returns the account for immediate sign-in', async () => {
    const prisma = {user: {findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({id: 'u', preferredLocale: 'AR'})}};
    const service = new AuthService(prisma as never, config as never);
    await expect(service.register(' Mouad ', 'MOUAD@example.com ', 'secure-password', 'ar')).resolves.toEqual({userId: 'u', preferredLocale: 'ar'});
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({name: 'Mouad', email: 'mouad@example.com', preferredLocale: 'AR'});
    expect(await verify(data.passwordHash, 'secure-password')).toBe(true);
  });

  it.each([null, new Date()])('never overwrites an existing account (legacy verification: %s)', async emailVerifiedAt => {
    const prisma = {user: {findUnique: jest.fn().mockResolvedValue({id: 'u', emailVerifiedAt}), create: jest.fn(), update: jest.fn()}};
    const service = new AuthService(prisma as never, config as never);
    await expect(service.register('Attacker', 'mouad@example.com', 'different-password')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('handles simultaneous registration with the same email as a conflict', async () => {
    const prisma = {user: {findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockRejectedValue({code: 'P2002'})}};
    await expect(new AuthService(prisma as never, config as never).register('Mouad', 'mouad@example.com', 'secure-password')).rejects.toBeInstanceOf(ConflictException);
  });

  it('lets an account from a failed email attempt log in using its existing password', async () => {
    const passwordHash = await hash('secure-password', {type: argon2id});
    const prisma = {user: {findUnique: jest.fn().mockResolvedValue({id: 'u', passwordHash, emailVerifiedAt: null, preferredLocale: 'FR'})}};
    const service = new AuthService(prisma as never, config as never);
    await expect(service.login('mouad@example.com', 'secure-password')).resolves.toEqual({userId: 'u', preferredLocale: 'fr'});
    await expect(service.login('mouad@example.com', 'wrong-password')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('blocks demo sign-in in production even if the development flag was left on', async () => {
    const productionConfig = {get: (key: string) => ({NODE_ENV: 'production', DEV_AUTH_ENABLED: 'true'}[key])};
    const prisma = {user: {findUnique: jest.fn()}};
    await expect(new AuthService(prisma as never, productionConfig as never).devLogin('mouad@housefamily.local')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
