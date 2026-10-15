import {createHash} from 'node:crypto';
import {SessionService} from './session.service';

describe('SessionService logout', () => {
  it('revokes the current database session and clears its cookie', async () => {
    const prisma = {session: {deleteMany: jest.fn()}};
    const config = {get: jest.fn((_key: string, fallback: unknown) => fallback)};
    const service = new SessionService(prisma as never, config as never);
    const response = {clearCookie: jest.fn()};
    await service.destroy({cookies: {housefamily_session: 'private-token'}} as never, response as never);
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({where: {tokenHash: createHash('sha256').update('private-token').digest('hex')}});
    expect(response.clearCookie).toHaveBeenCalledWith('housefamily_session', {path: '/'});
  });
});
