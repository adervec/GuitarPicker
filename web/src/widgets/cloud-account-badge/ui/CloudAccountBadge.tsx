"use client";

import { useSyncExternalStore } from "react";
import { useCloudAccountQuery, useSignIn, useSignOut } from "@/entities/cloud-account/model/useCloudAccount";
import { clientId } from "@/entities/cloud-account/api/googleAuth";
import styles from "./CloudAccountBadge.module.css";

// `clientId()` reads `location`, which doesn't exist during SSR and *does*
// exist on the client's first (hydration) render — reading it straight in
// render would make server and client disagree on the markup.
// `useSyncExternalStore` is React's sanctioned fix for exactly this: its
// `getServerSnapshot` matches the SSR pass, and React itself reconciles the
// real client value right after hydration (no manual setState-in-an-effect,
// which the "you might not need an effect" lint rule now flags). The origin
// never changes at runtime, so the subscription is a no-op.
const noSubscribe = () => () => {};
function useOriginAllowed() {
  return useSyncExternalStore(noSubscribe, () => !!clientId(), () => false);
}

/** Small header widget proving out TanStack Query against this app's one
 *  real network resource (Google sign-in) — see Design.md's FSD/Next/RQ
 *  pilot entry for why this exists instead of full Drive file sync. */
export function CloudAccountBadge() {
  // Hooks run unconditionally (rules-of-hooks) — useCloudAccountQuery is
  // itself gated by `enabled: !!clientId()`, so off-origin this just never
  // fires; we only skip rendering below.
  const account = useCloudAccountQuery();
  const signIn = useSignIn();
  const signOut = useSignOut();
  const allowed = useOriginAllowed();

  if (!allowed) return null; // off-origin (not localhost / the live site) — nothing to show

  if (account.isLoading) {
    return <span className={styles.badge}>Checking Google session…</span>;
  }

  if (account.data) {
    return (
      <div className={styles.badge}>
        {account.data.picture && (
          // eslint-disable-next-line @next/next/no-img-element -- external Google avatar, not a static asset
          <img src={account.data.picture} alt="" className={styles.avatar} />
        )}
        <span>{account.data.name}</span>
        <button
          className={styles.link}
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className={styles.badge}>
      <button
        className={styles.button}
        onClick={() => signIn.mutate()}
        disabled={signIn.isPending}
      >
        {signIn.isPending ? "Opening Google…" : "Connect Google"}
      </button>
      {signIn.isError && <span className={styles.error}>{signIn.error.message}</span>}
    </div>
  );
}
