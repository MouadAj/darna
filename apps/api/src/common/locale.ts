import type {AppLocale} from '@prisma/client';
import type {Locale} from '@housefamily/shared';

export function toAppLocale(locale: Locale): AppLocale {
  return locale.toUpperCase() as AppLocale;
}

export function toLocale(locale: AppLocale): Locale {
  return locale.toLowerCase() as Locale;
}
