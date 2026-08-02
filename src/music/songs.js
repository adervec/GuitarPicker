// Built-in public-domain song library (and a few practice progressions).
// Authored with the compact notation in song-format.js. All melodies are
// traditional / public domain. No copyrighted audio is bundled.
import { parseMelody, newSong } from "./song-format.js";
import { nameToMidi } from "./notes.js";
import { chordMidis } from "./theory.js";
import { EXTRA_SONGS } from "./songs-extra.js";

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
    // Word timing aligned to the melody notes — a karaoke showcase.
    lyrics: [
      { time: 0, dur: 4.8, text: "Twinkle, twinkle, little star", words: [
        { t: 0, text: "Twinkle," }, { t: 1.2, text: "twinkle," }, { t: 2.4, text: "little" }, { t: 3.6, text: "star" }] },
      { time: 4.8, dur: 4.8, text: "How I wonder what you are", words: [
        { t: 4.8, text: "How" }, { t: 5.4, text: "I" }, { t: 6.0, text: "wonder" }, { t: 7.2, text: "what" }, { t: 7.8, text: "you" }, { t: 8.4, text: "are" }] },
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
    lyrics: [
      { time: 0, text: "Oh, when the saints" }, { time: 3.3, text: "go marching in," },
      { time: 6.5, text: "Oh when the saints go marching in," },
      { time: 9.8, text: "Lord, how I want to be in that number!" },
    ],
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
    id: "bi-frere", title: "Frère Jacques", artist: "Trad.",
    key: "C", bpm: 100, difficulty: "beginner", genre: "Children's",
    background: { type: "animated", value: "pulse" },
    notes: parseMelody(100,
      "C4:1 D4:1 E4:1 C4:1 C4:1 D4:1 E4:1 C4:1 " +
      "E4:1 F4:1 G4:2 E4:1 F4:1 G4:2 " +
      "G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 " +
      "C4:1 G3:1 C4:2 C4:1 G3:1 C4:2"),
    // Fully word-timed to the melody — a karaoke showcase.
    lyrics: [
      { time: 0, dur: 4.8, text: "Are you sleeping, are you sleeping?", words: [
        { t: 0, text: "Are" }, { t: 0.6, text: "you" }, { t: 1.2, text: "sleeping," }, { t: 2.4, text: "are" }, { t: 3.0, text: "you" }, { t: 3.6, text: "sleeping?" }] },
      { time: 4.8, dur: 4.8, text: "Brother John, Brother John?", words: [
        { t: 4.8, text: "Brother" }, { t: 6.0, text: "John," }, { t: 7.2, text: "Brother" }, { t: 8.4, text: "John?" }] },
      { time: 9.6, dur: 4.8, text: "Morning bells are ringing, morning bells are ringing,", words: [
        { t: 9.6, text: "Morning" }, { t: 10.2, text: "bells" }, { t: 10.5, text: "are" }, { t: 10.8, text: "ringing," }, { t: 12.0, text: "morning" }, { t: 12.6, text: "bells" }, { t: 12.9, text: "are" }, { t: 13.2, text: "ringing," }] },
      { time: 14.4, dur: 4.8, text: "Ding ding dong, ding ding dong.", words: [
        { t: 14.4, text: "Ding" }, { t: 15.0, text: "ding" }, { t: 15.6, text: "dong," }, { t: 16.8, text: "ding" }, { t: 17.4, text: "ding" }, { t: 18.0, text: "dong." }] },
    ],
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

  // ---- Singalong tunes (timed lyrics for karaoke-style play) ----
  builtin({
    id: "bi-mary", title: "Mary Had a Little Lamb", artist: "Trad.",
    key: "C", bpm: 100, difficulty: "beginner", genre: "Children's",
    background: { type: "animated", value: "pulse" },
    notes: parseMelody(100,
      "E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:2 D4:1 D4:1 D4:2 E4:1 G4:1 G4:2 " +
      "E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:1 E4:1 D4:1 D4:1 E4:1 D4:1 C4:2"),
    lyrics: [
      { time: 0, text: "Mary had a little lamb," }, { time: 4.8, text: "little lamb, little lamb," },
      { time: 9.6, text: "Mary had a little lamb," }, { time: 14.4, text: "its fleece was white as snow." },
    ],
  }),
  builtin({
    id: "bi-row", title: "Row, Row, Row Your Boat", artist: "Trad.",
    key: "C", bpm: 90, difficulty: "beginner", genre: "Children's",
    background: { type: "animated", value: "waves" },
    notes: parseMelody(90,
      "C4:1 C4:1 C4:1 D4:1 E4:2 E4:1 D4:1 E4:1 F4:1 G4:2 " +
      "C5:1 C5:1 C5:1 G4:1 G4:1 G4:1 E4:1 E4:1 E4:1 C4:1 C4:1 C4:1 G4:1 F4:1 E4:1 D4:1 C4:2"),
    lyrics: [
      { time: 0, text: "Row, row, row your boat," }, { time: 4.0, text: "gently down the stream." },
      { time: 8.0, text: "Merrily, merrily, merrily, merrily," }, { time: 16.0, text: "life is but a dream." },
    ],
  }),
  builtin({
    id: "bi-london", title: "London Bridge Is Falling Down", artist: "Trad.",
    key: "C", bpm: 120, difficulty: "beginner", genre: "Children's",
    background: { type: "solid", value: "" },
    notes: parseMelody(120,
      "G4:1.5 A4:0.5 G4:1 F4:1 E4:1 F4:1 G4:2 D4:1 E4:1 F4:2 E4:1 F4:1 G4:2 " +
      "G4:1.5 A4:0.5 G4:1 F4:1 E4:1 F4:1 G4:2 D4:2 G4:1 E4:1 C4:2"),
    lyrics: [
      { time: 0, text: "London Bridge is falling down," }, { time: 4.0, text: "falling down, falling down," },
      { time: 8.0, text: "London Bridge is falling down," }, { time: 12.0, text: "my fair lady." },
    ],
  }),
  builtin({
    id: "bi-macdonald", title: "Old MacDonald Had a Farm", artist: "Trad.",
    key: "C", bpm: 120, difficulty: "beginner", genre: "Children's",
    background: { type: "animated", value: "pulse" },
    notes: parseMelody(120,
      "C4:1 C4:1 C4:1 G3:1 A3:1 A3:1 G3:2 E4:1 E4:1 D4:1 D4:1 C4:2 " +
      "G3:1 C4:1 C4:1 C4:1 G3:1 A3:1 A3:1 G3:2 E4:1 E4:1 D4:1 D4:1 C4:2 " +
      "C4:1 C4:1 C4:1 G3:1 A3:1 A3:1 G3:2 E4:1 E4:1 D4:1 D4:1 C4:2"),
    lyrics: [
      { time: 0, text: "Old MacDonald had a farm, E-I-E-I-O!" },
      { time: 7.0, text: "And on his farm he had a cow, E-I-E-I-O!" },
      { time: 14.5, text: "Old MacDonald had a farm, E-I-E-I-O!" },
    ],
  }),
  builtin({
    id: "bi-jingle", title: "Jingle Bells", artist: "Pierpont (Trad.)",
    key: "C", bpm: 120, difficulty: "beginner", genre: "Holiday",
    background: { type: "animated", value: "starfield" },
    notes: parseMelody(120,
      "E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:0.5 E4:4 " +
      "F4:1 F4:1 F4:1.5 F4:0.5 F4:1 E4:1 E4:1 E4:0.5 E4:0.5 G4:1 G4:1 F4:1 D4:1 C4:4"),
    lyrics: [
      { time: 0, text: "Jingle bells, jingle bells," }, { time: 4.0, text: "jingle all the way!" },
      { time: 8.0, text: "Oh what fun it is to ride" }, { time: 12.0, text: "in a one-horse open sleigh!" },
    ],
  }),
  builtin({
    id: "bi-susanna", title: "Oh! Susanna", artist: "Stephen Foster (Trad.)",
    key: "C", bpm: 120, difficulty: "intermediate", genre: "Folk",
    background: { type: "animated", value: "waves" },
    notes: parseMelody(120,
      "C4:0.5 D4:0.5 E4:1 G4:1 G4:1 A4:1 G4:1 E4:1 C4:1 D4:1 E4:1 E4:1 D4:1 C4:1 D4:2 " +
      "C4:0.5 D4:0.5 E4:1 G4:1 G4:1 A4:1 G4:1 E4:1 C4:1 D4:1 E4:1 E4:1 D4:1 D4:1 C4:2 " +
      "E4:1 F4:1 G4:2 G4:1 A4:1 G4:1 E4:1 C4:1 D4:1 E4:1 E4:1 D4:1 C4:1 D4:2 " +
      "C4:0.5 D4:0.5 E4:1 G4:1 G4:1 A4:1 G4:1 E4:1 C4:1 D4:1 E4:1 E4:1 D4:1 D4:1 C4:2"),
    lyrics: [
      { time: 0, text: "I come from Alabama with my banjo on my knee," },
      { time: 7.5, text: "And I'm going to Louisiana, my true love for to see." },
      { time: 15.0, text: "Oh! Susanna, don't you cry for me," },
      { time: 23.0, text: "For I come from Alabama with my banjo on my knee." },
    ],
  }),
  builtin({
    id: "bi-silent", title: "Silent Night", artist: "Gruber / Mohr (Trad.)",
    key: "C", bpm: 90, difficulty: "intermediate", genre: "Holiday",
    background: { type: "animated", value: "aurora" },
    notes: parseMelody(90,
      "G4:1.5 A4:0.5 G4:1 E4:3 G4:1.5 A4:0.5 G4:1 E4:3 " +
      "D5:2 D5:1 B4:3 C5:2 C5:1 G4:3 " +
      "A4:2 A4:1 C5:1.5 B4:0.5 A4:1 G4:1.5 A4:0.5 G4:1 E4:3 " +
      "A4:2 A4:1 C5:1.5 B4:0.5 A4:1 G4:1.5 A4:0.5 G4:1 E4:3 " +
      "D5:2 D5:1 F5:1.5 D5:0.5 B4:1 C5:3 E5:3 C5:1 G4:1 E4:1 G4:1.5 F4:0.5 D4:1 C4:3"),
    lyrics: [
      { time: 0, text: "Silent night, holy night," }, { time: 8.0, text: "All is calm, all is bright," },
      { time: 16.0, text: "Round yon virgin mother and child," }, { time: 24.0, text: "Holy infant so tender and mild," },
      { time: 32.0, text: "Sleep in heavenly peace," }, { time: 38.0, text: "Sleep in heavenly peace." },
    ],
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
  // ---- harmonica: middle octave of a C diatonic (holes 4-7, no bends) ----
  builtin({
    id: "bi-saints-harmonica", title: "When the Saints (Harmonica)", artist: "Trad.",
    instrument: "harmonica", key: "C", bpm: 110, difficulty: "beginner",
    notes: parseMelody(110,
      "C5:1 E5:1 F5:1 G5:2 r:1 C5:1 E5:1 F5:1 G5:2 r:1 C5:1 E5:1 F5:1 G5:2 E5:1 C5:1 E5:1 D5:3"),
  }),
  // ---- recorder: the classic first tune, in the soprano's bottom register ----
  builtin({
    id: "bi-hotcross-recorder", title: "Hot Cross Buns (Recorder)", artist: "Trad.",
    instrument: "recorder", key: "C", bpm: 90, difficulty: "beginner",
    notes: parseMelody(90,
      "E5:1 D5:1 C5:2 E5:1 D5:1 C5:2 C5:0.5 C5:0.5 C5:0.5 C5:0.5 D5:0.5 D5:0.5 D5:0.5 D5:0.5 E5:1 D5:1 C5:2"),
  }),
  // ---- drums: unpitched, graded on hit timing (lanes are GM kick/snare/hat) ----
  builtin({
    id: "bi-backbeat", title: "Backbeat Basics (Drums)", artist: "GuitarPicker",
    instrument: "e-drums", key: "C", bpm: 90, difficulty: "beginner",
    notes: parseMelody(90,
      "C2:1 D2:1 C2:1 D2:1 C2:1 D2:1 C2:1 D2:1 " +
      "C2:0.5 F#2:0.5 D2:0.5 F#2:0.5 C2:0.5 F#2:0.5 D2:0.5 F#2:0.5 " +
      "C2:0.5 F#2:0.5 D2:0.5 F#2:0.5 C2:0.5 F#2:0.5 D2:0.5 F#2:0.5 " +
      "C2:1 D2:1 C2:1 D2:1 C2:1 D2:1 C2:0.5 C2:0.5 D2:2"),
  }),
];

SONGS.push(...EXTRA_SONGS);

export function builtinSongs() { return SONGS.map((s) => ({ ...s })); }
export function getBuiltin(id) { const s = SONGS.find((x) => x.id === id); return s ? { ...s } : null; }
