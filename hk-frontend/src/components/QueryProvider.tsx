"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Data considered fresh for 3 minutes — no refetch on screen switch
        staleTime: 3 * 60 * 1000,
        // Keep unused data in cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Don't refetch when window comes back into focus
        refetchOnWindowFocus: false,
        // Don't refetch when reconnecting to internet (we handle that manually)
        refetchOnReconnect: false,
        // Only retry once on failure (default is 3)
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
