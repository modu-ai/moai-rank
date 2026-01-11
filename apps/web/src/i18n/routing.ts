import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';
import { type Locale, defaultLocale, locales } from './config';

/**
 * Routing configuration for next-intl v4
 * Defines how locales are handled in URLs
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  // 'as-needed' means the default locale (ko) won't have a prefix in the URL
  // e.g., / for Korean, /en for English
  localePrefix: 'as-needed',
});

/**
 * Navigation helpers with locale awareness
 * Use these instead of next/link and next/navigation
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

export type { Locale };
