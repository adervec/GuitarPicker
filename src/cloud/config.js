// Cloud-sync configuration (Google Drive appData — opt-in, no backend).
//
// Cloud sync is OFF until a public OAuth 2.0 *Web* client ID is set below. With it
// empty, GuitarPicker stays 100% local (no network, no accounts) and the Settings
// panel just shows a "not configured" note. See docs/CLOUD-SYNC-SETUP.md for how to
// create one (free, ~5 min) — or reuse the client ID from another app you deploy to
// the same origin (appDataFolder is per-Google-project; distinct filenames don't clash).
//
// The client ID is a PUBLIC identifier, not a secret — safe to commit. Security is
// twofold: Google enforces the "Authorized JavaScript origins" you register, AND the
// OAUTH_ORIGINS allowlist below also refuses sign-in app-side on any origin we don't
// expect (e.g. a fork of this repo redeployed elsewhere), so it can't borrow this
// project's consent screen or quota. Keep the two lists in sync.
//
// Sync uses the user's OWN Drive "appDataFolder" — a hidden, app-private space. We
// request only the minimal `drive.appdata` scope, so the app can see just the single
// sync file it creates, never the rest of the user's Drive.
export const GOOGLE_CLIENT_ID = "";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
export const SYNC_FILENAME = "guitarpicker-sync.json";

// Origins permitted to use the committed client ID. localhost / 127.0.0.1 (any port)
// are always allowed for local dev. Add each production origin, matching the OAuth
// provider's "Authorized JavaScript origins".
export const OAUTH_ORIGINS = ["https://adervec.github.io"];

export function originAllowed() {
  if (typeof location === "undefined") return true; // non-browser (tests/SSR): nothing to police
  try {
    const h = location.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1") return true;
    return OAUTH_ORIGINS.includes(location.origin);
  } catch { return false; }
}

// Configured = a client ID is set AND we're on an allowed origin (fail closed on forks).
export function syncConfigured() { return !!GOOGLE_CLIENT_ID && originAllowed(); }
