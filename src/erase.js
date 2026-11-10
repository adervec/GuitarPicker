// "Erase everything": remove GuitarPicker's data from this device, and nothing
// else. Every app shares the adervec.github.io origin, so this never calls
// localStorage.clear() — it deletes our own keys and only our rows in the
// shared maker-portal keys.
export const OWN_KEYS = ["guitarpicker.v1", "gp-coach-reply"];
export const CACHE_NAME = "guitarpicker-v1";   // keep in step with sw.js
const APP = "GuitarPicker";

export function eraseLocalData(storage) {
  for (const k of OWN_KEYS) storage.removeItem(k);
  try {   // portal-activity: [[ts, app, kind, n], ...] — drop ours, keep other apps'
    const rows = JSON.parse(storage.getItem("portal-activity") || "null");
    if (Array.isArray(rows)) storage.setItem("portal-activity", JSON.stringify(rows.filter((r) => r?.[1] !== APP)));
  } catch { /* not ours to repair */ }
  try {   // portal-installed: { app: ts }
    const reg = JSON.parse(storage.getItem("portal-installed") || "null");
    if (reg && typeof reg === "object" && APP in reg) { delete reg[APP]; storage.setItem("portal-installed", JSON.stringify(reg)); }
  } catch { /* not ours to repair */ }
}
