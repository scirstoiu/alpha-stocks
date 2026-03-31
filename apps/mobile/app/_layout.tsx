import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiClientContext, createApiClient } from '@alpha-stocks/core';
import Constants from 'expo-constants';
import AuthProvider from '../components/AuthProvider';
import AuthGate from '../components/AuthGate';
import ErrorBoundary from '../components/ErrorBoundary';

const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) || 'https://alpha-stocks-742708333282.europe-west1.run.app';

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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ApiClientContext value={apiClient}>
          <AuthProvider>
            <AuthGate>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="stocks/[symbol]" options={{ title: 'Stock Details' }} />

                <Stack.Screen name="portfolio/[id]" options={{ title: 'Portfolio' }} />
              </Stack>
            </AuthGate>
          </AuthProvider>
        </ApiClientContext>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
