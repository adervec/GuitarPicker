// Global store: settings, user songs, history, progress. Persists to localStorage.
import { DEFAULT_AVATAR } from "./cosmetics/avatars.js";
import { DEFAULT_GUITAR } from "./cosmetics/guitars.js";
import { localDay, dayBefore } from "./day.js";

const KEY = "guitarpicker.v1";

const DEFAULTS = {
  settings: {
    // no theme here: colours are the house theme list, chosen through font.js (src/theme-migrate.js moves old skins)
    inputDeviceId: "",
    outputDeviceId: "",
    instrument: "acoustic-guitar",
    a4: 440,
    backingVolume: 0.6,
    vocalVolume: 0.7,
    micGate: 0.012,          // RMS noise gate for pitch detection
    noteSpeed: 1.0,          // highway scroll multiplier
    metronome: false,
    karaokeScoring: true,    // grade the singer's voice in karaoke mode (sing-and-score)
    karaokeLyrics: true,     // word-by-word karaoke highlight in the play-view lyric overlay
    avatar: { ...DEFAULT_AVATAR },   // player cosmetic loadout (see cosmetics/avatars.js)
    guitar: { ...DEFAULT_GUITAR },   // guitar cosmetic loadout (see cosmetics/guitars.js)
    streak: { count: 0, best: 0, lastDay: "" },  // daily-practice streak (see music/daily.js)
  },
  songs: [],                 // user/imported/generated songs (built-ins live in code)
  history: [],               // session results
  progress: {},              // per-instrument: { xp, drills:{id:bestScore}, courses:{id:[done...]} }
  coins: 0,                  // earned currency for unlocking cosmetics
  unlocks: {},               // unlocked cosmetic keys -> true (see cosmetics/economy.js)
  coinsAt: 0,                // when the coin balance last changed (sync: the newer balance wins)
  songTombstones: [],        // deleted songs { id, deleted: true, updatedAt }, so a stale device can't bring them back
};

// A saved old app skin (settings.theme) is kept as loaded until src/theme-migrate.js moves it to
// the house theme list and deletes it.
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return {
      settings: { ...DEFAULTS.settings, ...(parsed.settings || {}) },
      songs: parsed.songs || [],
      history: parsed.history || [],
      progress: parsed.progress || {},
      coins: parsed.coins || 0,
      unlocks: parsed.unlocks || {},
      coinsAt: parsed.coinsAt || 0,
      songTombstones: parsed.songTombstones || [],
    };
  } catch (e) {
    console.warn("state load failed, using defaults", e);
    return structuredClone(DEFAULTS);
  }
}

const state = load();
const listeners = new Set();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.warn("persist failed (quota?)", e); }
}

export const Store = {
  get: () => state,
  persist: () => persist(),
  settings: () => state.settings,

  on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  emit(evt) { listeners.forEach((fn) => fn(evt, state)); },

  setSetting(key, value) {
    state.settings[key] = value;
    persist();
    this.emit({ type: "settings", key, value });
  },

  // ----- songs -----
  allUserSongs: () => state.songs,
  getSong(id) { return state.songs.find((s) => s.id === id); },
  saveSong(song) {
    song.updatedAt = Date.now();
    state.songTombstones = state.songTombstones.filter((x) => x.id !== song.id);
    const i = state.songs.findIndex((s) => s.id === song.id);
    if (i >= 0) state.songs[i] = song; else state.songs.push(song);
    persist();
    this.emit({ type: "songs" });
    return song;
  },
  deleteSong(id) {
    state.songs = state.songs.filter((s) => s.id !== id);
    state.songTombstones = [...state.songTombstones.filter((x) => x.id !== id), { id, deleted: true, updatedAt: Date.now() }];
    persist();
    this.emit({ type: "songs" });
  },

  // ----- history / progress -----
  addHistory(entry) {
    state.history.unshift(entry);
    // maker-portal character sheet (same-origin localStorage; stays in this browser)
    // house session ledger (standard 25): one row per finished run; the id stops a synced-back run counting twice
    try { globalThis.appFont?.logSession?.({ kind: "practice", minutes: Math.max(1, Math.round((entry.durationSec || 120) / 60)), id: "gp-" + entry.ts, at: entry.ts }); } catch (_) { /* hub ledger is optional */ }
    if (state.history.length > 1000) state.history.length = 1000;
    // per-note detail is for AI review of recent runs; the origin's storage is shared, so only the newest 50 keep it
    for (let i = 50; i < state.history.length; i++) delete state.history[i].judgments;
    // award xp on the instrument
    const inst = entry.instrument || "acoustic-guitar";
    const p = (state.progress[inst] ||= { xp: 0, drills: {}, courses: {} });
    p.xp = (p.xp || 0) + Math.round(entry.score / 10);
    // award coins (accuracy-based + a pass bonus); attach to entry for the UI
    const coinGain = Math.round((entry.accuracy || 0) / 5) + (entry.passed ? 15 : 0);
    state.coins = (state.coins || 0) + coinGain;
    state.coinsAt = Date.now();
    entry.coins = coinGain;
    // a completed run — pass OR fail — counts toward today's practice streak
    // (a noble failed attempt still counts; the streak can only be earned by
    //  actually playing, never by ticking daily-activity boxes)
    this.recordPracticeDay(localDay(entry.ts || Date.now()));
    persist();
    this.emit({ type: "history", entry });
  },
  /** Store (or with null, remove) an AI review on a session, beside the app's own score. */
  setAiReview(ts, review) {
    const h = state.history.find((x) => x.ts === ts);
    if (!h) return false;
    if (review) h.aiReview = review; else delete h.aiReview;
    persist();
    this.emit({ type: "history" });
    return true;
  },
  historyFor(instrument) {
    return instrument ? state.history.filter((h) => h.instrument === instrument) : state.history;
  },
  progressFor(instrument) {
    return (state.progress[instrument] ||= { xp: 0, drills: {}, courses: {} });
  },
  recordDrill(instrument, drillId, score) {
    const p = this.progressFor(instrument);
    p.drills[drillId] = Math.max(p.drills[drillId] || 0, score);
    persist();
    this.emit({ type: "progress" });
  },
  markCourseStep(instrument, courseId, stepId) {
    const p = this.progressFor(instrument);
    const arr = (p.courses[courseId] ||= []);
    if (!arr.includes(stepId)) arr.push(stepId);
    persist();
    this.emit({ type: "progress" });
  },

  // ----- daily practice streak -----
  // `day` is a "YYYY-MM-DD" key. Bumps the streak when called on a new day,
  // continuing it only if the previous practice day was exactly one day before.
  recordPracticeDay(day) {
    const cur = state.settings.streak || { count: 0, best: 0, lastDay: "" };
    if (!day || cur.lastDay === day) return cur;        // already counted today
    const consecutive = cur.lastDay && dayBefore(day) === cur.lastDay;   // by date, so DST's 23h/25h days still chain
    const count = consecutive ? (cur.count || 0) + 1 : 1;
    const st = { count, best: Math.max(cur.best || 0, count), lastDay: day };
    state.settings.streak = st;
    persist();
    this.emit({ type: "streak", streak: st });
    return st;
  },

  // ----- economy (coins + cosmetic unlocks) -----
  coins: () => state.coins || 0,
  addCoins(n) {
    state.coins = Math.max(0, (state.coins || 0) + Math.round(n));
    state.coinsAt = Date.now();
    persist();
    this.emit({ type: "coins", coins: state.coins });
    return state.coins;
  },
  spendCoins(n) {
    if ((state.coins || 0) < n) return false;
    state.coins -= n;
    state.coinsAt = Date.now();
    persist();
    this.emit({ type: "coins", coins: state.coins });
    return true;
  },
  isUnlocked(key) { return !!state.unlocks[key]; },
  unlock(key) {
    if (!state.unlocks[key]) {
      state.unlocks[key] = true;
      persist();
      this.emit({ type: "unlocks", key });
    }
  },

  exportAll() {
    return JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2);
  },

  // ----- cloud-syncable subset (one document, kept in step by appFont.cloud.syncDoc) -----
  // Portable user content only — device-specific settings stay local. No timestamp of the
  // export itself: an unchanged document must stay byte-identical, so syncDoc skips the write.
  exportSyncable() {
    return {
      app: "guitarpicker", v: 2,
      songs: [...state.songs, ...state.songTombstones], history: state.history, progress: state.progress,
      coins: state.coins || 0, coinsAt: state.coinsAt || 0, unlocks: state.unlocks || {},
    };
  },
  // Take a merged document (cloud/merge.js) as this device's copy, persist, and notify.
  applySyncable(doc) {
    state.songs = doc.songs.filter((s) => !s.deleted);
    state.songTombstones = doc.songs.filter((s) => s.deleted);
    state.history = doc.history;
    state.progress = doc.progress;
    state.coins = doc.coins;
    state.coinsAt = doc.coinsAt;
    state.unlocks = doc.unlocks;
    persist();
    this.emit({ type: "sync" });
    this.emit({ type: "coins", coins: state.coins });
  },
};
