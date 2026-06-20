// Cloud-sync configuration.
//
// Cloud sync is OFF until you paste your own OAuth 2.0 *Web* client ID below.
// With it empty, GuitarPicker stays 100% local (no network, no accounts) — the
// Settings panel just shows a "not configured" note. See docs/CLOUD-SYNC-SETUP.md
// for how to create the client ID (it's free; takes a few minutes).
//
// Sync uses the user's OWN Google Drive "appDataFolder" — a hidden, app-private
// space. We request the minimal `drive.appdata` scope: GuitarPicker can only see
// the single sync file it creates, never the rest of your Drive.
export const GOOGLE_CLIENT_ID = "";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
export const SYNC_FILENAME = "guitarpicker-sync.json";

export function syncConfigured() { return !!GOOGLE_CLIENT_ID; }
