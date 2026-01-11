import { locales } from '@/i18n/config';

/**
 * Generate static params for all supported locales
 * This enables static generation for locale-prefixed routes
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Locale layout - passes through children without additional wrapping
 * The root layout handles all providers and styling
 */
export default function LocaleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
