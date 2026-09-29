// Instrument tuning data. Ported from the vanilla app's src/music/notes.js —
// trimmed to the instruments actually used across the Tuner pilot and the
// ported Play song library (the original carries 59 instruments for every
// corner of the note highway; add more here if a ported song needs one).
import { midiToName } from "@/shared/lib/note-math";

export type InstrumentKind = "fretted" | "bowed" | "wind" | "percussion" | "keys" | "voice";

export interface InstrumentDef {
  name: string;
  strings: number[];
  frets: number;
  kind: InstrumentKind;
}

export type InstrumentId = keyof typeof INSTRUMENTS;

// Open-string MIDI, low -> high. `kind`/`frets` drive Play (fretboard
// fingering hints, band-voice selection); unstringed instruments carry
// strings: [] the same way the vanilla app does.
export const INSTRUMENTS = {
  "acoustic-guitar": { name: "Acoustic Guitar", strings: [40, 45, 50, 55, 59, 64], frets: 20, kind: "fretted" },
  "electric-guitar": { name: "Electric Guitar", strings: [40, 45, 50, 55, 59, 64], frets: 22, kind: "fretted" },
  bass: { name: "Bass Guitar", strings: [28, 33, 38, 43], frets: 20, kind: "fretted" },
  ukulele: { name: "Ukulele", strings: [67, 60, 64, 69], frets: 15, kind: "fretted" },
  mandolin: { name: "Mandolin", strings: [55, 62, 69, 76], frets: 20, kind: "fretted" },
  violin: { name: "Violin", strings: [55, 62, 69, 76], frets: 0, kind: "bowed" },
  "classical-guitar": { name: "Classical Guitar (nylon)", strings: [40, 45, 50, 55, 59, 64], frets: 19, kind: "fretted" },
  "bass-5": { name: "5-String Bass", strings: [23, 28, 33, 38, 43], frets: 22, kind: "fretted" },
  cello: { name: "Cello", strings: [36, 43, 50, 57], frets: 0, kind: "bowed" },
  "double-bass": { name: "Double Bass", strings: [28, 33, 38, 43], frets: 0, kind: "bowed" },
  harmonica: { name: "Harmonica (C diatonic)", strings: [], frets: 0, kind: "wind" },
  recorder: { name: "Recorder (soprano)", strings: [], frets: 0, kind: "wind" },
  "e-drums": { name: "Electronic Drums", strings: [], frets: 0, kind: "percussion" },
  "drum-kit": { name: "Drums", strings: [], frets: 0, kind: "percussion" },
  piano: { name: "Piano / Keys", strings: [], frets: 0, kind: "keys" },
  voice: { name: "Voice", strings: [], frets: 0, kind: "voice" },
} satisfies Record<string, InstrumentDef>;

export const ALT_TUNINGS: Record<string, Record<string, number[]>> = {
  "acoustic-guitar": {
    standard: [40, 45, 50, 55, 59, 64],
    "drop-d": [38, 45, 50, 55, 59, 64],
    dadgad: [38, 45, 50, 55, 57, 62],
    "open-g": [38, 43, 50, 55, 59, 62],
  },
  "electric-guitar": {
    standard: [40, 45, 50, 55, 59, 64],
    "drop-d": [38, 45, 50, 55, 59, 64],
    "half-step-down": [39, 44, 49, 54, 58, 63],
  },
  bass: { standard: [28, 33, 38, 43], "drop-d": [26, 33, 38, 43] },
};

export const STRING_LABELS: Record<string, string[]> = {
  "acoustic-guitar": ["E", "A", "D", "G", "B", "e"],
  "electric-guitar": ["E", "A", "D", "G", "B", "e"],
  bass: ["E", "A", "D", "G"],
  ukulele: ["G", "C", "E", "A"],
  mandolin: ["G", "D", "A", "E"],
  violin: ["G", "D", "A", "E"],
  "classical-guitar": ["E", "A", "D", "G", "B", "e"],
  "bass-5": ["B", "E", "A", "D", "G"],
  cello: ["C", "G", "D", "A"],
  "double-bass": ["E", "A", "D", "G"],
};

export function instrumentOptions(): { value: string; label: string }[] {
  return Object.entries(INSTRUMENTS).map(([id, i]) => ({ value: id, label: i.name }));
}

export function tuningOptions(instrument: string): string[] {
  return Object.keys(ALT_TUNINGS[instrument] || { standard: 1 });
}

export function tuningFor(instrument: string, tuningName: string): number[] {
  return (ALT_TUNINGS[instrument] || {})[tuningName]
    || (INSTRUMENTS as Record<string, InstrumentDef>)[instrument]?.strings
    || [];
}

/** String display label: note name (from STRING_LABELS, falling back to the
 *  string's own pitch name) or its player-facing number — by guitar/bass
 *  convention, 1 is the highest-pitched string, counting up to the lowest,
 *  i.e. the reverse of `strings` (stored low-to-high). */
export function stringLabel(instrument: string, strings: number[], index: number, style = "notes"): string {
  if (style === "numbers") return String(strings.length - index);
  return STRING_LABELS[instrument]?.[index] ?? midiToName(strings[index]).name;
}

export interface FretPosition {
  string: number;
  fret: number;
}

/** Best (string, fret) for a midi on a fretted instrument, preferring low frets. */
export function midiToFret(midi: number, instrumentId: string = "acoustic-guitar", tuning?: number[]): FretPosition | null {
  const strings = tuning || (INSTRUMENTS as Record<string, InstrumentDef>)[instrumentId]?.strings || [];
  const frets = (INSTRUMENTS as Record<string, InstrumentDef>)[instrumentId]?.frets || 20;
  let best: FretPosition | null = null;
  for (let s = strings.length - 1; s >= 0; s--) {
    const fret = midi - strings[s];
    if (fret >= 0 && fret <= frets) {
      if (!best || fret < best.fret) best = { string: s, fret };
    }
  }
  return best;
}

// Richter-tuned 10-hole C diatonic: blow/draw note per hole (index = hole-1).
export const HARMONICA_BLOW = [60, 64, 67, 72, 76, 79, 84, 88, 91, 96];
export const HARMONICA_DRAW = [62, 67, 71, 74, 77, 81, 83, 86, 89, 93];

export interface HoleTarget {
  hole: number;
  draw: boolean;
}

/** Hole + breath for a midi on a C diatonic (blow preferred on overlaps); null if unplayable. */
export function midiToHole(midi: number): HoleTarget | null {
  let i = HARMONICA_BLOW.indexOf(midi);
  if (i >= 0) return { hole: i + 1, draw: false };
  i = HARMONICA_DRAW.indexOf(midi);
  return i >= 0 ? { hole: i + 1, draw: true } : null;
}

export function nameToMidi(name: string): number | null {
  const m = name.trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!m) return null;
  const base = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[m[1].toUpperCase()];
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  const oct = parseInt(m[3], 10);
  return base + acc + (oct + 1) * 12;
}
