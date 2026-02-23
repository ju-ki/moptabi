'use client';
import './globals.css';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { useLoadScript } from '@react-google-maps/api';

import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/common/header';
import LoadingState from '@/components/common/LoadingState';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || '',
  });

  return (
    <html lang="ja">
      <head>
        <title>モプタビ - もっと旅がしたくなる旅行計画アプリ</title>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
      </head>
      <body>
        <>
          <SessionProvider>
            <Header />
            {!isLoaded ? <LoadingState isLoading={true} error={false} /> : <main>{children}</main>}
          </SessionProvider>
          <Toaster />
        </>
      </body>
    </html>
  );
}
