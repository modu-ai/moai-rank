import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { locales } from '@/i18n/config';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

/**
 * Generate static params for all supported locales
 * This enables static generation for locale-prefixed routes
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Locale layout - provides NextIntlClientProvider for client components
 * This ensures translations are updated when locale changes
 */
export default async function LocaleLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="relative flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}
