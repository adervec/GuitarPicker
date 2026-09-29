// Quick Entry: a compact text notation for the Guitar tab view, mirroring
// the piano roll's own PITCH:beats notation panel but for string+fret —
// `string:fret:beats`, space-separated, e.g. "1:5:1 1:0:1 1:5:1". String
// numbers follow standard tab convention (1 = highest-pitched string,
// counting up to the lowest), same as entities/instrument's stringLabel()
// "numbers" style, so what a guitarist would call "the 1st string" here is
// the 1st string in Quick Entry too.
import { midiToFret } from "@/entities/instrument/model/data";
import type { Note } from "@/entities/song/model/song-format";

export function parseTabEntry(bpm: number, text: string, tabStrings: number[]): Note[] {
  const spb = 60 / (bpm || 90);
  const notes: Note[] = [];
  let t = 0;
  for (const tok of text.trim().split(/\s+/).filter(Boolean)) {
    const m = tok.match(/^(\d+):(\d+):([\d.]+)$/);
    if (!m) throw new Error(`Bad token "${tok}" — expected string:fret:beats, e.g. 1:5:1`);
    const playerNum = +m[1], fret = +m[2], beats = +m[3];
    const strIdx = tabStrings.length - playerNum;
    if (strIdx < 0 || strIdx >= tabStrings.length) {
      throw new Error(`String ${playerNum} doesn't exist on this instrument (1-${tabStrings.length})`);
    }
    if (!beats || beats <= 0) throw new Error(`Bad duration in "${tok}" — beats must be > 0`);
    const midi = tabStrings[strIdx] + fret;
    notes.push({ time: +(t * spb).toFixed(4), dur: +(beats * spb * 0.92).toFixed(4), midi: [midi], str: strIdx });
    t += beats;
  }
  return notes;
}

export function tabEntryFromNotes(notes: Note[], bpm: number, instrument: string, tabStrings: number[]): string {
  const spb = 60 / (bpm || 90);
  return notes
    .slice()
    .sort((a, b) => a.time - b.time)
    .map((n) => {
      if (n.midi.length !== 1) return null; // chords aren't representable in this flat string:fret:beats form
      const m = n.midi[0];
      const strIdx = n.str ?? midiToFret(m, instrument, tabStrings)?.string;
      if (strIdx == null) return null;
      const fret = m - tabStrings[strIdx];
      const playerNum = tabStrings.length - strIdx;
      const beats = Math.round((n.dur / spb / 0.92) * 4) / 4 || 1;
      return `${playerNum}:${fret}:${beats}`;
    })
    .filter((x): x is string => x != null)
    .join(" ");
}
