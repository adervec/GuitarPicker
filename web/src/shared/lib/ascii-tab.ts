// Plain-text ASCII guitar tab — the quick, universally-pasteable format
// guitarists actually trade tabs in (Guitar Pro's own docs call it "a
// simple universal text format for tablature").
//
// Export (songToAsciiTab) is the primary direction — matching MusicXML/
// .gpsong.json, it's offered from EditorPage's Export button. Import
// (asciiTabToNotes) is the second, by request, via a paste dialog in
// TabRoll (same window.prompt() pattern EditorPage's "Paste LRC" already
// uses) rather than a file picker, since that's how tabs actually get
// shared — pasted into a forum post or a chat, not attached as a file.
// It's inherently lossier than MusicXML: rhythm isn't really encoded, only
// column position, so duration is *inferred* (rings until the next note on
// any string starts) rather than read — good enough to get a quick tab
// typed elsewhere into this editor, not a faithful round-trip.
import { midiToFret, stringLabel } from "@/entities/instrument/model/data";
import type { Song, Note } from "@/entities/song/model/song-format";

const CHARS_PER_BEAT = 4; // matches this app's finest grid (1/16 beat) to one ASCII column

export function songToAsciiTab(song: Song, tabStrings: number[]): string {
  if (!tabStrings.length) return "";
  const spb = 60 / (song.bpm || 90);
  const rows = tabStrings.length;
  const cells: { col: number; row: number; digits: string }[] = [];
  let maxCol = 0;
  for (const n of song.notes) {
    for (const m of n.midi) {
      const strIdx = n.str != null && n.midi.length === 1 ? n.str : (midiToFret(m, song.instrument, tabStrings)?.string ?? null);
      if (strIdx == null) continue;
      const fret = m - tabStrings[strIdx];
      if (fret < 0) continue;
      const col = Math.round((n.time / spb) * CHARS_PER_BEAT);
      const digits = String(fret);
      cells.push({ col, row: rows - 1 - strIdx, digits });
      maxCol = Math.max(maxCol, col + digits.length);
    }
  }
  const width = maxCol + 2;
  const lines: string[][] = Array.from({ length: rows }, () => Array(width).fill("-"));
  for (const cell of cells) {
    for (let i = 0; i < cell.digits.length; i++) lines[cell.row][cell.col + i] = cell.digits[i];
  }
  return lines
    .map((chars, r) => `${stringLabel(song.instrument, tabStrings, rows - 1 - r, "notes").padEnd(2)}|${chars.join("")}|`)
    .join("\n");
}

/** ASCII tab -> Note[]. One line per string, top = highest-pitched string
 *  (the universal convention regardless of what the line's own label says,
 *  e.g. "e|--5--0--|" — line ORDER is what's trusted, not the label text,
 *  since real-world pasted tabs spell/pad/omit labels inconsistently).
 *  Each digit run between a line's first `|` and its end is one fret
 *  number at that column; a note's duration runs until the next fret
 *  number on ANY string, or one beat if it's the last one. Throws if the
 *  number of string lines doesn't match the current instrument. */
export function asciiTabToNotes(text: string, tabStrings: number[], bpm: number, charsPerBeat = CHARS_PER_BEAT): Note[] {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.includes("|"));
  if (!lines.length) throw new Error("No tab lines found — each string's line needs a '|' after its label");
  if (lines.length !== tabStrings.length) {
    throw new Error(`Found ${lines.length} string line(s), but the current instrument has ${tabStrings.length}`);
  }
  const spb = 60 / (bpm || 90);
  const events: { col: number; strIdx: number; fret: number }[] = [];
  lines.forEach((line, lineIdx) => {
    const body = line.slice(line.indexOf("|") + 1);
    const strIdx = tabStrings.length - 1 - lineIdx;
    const re = /\d+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) events.push({ col: m.index, strIdx, fret: +m[0] });
  });
  if (!events.length) throw new Error("No fret numbers found in that tab");
  const cols = Array.from(new Set(events.map((e) => e.col))).sort((a, b) => a - b);
  return events
    .sort((a, b) => a.col - b.col)
    .map((ev) => {
      const nextCol = cols.find((c) => c > ev.col);
      const beats = Math.max(0.1, ((nextCol ?? ev.col + charsPerBeat) - ev.col) / charsPerBeat);
      const midi = tabStrings[ev.strIdx] + ev.fret;
      return {
        time: +((ev.col / charsPerBeat) * spb).toFixed(4),
        dur: +(beats * spb * 0.92).toFixed(4),
        midi: [midi],
        str: ev.strIdx,
      };
    });
}
