import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiClientContext, createApiClient } from '@alpha-stocks/core';
import Constants from 'expo-constants';
import AuthProvider from '../components/AuthProvider';
import AuthGate from '../components/AuthGate';

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) || 'http://10.0.2.2:3000';

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 3_600_000,
            retry: 1,
          },
        },
      }),
  );

  const [apiClient] = useState(() => createApiClient(API_BASE_URL));

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientContext value={apiClient}>
        <AuthProvider>
          <AuthGate>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="stocks/[symbol]" options={{ title: 'Stock Details' }} />
              <Stack.Screen name="watchlists/[id]" options={{ title: 'Watchlist' }} />
              <Stack.Screen name="portfolio/[id]" options={{ title: 'Portfolio' }} />
            </Stack>
          </AuthGate>
        </AuthProvider>
      </ApiClientContext>
    </QueryClientProvider>
  );
}
