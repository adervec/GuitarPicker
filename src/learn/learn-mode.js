// Learn mode: a self-contained "practice this song in segments" controller.
// UI-agnostic and state-agnostic — it doesn't touch the DOM, the transport clock,
// or Play's own variables directly; the host (a view) wires it up with a handful
// of callbacks and reads `segments`/`index`/`isActive` back to render its own UI
// (e.g. Play's segment timeline). This mirrors how `karaoke/grader.js` and
// `karaoke/timeline.js` are shared engines behind a view, not views themselves.
//
// Song is sliced into fixed-length segments (SEGMENT_BEATS each, last one
// trimmed to the song). Entering a segment forces a loop on it at START_RATE;
// each clean pass (>=PASS_ACC accuracy, judged only on notes inside that
// segment) bumps the rate by RATE_STEP, up to full speed.
const SEGMENT_BEATS = 16;      // 4 bars of 4/4 per segment
const START_RATE = 0.5;
const RATE_STEP = 0.1;
const PASS_ACC = 85;           // percent

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
export function createLearnMode(host) {
  let active = false;
  let segments = null;
  let index = 0;
  const counts = { perfect: 0, good: 0, off: 0, miss: 0 };

  function resetCounts() { counts.perfect = counts.good = counts.off = counts.miss = 0; }

  function build() {
    const segLen = SEGMENT_BEATS * host.beatLen;
    const segs = [];
    for (let t = 0; t < host.duration; t += segLen) segs.push({ start: t, end: Math.min(host.duration, t + segLen) });
    return segs.length ? segs : [{ start: 0, end: host.duration }];
  }

  function enter() {
    const seg = segments[index];
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

    /** Turn Learn mode on/off (or force a state by passing `on`). Returns the new state. */
    toggle(on) {
      active = on != null ? on : !active;
      if (active) { segments = build(); index = 0; enter(); }
      else { segments = null; host.setLoop(false); host.applySegment(0, host.duration); }
      return active;
    },
    next() { if (segments && index < segments.length - 1) { index++; enter(); } },
    prev() { if (segments && index > 0) { index--; enter(); } },

    /** Feed every finalized note judgment while active; ignored outside the
     *  current segment's own time range so an out-of-segment note (there
     *  shouldn't be any while looping, but belt-and-braces) can't skew it. */
    record(quality, noteTime) {
      if (!active || !segments) return;
      const seg = segments[index];
      if (noteTime < seg.start || noteTime >= seg.end) return;
      counts[quality]++;
    },

    /** Call once each time the looped segment completes a pass. */
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
