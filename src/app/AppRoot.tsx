import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppTheme } from '../theme/theme';
import { RootNavigator } from '../navigation/RootNavigator';
import { AuthProvider } from '../auth/AuthContext';
import { SiteProvider } from '../site/SiteContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mobile networks can be flaky; keep last-successful data available.
      staleTime: 30_000,
      gcTime: 24 * 60 * 60_000,
      retry: 2,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'smartSolarQueryCache',
  // Throttle writes so rapid refetches don't thrash AsyncStorage
  throttleTime: 3_000,
});

export function AppRoot() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            maxAge: 6 * 60 * 60_000, // 6 hours
            dehydrateOptions: {
              // Exclude large time-series queries from persistence — they easily exceed
              // Android's 2MB CursorWindow limit when serialized into a single AsyncStorage key.
              // These queries are time-sensitive anyway and should re-fetch on app open.
              shouldDehydrateQuery: (query) => {
                const key = (query.queryKey[0] as string | undefined) ?? '';
                const metaPersist = (query.options?.meta as any)?.persist;
                if (metaPersist === false) return false;

                // Never persist in-flight/pending work; it can rehydrate into a rejected promise
                // (e.g. auth-required queries after logout).
                if (query.state.status === 'pending') return false;
                if (query.state.fetchStatus === 'fetching') return false;

                // Avoid persisting auth-gated, frequently-changing feeds.
                if (['alerts'].includes(key)) return false;

                return !['telemetry', 'history', 'forecast', 'weather'].includes(key);
              },
            },
          }}
        >
          <AuthProvider>
            <SiteProvider>
              <NavigationContainer theme={AppTheme.navigation}>
                <RootNavigator />
              </NavigationContainer>
            </SiteProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
        <StatusBar style={AppTheme.statusBarStyle} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
