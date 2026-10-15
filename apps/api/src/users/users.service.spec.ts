import {UsersService} from './users.service.js';

describe('UsersService', () => {
  it('persists the signed-in user locale and returns the public locale value', async () => {
    const prisma = {
      user: {update: jest.fn().mockResolvedValue({preferredLocale: 'AR'})},
    };
    const service = new UsersService(prisma as never);

    await expect(service.updatePreferences('user-a', 'ar')).resolves.toEqual({preferredLocale: 'ar'});
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: {id: 'user-a'},
      data: {preferredLocale: 'AR'},
      select: {preferredLocale: true},
    });
  });
});
