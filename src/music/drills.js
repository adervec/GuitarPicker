// Drill generators + course definitions for the Training view.
import { newSong } from "./song-format.js";
import { scaleNotes, SCALES } from "./notes.js";
import { chordMidis } from "./theory.js";

function seqFromMidis(midis, bpm, beatsEach = 1) {
  const spb = 60 / bpm;
  return midis.map((m, i) => ({
    time: +(i * beatsEach * spb).toFixed(3),
    dur: +(beatsEach * spb * 0.9).toFixed(3),
    midi: Array.isArray(m) ? m : [m],
  }));
}

function scaleUpDown(rootMidi, scale, octaves = 1) {
  const ints = SCALES[scale] || SCALES.major;
  const up = [];
  for (let o = 0; o < octaves; o++) for (const i of ints) up.push(rootMidi + o * 12 + i);
  up.push(rootMidi + octaves * 12);
  return [...up, ...up.slice(0, -1).reverse()];
}

// Each drill: stable id, generator(bpm) -> notes
export const DRILLS = [
  {
    id: "drill-chromatic", title: "Chromatic Warm-up", difficulty: "beginner",
    desc: "1-2-3-4 fingers up the low strings — builds finger independence.",
    bpm: 80, gen: (bpm) => seqFromMidis([40, 41, 42, 43, 45, 46, 47, 48, 50, 51, 52, 53, 52, 51, 50, 48, 47, 46, 45, 43, 42, 41], bpm, 0.5),
  },
  {
    id: "drill-cmajor", title: "C Major Scale", difficulty: "beginner",
    desc: "Ascend and descend the C major scale, one octave.",
    bpm: 90, gen: (bpm) => seqFromMidis(scaleUpDown(48, "major", 1), bpm, 0.5),
  },
  {
    id: "drill-gmajor2", title: "G Major Scale (2 octaves)", difficulty: "intermediate",
    desc: "Two-octave G major run for fretboard fluency.",
    bpm: 100, gen: (bpm) => seqFromMidis(scaleUpDown(43, "major", 2), bpm, 0.5),
  },
  {
    id: "drill-pentatonic", title: "A Minor Pentatonic", difficulty: "intermediate",
    desc: "The lead-guitar staple — box 1 up and down.",
    bpm: 100, gen: (bpm) => seqFromMidis(scaleUpDown(45, "minor_pentatonic", 1), bpm, 0.5),
  },
  {
    id: "drill-chordchanges", title: "Chord Changes G–C–D", difficulty: "beginner",
    desc: "Switch cleanly between open chords in time.",
    bpm: 70, gen: (bpm) => {
      const items = [];
      for (const root of [43, 48, 50, 43, 48, 50, 43, 43]) items.push(chordMidis(root, "maj"));
      return seqFromMidis(items, bpm, 2);
    },
  },
  {
    id: "drill-bluespent", title: "Blues Scale Sprint", difficulty: "advanced",
    desc: "E blues scale, fast — for picking accuracy.",
    bpm: 130, gen: (bpm) => seqFromMidis(scaleUpDown(40, "blues", 2), bpm, 0.25),
  },
];

export function getDrill(id) { return DRILLS.find((d) => d.id === id); }

export function buildDrillSong(drill, bpm) {
  return newSong({
    id: drill.id, title: drill.title + " — Drill", artist: "GuitarPicker Trainer",
    instrument: "acoustic-guitar", bpm: bpm || drill.bpm, difficulty: drill.difficulty,
    background: { type: "animated", value: "pulse" }, source: "drill",
    notes: drill.gen(bpm || drill.bpm),
  });
}

// Course progression: ordered steps referencing song ids or drill ids.
export const COURSES = [
  {
    id: "course-foundations", title: "Guitar Foundations", level: "Beginner",
    desc: "From your first notes to your first songs.",
    steps: [
      { id: "bi-twinkle", title: "Twinkle, Twinkle (melody)", ref: "bi-twinkle" },
      { id: "drill-chromatic", title: "Chromatic Warm-up", ref: "drill-chromatic" },
      { id: "drill-cmajor", title: "C Major Scale", ref: "drill-cmajor" },
      { id: "bi-3chord", title: "Three-Chord Trainer", ref: "bi-3chord" },
      { id: "drill-chordchanges", title: "Chord Changes G–C–D", ref: "drill-chordchanges" },
      { id: "bi-saints", title: "When the Saints (melody)", ref: "bi-saints" },
    ],
  },
  {
    id: "course-songcraft", title: "Strumming & Songcraft", level: "Beginner+",
    desc: "Play along to full progressions and traditional tunes.",
    steps: [
      { id: "bi-popprog", title: "Pop Progression I–V–vi–IV", ref: "bi-popprog" },
      { id: "bi-auld", title: "Auld Lang Syne", ref: "bi-auld" },
      { id: "bi-amazing", title: "Amazing Grace", ref: "bi-amazing" },
      { id: "bi-ode", title: "Ode to Joy", ref: "bi-ode" },
    ],
  },
  {
    id: "course-lead", title: "Lead & Improvisation", level: "Intermediate",
    desc: "Scales, pentatonics, and the 12-bar blues.",
    steps: [
      { id: "drill-pentatonic", title: "A Minor Pentatonic", ref: "drill-pentatonic" },
      { id: "drill-gmajor2", title: "G Major (2 octaves)", ref: "drill-gmajor2" },
      { id: "bi-12bar", title: "12-Bar Blues in A", ref: "bi-12bar" },
      { id: "bi-rising", title: "House of the Rising Sun", ref: "bi-rising" },
      { id: "drill-bluespent", title: "Blues Scale Sprint", ref: "drill-bluespent" },
    ],
  },
];
