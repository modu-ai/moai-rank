import type { Metadata } from 'next';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import './globals.css';

const GA_TRACKING_ID = 'G-3JBPGGGMJZ';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rank.moai.dev';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'MoAI Rank - Claude Code Agent Leaderboard',
    template: '%s | MoAI Rank',
  },
  description:
    'Track and compare Claude Code usage rankings. See who leads the AI coding revolution with real-time leaderboards, efficiency metrics, and developer statistics.',
  keywords: [
    'Claude Code',
    'AI coding',
    'token usage',
    'leaderboard',
    'ranking',
    'developer tools',
    'AI agent',
    'coding assistant',
    'MoAI',
    'Anthropic',
  ],
  authors: [{ name: 'MoAI Team', url: 'https://moai.dev' }],
  creator: 'MoAI Team',
  publisher: 'MoAI',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'MoAI Rank',
    title: 'MoAI Rank - Claude Code Agent Leaderboard',
    description:
      'Track and compare Claude Code usage rankings. See who leads the AI coding revolution with real-time leaderboards and developer statistics.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MoAI Rank - Claude Code Agent Leaderboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MoAI Rank - Claude Code Agent Leaderboard',
    description:
      'Track and compare Claude Code usage rankings. See who leads the AI coding revolution.',
    images: ['/og-image.png'],
    creator: '@moai_dev',
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/favicon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.png',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: siteUrl,
  },
  category: 'technology',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_TRACKING_ID}');
            `}
          </Script>
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Analytics />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
