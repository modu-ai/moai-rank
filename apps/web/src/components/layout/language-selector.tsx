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
import { type Locale, locales, localeNames } from '@/i18n/config';
import { useRouter, usePathname } from '@/i18n/routing';

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
    if (newLocale === locale) return;

    startTransition(() => {
      // usePathname from @/i18n/routing returns path without locale prefix
      // useRouter from @/i18n/routing handles locale-aware navigation
      router.replace(pathname, { locale: newLocale });
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
