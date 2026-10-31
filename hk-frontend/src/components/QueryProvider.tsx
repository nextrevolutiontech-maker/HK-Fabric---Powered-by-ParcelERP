"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // PERF FIX: Data stays fresh for 5 minutes — prevents re-fetching on every screen switch
        staleTime: 5 * 60 * 1000,
        // Keep unused data in cache for 15 minutes — avoids cold-start re-fetch
        gcTime: 15 * 60 * 1000,
        // Don't refetch when window comes back into focus — eliminates surprise network spikes
        refetchOnWindowFocus: false,
        // Don't refetch when reconnecting to internet (handled manually via offline sync modal)
        refetchOnReconnect: false,
        // Only retry once on failure (default is 3 — reduces lag on bad network)
        retry: 1,
        // Retry after 2s on failure instead of the exponential default
        retryDelay: 2000,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
