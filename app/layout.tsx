import { ToasterComponent as Toaster } from '@/components/ui/sonner';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import React from 'react';
import Providers from '../providers/providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Mezon',
  description: 'Mezon elektron hujjat aylanish tizimi',
  icons: {
    icon: '/mexon-mark.png',
  },
  other: {
    google: 'notranslate',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html
      lang="uz"
      translate="no"
      className="notranslate"
      suppressHydrationWarning
      nonce={nonce}>
      <head suppressHydrationWarning>
        <meta name="google" content="notranslate" />
        <meta httpEquiv="Content-Language" content="uz" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.setAttribute('translate','no');document.documentElement.classList.add('notranslate');`,
          }}
        />
      </head>
      <body
        translate="no"
        className={`notranslate ${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning>
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            duration: 2000,
            style: {
              fontSize: '16px',
            },
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
