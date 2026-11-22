// Pure merge of two cloud-sync payloads (no I/O — unit-testable). House standard 30.
//
// Songs are records: for each id the most recently changed copy wins (`updatedAt`, else
// `createdAt` for songs saved before v2), and a deleted song is a tombstone
// `{ id, deleted: true, updatedAt }` so a stale device cannot bring it back. History,
// xp, drills, courses and unlocks only ever grow, so they are unioned. The coin balance
// moves both ways: the copy whose `coinsAt` (when the balance last changed) is newer wins.
//   { app, v: 2, songs[], history[], progress{}, coins, coinsAt, unlocks{} }
const TOMBSTONE_DAYS = 90;
export const songTime = (s) => Number(s.updatedAt) || Date.parse(s.createdAt) || 0;

export function mergeSyncable(a, b, now = Date.now()) {
  a = a || {}; b = b || {};

  const byId = new Map();
  for (const s of [...(b.songs || []), ...(a.songs || [])]) {
    if (!s || !s.id) continue;
    const prev = byId.get(s.id);
    if (!prev || songTime(s) > songTime(prev) || (songTime(s) === songTime(prev) && s.deleted && !prev.deleted)) byId.set(s.id, s);
  }
  const songs = [...byId.values()].filter((s) => !s.deleted || now - songTime(s) < TOMBSTONE_DAYS * 864e5);

  // history: union by (ts, songId), newest first, capped at 1000; a run reviewed by the AI on
  // one device keeps that review (fields one copy lacks are filled from the other)
  // ponytail: removing a review (undo) on one device is undone by the other's copy; add a tombstone if that bites
  const seen = new Map(); const history = [];
  for (const h of [...(a.history || []), ...(b.history || [])].sort((x, y) => (y.ts || 0) - (x.ts || 0))) {
    const k = (h.ts || 0) + "|" + (h.songId || "");
    const i = seen.get(k);
    if (i !== undefined) { history[i] = { ...h, ...history[i] }; continue; }
    seen.set(k, history.length); history.push(h);
  }
  if (history.length > 1000) history.length = 1000;

  // progress: per-instrument xp = max, drills = max per id, courses = union
  const progress = {};
  for (const src of [a.progress || {}, b.progress || {}]) {
    for (const [inst, p] of Object.entries(src)) {
      const cur = progress[inst] || (progress[inst] = { xp: 0, drills: {}, courses: {} });
      cur.xp = Math.max(cur.xp || 0, p.xp || 0);
      for (const [id, sc] of Object.entries(p.drills || {})) cur.drills[id] = Math.max(cur.drills[id] || 0, sc || 0);
      for (const [cid, arr] of Object.entries(p.courses || {})) cur.courses[cid] = [...new Set([...(cur.courses[cid] || []), ...(arr || [])])];
    }
  }

  const unlocks = { ...(a.unlocks || {}), ...(b.unlocks || {}) };
  // v1 payloads carried only savedAt; it stands in for coinsAt
  const ca = a.coinsAt ?? a.savedAt ?? 0, cb = b.coinsAt ?? b.savedAt ?? 0;
  const [coins, coinsAt] = ca > cb ? [a.coins || 0, ca] : [b.coins || 0, cb];

  return { app: "guitarpicker", v: 2, songs, history, progress, coins, coinsAt, unlocks };
}
