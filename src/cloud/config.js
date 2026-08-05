// Cloud-sync configuration (Google Drive appData — opt-in, no backend).
//
// Sync is AVAILABLE on the origins listed below and OFF until the user signs in.
// Nothing here causes a network request: the Google script is fetched, and a token
// requested, only when someone clicks "Connect Google Drive" in Settings.
//
// The client ID below is a PUBLIC identifier, not a secret — it is safe to commit,
// and it is deliberately shared with the author's other local-first apps (Tachyread,
// GymTracker) so all of them work on adervec.github.io with zero per-user setup.
// Security is twofold: Google enforces the "Authorized JavaScript origins" registered
// for the project, AND the OAUTH_ORIGINS gate below refuses it app-side on any origin
// we don't expect, so a fork redeployed elsewhere cannot borrow this project's consent
// screen or quota — it must supply its own ID (Settings, or edit this file).
//
// Sync uses the user's OWN Drive "appDataFolder" — a hidden, app-private space. We
// request only the minimal `drive.appdata` scope for files, plus the standard identity
// scopes so Settings can show which account is connected. `drive.appdata` can see just
// the files this app creates, never the rest of the user's Drive. Because the folder is
// per-Google-project, the sibling apps share it — distinct filenames keep them apart.
export const BUILTIN_CLIENT_ID = "547617739897-br6dj2facmsc34qnkjb5u4dbfhju39pu.apps.googleusercontent.com";

export const DRIVE_SCOPE = "openid email profile https://www.googleapis.com/auth/drive.appdata";
export const SYNC_FILENAME = "guitarpicker-sync.json";

// Origins permitted to use the built-in client ID. localhost / 127.0.0.1 (any port)
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

/**
 * The client ID to actually use. A user-supplied one (fork / self-host, set in
 * Settings) always wins; otherwise the built-in ID, but only on an allowed origin.
 * Empty string means sync is unavailable here — fail closed on forks.
 */
export function driveClientId(override = "") {
  return String(override || "").trim() || (originAllowed() ? BUILTIN_CLIENT_ID : "");
}

export function syncConfigured(override) { return !!driveClientId(override); }
