// Functional smoke test of the DOM-free core (music + audio math).
import assert from "node:assert";
import { midiToFreq, freqToMidi, nameToMidi, midiToName, scaleNotes, midiToFret } from "./src/music/notes.js";
import { chordMidis, identifyChord, suggestCapo, transposeSong } from "./src/music/theory.js";
import { parseMelody, newSong, validateSong, songDuration } from "./src/music/song-format.js";
import { builtinSongs } from "./src/music/songs.js";
import { DRILLS, buildDrillSong, COURSES } from "./src/music/drills.js";
import { detectPitch } from "./src/audio/pitch.js";
import { GLOSSARY, CATEGORIES } from "./src/music/glossary-data.js";
import { parseLRC, toLRC, parseLRCTime } from "./src/music/lrc.js";
import { buildLyricTimeline, activeAt, timelineDuration } from "./src/karaoke/timeline.js";
import { Grader, centsOff, classify, gradeLetter, vocalTargets } from "./src/karaoke/grader.js";
import { lineFillHTML, escapeHTML } from "./src/karaoke/render.js";
import { framesToNotes, quantizeNotes } from "./src/music/transcribe.js";
import { mergeSyncable } from "./src/cloud/merge.js";
import { OAUTH_ORIGINS, originAllowed, syncConfigured } from "./src/cloud/config.js";

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

// ---- karaoke: LRC parsing ----
ok("parseLRCTime mm:ss.xx", Math.abs(parseLRCTime("01:02.50") - 62.5) < 1e-6);
const lrc = parseLRC("[ti:Demo]\n[offset:0]\n[00:00.00]Hello world\n[00:02.50]Second line");
ok("parseLRC skips metadata, keeps 2 lines", lrc.length === 2);
ok("parseLRC times", Math.abs(lrc[0].time - 0) < 1e-6 && Math.abs(lrc[1].time - 2.5) < 1e-6);
ok("parseLRC line dur from next tag", Math.abs(lrc[0].dur - 2.5) < 1e-6);
const elrc = parseLRC("[00:01.00]<00:01.00>Twin<00:01.50>kle <00:02.00>star");
ok("parseLRC enhanced word count", elrc[0].words && elrc[0].words.length === 3);
ok("parseLRC enhanced word time", Math.abs(elrc[0].words[2].t - 2.0) < 1e-6);
ok("parseLRC offset applied", parseLRC("[offset:500]\n[00:01.00]x")[0].time === 1.5);
const round = parseLRC(toLRC(lrc));
ok("toLRC -> parseLRC roundtrip", round.length === 2 && Math.abs(round[1].time - 2.5) < 0.02);
const eround = parseLRC(toLRC(elrc));
ok("toLRC enhanced roundtrip keeps words", eround[0].words && eround[0].words.length === 3);

// ---- karaoke: lyric timeline ----
const ksong = newSong({ title: "K", notes: mel,
  lyrics: [{ time: 0, dur: 3, text: "one two three" }, { time: 4, text: "four" }],
  voice: { notes: [{ time: 0, dur: 0.5, midi: [60] }] } });
ok("validateSong accepts voice + lyrics", validateSong(ksong).ok);
const tl = buildLyricTimeline(ksong);
ok("timeline builds 2 lines", tl.lines.length === 2);
ok("words auto-distributed for line-only lyric", tl.lines[0].words.length === 3);
ok("auto words stay within line span", tl.lines[0].words[0].t >= 0 && tl.lines[0].words[2].end <= 3.001);
ok("timeline preserves authored word timing", buildLyricTimeline({ lyrics: elrc }).lines[0].words.length === 3);
ok("timelineDuration is last line end", Math.abs(timelineDuration(tl) - tl.lines[1].end) < 1e-6);
ok("activeAt before first line", activeAt(tl, -1).lineIdx === -1);
ok("activeAt selects current line", activeAt(tl, 0.1).lineIdx === 0 && activeAt(tl, 4.2).lineIdx === 1);
const aw = activeAt(tl, 0.1);
ok("activeAt resolves current word + progress", aw.wordIdx === 0 && aw.wordProgress > 0 && aw.wordProgress <= 1);
const wordTimed = songs.filter((s) => (s.lyrics || []).some((l) => Array.isArray(l.words) && l.words.length));
ok("at least 2 built-in songs are word-timed showcases", wordTimed.length >= 2);
for (const ws of wordTimed) for (const ln of buildLyricTimeline(ws).lines)
  ln.words.forEach((w, i) => assert.ok(i === 0 || w.t >= ln.words[i - 1].t, "words sorted in " + ws.title));
ok("word-timed built-ins build a monotonic timeline", true);

// ---- karaoke: grader ----
ok("centsOff is octave-agnostic", centsOff(72, [60]) < 1e-6 && centsOff(60, [60]) < 1e-6);
ok("classify perfect/good/off/miss", classify(2, 10) === "perfect" && classify(1, 50) === "good"
  && classify(1, 999) === "off" && classify(0, 999) === "miss");
const g = new Grader();
const vnote = { midi: [60], frames: 0, best: Infinity };
for (let i = 0; i < 3; i++) g.observe(vnote, 72); // sung an octave up — still perfect
ok("grader scores an octave-up perfect", g.finalize(vnote) === "perfect" && g.counts.perfect === 1 && g.score === 100);
ok("grader accuracy 100 after one perfect", g.accuracy() === 100);
const g2 = new Grader();
g2.finalize({ midi: [60], frames: 0, best: Infinity }); // a miss
ok("grader miss drops health, no score", g2.counts.miss === 1 && g2.health === 90 && g2.score === 0);
ok("gradeLetter S/F", gradeLetter(98, false) === "S" && gradeLetter(99, true) === "F");
ok("vocalTargets prefers authored voice melody",
  vocalTargets({ voice: { notes: [{ time: 0, dur: 1, midi: [60] }] }, notes: [{ time: 0, dur: 1, midi: [48] }] })[0].midi[0] === 60);
ok("vocalTargets falls back to instrument melody",
  vocalTargets({ voice: { notes: [] }, notes: [{ time: 0, dur: 1, midi: [48] }] })[0].midi[0] === 48);

// ---- karaoke: line fill HTML ----
ok("escapeHTML escapes angle brackets", escapeHTML("a<b>&c") === "a&lt;b&gt;&amp;c");
const fillLine = buildLyricTimeline(ksong).lines[0]; // "one two three", 3 auto words
const html0 = lineFillHTML(fillLine, -1, 0);
ok("lineFillHTML neutral before first word", !html0.includes("done") && !html0.includes("cur"));
const html1 = lineFillHTML(fillLine, 1, 0.5);
ok("lineFillHTML marks done/current words", html1.includes('kw done') && html1.includes('kw cur') && html1.includes("50%"));
ok("lineFillHTML falls back to plain text", lineFillHTML({ text: "hi", words: [] }, 0, 0) === "hi");

// ---- transcription (Listen + hum-to-capture) ----
const humFrames = [];
for (let t = 0; t < 0.5; t += 0.02) humFrames.push({ t: +t.toFixed(2), freq: 440 });      // A4 (midi 69)
for (let t = 0.5; t < 0.64; t += 0.02) humFrames.push({ t: +t.toFixed(2), freq: -1 });     // gap
for (let t = 0.7; t < 1.2; t += 0.02) humFrames.push({ t: +t.toFixed(2), freq: 493.88 });  // B4 (midi 71)
const humNotes = framesToNotes(humFrames, 120, 440);
ok("framesToNotes segments two sung notes", humNotes.length === 2);
ok("framesToNotes detects A4 then B4", humNotes[0].midi[0] === 69 && humNotes[1].midi[0] === 71);
ok("framesToNotes quantizes onsets to the grid", humNotes.every((n) => Math.abs(n.time / (0.5 * 0.25) - Math.round(n.time / (0.5 * 0.25))) < 1e-6));
const q = quantizeNotes([{ time: 0.04, dur: 0.001, midi: [60] }], 120);
ok("quantizeNotes snaps onset to grid + floors dur to >= grid", q.length === 1 && q[0].time === 0 && q[0].dur >= 0.1);

// ---- cloud sync merge ----
const localP = { savedAt: 100, songs: [{ id: "x", createdAt: "2024-01-01" }, { id: "y", createdAt: "2024-01-01" }],
  history: [{ ts: 10, songId: "x" }], progress: { guitar: { xp: 50, drills: { d1: 80 }, courses: { c1: ["s1"] } } },
  coins: 30, unlocks: { red: true } };
const remoteP = { savedAt: 200, songs: [{ id: "y", createdAt: "2024-06-01" }, { id: "z", createdAt: "2024-01-01" }],
  history: [{ ts: 10, songId: "x" }, { ts: 20, songId: "z" }], progress: { guitar: { xp: 90, drills: { d1: 60, d2: 40 }, courses: { c1: ["s2"] } } },
  coins: 12, unlocks: { blue: true } };
const mg = mergeSyncable(localP, remoteP);
ok("merge unions songs by id (x,y,z)", mg.songs.length === 3);
ok("merge keeps newer song on id conflict", mg.songs.find((s) => s.id === "y").createdAt === "2024-06-01");
ok("merge dedupes history by ts+songId", mg.history.length === 2);
ok("merge takes max xp + union drills/courses", mg.progress.guitar.xp === 90 && mg.progress.guitar.drills.d1 === 80 && mg.progress.guitar.drills.d2 === 40 && mg.progress.guitar.courses.c1.length === 2);
ok("merge unions unlocks", mg.unlocks.red && mg.unlocks.blue);
ok("merge coins = last-write-wins by savedAt", mg.coins === 12);
ok("merge coins flips when local is newer", mergeSyncable({ ...localP, savedAt: 300 }, remoteP).coins === 30);
ok("merge of empties is safe", mergeSyncable(null, null).songs.length === 0);

// ---- cloud OAuth origin gate ----
{
  const saved = globalThis.location;
  const set = (origin) => { globalThis.location = { origin, hostname: new URL(origin).hostname }; };
  set("http://localhost:8080"); ok("origin gate allows localhost dev (any port)", originAllowed());
  set(OAUTH_ORIGINS[0]); ok("origin gate allows the production origin", originAllowed());
  set("https://evil.example.com"); ok("origin gate denies an unknown origin", !originAllowed());
  ok("not configured without a client id, even on an allowed origin", !syncConfigured());
  if (saved === undefined) delete globalThis.location; else globalThis.location = saved;
}

console.log(`\n${pass} checks passed.`);
