"use client";

// TanStack Query wrapping the one real network resource in this app: Google
// sign-in state. `useCloudAccountQuery` restores an existing Google session
// silently (query); `useSignIn`/`useSignOut` are mutations that update the
// same query's cache directly instead of just invalidating it, since we
// already have the fresh profile (or null) in hand from the call itself.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientId, restoreSession, signIn, signOut } from "../api/googleAuth";

export const cloudAccountKey = ["cloud-account"];

export function useCloudAccountQuery() {
  return useQuery({
    queryKey: cloudAccountKey,
    queryFn: restoreSession,
    enabled: !!clientId(),
    staleTime: Infinity,   // this only ever changes via sign-in/out, both below
    retry: false,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signIn,
    onSuccess: (profile) => queryClient.setQueryData(cloudAccountKey, profile),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => signOut(),
    onSuccess: () => queryClient.setQueryData(cloudAccountKey, null),
  });
}
