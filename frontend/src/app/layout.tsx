'use client';
import './globals.css';

import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { useLoadScript } from '@react-google-maps/api';

import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/common/header';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || '',
  });

  return (
    <html lang="ja">
      <title>AI旅行計画プランナー</title>
      <body>
        <>
          <ClerkProvider>
            <Header />
            {!isLoaded ? <div>Loading...</div> : <main>{children}</main>}
          </ClerkProvider>
          <Toaster />
        </>
      </body>
    </html>
  );
}
