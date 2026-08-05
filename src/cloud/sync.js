// Google Drive appData sync — fully client-side, no backend, no bundled SDK.
//
// Auth: Google Identity Services (loaded from Google's CDN only when the user
// opts in) gives a short-lived OAuth access token for the `drive.appdata` scope.
// Storage: the Drive v3 REST API (plain fetch) reads/writes a single JSON file
// in the user's hidden appDataFolder. Data never touches any server we operate.
import { Store } from "../state.js";
import { DRIVE_SCOPE, SYNC_FILENAME, driveClientId } from "./config.js";

const DRIVE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
// Drive's simple/multipart uploads cap out at 5 MB. A song with an imported backing
// track carries it as a data URL, so a library of two or three blows straight past
// that — anything larger goes via the resumable protocol instead.
const RESUMABLE_OVER = 4 * 1024 * 1024;

let _gis = null;            // promise resolving once GIS script is loaded
let _token = null;          // current access token
let _tokenExp = 0;          // epoch ms when it expires
let _lastSync = 0;          // epoch ms of last successful sync
let _profile = null;        // { name, email, picture } of the connected account (cosmetic)

/** The client ID in force: a user-supplied override wins, else the built-in one. */
function clientId() { return driveClientId(Store.settings().driveClientId); }
export function syncConfigured() { return !!clientId(); }
export function isSignedIn() { return !!_token && Date.now() < _tokenExp; }
export function lastSync() { return _lastSync; }
export function account() { return _profile; }

function loadGIS() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (_gis) return _gis;
  _gis = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { _gis = null; reject(new Error("Couldn't load Google Identity Services (offline?)")); };
    document.head.appendChild(s);
  });
  return _gis;
}

function requestToken(prompt) {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId(),
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error));
        _token = resp.access_token;
        _tokenExp = Date.now() + (Number(resp.expires_in) || 3600) * 1000;
        resolve(_token);
      },
      // Without this a dismissed or blocked popup never settles the promise.
      error_callback: (err) => reject(new Error(err?.message || "Sign-in was cancelled")),
    });
    client.requestAccessToken({ prompt });
  });
}

// Obtain an access token. `interactive` may open the Google account chooser; otherwise
// it only ever reuses an existing grant silently.
async function getToken(interactive) {
  if (!syncConfigured()) throw new Error("Cloud sync is not configured");
  if (_token && Date.now() < _tokenExp - 60000) return _token;
  await loadGIS();
  // Try silent first even when interactive: a returning user with a live Google
  // session gets reconnected with no popup at all.
  let token = null;
  try { token = await requestToken("none"); }
  catch (e) { if (!interactive) throw e; }
  if (!token) token = await requestToken("consent");
  if (!_profile) await fetchProfile(token);
  return token;
}

// Best-effort: which Google account is connected, for display in Settings only.
async function fetchProfile(token) {
  try {
    const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { const j = await r.json(); _profile = { name: j.name || j.email || "Google account", email: j.email || "", picture: j.picture || "" }; }
  } catch { /* cosmetic only — never fails a sync */ }
  return _profile;
}

async function api(url, opts = {}) {
  const token = await getToken(false);
  const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  if (res.status === 401) { _token = null; throw new Error("Google session expired — sign in again"); }
  if (!res.ok) throw new Error(`Drive error ${res.status}: ${(await res.text()).slice(0, 140)}`);
  return res;
}

async function findFileId() {
  const q = encodeURIComponent(`name='${SYNC_FILENAME}'`);
  const res = await api(`${DRIVE}/files?spaces=appDataFolder&fields=files(id,modifiedTime)&q=${q}`);
  const json = await res.json();
  return json.files?.[0]?.id || null;
}

async function downloadPayload(id) {
  const res = await api(`${DRIVE}/files/${id}?alt=media`);
  try { return await res.json(); } catch { return null; }
}

// Big payloads (any song with imported audio) use the resumable protocol: initiate,
// then a single PUT of the bytes. Simple and multipart uploads would 413 at 5 MB.
async function uploadResumable(id, body) {
  const meta = id ? {} : { name: SYNC_FILENAME, parents: ["appDataFolder"] };
  const init = await api(
    id ? `${UPLOAD}/files/${id}?uploadType=resumable` : `${UPLOAD}/files?uploadType=resumable`,
    { method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "application/json" },
      body: JSON.stringify(meta) });
  const session = init.headers.get("Location");
  if (!session) throw new Error("Drive upload session was not created");
  // No auth header here on purpose — the session URL carries its own credentials.
  const put = await fetch(session, { method: "PUT", body });
  if (!put.ok) throw new Error(`Drive upload failed (${put.status})`);
  return id || (await put.json()).id;
}

async function uploadPayload(id, payload) {
  const body = JSON.stringify(payload);
  if (body.length > RESUMABLE_OVER) return uploadResumable(id, body);
  if (id) {
    await api(`${UPLOAD}/files/${id}?uploadType=media`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    return id;
  }
  // create: multipart (metadata + media) so we can set parents=appDataFolder
  const boundary = "gpsync" + String(payload.savedAt || 0);
  const meta = { name: SYNC_FILENAME, parents: ["appDataFolder"] };
  const multipart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
  const res = await api(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: multipart,
  });
  return (await res.json()).id;
}

// Public: prompt the account chooser and do a first sync.
export async function signIn() {
  await getToken(true);
  return syncNow();
}

export function signOut() {
  if (_token && window.google?.accounts?.oauth2) {
    try { window.google.accounts.oauth2.revoke(_token); } catch {}
  }
  _token = null; _tokenExp = 0; _profile = null;
}

// Pull remote → merge into local → push merged back. Returns a small summary.
export async function syncNow() {
  const id = await findFileId();
  const remote = id ? await downloadPayload(id) : null;
  if (remote && remote.app === "guitarpicker") Store.importSyncable(remote);
  const merged = Store.exportSyncable();
  const newId = await uploadPayload(id, merged);
  _lastSync = Date.now();
  return { pulled: !!remote, fileId: newId, songs: merged.songs.length, at: _lastSync };
}
