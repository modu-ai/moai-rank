'use client';

import { useTransition, useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type Locale, locales, localeNames, defaultLocale } from '@/i18n/config';
import { useRouter, usePathname } from 'next/navigation';

export function LanguageSelector() {
  const locale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    startTransition(() => {
      // Build new pathname with new locale prefix
      // localePrefix: 'as-needed' means default locale (ko) has no prefix
      let newPathname: string;

      if (locale === defaultLocale) {
        // Currently on default locale without prefix (e.g., /dashboard)
        // Add prefix for non-default locales
        newPathname = newLocale === defaultLocale ? pathname : `/${newLocale}${pathname}`;
      } else {
        // Currently on non-default locale with prefix (e.g., /en/dashboard)
        // Remove current locale prefix and add new one if needed
        const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
        newPathname =
          newLocale === defaultLocale ? pathWithoutLocale : `/${newLocale}${pathWithoutLocale}`;
      }

      // Navigate to new locale path
      router.push(newPathname);
    });
  };

  // Prevent hydration mismatch by rendering placeholder until mounted
  if (!mounted) {
    return (
      <Button variant="outline" size="sm" disabled aria-label="Select language">
        <Globe className="h-4 w-4" />
        <span className="ml-1.5 hidden sm:inline">{localeNames[locale]}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending} aria-label="Select language">
          <Globe className="h-4 w-4" />
          <span className="ml-1.5 hidden sm:inline">{localeNames[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={locale === loc ? 'bg-accent text-accent-foreground' : ''}
          >
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
