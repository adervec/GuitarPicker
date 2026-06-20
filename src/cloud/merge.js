// Pure merge of two cloud-sync payloads (no I/O — unit-testable).
//
// Content sets are unioned so no device loses data when two devices both made
// changes offline; the coin balance (which moves both up and down) is
// last-write-wins by `savedAt`. Payload shape:
//   { app, v, savedAt, songs[], history[], progress{}, coins, unlocks{} }
export function mergeSyncable(a, b) {
  a = a || {}; b = b || {};

  // songs: union by id, newer createdAt wins on conflict
  const byId = new Map();
  for (const s of [...(a.songs || []), ...(b.songs || [])]) {
    if (!s || !s.id) continue;
    const prev = byId.get(s.id);
    if (!prev) { byId.set(s.id, s); continue; }
    if ((Date.parse(s.createdAt) || 0) > (Date.parse(prev.createdAt) || 0)) byId.set(s.id, s);
  }
  const songs = [...byId.values()];

  // history: union by (ts, songId), newest first, capped at 1000
  const seen = new Set(); const history = [];
  for (const h of [...(a.history || []), ...(b.history || [])].sort((x, y) => (y.ts || 0) - (x.ts || 0))) {
    const k = (h.ts || 0) + "|" + (h.songId || "");
    if (seen.has(k)) continue;
    seen.add(k); history.push(h);
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
  const coins = (a.savedAt || 0) >= (b.savedAt || 0) ? (a.coins || 0) : (b.coins || 0);

  return { app: "guitarpicker", v: 1, savedAt: Math.max(a.savedAt || 0, b.savedAt || 0), songs, history, progress, coins, unlocks };
}
