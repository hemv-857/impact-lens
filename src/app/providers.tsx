"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

// Singleton QueryClient so HMR doesn't recreate clients on every render.
let _client: QueryClient | null = null;
function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

function getBrowserClient() {
  if (typeof window === "undefined") return makeClient();
  if (!_client) _client = makeClient();
  return _client;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const client = getBrowserClient();
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="impactlens-theme">
      <SessionProvider>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
