// Global store: settings, user songs, history, progress. Persists to localStorage.
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
  },
  songs: [],                 // user/imported/generated songs (built-ins live in code)
  history: [],               // session results
  progress: {},              // per-instrument: { xp, drills:{id:bestScore}, courses:{id:[done...]} }
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

  exportAll() {
    return JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2);
  },
};
