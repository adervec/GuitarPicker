"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// This whole app is client-only (a local-first tool, same as the vanilla
// GuitarPicker it's piloting FSD/Next/RQ for) — the only real network calls
// are Google's Drive/Identity endpoints (see entities/cloud-account), so
// there's no server-rendered data to hydrate into the query cache. Still
// follow Next's recommended split so this keeps working if that changes:
// a fresh QueryClient per server render, one reused client in the browser.
let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return new QueryClient();
  browserQueryClient ??= new QueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}
