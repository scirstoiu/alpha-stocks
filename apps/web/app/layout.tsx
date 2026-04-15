'use client';

import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientContext, createApiClient } from '@alpha-stocks/core';
import { useState } from 'react';
import Header from '@/components/layout/Header';
import AuthProvider from '@/components/AuthProvider';

const apiClient = createApiClient('');

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 3_600_000,
            retry: 2,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
          },
        },
      }),
  );

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen font-sans">
        <QueryClientProvider client={queryClient}>
          <ApiClientContext value={apiClient}>
            <AuthProvider>
              <Header />
              <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
            </AuthProvider>
          </ApiClientContext>
        </QueryClientProvider>
      </body>
    </html>
  );
}
