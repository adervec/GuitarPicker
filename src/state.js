// Global store: settings, user songs, history, progress. Persists to localStorage.
import { DEFAULT_AVATAR } from "./cosmetics/avatars.js";
import { DEFAULT_GUITAR } from "./cosmetics/guitars.js";

const KEY = "guitarpicker.v1";

const DEFAULTS = {
  settings: {
    theme: "midnight",
    inputDeviceId: "",
    outputDeviceId: "",
    instrument: "acoustic-guitar",
    a4: 440,
    backingVolume: 0.6,
    vocalVolume: 0.7,
    micGate: 0.012,          // RMS noise gate for pitch detection
    noteSpeed: 1.0,          // highway scroll multiplier
    metronome: false,
    avatar: { ...DEFAULT_AVATAR },   // player cosmetic loadout (see cosmetics/avatars.js)
    guitar: { ...DEFAULT_GUITAR },   // guitar cosmetic loadout (see cosmetics/guitars.js)
    streak: { count: 0, best: 0, lastDay: "" },  // daily-practice streak (see music/daily.js)
  },
  songs: [],                 // user/imported/generated songs (built-ins live in code)
  history: [],               // session results
  progress: {},              // per-instrument: { xp, drills:{id:bestScore}, courses:{id:[done...]} }
  coins: 0,                  // earned currency for unlocking cosmetics
  unlocks: {},               // unlocked cosmetic keys -> true (see cosmetics/economy.js)
};

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
    const i = state.songs.findIndex((s) => s.id === song.id);
    if (i >= 0) state.songs[i] = song; else state.songs.push(song);
    persist();
    this.emit({ type: "songs" });
    return song;
  },
  deleteSong(id) {
    state.songs = state.songs.filter((s) => s.id !== id);
    persist();
    this.emit({ type: "songs" });
  },

  // ----- history / progress -----
  addHistory(entry) {
    state.history.unshift(entry);
    if (state.history.length > 1000) state.history.length = 1000;
    // award xp on the instrument
    const inst = entry.instrument || "acoustic-guitar";
    const p = (state.progress[inst] ||= { xp: 0, drills: {}, courses: {} });
    p.xp = (p.xp || 0) + Math.round(entry.score / 10);
    // award coins (accuracy-based + a pass bonus); attach to entry for the UI
    const coinGain = Math.round((entry.accuracy || 0) / 5) + (entry.passed ? 15 : 0);
    state.coins = (state.coins || 0) + coinGain;
    entry.coins = coinGain;
    // playing counts toward today's practice streak
    this.recordPracticeDay(new Date(entry.ts || Date.now()).toISOString().slice(0, 10));
    persist();
    this.emit({ type: "history", entry });
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
    const consecutive = cur.lastDay && (new Date(day) - new Date(cur.lastDay) === 86400000);
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
    persist();
    this.emit({ type: "coins", coins: state.coins });
    return state.coins;
  },
  spendCoins(n) {
    if ((state.coins || 0) < n) return false;
    state.coins -= n;
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
};
