// Notes, frequencies, names, scales, keys, instrument tunings, fretboard math.

export const NOTE_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const NOTE_FLAT  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export function midiToFreq(midi, a4 = 440) { return a4 * Math.pow(2, (midi - 69) / 12); }
export function freqToMidiFloat(freq, a4 = 440) { return 69 + 12 * Math.log2(freq / a4); }
export function freqToMidi(freq, a4 = 440) { return Math.round(freqToMidiFloat(freq, a4)); }

export function midiToName(midi, { flat = false } = {}) {
  const m = Math.round(midi);
  const names = flat ? NOTE_FLAT : NOTE_SHARP;
  const pc = ((m % 12) + 12) % 12;
  const octave = Math.floor(m / 12) - 1;
  return { name: names[pc], octave, pc, full: names[pc] + octave, midi: m };
}
export function noteFull(midi, opts) { return midiToName(midi, opts).full; }

/** signed cents that `freq` is from the nearest equal-tempered note */
export function centsFromNearest(freq, a4 = 440) {
  const f = freqToMidiFloat(freq, a4);
  const nearest = Math.round(f);
  return { midi: nearest, cents: Math.round((f - nearest) * 100) };
}
/** cents of `freq` relative to a specific target midi */
export function centsTo(freq, targetMidi, a4 = 440) {
  return Math.round((freqToMidiFloat(freq, a4) - targetMidi) * 100);
}

export function nameToMidi(name) {
  // "C4", "F#3", "Bb2"
  const m = name.trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!m) return null;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase()];
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  const oct = parseInt(m[3], 10);
  return base + acc + (oct + 1) * 12;
}

// ---------- Scales ----------
export const SCALES = {
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

export function scaleNotes(rootPc, scale = "major") {
  const ints = SCALES[scale] || SCALES.major;
  return ints.map((i) => (rootPc + i) % 12);
}

// Number of sharps(+)/flats(-) per major key, for "key signature" display
export const KEY_SIGNATURES = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7,
  F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
};
export const CIRCLE_OF_FIFTHS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];

// ---------- Instruments & tunings (open-string MIDI, low -> high) ----------
export const INSTRUMENTS = {
  "acoustic-guitar": { name: "Acoustic Guitar", strings: [40, 45, 50, 55, 59, 64], frets: 20, kind: "fretted" },
  "electric-guitar": { name: "Electric Guitar", strings: [40, 45, 50, 55, 59, 64], frets: 22, kind: "fretted" },
  "bass":            { name: "Bass Guitar",     strings: [28, 33, 38, 43],          frets: 20, kind: "fretted" },
  "ukulele":         { name: "Ukulele",         strings: [67, 60, 64, 69],          frets: 15, kind: "fretted" },
  "mandolin":        { name: "Mandolin",        strings: [55, 62, 69, 76],          frets: 20, kind: "fretted" },
  "violin":          { name: "Violin",          strings: [55, 62, 69, 76],          frets: 0,  kind: "bowed" },
  "piano":           { name: "Piano / Keys",    strings: [],                        frets: 0,  kind: "keys" },
  "voice":           { name: "Voice",           strings: [],                        frets: 0,  kind: "voice" },
  "harmonica":       { name: "Harmonica (C diatonic)", strings: [],                 frets: 0,  kind: "wind" },
  "recorder":        { name: "Recorder (soprano)", strings: [],                     frets: 0,  kind: "wind" },
  "whistle":         { name: "Tin Whistle (D)",   strings: [],                      frets: 0,  kind: "wind" },
  "flute":           { name: "Flute",             strings: [],                      frets: 0,  kind: "wind" },
  "melodica":        { name: "Melodica",          strings: [],                      frets: 0,  kind: "keys" },
  "kalimba":         { name: "Kalimba (17-key C)", strings: [],                     frets: 0,  kind: "tines" },
  "e-drums":         { name: "Electronic Drums",  strings: [],                      frets: 0,  kind: "percussion" },
};

// Richter-tuned 10-hole C diatonic: blow/draw note per hole (index = hole-1).
// ponytail: C harp only; add a key param + transposition if other keys matter.
export const HARMONICA_BLOW = [60, 64, 67, 72, 76, 79, 84, 88, 91, 96];
export const HARMONICA_DRAW = [62, 67, 71, 74, 77, 81, 83, 86, 89, 93];

/** Hole + breath for a midi on a C diatonic (blow preferred on overlaps); null if unplayable (no bends). */
export function midiToHole(midi) {
  let i = HARMONICA_BLOW.indexOf(midi);
  if (i >= 0) return { hole: i + 1, draw: false };
  i = HARMONICA_DRAW.indexOf(midi);
  return i >= 0 ? { hole: i + 1, draw: true } : null;
}

export const ALT_TUNINGS = {
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
  ukulele: { standard: [67, 60, 64, 69] },
  mandolin: { standard: [55, 62, 69, 76] },
  violin: { standard: [55, 62, 69, 76] },
};

export const STRING_LABELS = {
  "acoustic-guitar": ["E", "A", "D", "G", "B", "e"],
  "electric-guitar": ["E", "A", "D", "G", "B", "e"],
  bass: ["E", "A", "D", "G"],
  ukulele: ["G", "C", "E", "A"],
  mandolin: ["G", "D", "A", "E"],
  violin: ["G", "D", "A", "E"],
};

/** Best (string, fret) for a midi on a fretted instrument, preferring low frets. */
export function midiToFret(midi, instrumentId = "acoustic-guitar", tuning) {
  const strings = tuning || (INSTRUMENTS[instrumentId] || {}).strings || [];
  const frets = (INSTRUMENTS[instrumentId] || {}).frets || 20;
  let best = null;
  for (let s = strings.length - 1; s >= 0; s--) {
    const fret = midi - strings[s];
    if (fret >= 0 && fret <= frets) {
      if (!best || fret < best.fret) best = { string: s, fret };
    }
  }
  return best;
}

export function fretToMidi(string, fret, instrumentId = "acoustic-guitar", tuning) {
  const strings = tuning || (INSTRUMENTS[instrumentId] || {}).strings || [];
  return strings[string] + fret;
}
