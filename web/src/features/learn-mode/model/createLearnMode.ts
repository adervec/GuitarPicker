// Learn mode: a self-contained "practice this song in segments" controller.
// Ported verbatim from the vanilla app's src/learn/learn-mode.js — it's
// UI-agnostic and state-agnostic already (no DOM, no framework), so nothing
// needed to change to bring it into this project.
//
// Song is sliced into fixed-length segments (SEGMENT_BEATS each, last one
// trimmed to the song). Entering a segment forces a loop on it at START_RATE;
// each clean pass (>=PASS_ACC accuracy, judged only on notes inside that
// segment) bumps the rate by RATE_STEP, up to full speed.
import type { TimelineSegment } from "@/shared/lib/practice-timeline";

const SEGMENT_BEATS = 16;      // 4 bars of 4/4 per segment
const START_RATE = 0.5;
const RATE_STEP = 0.1;
const PASS_ACC = 85;           // percent

type Grade = "perfect" | "good" | "off" | "miss";

export interface LearnModeHost {
  duration: number;
  beatLen: number;
  applySegment(start: number, end: number): void;
  rewindTo(t: number): void;
  getRate(): number;
  setRate(rate: number): void;
  setLoop(on: boolean): void;
  toast(msg: string, kind: string): void;
}

/**
 * host: {
 *   duration, beatLen,            // song length + seconds-per-beat (numbers)
 *   applySegment(start, end),     // tell the host which range is "current"
 *   rewindTo(t),                  // seek playback (audio/band/notes/clock) to t
 *   getRate(), setRate(rate),     // practice-speed get/set (host also updates its own UI)
 *   setLoop(on),                  // toggle the host's segment-loop flag/UI
 *   toast(msg, kind),             // user-facing nudge
 * }
 */
export function createLearnMode(host: LearnModeHost) {
  let active = false;
  let segments: TimelineSegment[] | null = null;
  let index = 0;
  const counts: Record<Grade, number> = { perfect: 0, good: 0, off: 0, miss: 0 };

  function resetCounts() { counts.perfect = counts.good = counts.off = counts.miss = 0; }

  function build(): TimelineSegment[] {
    const segLen = SEGMENT_BEATS * host.beatLen;
    const segs: TimelineSegment[] = [];
    for (let t = 0; t < host.duration; t += segLen) segs.push({ start: t, end: Math.min(host.duration, t + segLen) });
    return segs.length ? segs : [{ start: 0, end: host.duration }];
  }

  function enter() {
    const seg = segments![index];
    host.applySegment(seg.start, seg.end);
    host.setLoop(true);
    host.setRate(START_RATE);
    resetCounts();
    host.rewindTo(seg.start);
  }

  return {
    get isActive() { return active; },
    get segments() { return segments; },
    get index() { return index; },

    toggle(on?: boolean | null) {
      active = on != null ? on : !active;
      if (active) { segments = build(); index = 0; enter(); }
      else { segments = null; host.setLoop(false); host.applySegment(0, host.duration); }
      return active;
    },
    next() { if (segments && index < segments.length - 1) { index++; enter(); } },
    prev() { if (segments && index > 0) { index--; enter(); } },

    record(quality: Grade, noteTime: number) {
      if (!active || !segments) return;
      const seg = segments[index];
      if (noteTime < seg.start || noteTime >= seg.end) return;
      counts[quality]++;
    },

    evaluatePass() {
      if (!active) return;
      const total = counts.perfect + counts.good + counts.off + counts.miss;
      const acc = total ? Math.round(((counts.perfect + counts.good * 0.6) / total) * 100) : 0;
      resetCounts();
      if (!total || acc < PASS_ACC) return;
      const rate = host.getRate();
      if (rate < 1) {
        const next = Math.min(1, Math.round((rate + RATE_STEP) * 100) / 100);
        host.setRate(next);
        host.toast(`Nice — speeding this segment up to ${Math.round(next * 100)}%`, "good");
      } else {
        host.toast("🎉 Segment mastered at full speed — ▶ next when ready", "good");
      }
    },
  };
}

export type LearnMode = ReturnType<typeof createLearnMode>;
