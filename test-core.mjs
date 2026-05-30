// Functional smoke test of the DOM-free core (music + audio math).
import assert from "node:assert";
import { midiToFreq, freqToMidi, nameToMidi, midiToName, scaleNotes, midiToFret } from "./src/music/notes.js";
import { chordMidis, identifyChord, suggestCapo, transposeSong } from "./src/music/theory.js";
import { parseMelody, newSong, validateSong, songDuration } from "./src/music/song-format.js";
import { builtinSongs } from "./src/music/songs.js";
import { DRILLS, buildDrillSong, COURSES } from "./src/music/drills.js";
import { detectPitch } from "./src/audio/pitch.js";
import { GLOSSARY, CATEGORIES } from "./src/music/glossary-data.js";

let pass = 0;
const ok = (name, cond) => { assert.ok(cond, "FAILED: " + name); console.log("  ✓ " + name); pass++; };

// ---- notes / theory ----
ok("A4 = 440Hz", Math.abs(midiToFreq(69) - 440) < 0.001);
ok("440Hz -> midi 69", freqToMidi(440) === 69);
ok("nameToMidi C4 = 60", nameToMidi("C4") === 60);
ok("nameToMidi F#3", nameToMidi("F#3") === 54);
ok("midiToName 60 = C4", midiToName(60).full === "C4");
ok("C major scale pcs", scaleNotes(0, "major").join() === "0,2,4,5,7,9,11");
ok("guitar low E open -> string0 fret0", JSON.stringify(midiToFret(40)) === JSON.stringify({ string: 0, fret: 0 }));

const cMaj = chordMidis(60, "maj");
ok("C major chord = C E G", cMaj.join() === "60,64,67");
const id = identifyChord([64, 60, 67]);
ok("identify C major", id && id.name === "C");
const am7 = identifyChord(chordMidis(57, "min7"));
ok("identify Am7", am7 && am7.type === "min7");
ok("suggestCapo returns capo<=7", suggestCapo(8).capo <= 7);
ok("transpose +2", transposeSong([{ time: 0, dur: 1, midi: [60] }], 2)[0].midi[0] === 62);

// ---- song format ----
const mel = parseMelody(120, "C4:1 E4:1 G4:2 r:1 C4+E4+G4:2");
ok("parseMelody count (rest excluded)", mel.length === 4);
ok("parseMelody timing", Math.abs(mel[2].time - 1) < 1e-6); // C,E at 0 and 0.5; G at 1.0
ok("parseMelody chord", mel[3].midi.length === 3);
const sng = newSong({ title: "T", notes: mel });
ok("validateSong ok", validateSong(sng).ok);
ok("songDuration > 0", songDuration(sng) > 0);

// ---- built-in library ----
const songs = builtinSongs();
ok("library has >= 10 songs", songs.length >= 10);
for (const s of songs) {
  assert.ok(s.notes.length > 0, "song has notes: " + s.title);
  for (const n of s.notes) {
    assert.ok(Array.isArray(n.midi) && n.midi.every((m) => Number.isFinite(m) && m > 0 && m < 128),
      "valid midi in " + s.title + " -> " + JSON.stringify(n.midi));
    assert.ok(Number.isFinite(n.time) && Number.isFinite(n.dur), "finite time/dur in " + s.title);
  }
}
ok("all built-in songs have valid notes", true);

// ---- drills / courses ----
for (const d of DRILLS) {
  const ds = buildDrillSong(d, d.bpm);
  assert.ok(ds.notes.length > 0, "drill has notes: " + d.id);
}
ok("all drills generate notes", true);
const refs = new Set([...songs.map((s) => s.id), ...DRILLS.map((d) => d.id)]);
for (const c of COURSES) for (const st of c.steps)
  assert.ok(refs.has(st.ref), "course step ref exists: " + st.ref);
ok("all course steps reference real songs/drills", true);

// ---- glossary ----
ok("glossary has terms", GLOSSARY.length > 30);
ok("glossary categories derived", CATEGORIES.length >= 5);

// ---- pitch detection on synthesized sines ----
const SR = 44100;
function sine(freq, n = 2048, amp = 0.5) {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) b[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR);
  return b;
}
for (const f of [110, 196, 220, 330, 440]) {
  const { freq } = detectPitch(sine(f), SR, 0.01);
  assert.ok(Math.abs(freq - f) < 3, `detectPitch ${f}Hz got ${freq && freq.toFixed(2)}`);
}
ok("detectPitch matches sine tones (110-440Hz)", true);
const silent = detectPitch(new Float32Array(2048), SR, 0.01);
ok("detectPitch gates silence", silent.freq === -1);

console.log(`\n${pass} checks passed.`);
