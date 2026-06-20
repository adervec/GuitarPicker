// Additional built-in songs — public-domain melodies/lyrics and non-copyrightable
// chord forms. Provenance is tracked in CREDITS.md.
//
// ACCURACY NOTE: the chord-form / original pieces below are correct by
// construction. The traditional *melodies* are hand-transcribed and tagged
// "verify-melody" — they should be spot-checked by ear before a public release
// (a wrong note in a famous tune is the main risk here, not copyright).
import { parseMelody, newSong } from "./song-format.js";
import { nameToMidi } from "./notes.js";
import { chordMidis } from "./theory.js";

// (kept local to avoid a circular import with songs.js)
function chordSeq(bpm, items) {
  const spb = 60 / bpm;
  let t = 0;
  const notes = [];
  for (const [root, type, beats] of items) {
    notes.push({ time: +t.toFixed(3), dur: +(beats * spb * 0.95).toFixed(3), midi: chordMidis(nameToMidi(root), type), chord: true });
    t += beats * spb;
  }
  return notes;
}
function builtin(o) { return newSong({ ...o, source: "builtin" }); }

export const EXTRA_SONGS = [
  // ===== Guitar — chord progressions & patterns (correct by construction) =====
  builtin({
    id: "bi-12bar-e", title: "12-Bar Blues in E", artist: "Trad. (blues form)",
    key: "E", bpm: 100, difficulty: "intermediate",
    background: { type: "animated", value: "starfield" },
    notes: chordSeq(100, [
      ["E2", "dom7", 4], ["E2", "dom7", 4], ["E2", "dom7", 4], ["E2", "dom7", 4],
      ["A2", "dom7", 4], ["A2", "dom7", 4], ["E2", "dom7", 4], ["E2", "dom7", 4],
      ["B2", "dom7", 4], ["A2", "dom7", 4], ["E2", "dom7", 4], ["B2", "dom7", 4],
    ]),
  }),
  builtin({
    id: "bi-doowop", title: "Doo-Wop Progression I–vi–IV–V (C)", artist: "GuitarPicker",
    key: "C", bpm: 96, difficulty: "beginner",
    background: { type: "animated", value: "waves" },
    notes: chordSeq(96, [
      ["C3", "maj", 4], ["A2", "min", 4], ["F2", "maj", 4], ["G2", "maj", 4],
      ["C3", "maj", 4], ["A2", "min", 4], ["F2", "maj", 4], ["G2", "maj", 4],
    ]),
  }),
  builtin({
    id: "bi-andalusian", title: "Andalusian Cadence (Am–G–F–E)", artist: "Trad. (Spanish form)",
    key: "Am", bpm: 100, difficulty: "intermediate",
    background: { type: "animated", value: "aurora" },
    notes: chordSeq(100, [
      ["A2", "min", 4], ["G2", "maj", 4], ["F2", "maj", 4], ["E2", "maj", 4],
      ["A2", "min", 4], ["G2", "maj", 4], ["F2", "maj", 4], ["E2", "maj", 4],
    ]),
  }),
  builtin({
    id: "bi-canon-strum", title: "Pachelbel Strum Loop (D)", artist: "Pachelbel (chord loop)",
    key: "D", bpm: 96, difficulty: "intermediate",
    background: { type: "animated", value: "aurora" },
    notes: chordSeq(96, [
      ["D3", "maj", 4], ["A2", "maj", 4], ["B2", "min", 4], ["F#2", "min", 4],
      ["G2", "maj", 4], ["D3", "maj", 4], ["G2", "maj", 4], ["A2", "maj", 4],
    ]),
  }),
  builtin({
    id: "bi-minor-blues", title: "Minor 12-Bar Blues in Am", artist: "Trad. (blues form)",
    key: "Am", bpm: 92, difficulty: "intermediate",
    background: { type: "animated", value: "starfield" },
    notes: chordSeq(92, [
      ["A2", "min7", 4], ["A2", "min7", 4], ["A2", "min7", 4], ["A2", "min7", 4],
      ["D3", "min7", 4], ["D3", "min7", 4], ["A2", "min7", 4], ["A2", "min7", 4],
      ["E3", "dom7", 4], ["D3", "min7", 4], ["A2", "min7", 4], ["E3", "dom7", 4],
    ]),
  }),
  builtin({
    id: "bi-251", title: "Jazz ii–V–I Loop (C)", artist: "GuitarPicker",
    key: "C", bpm: 100, difficulty: "advanced",
    background: { type: "animated", value: "aurora" },
    notes: chordSeq(100, [
      ["D3", "min7", 4], ["G2", "dom7", 4], ["C3", "maj", 8],
      ["D3", "min7", 4], ["G2", "dom7", 4], ["C3", "maj", 8],
    ]),
  }),
  builtin({
    id: "bi-folk-d", title: "Folk Trainer I–IV–V (D)", artist: "GuitarPicker",
    key: "D", bpm: 96, difficulty: "beginner",
    background: { type: "solid", value: "" },
    notes: chordSeq(96, [
      ["D3", "maj", 4], ["G2", "maj", 4], ["D3", "maj", 4], ["A2", "maj", 4],
      ["D3", "maj", 4], ["G2", "maj", 4], ["D3", "maj", 2], ["A2", "maj", 2], ["D3", "maj", 4],
    ]),
  }),
  builtin({
    id: "bi-travis", title: "Travis Picking Pattern (C–Am–F–G)", artist: "GuitarPicker",
    key: "C", bpm: 100, difficulty: "intermediate",
    background: { type: "animated", value: "pulse" },
    notes: parseMelody(100,
      "C2:0.5 E4:0.5 G2:0.5 E4:0.5 C2:0.5 E4:0.5 G2:0.5 E4:0.5 " +
      "A2:0.5 E4:0.5 E3:0.5 C4:0.5 A2:0.5 E4:0.5 E3:0.5 C4:0.5 " +
      "F2:0.5 A4:0.5 C3:0.5 A4:0.5 F2:0.5 A4:0.5 C3:0.5 A4:0.5 " +
      "G2:0.5 D4:0.5 D3:0.5 B3:0.5 G2:0.5 D4:0.5 D3:0.5 B3:0.5"),
  }),

  // ===== Singalong — public-domain melodies + lyrics (word-timed) =====
  // melodies tagged "verify-melody" pending an ear-check.
  builtin({
    id: "bi-hotcross", title: "Hot Cross Buns", artist: "Trad.",
    key: "C", bpm: 100, difficulty: "beginner", genre: "Children's", tags: ["verify-melody"],
    background: { type: "animated", value: "pulse" },
    notes: parseMelody(100,
      "E4:1 D4:1 C4:1 E4:1 D4:1 C4:1 C4:0.5 C4:0.5 C4:0.5 C4:0.5 D4:0.5 D4:0.5 D4:0.5 D4:0.5 E4:1 D4:1 C4:2"),
    lyrics: [
      { time: 0, dur: 1.8, text: "Hot cross buns!", words: [{ t: 0, text: "Hot" }, { t: 0.6, text: "cross" }, { t: 1.2, text: "buns!" }] },
      { time: 1.8, dur: 1.8, text: "Hot cross buns!", words: [{ t: 1.8, text: "Hot" }, { t: 2.4, text: "cross" }, { t: 3.0, text: "buns!" }] },
      { time: 3.6, dur: 2.4, text: "One a penny, two a penny,", words: [{ t: 3.6, text: "One" }, { t: 3.9, text: "a" }, { t: 4.2, text: "penny," }, { t: 4.8, text: "two" }, { t: 5.1, text: "a" }, { t: 5.4, text: "penny," }] },
      { time: 6.0, dur: 2.4, text: "Hot cross buns!", words: [{ t: 6.0, text: "Hot" }, { t: 6.6, text: "cross" }, { t: 7.2, text: "buns!" }] },
    ],
  }),
  builtin({
    id: "bi-joy", title: "Joy to the World", artist: "Handel / Watts",
    key: "C", bpm: 100, difficulty: "beginner", genre: "Holiday", tags: ["verify-melody"],
    background: { type: "animated", value: "aurora" },
    notes: parseMelody(100, "C5:1 B4:1 A4:1 G4:1.5 F4:0.5 E4:1 D4:1 C4:2"),
    lyrics: [
      { time: 0, dur: 5.4, text: "Joy to the world, the Lord is come!", words: [
        { t: 0, text: "Joy" }, { t: 0.6, text: "to" }, { t: 1.2, text: "the" }, { t: 1.8, text: "world," },
        { t: 2.7, text: "the" }, { t: 3.0, text: "Lord" }, { t: 3.6, text: "is" }, { t: 4.2, text: "come!" }] },
    ],
  }),
  builtin({
    id: "bi-wewish", title: "We Wish You a Merry Christmas", artist: "Trad.",
    key: "G", bpm: 120, difficulty: "beginner", genre: "Holiday", tags: ["verify-melody"],
    background: { type: "animated", value: "starfield" },
    notes: parseMelody(120, "D4:1 G4:1 G4:0.5 A4:0.5 G4:1 F#4:2 E4:0.5 E4:0.5 D4:1 D4:1 G4:2"),
    lyrics: [
      { time: 0, dur: 3.0, text: "We wish you a merry Christmas,", words: [
        { t: 0, text: "We" }, { t: 0.5, text: "wish" }, { t: 1.0, text: "you" }, { t: 1.25, text: "a" }, { t: 1.5, text: "merry" }, { t: 2.0, text: "Christmas," }] },
      { time: 3.0, dur: 2.5, text: "and a happy new year!", words: [
        { t: 3.0, text: "and" }, { t: 3.25, text: "a" }, { t: 3.5, text: "happy" }, { t: 4.0, text: "new" }, { t: 4.5, text: "year!" }] },
    ],
  }),
  builtin({
    id: "bi-mountain", title: "She'll Be Coming 'Round the Mountain", artist: "Trad.",
    key: "C", bpm: 120, difficulty: "beginner", genre: "Folk", tags: ["verify-melody"],
    background: { type: "animated", value: "waves" },
    notes: parseMelody(120,
      "C4:0.5 C4:0.5 E4:1 G4:0.5 G4:0.5 A4:1 G4:0.5 E4:0.5 C4:1 " +
      "C4:0.5 C4:0.5 E4:1 G4:0.5 G4:0.5 A4:1 G4:0.5 E4:0.5 C4:1"),
    lyrics: [
      { time: 0, dur: 3.0, text: "She'll be coming 'round the mountain when she comes,", words: [
        { t: 0, text: "She'll" }, { t: 0.25, text: "be" }, { t: 0.5, text: "coming" }, { t: 1.0, text: "'round" }, { t: 1.25, text: "the" }, { t: 1.5, text: "mountain" }, { t: 2.0, text: "when" }, { t: 2.25, text: "she" }, { t: 2.5, text: "comes," }] },
      { time: 3.0, dur: 3.0, text: "She'll be coming 'round the mountain when she comes!", words: [
        { t: 3.0, text: "She'll" }, { t: 3.25, text: "be" }, { t: 3.5, text: "coming" }, { t: 4.0, text: "'round" }, { t: 4.25, text: "the" }, { t: 4.5, text: "mountain" }, { t: 5.0, text: "when" }, { t: 5.25, text: "she" }, { t: 5.5, text: "comes!" }] },
    ],
  }),
  builtin({
    id: "bi-clementine", title: "Oh My Darling, Clementine", artist: "Trad.",
    key: "C", bpm: 120, difficulty: "beginner", genre: "Folk", tags: ["verify-melody"],
    background: { type: "animated", value: "aurora" },
    notes: parseMelody(120, "G3:0.5 G3:0.5 C4:1 E4:0.5 E4:0.5 C4:1 G3:0.5 G3:0.5 C4:1 E4:0.5 D4:0.5 C4:2"),
    lyrics: [
      { time: 0, dur: 2.0, text: "Oh my darling, oh my darling,", words: [
        { t: 0, text: "Oh" }, { t: 0.25, text: "my" }, { t: 0.5, text: "darling," }, { t: 1.0, text: "oh" }, { t: 1.25, text: "my" }, { t: 1.5, text: "darling," }] },
      { time: 2.0, dur: 3.0, text: "oh my darling Clementine!", words: [
        { t: 2.0, text: "oh" }, { t: 2.25, text: "my" }, { t: 2.5, text: "darling" }, { t: 3.0, text: "Clem-" }, { t: 3.25, text: "en-" }, { t: 3.5, text: "tine!" }] },
    ],
  }),
  builtin({
    id: "bi-camptown", title: "Camptown Races", artist: "Stephen Foster (Trad.)",
    key: "C", bpm: 120, difficulty: "intermediate", genre: "Folk", tags: ["verify-melody"],
    background: { type: "animated", value: "pulse" },
    notes: parseMelody(120, "G4:1 E4:1 G4:0.5 A4:0.5 G4:1 E4:1 D4:1 E4:1 C4:1"),
    lyrics: [
      { time: 0, dur: 2.0, text: "Camptown ladies sing this song,", words: [
        { t: 0, text: "Camptown" }, { t: 0.5, text: "ladies" }, { t: 1.0, text: "sing" }, { t: 1.25, text: "this" }, { t: 1.5, text: "song," }] },
      { time: 2.0, dur: 2.0, text: "Doo-dah! Doo-dah!", words: [
        { t: 2.0, text: "Doo-dah!" }, { t: 3.0, text: "Doo-dah!" }] },
    ],
  }),
  builtin({
    id: "bi-valley", title: "Down in the Valley", artist: "Trad.",
    key: "C", bpm: 120, difficulty: "beginner", genre: "Folk", tags: ["verify-melody"],
    background: { type: "animated", value: "aurora" },
    notes: parseMelody(120,
      "G3:1 G3:0.5 A3:0.5 C4:1 C4:0.5 B3:0.5 A3:1 G3:2 " +
      "G3:1 A3:0.5 B3:0.5 C4:1 B3:0.5 A3:0.5 G3:1 G3:2"),
    lyrics: [
      { time: 0, dur: 3.5, text: "Down in the valley, the valley so low,", words: [
        { t: 0, text: "Down" }, { t: 0.5, text: "in" }, { t: 0.75, text: "the" }, { t: 1.0, text: "valley," }, { t: 1.5, text: "the" }, { t: 1.75, text: "valley" }, { t: 2.0, text: "so" }, { t: 2.5, text: "low," }] },
      { time: 3.5, dur: 4.5, text: "Hang your head over, hear the wind blow.", words: [
        { t: 3.5, text: "Hang" }, { t: 4.0, text: "your" }, { t: 4.25, text: "head" }, { t: 4.5, text: "over," }, { t: 5.0, text: "hear" }, { t: 5.25, text: "the" }, { t: 5.5, text: "wind" }, { t: 6.0, text: "blow." }] },
    ],
  }),
  builtin({
    id: "bi-michael", title: "Michael, Row the Boat Ashore", artist: "Trad. (spiritual)",
    key: "C", bpm: 100, difficulty: "beginner", genre: "Hymn/Gospel", tags: ["verify-melody"],
    background: { type: "animated", value: "waves" },
    notes: parseMelody(100, "C4:1 E4:1 G4:0.5 G4:0.5 E4:1 G4:2 C4:1 E4:1 G4:0.5 G4:0.5 E4:1 G4:2"),
    lyrics: [
      { time: 0, dur: 3.6, text: "Michael, row the boat ashore, Hallelujah!", words: [
        { t: 0, text: "Michael," }, { t: 0.6, text: "row" }, { t: 1.2, text: "the" }, { t: 1.5, text: "boat" }, { t: 1.8, text: "ashore," }, { t: 2.4, text: "Hallelujah!" }] },
      { time: 3.6, dur: 3.6, text: "Michael, row the boat ashore, Hallelujah!", words: [
        { t: 3.6, text: "Michael," }, { t: 4.2, text: "row" }, { t: 4.8, text: "the" }, { t: 5.1, text: "boat" }, { t: 5.4, text: "ashore," }, { t: 6.0, text: "Hallelujah!" }] },
    ],
  }),
  builtin({
    id: "bi-deckhalls", title: "Deck the Halls", artist: "Trad. (Welsh)",
    key: "C", bpm: 120, difficulty: "intermediate", genre: "Holiday", tags: ["verify-melody"],
    background: { type: "animated", value: "starfield" },
    notes: parseMelody(120,
      "C5:1 B4:0.5 A4:0.5 G4:1 A4:0.5 G4:0.5 F4:1 " +
      "E4:0.5 D4:0.5 C4:0.5 D4:0.5 E4:0.5 E4:0.5 D4:0.5 C4:0.5 C4:1"),
    lyrics: [
      { time: 0, dur: 2.5, text: "Deck the halls with boughs of holly,", words: [
        { t: 0, text: "Deck" }, { t: 0.5, text: "the" }, { t: 0.75, text: "halls" }, { t: 1.0, text: "with" }, { t: 1.5, text: "boughs" }, { t: 1.75, text: "of" }, { t: 2.0, text: "holly," }] },
      { time: 2.5, dur: 2.5, text: "Fa la la la la, la la la la!", words: [
        { t: 2.5, text: "Fa" }, { t: 2.75, text: "la" }, { t: 3.0, text: "la" }, { t: 3.25, text: "la" }, { t: 3.5, text: "la," }, { t: 3.75, text: "la" }, { t: 4.0, text: "la" }, { t: 4.25, text: "la" }, { t: 4.5, text: "la!" }] },
    ],
  }),
  builtin({
    id: "bi-kumbaya", title: "Kumbaya", artist: "Trad. (spiritual)",
    key: "C", bpm: 100, difficulty: "beginner", genre: "Hymn/Gospel", tags: ["verify-melody"],
    background: { type: "animated", value: "aurora" },
    notes: parseMelody(100, "C4:1 E4:0.5 G4:1 G4:1.5 C4:1 E4:0.5 G4:1 G4:1.5"),
    lyrics: [
      { time: 0, dur: 2.4, text: "Kumbaya, my Lord, kumbaya,", words: [
        { t: 0, text: "Kumbaya," }, { t: 0.6, text: "my" }, { t: 0.9, text: "Lord," }, { t: 1.5, text: "kumbaya," }] },
      { time: 2.4, dur: 2.4, text: "Kumbaya, my Lord, kumbaya,", words: [
        { t: 2.4, text: "Kumbaya," }, { t: 3.0, text: "my" }, { t: 3.3, text: "Lord," }, { t: 3.9, text: "kumbaya," }] },
    ],
  }),
  builtin({
    id: "bi-muffin", title: "The Muffin Man", artist: "Trad.",
    key: "C", bpm: 120, difficulty: "beginner", genre: "Children's", tags: ["verify-melody"],
    background: { type: "animated", value: "pulse" },
    notes: parseMelody(120, "C4:0.5 D4:0.5 E4:1 D4:0.5 C4:0.5 G4:1 G4:0.5 A4:0.5 G4:1 F4:0.5 E4:0.5 D4:1"),
    lyrics: [
      { time: 0, dur: 2.0, text: "Do you know the muffin man,", words: [
        { t: 0, text: "Do" }, { t: 0.25, text: "you" }, { t: 0.5, text: "know" }, { t: 1.0, text: "the" }, { t: 1.25, text: "muffin" }, { t: 1.5, text: "man," }] },
      { time: 2.0, dur: 2.0, text: "the muffin man, the muffin man?", words: [
        { t: 2.0, text: "the" }, { t: 2.25, text: "muffin" }, { t: 2.5, text: "man," }, { t: 3.0, text: "the" }, { t: 3.25, text: "muffin" }, { t: 3.5, text: "man?" }] },
    ],
  }),
  builtin({
    id: "bi-skiplou", title: "Skip to My Lou", artist: "Trad.",
    key: "C", bpm: 120, difficulty: "beginner", genre: "Folk", tags: ["verify-melody"],
    background: { type: "animated", value: "waves" },
    notes: parseMelody(120, "G4:1 G4:1 E4:0.5 G4:0.5 G4:0.5 E4:1.5 G4:0.5 G4:0.5 E4:0.5 G4:1 D4:0.5 E4:1.5"),
    lyrics: [
      { time: 0, dur: 2.5, text: "Lou, Lou, skip to my Lou,", words: [
        { t: 0, text: "Lou," }, { t: 0.5, text: "Lou," }, { t: 1.0, text: "skip" }, { t: 1.25, text: "to" }, { t: 1.5, text: "my" }, { t: 1.75, text: "Lou," }] },
      { time: 2.5, dur: 2.5, text: "Skip to my Lou, my darling!", words: [
        { t: 2.5, text: "Skip" }, { t: 2.75, text: "to" }, { t: 3.0, text: "my" }, { t: 3.25, text: "Lou," }, { t: 3.75, text: "my" }, { t: 4.0, text: "darling!" }] },
    ],
  }),
  builtin({
    id: "bi-yankee", title: "Yankee Doodle", artist: "Trad.",
    key: "C", bpm: 120, difficulty: "beginner", genre: "Folk", tags: ["verify-melody"],
    background: { type: "solid", value: "" },
    notes: parseMelody(120, "C4:1 C4:1 D4:0.5 E4:0.5 C4:1 E4:1 D4:1 D4:0.5 C4:1.5"),
    lyrics: [
      { time: 0, dur: 2.0, text: "Yankee Doodle went to town,", words: [
        { t: 0, text: "Yankee" }, { t: 0.5, text: "Doodle" }, { t: 1.0, text: "went" }, { t: 1.25, text: "to" }, { t: 1.5, text: "town," }] },
      { time: 2.0, dur: 2.5, text: "riding on a pony!", words: [
        { t: 2.0, text: "riding" }, { t: 2.5, text: "on" }, { t: 3.0, text: "a" }, { t: 3.25, text: "pony!" }] },
    ],
  }),
  builtin({
    id: "bi-firstnoel", title: "The First Noel", artist: "Trad.",
    key: "C", bpm: 100, difficulty: "intermediate", genre: "Holiday", tags: ["verify-melody"],
    background: { type: "animated", value: "aurora" },
    notes: parseMelody(100, "E4:0.5 E4:1 D4:1 C4:0.5 D4:0.5 E4:1 F4:1 G4:1 F4:1 E4:1 D4:1"),
    lyrics: [
      { time: 0, dur: 3.3, text: "The first Noel, the angels did say,", words: [
        { t: 0, text: "The" }, { t: 0.3, text: "first" }, { t: 0.9, text: "Noel," }, { t: 1.5, text: "the" }, { t: 1.8, text: "angels" }, { t: 2.1, text: "did" }, { t: 2.7, text: "say," }] },
      { time: 3.3, dur: 2.4, text: "Noel, Noel, Noel, Noel,", words: [
        { t: 3.3, text: "Noel," }, { t: 3.9, text: "Noel," }, { t: 4.5, text: "Noel," }, { t: 5.1, text: "Noel," }] },
    ],
  }),
  builtin({
    id: "bi-otannenbaum", title: "O Christmas Tree", artist: "Trad. (German)",
    key: "C", bpm: 100, difficulty: "beginner", genre: "Holiday", tags: ["verify-melody"],
    background: { type: "animated", value: "starfield" },
    notes: parseMelody(100, "G3:0.5 C4:1 C4:1 C4:0.5 D4:1 D4:1 B3:0.5 E4:1 D4:0.5 D4:0.5 C4:1.5"),
    lyrics: [
      { time: 0, dur: 3.0, text: "O Christmas tree, O Christmas tree,", words: [
        { t: 0, text: "O" }, { t: 0.3, text: "Christmas" }, { t: 0.9, text: "tree," }, { t: 1.5, text: "O" }, { t: 1.8, text: "Christmas" }, { t: 2.4, text: "tree," }] },
      { time: 3.0, dur: 3.0, text: "how lovely are your branches!", words: [
        { t: 3.0, text: "how" }, { t: 3.3, text: "lovely" }, { t: 3.9, text: "are" }, { t: 4.2, text: "your" }, { t: 4.5, text: "branches!" }] },
    ],
  }),
  builtin({
    id: "bi-buffalogals", title: "Buffalo Gals", artist: "Trad.",
    key: "C", bpm: 120, difficulty: "intermediate", genre: "Folk", tags: ["verify-melody"],
    background: { type: "animated", value: "pulse" },
    notes: parseMelody(120,
      "G4:1 E4:0.5 G4:0.5 G4:1 E4:0.5 G4:0.5 D4:1 E4:0.5 F4:0.5 G4:1 E4:0.5 D4:0.5 C4:1"),
    lyrics: [
      { time: 0, dur: 2.5, text: "Buffalo gals, won't you come out tonight,", words: [
        { t: 0, text: "Buffalo" }, { t: 0.5, text: "gals," }, { t: 0.75, text: "won't" }, { t: 1.0, text: "you" }, { t: 1.5, text: "come" }, { t: 1.75, text: "out" }, { t: 2.0, text: "tonight," }] },
      { time: 2.5, dur: 2.5, text: "come out tonight, come out tonight?", words: [
        { t: 2.5, text: "come" }, { t: 2.75, text: "out" }, { t: 3.0, text: "tonight," }, { t: 3.5, text: "come" }, { t: 3.75, text: "out" }, { t: 4.0, text: "tonight?" }] },
    ],
  }),
  builtin({
    id: "bi-homerange", title: "Home on the Range", artist: "Trad.",
    key: "C", bpm: 120, difficulty: "intermediate", genre: "Country", tags: ["verify-melody"],
    background: { type: "animated", value: "aurora" },
    notes: parseMelody(120,
      "C4:1 F4:0.5 F4:0.5 G4:0.5 A4:1 G4:0.5 F4:0.5 G4:0.5 A4:1 " +
      "A4:0.5 A4:0.5 C5:1 A4:0.5 G4:0.5 F4:0.5 G4:1.5"),
    lyrics: [
      { time: 0, dur: 3.0, text: "Oh, give me a home where the buffalo roam,", words: [
        { t: 0, text: "Oh," }, { t: 0.5, text: "give" }, { t: 0.75, text: "me" }, { t: 1.0, text: "a" }, { t: 1.25, text: "home" }, { t: 1.75, text: "where" }, { t: 2.0, text: "the" }, { t: 2.25, text: "buffalo" }, { t: 2.5, text: "roam," }] },
      { time: 3.0, dur: 2.75, text: "where the deer and the antelope play;", words: [
        { t: 3.0, text: "where" }, { t: 3.25, text: "the" }, { t: 3.5, text: "deer" }, { t: 4.0, text: "and" }, { t: 4.25, text: "the" }, { t: 4.5, text: "antelope" }, { t: 4.75, text: "play;" }] },
    ],
  }),
];
