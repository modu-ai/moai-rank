import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { type Locale, defaultLocale, locales } from './config';

export default getRequestConfig(async () => {
  // Try to get locale from cookie first
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;

  let locale: Locale = defaultLocale;

  // Check if cookie value is a valid locale
  if (localeCookie && locales.includes(localeCookie as Locale)) {
    locale = localeCookie as Locale;
  } else {
    // Fall back to Accept-Language header
    const headersList = await headers();
    const acceptLanguage = headersList.get('Accept-Language');

    if (acceptLanguage) {
      // Parse Accept-Language header and find best match
      const preferredLocales = acceptLanguage
        .split(',')
        .map((lang) => {
          const [code, priority] = lang.trim().split(';q=');
          return {
            code: code.split('-')[0].toLowerCase(),
            priority: priority ? Number.parseFloat(priority) : 1,
          };
        })
        .sort((a, b) => b.priority - a.priority);

      for (const preferred of preferredLocales) {
        if (locales.includes(preferred.code as Locale)) {
          locale = preferred.code as Locale;
          break;
        }
      }
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
