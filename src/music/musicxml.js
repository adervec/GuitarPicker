// MusicXML (score-partwise, uncompressed .musicxml/.xml) -> GuitarPicker song.
// MuseScore, TuxGuitar and Guitar Pro all export this, so it is also the route
// for .gp/.gp5 files: open them in TuxGuitar (free) and export MusicXML.
// ponytail: no .mxl (zipped) — unzip it first; add DecompressionStream if asked.
import { newSong } from "./song-format.js";
import { INSTRUMENTS } from "./notes.js";

// Tiny XML reader: enough for MusicXML (elements, attributes, text). Hand-rolled
// rather than DOMParser so the Node test suite can run it.
export function parseXML(text) {
  const root = { name: "#root", attrs: {}, kids: [], text: "" };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<![^>]*>|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:\s+[^\s=]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(text))) {
    const top = stack[stack.length - 1];
    if (m[1] != null) top.text += m[1];
    else if (m[2]) { if (stack.length > 1) stack.pop(); }
    else if (m[3]) {
      const node = { name: m[3], attrs: {}, kids: [], text: "" };
      for (const a of m[4].matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) node.attrs[a[1]] = unescape(a[2] ?? a[3]);
      top.kids.push(node);
      if (!m[5]) stack.push(node);
    } else if (m[6]) top.text += unescape(m[6]);
  }
  return root;
}
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const kid = (n, name) => n?.kids.find((k) => k.name === name);
const kids = (n, name) => (n?.kids || []).filter((k) => k.name === name);
const txt = (n, name) => kid(n, name)?.text.trim() ?? "";
const findAll = (n, name, out = []) => { for (const k of n.kids) { if (k.name === name) out.push(k); findAll(k, name, out); } return out; };

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const KEYS = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];

/** Guess our instrument id from a MusicXML part name. */
export function guessInstrument(name = "") {
  const n = name.toLowerCase();
  const rules = [
    [/drum|percussion|kit/, "e-drums"], [/bass/, "bass"], [/electric.*guitar|e\.? ?gtr|distortion|overdrive/, "electric-guitar"],
    [/classical|nylon/, "classical-guitar"], [/guitar|gtr/, "acoustic-guitar"], [/ukulele|uke/, "ukulele"],
    [/mandolin/, "mandolin"], [/banjo/, "banjo"], [/violin|fiddle/, "violin"], [/viola/, "viola"], [/cello/, "cello"],
    [/harmonica/, "harmonica"], [/flute/, "flute"], [/recorder/, "recorder"], [/clarinet/, "clarinet"],
    [/sax/, "alto-sax"], [/trumpet/, "trumpet"], [/trombone/, "trombone"], [/organ/, "organ"],
    [/piano|keys|keyboard/, "piano"], [/voice|vocal|soprano|alto|tenor|sing/, "voice"],
  ];
  for (const [re, id] of rules) if (re.test(n) && INSTRUMENTS[id]) return id;
  return "acoustic-guitar";
}

/** Parse MusicXML text into a normalised song. Throws on non-partwise input. */
export function parseMusicXML(text) {
  const doc = parseXML(text);
  const score = kid(doc, "score-partwise");
  if (!score) throw new Error(kid(doc, "score-timewise") ? "timewise MusicXML isn't supported — re-export as partwise" : "not a MusicXML score");
  const names = {};
  for (const sp of findAll(score, "score-part")) names[sp.attrs.id] = txt(sp, "part-name");
  // ponytail: one tempo for the whole song (the first marked); tempo changes are ignored
  const tempoNode = findAll(score, "sound").find((s) => s.attrs.tempo);
  const bpm = Math.round(parseFloat(tempoNode?.attrs.tempo) || 120);
  const spq = 60 / bpm;  // seconds per quarter note
  const fifths = parseInt(findAll(score, "fifths")[0]?.text, 10);
  const lyrics = [];

  const parts = kids(score, "part").map((part) => {
    let divisions = 1, cursor = 0, lastStart = 0;
    const takeLyrics = !lyrics.length;  // first part with lyrics wins
    const notes = [], open = new Map();  // midi -> note awaiting a tie stop
    for (const measure of kids(part, "measure")) {
      let line = null;
      for (const el of measure.kids) {
        if (el.name === "attributes") { const d = parseFloat(txt(el, "divisions")); if (d > 0) divisions = d; }
        else if (el.name === "backup") cursor -= parseFloat(txt(el, "duration")) || 0;
        else if (el.name === "forward") cursor += parseFloat(txt(el, "duration")) || 0;
        else if (el.name === "note") {
          if (kid(el, "grace")) continue;  // ponytail: grace notes dropped; they carry no duration
          const len = parseFloat(txt(el, "duration")) || 0;
          const chord = !!kid(el, "chord");
          const start = chord ? lastStart : cursor;
          if (!chord) { lastStart = cursor; cursor += len; }
          const p = kid(el, "pitch");
          if (!p) continue;  // rest or unpitched percussion
          const midi = (parseInt(txt(p, "octave"), 10) + 1) * 12 + PC[txt(p, "step")] + Math.round(parseFloat(txt(p, "alter")) || 0);
          if (!Number.isFinite(midi)) continue;
          const time = (start / divisions) * spq, dur = (len / divisions) * spq;
          const ties = kids(el, "tie").map((t) => t.attrs.type);
          const held = open.get(midi);
          if (ties.includes("stop") && held) { held.dur += dur; if (!ties.includes("start")) open.delete(midi); continue; }
          const prev = chord && notes[notes.length - 1];
          let n;
          if (prev && Math.abs(prev.time - time) < 1e-6) { prev.midi.push(midi); n = prev; }
          else { n = { time, dur, midi: [midi] }; notes.push(n); }
          if (ties.includes("start")) open.set(midi, n);
          const ly = kid(el, "lyric");
          if (ly && txt(ly, "text") && takeLyrics) {
            const syl = txt(ly, "syllabic");
            if (!line) { line = { time: +time.toFixed(3), text: "" }; lyrics.push(line); }
            line.text += txt(ly, "text") + (syl === "begin" || syl === "middle" ? "" : " ");
          }
        }
      }
    }
    for (const n of notes) { n.time = +n.time.toFixed(4); n.dur = +(n.dur * 0.92).toFixed(4); }
    return { instrument: guessInstrument(names[part.attrs.id]), name: names[part.attrs.id] || "Part", notes };
  }).filter((p) => p.notes.length);
  if (!parts.length) throw new Error("no pitched notes found");

  const [lead, ...rest] = parts;
  const work = kid(score, "work");
  const creator = findAll(score, "creator").find((c) => c.attrs.type === "composer") || findAll(score, "creator")[0];
  return newSong({
    title: txt(work, "work-title") || txt(score, "movement-title") || "Imported score",
    artist: creator?.text.trim() || "Unknown / Trad.",
    instrument: lead.instrument, notes: lead.notes, parts: rest, bpm,
    key: Number.isFinite(fifths) ? KEYS[fifths + 7] || "C" : "C",
    lyrics: lyrics.map((l) => ({ time: l.time, text: l.text.trim() })),
    source: "musicxml",
  });
}
