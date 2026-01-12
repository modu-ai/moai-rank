export const locales = ['en', 'ko', 'ja', 'zh'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
  ja: '日本語',
  zh: '中文',
};

export const localeFlags: Record<Locale, string> = {
  en: 'US',
  ko: 'KR',
  ja: 'JP',
  zh: 'CN',
};
