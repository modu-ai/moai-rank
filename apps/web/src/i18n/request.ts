import { getRequestConfig } from 'next-intl/server';
import { type Locale, defaultLocale, locales } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  // Use the locale from URL segment [locale] - this is the primary source
  const urlLocale = await requestLocale;

  // Validate the URL locale, fall back to default if invalid
  const locale: Locale =
    urlLocale && locales.includes(urlLocale as Locale) ? (urlLocale as Locale) : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
