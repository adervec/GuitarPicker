// Turn a stream of pitch frames ({ t, freq }) into quantized notes[].
// Shared by the Listen view (record → song) and the editor's hum-to-capture
// (record → vocal melody). Monophonic: consecutive same-MIDI frames merge into
// one note; a short silence ends the current note.
import { freqToMidi } from "./notes.js";

export function quantizeNotes(notes, bpm, gridBeats = 0.25) {
  const grid = (60 / bpm) * gridBeats;
  return notes
    .map((n) => ({
      time: +(Math.round(n.time / grid) * grid).toFixed(4),
      dur: +(Math.max(grid, Math.round(n.dur / grid) * grid) * 0.92).toFixed(4),
      midi: n.midi,
    }))
    .filter((n) => n.dur >= grid * 0.5);
}

export function framesToNotes(frames, bpm, a4 = 440) {
  const notes = [];
  let cur = null;
  const minDur = 0.07;
  const closeNote = (n) => {
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
