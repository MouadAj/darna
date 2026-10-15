import {getRequestConfig} from 'next-intl/server';
import {hasLocale} from 'next-intl';

export const locales = ['en', 'fr', 'ar'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({requestLocale}) => {
  const requested = await requestLocale;
  const locale: Locale = hasLocale(locales, requested) ? requested : 'en';
  return {locale, messages: (await import(`../../messages/${locale}.json`)).default};
});
