// Best score per Theory Games quiz — a trimmed, XP/coin-free slice of the
// vanilla app's Store.progressFor("theory").drills. The vanilla app also
// tracks XP and course-step progress on the same object, but XP there is
// only ever granted by playing a song (see Store.addHistory), never by a
// drill, and courses/Training aren't part of this pilot — so this is just
// "best correct count per quiz", nothing gamified layered on top.
const KEY = "guitarpicker-web.theory-drills.v1";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Same stable-reference-until-write caching as player-settings.ts's
// historyCache — required for useSyncExternalStore to not loop.
let cache: Record<string, number> | null = null;

export function getDrillScores(): Record<string, number> {
  if (cache === null) cache = readJSON<Record<string, number>>(KEY, {});
  return cache;
}

/** Records a drill result, keeping the best (max) score per drill id. */
export function recordDrillScore(drillId: string, score: number): number {
  const scores = { ...getDrillScores() };
  const best = Math.max(scores[drillId] || 0, score);
  scores[drillId] = best;
  try { localStorage.setItem(KEY, JSON.stringify(scores)); } catch { /* storage unavailable/full */ }
  cache = scores;
  return best;
}
