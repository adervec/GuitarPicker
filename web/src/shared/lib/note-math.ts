// Pure note/frequency math — no DOM, no framework. Ported from the vanilla
// app's src/music/notes.js (only the subset the Tuner pilot needs).

export const NOTE_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface NoteName {
  name: string;
  octave: number;
  pc: number;
  full: string;
  midi: number;
}

export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}
export function freqToMidiFloat(freq: number, a4 = 440): number {
  return 69 + 12 * Math.log2(freq / a4);
}
export function freqToMidi(freq: number, a4 = 440): number {
  return Math.round(freqToMidiFloat(freq, a4));
}

export function midiToName(midi: number): NoteName {
  const m = Math.round(midi);
  const pc = ((m % 12) + 12) % 12;
  const octave = Math.floor(m / 12) - 1;
  return { name: NOTE_SHARP[pc], octave, pc, full: NOTE_SHARP[pc] + octave, midi: m };
}

/** Cents of `freq` relative to a specific target midi (signed: flat < 0 < sharp). */
export function centsTo(freq: number, targetMidi: number, a4 = 440): number {
  return Math.round((freqToMidiFloat(freq, a4) - targetMidi) * 100);
}

// Ported from notes.js for the Glossary's scale explorer.
export const SCALES: Record<string, number[]> = {
  major:            [0, 2, 4, 5, 7, 9, 11],
  natural_minor:    [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor:   [0, 2, 3, 5, 7, 8, 11],
  melodic_minor:    [0, 2, 3, 5, 7, 9, 11],
  major_pentatonic: [0, 2, 4, 7, 9],
  minor_pentatonic: [0, 3, 5, 7, 10],
  blues:            [0, 3, 5, 6, 7, 10],
  dorian:           [0, 2, 3, 5, 7, 9, 10],
  mixolydian:       [0, 2, 4, 5, 7, 9, 10],
  chromatic:        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export function scaleNotes(rootPc: number, scale = "major"): number[] {
  const ints = SCALES[scale] || SCALES.major;
  return ints.map((i) => (rootPc + i) % 12);
}

export const CIRCLE_OF_FIFTHS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];

// Number of sharps(+)/flats(-) per major key — ported from notes.js for the
// Theory Games "Key Signatures" quiz.
export const KEY_SIGNATURES: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7,
  F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
};
