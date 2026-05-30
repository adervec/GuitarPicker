// Song schema: validate, parse, serialize, plus a compact authoring notation.
import { nameToMidi } from "./notes.js";

export const SONG_VERSION = 1;

export function uid() {
  return "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function newSong(partial = {}) {
  return {
    v: SONG_VERSION,
    id: partial.id || uid(),
    title: partial.title || "Untitled",
    artist: partial.artist || "Unknown / Trad.",
    instrument: partial.instrument || "acoustic-guitar",
    key: partial.key ?? "C",
    bpm: partial.bpm || 90,
    capo: partial.capo || 0,
    difficulty: partial.difficulty || "beginner",
    background: partial.background || { type: "solid", value: "" },
    audio: partial.audio || { backing: null, vocal: null },
    lyrics: partial.lyrics || [],
    notes: partial.notes || [],
    source: partial.source || "manual",
    createdAt: partial.createdAt || new Date().toISOString(),
  };
}

export function validateSong(o) {
  const errors = [];
  if (!o || typeof o !== "object") return { ok: false, errors: ["not an object"] };
  if (!o.title) errors.push("missing title");
  if (!Array.isArray(o.notes)) errors.push("notes must be an array");
  else o.notes.forEach((n, i) => {
    if (typeof n.time !== "number") errors.push(`note ${i}: time`);
    if (!Array.isArray(n.midi)) errors.push(`note ${i}: midi[]`);
  });
  if (typeof o.bpm !== "number" || o.bpm <= 0) errors.push("bpm");
  return { ok: errors.length === 0, errors };
}

export function serialize(song) { return JSON.stringify(song, null, 2); }

export function parse(text) {
  const o = JSON.parse(text);
  const v = validateSong(o);
  if (!v.ok) throw new Error("Invalid song: " + v.errors.join(", "));
  return newSong(o); // normalize / fill defaults
}

export function songDuration(song) {
  if (!song.notes.length) return 0;
  return song.notes.reduce((m, n) => Math.max(m, n.time + (n.dur || 0.4)), 0);
}

/**
 * Compact authoring notation -> notes[].
 * Tokens separated by spaces. Each token is PITCHES:beats
 *   - PITCHES: a note like "E4", a chord "C4+E4+G4", or "r" for rest
 *   - beats: number of beats (defaults to 1 if omitted)
 * Example: "C4:1 E4:1 G4:2 C4+E4+G4:2 r:1"
 */
export function parseMelody(bpm, str, { string = null } = {}) {
  const spb = 60 / bpm;
  let t = 0;
  const notes = [];
  for (const tok of str.trim().split(/\s+/)) {
    if (!tok) continue;
    const [pitchPart, beatPart] = tok.split(":");
    const beats = beatPart ? parseFloat(beatPart) : 1;
    const dur = beats * spb;
    if (pitchPart === "r" || pitchPart === "rest") { t += dur; continue; }
    const midi = pitchPart.split("+").map((p) => nameToMidi(p)).filter((m) => m != null);
    if (midi.length) notes.push({ time: +t.toFixed(4), dur: +(dur * 0.92).toFixed(4), midi });
    t += dur;
  }
  return notes;
}
