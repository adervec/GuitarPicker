// Cloud sync through the house door (appFont.cloud, font.js): sign-in, the reader's chosen
// cloud and the safe read-merge-write all live there (house standards 1 and 30). This file
// only says WHAT GuitarPicker syncs: one document, merged record by record (merge.js).
import { Store } from "../state.js";
import { mergeSyncable } from "./merge.js";

export const SYNC_FILENAME = "guitarpicker-sync.json";
const cloud = () => globalThis.appFont?.cloud;
let _lastSync = 0;

export function syncConfigured() { return !!cloud()?.syncDoc; }
export function isSignedIn() { return !!cloud()?.signedIn(); }
export function lastSync() { return _lastSync; }
export function account() { return globalThis.appFont?.getAccount?.() || null; }
export function cloudLabel() { return cloud()?.label() || "Google Drive"; }

// A cloud copy is untrusted input: only a GuitarPicker document of the right shape is merged.
const isDoc = (d) => d && typeof d === "object" && d.app === "guitarpicker" && Array.isArray(d.songs) &&
  Array.isArray(d.history || []) && typeof (d.progress || {}) === "object" && typeof (d.unlocks || {}) === "object";

export async function syncNow() {
  const r = await cloud().syncDoc(SYNC_FILENAME, {
    load: () => Store.exportSyncable(),
    save: (doc) => Store.applySyncable(doc),
    merge: (local, remote) => (isDoc(remote) ? mergeSyncable(local, remote) : local),
  });
  _lastSync = Date.now();
  return { ...r, songs: Store.allUserSongs().length, at: _lastSync };
}

export async function signIn() {
  await cloud().signIn();
  return syncNow();
}

export function signOut() { cloud()?.signOut(); }

// Sync on start (silently, if this device was signed in before), on focus, when the network
// returns, and a few seconds after a change. Never shows Google's window by itself.
let _timer = 0, _busy = false;
async function quietSync() {
  if (_busy || !syncConfigured() || !navigator.onLine) return;
  _busy = true;
  try {
    if (!isSignedIn()) { if (!account()) return; await cloud().signIn({ silent: true }); }
    await syncNow();
  } catch (e) { console.warn("sync skipped:", e.message); }
  finally { _busy = false; }
}
export function startAutoSync() {
  quietSync();
  addEventListener("focus", quietSync);
  addEventListener("online", quietSync);
  Store.on((evt) => {
    if (_busy || evt.type === "sync" || evt.type === "settings") return; // its own write, or device-only settings
    clearTimeout(_timer); _timer = setTimeout(quietSync, 5000);
  });
}
