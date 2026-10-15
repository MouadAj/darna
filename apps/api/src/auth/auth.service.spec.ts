import {ForbiddenException, UnauthorizedException} from '@nestjs/common';
import {argon2id, hash} from 'argon2';
import {createHash} from 'node:crypto';
import {AuthService} from './auth.service';

describe('AuthService', () => {
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => ({WEB_ORIGIN: 'http://localhost:3000', EMAIL_VERIFICATION_TTL_MINUTES: 30, DEV_AUTH_ENABLED: 'false'}[key] ?? fallback)),
  };
  const email = {send: jest.fn(), developmentPreviewEnabled: jest.fn().mockReturnValue(false)};

  beforeEach(() => jest.clearAllMocks());

  it('blocks demo sign-in in production even if the development flag was left on', async () => {
    const productionConfig = {get: (key: string) => ({NODE_ENV: 'production', DEV_AUTH_ENABLED: 'true'}[key])};
    const prisma = {user: {findUnique: jest.fn()}};
    const service = new AuthService(prisma as never, productionConfig as never, email as never);
    await expect(service.devLogin('mouad@housefamily.local')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('registers an unverified user with a hash and emails a non-stored token', async () => {
    const created = {id: 'user-a', name: 'Mouad', email: 'mouad@example.com', emailVerifiedAt: null};
    const prisma = {
      user: {findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(created)},
      authToken: {updateMany: jest.fn(), create: jest.fn()},
    };
    const service = new AuthService(prisma as never, config as never, email as never);
    await service.register('Mouad', 'MOUAD@example.com ', 'secure-password', 'en');

    const passwordHash = prisma.user.create.mock.calls[0][0].data.passwordHash as string;
    expect(passwordHash).not.toBe('secure-password');
    expect(prisma.authToken.create).toHaveBeenCalledWith({data: expect.objectContaining({userId: 'user-a', type: 'EMAIL_VERIFICATION', tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/)})});
    const actionUrl = email.send.mock.calls[0][0].actionUrl as string;
    const rawToken = new URL(actionUrl).searchParams.get('token')!;
    expect(createHash('sha256').update(rawToken).digest('hex')).toBe(prisma.authToken.create.mock.calls[0][0].data.tokenHash);
  });

  it('confirms a valid one-time token', async () => {
    const token = 'a'.repeat(43);
    const authToken = {id: 'token-a', userId: 'user-a', type: 'EMAIL_VERIFICATION', usedAt: null, expiresAt: new Date(Date.now() + 60_000)};
    const tx = {authToken: {updateMany: jest.fn().mockResolvedValue({count: 1})}, user: {update: jest.fn()}};
    const prisma = {
      authToken: {findUnique: jest.fn().mockResolvedValue(authToken)},
      user: {findUniqueOrThrow: jest.fn().mockResolvedValue({preferredLocale: 'AR'})},
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new AuthService(prisma as never, config as never, email as never);

    await expect(service.verifyEmail(token)).resolves.toEqual({userId: 'user-a', preferredLocale: 'ar'});
    expect(prisma.authToken.findUnique).toHaveBeenCalledWith({where: {tokenHash: createHash('sha256').update(token).digest('hex')}});
    expect(tx.user.update).toHaveBeenCalledWith({where: {id: 'user-a'}, data: {emailVerifiedAt: expect.any(Date)}});
  });

  it('does not allow an unverified user to log in', async () => {
    const passwordHash = await hash('secure-password', {type: argon2id});
    const prisma = {user: {findUnique: jest.fn().mockResolvedValue({id: 'user-a', passwordHash, emailVerifiedAt: null})}};
    const service = new AuthService(prisma as never, config as never, email as never);
    await expect(service.login('mouad@example.com', 'secure-password')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
