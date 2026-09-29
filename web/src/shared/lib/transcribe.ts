// Turn a stream of pitch frames ({ t, freq }) into quantized notes[]. Ported
// verbatim from the vanilla app's src/music/transcribe.js. Monophonic:
// consecutive same-MIDI frames merge into one note; a short silence ends the
// current note. Used by Listen & Make's record-to-song flow.
import { freqToMidi } from "./note-math";
import type { Note } from "@/entities/song/model/song-format";

export interface PitchFrame {
  t: number;
  freq: number;
}

export function quantizeNotes(notes: Note[], bpm: number, gridBeats = 0.25): Note[] {
  const grid = (60 / bpm) * gridBeats;
  return notes
    .map((n) => ({
      time: +(Math.round(n.time / grid) * grid).toFixed(4),
      dur: +(Math.max(grid, Math.round(n.dur / grid) * grid) * 0.92).toFixed(4),
      midi: n.midi,
    }))
    .filter((n) => n.dur >= grid * 0.5);
}

export function framesToNotes(frames: PitchFrame[], bpm: number, a4 = 440): Note[] {
  const notes: Note[] = [];
  let cur: { midi: number; start: number; last: number } | null = null;
  const minDur = 0.07;
  const closeNote = (n: { midi: number; start: number; last: number }) => {
    const dur = Math.max(minDur, n.last - n.start + 0.04);
    notes.push({ time: n.start, dur, midi: [n.midi] });
  };
  for (const fr of frames) {
    const midi = fr.freq > 0 ? freqToMidi(fr.freq, a4) : null;
    if (midi == null) {
      if (cur && fr.t - cur.last > 0.06) { closeNote(cur); cur = null; }
      continue;
    }
    if (cur && midi === cur.midi) cur.last = fr.t;
    else { if (cur) closeNote(cur); cur = { midi, start: fr.t, last: fr.t }; }
  }
  if (cur) closeNote(cur);
  return quantizeNotes(notes, bpm);
}
