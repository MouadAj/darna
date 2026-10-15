import {Injectable} from '@nestjs/common';
import type {Locale} from '@housefamily/shared';
import {PrismaService} from '../prisma/prisma.service.js';
import {toAppLocale, toLocale} from '../common/locale.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updatePreferences(userId: string, locale: Locale) {
    const user = await this.prisma.user.update({
      where: {id: userId},
      data: {preferredLocale: toAppLocale(locale)},
      select: {preferredLocale: true},
    });
    return {preferredLocale: toLocale(user.preferredLocale)};
  }
}
