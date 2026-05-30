// Built-in public-domain song library (and a few practice progressions).
// Authored with the compact notation in song-format.js. All melodies are
// traditional / public domain. No copyrighted audio is bundled.
import { parseMelody, newSong } from "./song-format.js";
import { nameToMidi } from "./notes.js";
import { chordMidis } from "./theory.js";

function chordSeq(bpm, items) {
  const spb = 60 / bpm;
  let t = 0;
  const notes = [];
  for (const [root, type, beats] of items) {
    const rm = nameToMidi(root);
    notes.push({
      time: +t.toFixed(3),
      dur: +(beats * spb * 0.95).toFixed(3),
      midi: chordMidis(rm, type),
      chord: true,
    });
    t += beats * spb;
  }
  return notes;
}

function builtin(o) {
  return newSong({ ...o, source: "builtin" });
}

const SONGS = [
  builtin({
    id: "bi-twinkle", title: "Twinkle, Twinkle, Little Star", artist: "Trad.",
    key: "C", bpm: 100, difficulty: "beginner",
    background: { type: "animated", value: "starfield" },
    notes: parseMelody(100,
      "C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2 " +
      "G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 " +
      "C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2"),
    lyrics: [
      { time: 0, text: "Twinkle, twinkle, little star" },
      { time: 4.8, text: "How I wonder what you are" },
    ],
  }),
  builtin({
    id: "bi-ode", title: "Ode to Joy", artist: "Beethoven",
    key: "C", bpm: 120, difficulty: "beginner",
    background: { type: "animated", value: "aurora" },
    notes: parseMelody(120,
      "E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:0.5 D4:2 " +
      "E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:0.5 C4:2"),
  }),
  builtin({
    id: "bi-saints", title: "When the Saints Go Marching In", artist: "Trad.",
    key: "C", bpm: 110, difficulty: "beginner",
    background: { type: "solid", value: "" },
    notes: parseMelody(110,
      "C4:1 E4:1 F4:1 G4:2 r:1 C4:1 E4:1 F4:1 G4:2 r:1 C4:1 E4:1 F4:1 G4:2 E4:1 C4:1 E4:1 D4:3"),
  }),
  builtin({
    id: "bi-auld", title: "Auld Lang Syne", artist: "Trad. / Burns",
    key: "C", bpm: 90, difficulty: "beginner",
    background: { type: "animated", value: "waves" },
    notes: parseMelody(90,
      "G3:1 C4:1.5 B3:0.5 C4:1 E4:1 D4:1.5 C4:0.5 D4:1 E4:1 C4:1.5 C4:0.5 E4:1 G4:1 A4:3 " +
      "A4:1 G4:1.5 E4:0.5 E4:1 C4:1 D4:1.5 C4:0.5 D4:1 E4:1 C4:1.5 A3:0.5 A3:1 G3:1 C4:3"),
  }),
  builtin({
    id: "bi-birthday", title: "Happy Birthday to You", artist: "Trad. (public domain)",
    key: "C", bpm: 110, difficulty: "beginner",
    notes: parseMelody(110,
      "G3:0.5 G3:0.5 A3:1 G3:1 C4:1 B3:2 G3:0.5 G3:0.5 A3:1 G3:1 D4:1 C4:2 " +
      "G3:0.5 G3:0.5 G4:1 E4:1 C4:1 B3:1 A3:1 F4:0.5 F4:0.5 E4:1 C4:1 D4:1 C4:2"),
  }),
  builtin({
    id: "bi-amazing", title: "Amazing Grace", artist: "Trad. / Newton",
    key: "C", bpm: 80, difficulty: "intermediate",
    background: { type: "animated", value: "aurora" },
    notes: parseMelody(80,
      "G3:1 C4:2 E4:1 C4:1 E4:2 D4:1 C4:3 A3:2 G3:1 G3:1 C4:2 E4:1 C4:1 E4:2 D4:1 G4:3"),
    lyrics: [{ time: 0, text: "Amazing grace, how sweet the sound" }],
  }),
  builtin({
    id: "bi-scarborough", title: "Scarborough Fair", artist: "Trad.",
    key: "Am", bpm: 96, difficulty: "intermediate",
    background: { type: "animated", value: "waves" },
    notes: parseMelody(96,
      "A3:3 A3:1.5 E4:1.5 E4:3 B3:1.5 A3:0.5 B3:1 C4:1 A3:1 A3:3 " +
      "G3:3 D4:1.5 D4:1.5 C4:1 B3:1 A3:1 G3:1.5 A3:0.5 B3:1 A3:1 A3:3"),
  }),
  builtin({
    id: "bi-greensleeves", title: "Greensleeves", artist: "Trad.",
    key: "Am", bpm: 100, difficulty: "intermediate",
    background: { type: "animated", value: "aurora" },
    notes: parseMelody(100,
      "A3:1 C4:2 D4:1 E4:1.5 F4:0.5 E4:1 D4:2 B3:1 G3:1.5 A3:0.5 B3:1 C4:2 A3:1 A3:1.5 G#3:0.5 A3:1 B3:2 G#3:1 E3:3"),
  }),
  builtin({
    id: "bi-rising", title: "House of the Rising Sun", artist: "Trad.",
    key: "Am", bpm: 76, difficulty: "intermediate",
    background: { type: "animated", value: "starfield" },
    notes: parseMelody(76,
      "A2:0.5 E3:0.5 A3:0.5 C4:0.5 E4:0.5 C4:0.5 C3:0.5 E3:0.5 G3:0.5 C4:0.5 E4:0.5 C4:0.5 " +
      "D3:0.5 A3:0.5 D4:0.5 F#4:0.5 A4:0.5 F#4:0.5 F2:0.5 C3:0.5 F3:0.5 A3:0.5 C4:0.5 A3:0.5 " +
      "A2:0.5 E3:0.5 A3:0.5 C4:0.5 E4:0.5 C4:0.5 E2:0.5 B2:0.5 E3:0.5 G#3:0.5 B3:0.5 G#3:0.5"),
  }),
  builtin({
    id: "bi-canon", title: "Canon in D (excerpt)", artist: "Pachelbel",
    key: "D", bpm: 100, difficulty: "advanced",
    background: { type: "animated", value: "aurora" },
    notes: parseMelody(100,
      "F#5:1 E5:1 D5:1 C#5:1 B4:1 A4:1 B4:1 C#5:1 D5:1 C#5:1 B4:1 A4:1 G4:1 F#4:1 G4:1 E4:1 " +
      "F#4:1 G4:1 A4:1 B4:1 A4:1 G4:1 F#4:1 E4:1 D4:2 D5:2"),
  }),

  // ---- Chord-progression trainers (great for strumming practice) ----
  builtin({
    id: "bi-3chord", title: "Three-Chord Trainer (G–C–D)", artist: "GuitarPicker",
    key: "G", bpm: 90, difficulty: "beginner",
    background: { type: "solid", value: "" },
    notes: chordSeq(90, [
      ["G2", "maj", 4], ["C3", "maj", 4], ["G2", "maj", 4], ["D3", "maj", 4],
      ["G2", "maj", 4], ["C3", "maj", 4], ["G2", "maj", 2], ["D3", "maj", 2], ["G2", "maj", 4],
    ]),
  }),
  builtin({
    id: "bi-popprog", title: "Pop Progression I–V–vi–IV (C)", artist: "GuitarPicker",
    key: "C", bpm: 100, difficulty: "beginner",
    background: { type: "animated", value: "waves" },
    notes: chordSeq(100, [
      ["C3", "maj", 4], ["G2", "maj", 4], ["A2", "min", 4], ["F2", "maj", 4],
      ["C3", "maj", 4], ["G2", "maj", 4], ["A2", "min", 4], ["F2", "maj", 4],
    ]),
  }),
  builtin({
    id: "bi-12bar", title: "12-Bar Blues in A", artist: "Trad.",
    key: "A", bpm: 96, difficulty: "intermediate",
    background: { type: "animated", value: "starfield" },
    notes: chordSeq(96, [
      ["A2", "dom7", 4], ["A2", "dom7", 4], ["A2", "dom7", 4], ["A2", "dom7", 4],
      ["D3", "dom7", 4], ["D3", "dom7", 4], ["A2", "dom7", 4], ["A2", "dom7", 4],
      ["E3", "dom7", 4], ["D3", "dom7", 4], ["A2", "dom7", 4], ["E3", "dom7", 4],
    ]),
  }),

  // ---- A simple variation for another instrument (ukulele) ----
  builtin({
    id: "bi-ode-uke", title: "Ode to Joy (Ukulele)", artist: "Beethoven",
    instrument: "ukulele", key: "C", bpm: 110, difficulty: "beginner",
    background: { type: "solid", value: "" },
    notes: parseMelody(110,
      "E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:0.5 D4:2"),
  }),
  builtin({
    id: "bi-saints-bass", title: "When the Saints (Bass Line)", artist: "Trad.",
    instrument: "bass", key: "C", bpm: 110, difficulty: "beginner",
    notes: parseMelody(110,
      "C2:1 E2:1 F2:1 G2:2 r:1 C2:1 E2:1 F2:1 G2:2 r:1 C2:1 E2:1 F2:1 G2:2 E2:1 C2:1 E2:1 D2:3"),
  }),
];

export function builtinSongs() { return SONGS.map((s) => ({ ...s })); }
export function getBuiltin(id) { const s = SONGS.find((x) => x.id === id); return s ? { ...s } : null; }
