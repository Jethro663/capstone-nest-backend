import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) =>
        Math.min(1000 * 2 ** attemptIndex, 30000) + Math.random() * 1000,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

