// LRC karaoke-lyric parsing and serialization. Ported verbatim from the
// vanilla app's src/music/lrc.js — used by the Song Editor's Lyrics &
// Karaoke panel (import/paste/export .lrc).
//
// Supports two flavours, both common in the wild:
//   - Standard LRC: line timestamps        [mm:ss.xx]Line text
//   - Enhanced LRC: inline word timestamps  [mm:ss.xx]<mm:ss.xx>Word <mm:ss.xx>word
// A single line may carry several leading time tags (repeated lines), which we
// expand into one entry per tag. ID-tag metadata ([ti:], [ar:], ...) is ignored,
// except [offset:N] (milliseconds) which is applied to every timestamp.
//
// Output matches the song-format lyric shape:
//   { time, dur, text, words?: [{ t, text }] }
// Durations are filled from the following timestamp so the persisted song is
// self-contained; the karaoke timeline tolerates them being absent too.
import type { LyricLine, LyricWord } from "@/entities/song/model/song-format";

const LEADING_TIME_TAG = /^\s*\[(\d+):(\d+(?:[.:]\d+)?)\]/;
const OFFSET_TAG = /^\s*\[offset:\s*(-?\d+)\s*\]/i;
const WORD_TAG = /<(\d+):(\d+(?:[.:]\d+)?)>([^<]*)/g;

function tagToSeconds(min: string, sec: string): number {
  return parseInt(min, 10) * 60 + parseFloat(String(sec).replace(":", "."));
}

// "mm:ss.xx" (or "m:ss") -> seconds, or null when it isn't a timestamp.
export function parseLRCTime(str: string): number | null {
  const m = /^\s*(\d+):(\d+(?:[.:]\d+)?)\s*$/.exec(str || "");
  return m ? tagToSeconds(m[1], m[2]) : null;
}

function parseEnhancedLine(rest: string): { text: string; words: LyricWord[] | null } {
  if (!/<\d+:\d+(?:[.:]\d+)?>/.test(rest)) return { text: rest.trim(), words: null };
  const words: LyricWord[] = [];
  let plain = "";
  WORD_TAG.lastIndex = 0;
  let m;
  while ((m = WORD_TAG.exec(rest))) {
    const t = tagToSeconds(m[1], m[2]);
    plain += m[3];
    const text = m[3].trim();
    if (text) words.push({ t: +t.toFixed(3), text });
  }
  return { text: plain.trim(), words: words.length ? words : null };
}

function fillDurations(lines: LyricLine[], defaultLineDur = 3): void {
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const lineEnd = i + 1 < lines.length ? lines[i + 1].time : L.time + defaultLineDur;
    if (L.dur == null) L.dur = +Math.max(0.1, lineEnd - L.time).toFixed(3);
  }
}

export function parseLRC(text: string): LyricLine[] {
  const out: LyricLine[] = [];
  let offset = 0;
  for (const raw of String(text || "").split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const off = OFFSET_TAG.exec(raw);
    if (off) { offset = parseInt(off[1], 10) / 1000; continue; }
    // Strip and collect all leading [mm:ss.xx] tags.
    const times: number[] = [];
    let rest = raw, m;
    while ((m = LEADING_TIME_TAG.exec(rest))) {
      times.push(tagToSeconds(m[1], m[2]));
      rest = rest.slice(m[0].length);
    }
    if (!times.length) continue; // metadata tag or untimed line — skip
    const { text: lineText, words } = parseEnhancedLine(rest);
    for (const t0 of times) {
      const entry: LyricLine = { time: +(t0 + offset).toFixed(3), text: lineText };
      if (words) entry.words = words.map((w) => ({ t: +(w.t + offset).toFixed(3), text: w.text }));
      out.push(entry);
    }
  }
  out.sort((a, b) => a.time - b.time);
  fillDurations(out);
  return out;
}

function fmtLRCTime(sec: number): string {
  const s = Math.max(0, sec);
  const mm = Math.floor(s / 60);
  const ss = (s - mm * 60).toFixed(2);
  return `${String(mm).padStart(2, "0")}:${ss.padStart(5, "0")}`;
}

// Serialize a song-format lyric array back to LRC. `enhanced` emits inline word
// timestamps when a line carries word timing.
export function toLRC(lyrics: LyricLine[] | undefined, { enhanced = true }: { enhanced?: boolean } = {}): string {
  const lines: string[] = [];
  for (const L of lyrics || []) {
    if (typeof L.time !== "number") continue;
    let line = `[${fmtLRCTime(L.time)}]`;
    if (enhanced && Array.isArray(L.words) && L.words.length) {
      line += L.words.map((w) => `<${fmtLRCTime(w.t)}>${w.text}`).join(" ");
    } else {
      line += L.text || "";
    }
    lines.push(line);
  }
  return lines.join("\n");
}
