// Google sign-in — the ported/trimmed half of the vanilla app's
// src/cloud/config.js + src/cloud/sync.js. This pilot only proves out
// TanStack Query against the app's one real network resource (there's no
// backend; everything else is localStorage), so it stops at "who's signed
// in" — it does not port the Drive appData file sync itself.
//
// Same client ID as the vanilla app, same origin gate (Google's own
// "Authorized JavaScript origins" is the real enforcement; this is a second,
// app-side check so a fork deployed elsewhere can't ride on this app's OAuth
// consent screen without supplying its own ID).
const BUILTIN_CLIENT_ID = "547617739897-br6dj2facmsc34qnkjb5u4dbfhju39pu.apps.googleusercontent.com";
const OAUTH_ORIGINS = ["https://adervec.github.io"];
// Identity only — no drive.appdata scope, since this pilot doesn't sync files.
const SCOPE = "openid email profile";

// The Google Identity Services (GIS) script attaches this global — no
// official type package for it, so a minimal ambient shape covers what this
// module actually calls.
interface GoogleTokenResponse {
  access_token: string;
  error?: string;
  error_description?: string;
}
interface GoogleTokenClient {
  requestAccessToken(opts: { prompt: string }): void;
}
interface GoogleOAuth2 {
  initTokenClient(opts: {
    client_id: string;
    scope: string;
    callback: (resp: GoogleTokenResponse) => void;
    error_callback: (err: { message?: string }) => void;
  }): GoogleTokenClient;
  revoke(token: string): void;
}
declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth2 } };
  }
}

export interface GoogleProfile {
  name: string;
  email: string;
  picture: string;
}

export function originAllowed(): boolean {
  // Server-rendered (no `location`): default closed. Real client components
  // call this after mount, never during the SSR pass, to avoid the widget's
  // markup differing between server and client (a hydration mismatch) —
  // see widgets/cloud-account-badge, which gates on a `mounted` flag.
  if (typeof location === "undefined") return false;
  const h = location.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1") return true;
  return OAUTH_ORIGINS.includes(location.origin);
}

export function clientId(): string {
  return originAllowed() ? BUILTIN_CLIENT_ID : "";
}

let gisLoad: Promise<void> | null = null;
function loadGIS(): Promise<void> {
  if (typeof window !== "undefined" && window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoad) return gisLoad;
  gisLoad = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { gisLoad = null; reject(new Error("Couldn't load Google Identity Services (offline?)")); };
    document.head.appendChild(s);
  });
  return gisLoad;
}

function requestToken(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts!.oauth2!.initTokenClient({
      client_id: clientId(),
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error));
        resolve(resp.access_token);
      },
      error_callback: (err) => reject(new Error(err?.message || "Sign-in was cancelled")),
    });
    client.requestAccessToken({ prompt });
  });
}

async function fetchProfile(token: string): Promise<GoogleProfile> {
  const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Google profile fetch failed (${r.status})`);
  const j = await r.json();
  return { name: j.name || j.email || "Google account", email: j.email || "", picture: j.picture || "" };
}

let token: string | null = null;
let tokenExp = 0;

export function hasSession(): boolean { return !!token && Date.now() < tokenExp; }

/** Silent check only — never opens the account chooser. Used by the initial query. */
export async function restoreSession(): Promise<GoogleProfile | null> {
  if (!clientId()) return null;
  if (hasSession()) return fetchProfile(token!);
  await loadGIS();
  try {
    token = await requestToken("none");
    tokenExp = Date.now() + 3600_000;
    return await fetchProfile(token);
  } catch {
    return null; // no existing Google session — that's a normal, not-signed-in state
  }
}

/** Interactive sign-in: may open the Google account chooser. */
export async function signIn(): Promise<GoogleProfile> {
  if (!clientId()) throw new Error("Cloud features aren't configured for this origin");
  await loadGIS();
  token = await requestToken("consent");
  tokenExp = Date.now() + 3600_000;
  return fetchProfile(token);
}

export function signOut(): void {
  if (token && window.google?.accounts?.oauth2) {
    try { window.google.accounts.oauth2.revoke(token); } catch { /* best effort */ }
  }
  token = null; tokenExp = 0;
}
