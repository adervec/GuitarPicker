// Song schema helpers. Ported (trimmed — validate/import for authoring are
// still left out, since the Song Editor only needs newSong/parseMelody/uid)
// from the vanilla app's src/music/song-format.js.
import { nameToMidi } from "@/entities/instrument/model/data";

export function uid(): string {
  return crypto.randomUUID();
}

// Ported from song-format.js for the Song Editor's genre <select>.
export const GENRES = [
  "Classical", "Folk", "Blues", "Rock", "Pop", "Jazz", "Country",
  "Holiday", "Children's", "Hymn/Gospel", "Funk/Soul", "World", "Electronic", "Unknown",
];

/** Fretting-hand finger, for the Guitar tab editor's per-note color coding.
 *  "T" is thumb; null means "no finger assigned" (still gets a neutral
 *  color, distinct from never having been set at all — see `Note.finger`). */
export type Finger = 1 | 2 | 3 | 4 | "T" | null;

export interface Note {
  time: number;
  dur: number;
  midi: number[];
  chord?: boolean;
  gain?: number;
  /** Guitar-tab string index (0 = lowest-pitched string), for single-pitch
   *  notes placed via the Song Editor's Guitar tab view. Purely a rendering/
   *  editing hint for that view — everything else (grading, playback,
   *  notation) only ever reads `midi`, so it's safe to leave unset; a note
   *  without it falls back to entities/instrument's midiToFret(). */
  str?: number;
  /** Stable id for the Guitar tab editor's selection/drag/undo, assigned
   *  lazily — only when a note is created or first selected there, so notes
   *  from notation/the piano roll don't carry it until they're touched in
   *  that view. */
  id?: string;
  /** See `Finger` above. Set only by the Guitar tab editor; nothing else in
   *  the pilot reads it. */
  finger?: Finger;
}

export interface LyricWord {
  t: number;
  text: string;
}

export interface LyricLine {
  time: number;
  dur?: number;
  text: string;
  words?: LyricWord[];
}

export interface SongPart {
  instrument: string;
  name?: string;
  notes: Note[];
  gain?: number;
}

export interface SongBackground {
  type: string;
  value: string | string[];
}

export interface SongAudio {
  backing: string | null;
  vocal: string | null;
}

export interface SongVoice {
  notes: Note[];
}

export interface Song {
  v: number;
  id?: string;
  title: string;
  artist: string;
  instrument: string;
  key: string;
  bpm: number;
  capo: number;
  difficulty: string;
  genre: string;
  mood: string;
  tags: string[];
  background: SongBackground;
  audio: SongAudio;
  parts: SongPart[];
  lyrics: LyricLine[];
  voice: SongVoice;
  notes: Note[];
  source: string;
  partName?: string;
}

export function newSong(partial: Partial<Song> = {}): Song {
  return {
    v: 1,
    id: partial.id || uid(),
    title: partial.title || "Untitled",
    artist: partial.artist || "Unknown / Trad.",
    instrument: partial.instrument || "acoustic-guitar",
    key: partial.key ?? "C",
    bpm: partial.bpm || 90,
    capo: partial.capo || 0,
    difficulty: partial.difficulty || "beginner",
    genre: partial.genre || "Unknown",
    mood: partial.mood || "",
    tags: partial.tags || [],
    background: partial.background || { type: "solid", value: "" },
    audio: partial.audio || { backing: null, vocal: null },
    parts: partial.parts || [],
    lyrics: partial.lyrics || [],
    voice: partial.voice || { notes: [] },
    notes: partial.notes || [],
    source: partial.source || "manual",
  };
}

/** Every part of the arrangement, the song's own notes first. */
export function songParts(song: Song): SongPart[] {
  const lead: SongPart = { instrument: song.instrument || "acoustic-guitar", name: song.partName || "Lead", notes: song.notes || [] };
  return [lead, ...(song.parts || []).filter((p) => p?.notes?.length)];
}

/** Which part the player plays: theirs if the song has one, else the lead. */
export function pickPart(song: Song, instrument: string): { parts: SongPart[]; index: number; lead: SongPart } {
  const parts = songParts(song);
  const index = Math.max(0, parts.findIndex((p) => p.instrument === instrument));
  return { parts, index, lead: parts[index] };
}

export function songDuration(song: Song): number {
  if (!song.notes.length) return 0;
  return song.notes.reduce((m, n) => Math.max(m, n.time + (n.dur || 0.4)), 0);
}

/**
 * Compact authoring notation -> notes[]. Tokens separated by spaces, each
 * PITCHES:beats — PITCHES is a note ("E4"), a chord ("C4+E4+G4") or "r".
 */
export function parseMelody(bpm: number, str: string): Note[] {
  const spb = 60 / bpm;
  let t = 0;
  const notes: Note[] = [];
  for (const tok of str.trim().split(/\s+/)) {
    if (!tok) continue;
    const [pitchPart, beatPart] = tok.split(":");
    const beats = beatPart ? parseFloat(beatPart) : 1;
    const dur = beats * spb;
    if (pitchPart === "r" || pitchPart === "rest") { t += dur; continue; }
    const midi = pitchPart.split("+").map((p) => nameToMidi(p)).filter((m): m is number => m != null);
    if (midi.length) notes.push({ time: +t.toFixed(4), dur: +(dur * 0.92).toFixed(4), midi });
    t += dur;
  }
  return notes;
}

// Lightweight metadata analysis: infer a genre + mood when a song lacks them.
export function analyzeSong(song: Song): { genre: string; mood: string } {
  const title = (song.title || "").toLowerCase();
  const inst = song.instrument || "acoustic-guitar";
  const bpm = song.bpm || 90;
  const keyword: [string, string][] = [
    ["blues", "Blues"], ["boogie", "Blues"], ["jazz", "Jazz"], ["swing", "Jazz"], ["rag", "Jazz"],
    ["waltz", "Classical"], ["sonata", "Classical"], ["symphony", "Classical"], ["nocturne", "Classical"],
    ["minuet", "Classical"], ["prelude", "Classical"], ["fugue", "Classical"], ["canon", "Classical"], ["ode", "Classical"],
    ["carol", "Holiday"], ["christmas", "Holiday"], ["jingle", "Holiday"], ["noel", "Holiday"],
    ["grace", "Hymn/Gospel"], ["holy", "Hymn/Gospel"], ["saints", "Hymn/Gospel"], ["hymn", "Hymn/Gospel"],
    ["twinkle", "Children's"], ["lamb", "Children's"], ["abc", "Children's"], ["nursery", "Children's"], ["birthday", "Children's"],
    ["greensleeves", "Folk"], ["scarborough", "Folk"], ["shanty", "Folk"], ["ballad", "Folk"], ["danny", "Folk"],
    ["auld", "Folk"], ["rising", "Folk"], ["lang syne", "Folk"],
    ["pop", "Pop"], ["progression", "Pop"], ["trainer", "Pop"], ["chord", "Pop"],
    ["country", "Country"], ["honky", "Country"],
  ];
  let genre: string | null = null;
  for (const [k, g] of keyword) if (title.includes(k)) { genre = g; break; }
  if (!genre) {
    if (inst === "electric-guitar") genre = bpm >= 120 ? "Rock" : "Blues";
    else if (inst === "bass") genre = "Funk/Soul";
    else if (inst === "piano") genre = "Classical";
    else if (inst === "violin" || inst === "mandolin") genre = "Folk";
    else genre = bpm <= 80 ? "Folk" : "Pop";
  }
  const mood = bpm >= 130 ? "Energetic" : bpm >= 100 ? "Upbeat" : bpm <= 70 ? "Mellow" : "Bright";
  return { genre, mood };
}

// Fill missing genre/mood/tags on a song (in place) and return it.
export function ensureMetadata(song: Song): Song {
  if (!song) return song;
  if (!song.genre || song.genre === "Unknown" || !song.mood) {
    const a = analyzeSong(song);
    if (!song.genre || song.genre === "Unknown") song.genre = a.genre;
    if (!song.mood) song.mood = a.mood;
  }
  if (!Array.isArray(song.tags)) song.tags = [];
  return song;
}

export function serialize(song: Song): string { return JSON.stringify(song, null, 2); }
