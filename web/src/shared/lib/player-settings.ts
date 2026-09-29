// A trimmed, localStorage-backed settings + history store for the ported Play
// engine — the subset of the vanilla app's src/state.js that Play actually
// reads/writes. No coin economy, no cosmetics/Locker, no cloud sync: those
// features aren't part of this pilot, so History entries just won't carry a
// `coins` field (Play's banner already treats that as optional).
const KEY = "guitarpicker-web.play-settings.v1";
const HISTORY_KEY = "guitarpicker-web.play-history.v1";

export interface PlayerSettings {
  instrument: string;
  a4: number;
  backingVolume: number;
  vocalVolume: number;
  micGate: number;
  noteSpeed: number;
  playbackSpeed: number;
  strictMode: boolean;
  // Performance Mode only ("🎯 Free mode") — practice a song note-by-note at
  // your own pace: no auto-playback at all, the highway freezes on each note
  // and waits (mic only) for you to play it before advancing. Mutually
  // exclusive with Learn mode in that engine.
  freeMode: boolean;
  stringLabels: string;
  fretboardSize: string;
  // Independent from `fretboardSize` (the main highway's own string/lane
  // size) — this one is just for Performance Mode's optional fretboard-
  // diagram overlay (see createPerformanceEngine.ts's `drawDiagram`), so
  // resizing one doesn't resize the other.
  fretDiagramSize: string;
  band: boolean;
  noteSounds: boolean;
  showFingering: boolean;
  karaokeLyrics: boolean;
  inputDeviceId: string;
  outputDeviceId: string;
  // Which Play engine views/play/ui/PlayPage.tsx mounts at /play/[id] —
  // "new" is the guitar-tab note-highway (createPerformanceEngine.ts,
  // string+fret+finger colors, audio-synced), "classic" is the original
  // pitch-row highway with grading (createPlayEngine.ts), kept exactly as
  // it was rather than replaced. Falls back to classic regardless of this
  // setting for non-fretted instruments, since Performance Mode's whole
  // model is string+fret.
  playerVersion: "new" | "classic";
  // Not in DEFAULTS (no Settings-page control for it) — Karaoke reads it as
  // `s.karaokeScoring ?? true`, so it's an optional persisted override rather
  // than a value every settings object is expected to carry.
  karaokeScoring?: boolean;
}

export const DEFAULTS: PlayerSettings = {
  instrument: "acoustic-guitar",
  a4: 440,
  backingVolume: 0.6,
  vocalVolume: 0.7,
  micGate: 0.012,
  noteSpeed: 1.0,
  playbackSpeed: 1.0,
  strictMode: false,
  freeMode: false,
  stringLabels: "notes",
  fretboardSize: "M",
  fretDiagramSize: "M",
  band: true,
  noteSounds: true,
  showFingering: true,
  karaokeLyrics: true,
  inputDeviceId: "",
  outputDeviceId: "",
  playerVersion: "new",
};

// The Play/Karaoke engines' host contract — a thin adapter their React
// wrapper pages (views/play, views/karaoke) supply so the engines stay
// framework-agnostic (see createPlayEngine.ts's header comment).
export interface EngineHost {
  song: import("@/entities/song/model/song-format").Song;
  settings: PlayerSettings;
  setSetting: <K extends keyof PlayerSettings>(k: K, v: PlayerSettings[K]) => void;
  addHistory: (entry: HistoryEntry) => void;
  onBack: () => void;
  // Opens this song for editing — always as an independent draft when the
  // song is a read-only built-in (a fresh id via cloneSongAsDraft(), so
  // editing it can never touch the original track), or the existing song
  // directly when it's already a user song. Optional: only
  // createPerformanceEngine.ts renders an Edit button for it so far — the
  // classic engine wasn't touched for this.
  onEdit?: () => void;
}

export interface HistoryEntry {
  ts: number;
  songId: string;
  songTitle: string;
  instrument: string;
  score: number;
  accuracy: number;
  maxStreak: number;
  passed: boolean;
  durationSec: number;
  notes: { perfect: number; good: number; off: number; miss: number };
  mode?: string;
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

let settings: PlayerSettings = { ...DEFAULTS, ...readJSON<Partial<PlayerSettings>>(KEY, {}) };
const settingsListeners = new Set<() => void>();

export function getSettings(): PlayerSettings { return settings; }

export function setSetting<K extends keyof PlayerSettings>(key: K, value: PlayerSettings[K]): void {
  settings = { ...settings, [key]: value };
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage unavailable/full */ }
  settingsListeners.forEach((fn) => fn());
}

/** For useSyncExternalStore (see views/settings) — notified on every setSetting. */
export function subscribeSettings(fn: () => void): () => void {
  settingsListeners.add(fn);
  return () => settingsListeners.delete(fn);
}

// `getHistory()` caches the array so repeated calls (e.g. React's
// useSyncExternalStore, which polls getSnapshot every render to check for
// changes) return the *same* reference until something actually writes —
// a fresh array each call would look like a change on every render and
// loop forever. `addHistory` is the only writer, so it's the only thing
// that invalidates the cache.
let historyCache: HistoryEntry[] | null = null;

/** Session results — score/accuracy/etc. No coin economy in this pilot. */
export function addHistory(entry: HistoryEntry): HistoryEntry {
  const history = readJSON<HistoryEntry[]>(HISTORY_KEY, []);
  history.unshift(entry);
  if (history.length > 200) history.length = 200;
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* storage unavailable/full */ }
  historyCache = history;
  return entry;
}

export function getHistory(): HistoryEntry[] {
  if (historyCache === null) historyCache = readJSON<HistoryEntry[]>(HISTORY_KEY, []);
  return historyCache;
}

/** Everything this pilot keeps in localStorage, for the Settings "Export all
 *  data" button. Trimmed shape vs. the vanilla app's Store.exportAll() —
 *  no songs/progress/coins/unlocks, since none of that is tracked here. */
export function exportAll(): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), settings, history: getHistory() }, null, 2);
}

/** Wipes both localStorage keys this pilot owns — does not touch the
 *  vanilla app's own `guitarpicker.v1` key, a different key entirely. */
export function resetAll(): void {
  try { localStorage.removeItem(KEY); localStorage.removeItem(HISTORY_KEY); } catch { /* storage unavailable */ }
}
