// Test utility: wraps components in QueryClientProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,        // Don't retry in tests
        gcTime: 0,           // Don't cache between tests
        staleTime: 0,
      },
    },
  });
}

export function TestQueryWrapper({ children }) {
  const client = createTestQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
