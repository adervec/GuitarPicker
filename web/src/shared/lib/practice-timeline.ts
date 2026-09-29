// A Sony-Vegas-style horizontal timeline: click to seek, click-drag to select
// a range, with an optional overlay of fixed segments (for Learn mode)
// showing which one is active. Canvas-based, resizes with its container.
// Ported verbatim from the vanilla app's src/ui/timeline.js, then extended
// with an optional note-preview strip (not in the vanilla source — added by
// request, "draw at least a minimal version of what's on the big [highway],
// so you can roughly tell from the timeline what's coming"). Each note draws
// as a small tick, x = time and y = a caller-supplied normalized position
// (0 = bottom, 1 = top) — this module doesn't compute that position itself
// (it used to, from pitch, but that read wrong for a string-lane highway:
// "на таймлайне рисуем относительно того на какой струне это находится, а
// не по ноте и её тону" — draw it relative to which *string* it's on, not
// the note/pitch). Each caller decides what the row means for its own
// highway — Performance Mode's string index, Classic's pitch height,
// whatever fits — and passes an already-normalized `row` per note; this
// module just places a tick there, no string/pitch/instrument knowledge of
// its own.
import { el, getVar } from "./dom";

export interface TimelineSegment {
  start: number;
  end: number;
}

/** Lean shape for the note-preview strip. `row` is normalized 0 (bottom of
 *  the strip) to 1 (top) — the caller's own highway decides what it means
 *  (string index, pitch height, ...); this module just places a tick there. */
export interface TimelineNote {
  time: number;
  dur: number;
  row: number;
}

export interface PracticeTimeline {
  el: HTMLElement;
  setPlayhead(t: number): void;
  setSelection(start: number | null, end: number | null): void;
  setSegments(list: TimelineSegment[] | null, idx: number): void;
  setInteractive(v: boolean): void;
  destroy(): void;
}

type Pointerish = MouseEvent | TouchEvent;

/** duration: song length in seconds.
 *  notes: optional — draws a minimal note-preview strip behind the
 *  segments/selection/playhead overlays.
 *  onSeek(t): a plain click (no drag) — move the playhead here.
 *  onSelect(start, end): a click-drag — mark this range. */
export function createTimeline({ duration, notes, onSeek, onSelect }: {
  duration: number; notes?: TimelineNote[];
  onSeek?: (t: number) => void; onSelect?: (start: number, end: number) => void;
}): PracticeTimeline {
  const wrap = el("div.timeline-wrap");
  const canvas = el("canvas.timeline-canvas") as HTMLCanvasElement;
  wrap.appendChild(canvas);
  const c = canvas.getContext("2d")!;

  let W = 0, H = 0, dpr = 1;
  let playhead = 0;
  let selStart: number | null = null, selEnd: number | null = null;
  let segs: TimelineSegment[] | null = null, activeIdx = -1;
  let interactive = true;
  let dragging = false, dragStartT = 0, dragged = false;

  const xToT = (x: number) => duration ? Math.max(0, Math.min(duration, (x / W) * duration)) : 0;
  const tToX = (t: number) => duration ? (t / duration) * W : 0;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.max(1, W * dpr); canvas.height = Math.max(1, H * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  function draw() {
    if (!W || !H) return;
    c.clearRect(0, 0, W, H);
    c.fillStyle = getVar("--bg-2");
    c.fillRect(0, 0, W, H);

    if (notes && notes.length) {
      const pad = 5;
      const usableH = Math.max(1, H - pad * 2);
      c.fillStyle = "rgba(255,255,255,0.32)";
      for (const n of notes) {
        const x0 = tToX(n.time);
        const x1 = tToX(n.time + Math.max(n.dur, 0.04));
        const y = pad + usableH - n.row * usableH;
        c.fillRect(x0, y - 1, Math.max(1.5, x1 - x0), 2);
      }
    }

    if (segs) {
      segs.forEach((seg, i) => {
        const x0 = tToX(seg.start), x1 = tToX(seg.end);
        c.fillStyle = i === activeIdx ? "rgba(110,168,254,0.35)" : "rgba(255,255,255,0.05)";
        c.fillRect(x0, 0, Math.max(1, x1 - x0), H);
        c.strokeStyle = "rgba(255,255,255,0.25)"; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0, H); c.stroke();
      });
      c.strokeStyle = "rgba(255,255,255,0.25)"; c.beginPath(); c.moveTo(W, 0); c.lineTo(W, H); c.stroke();
    }

    if (selStart != null && selEnd != null && selEnd > selStart) {
      const x0 = tToX(selStart), x1 = tToX(selEnd);
      c.fillStyle = "rgba(110,168,254,0.28)";
      c.fillRect(x0, 0, x1 - x0, H);
      c.strokeStyle = getVar("--accent"); c.lineWidth = 2;
      c.beginPath(); c.moveTo(x0, 1); c.lineTo(x0, H - 1); c.stroke();
      c.beginPath(); c.moveTo(x1, 1); c.lineTo(x1, H - 1); c.stroke();
    }

    const px = tToX(Math.max(0, playhead));
    c.strokeStyle = "#fff"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(px, 0); c.lineTo(px, H); c.stroke();
    c.beginPath(); c.moveTo(px - 5, 0); c.lineTo(px + 5, 0); c.lineTo(px, 7); c.closePath();
    c.fillStyle = "#fff"; c.fill();
  }

  function pointerT(e: Pointerish): number {
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    return xToT(clientX - rect.left);
  }
  function down(e: Pointerish) {
    if (!interactive) return;
    dragging = true; dragged = false;
    dragStartT = pointerT(e);
    selStart = dragStartT; selEnd = dragStartT;
    draw();
  }
  function move(e: Pointerish) {
    if (!dragging) return;
    const t = pointerT(e);
    if (Math.abs(t - dragStartT) > 0.05) dragged = true;
    selStart = Math.min(dragStartT, t); selEnd = Math.max(dragStartT, t);
    draw();
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    if (!dragged) { selStart = selEnd = null; draw(); onSeek && onSeek(dragStartT); }
    else onSelect && selStart != null && selEnd != null && onSelect(selStart, selEnd);
  }
  function touchDown(e: TouchEvent) { down(e); e.preventDefault(); }
  function touchMove(e: TouchEvent) { move(e); e.preventDefault(); }

  canvas.addEventListener("mousedown", down);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
  canvas.addEventListener("touchstart", touchDown, { passive: false });
  canvas.addEventListener("touchmove", touchMove, { passive: false });
  canvas.addEventListener("touchend", up);

  resize();

  return {
    el: wrap,
    setPlayhead(t: number) { playhead = t; draw(); },
    setSelection(start: number | null, end: number | null) { selStart = start; selEnd = end; draw(); },
    setSegments(list: TimelineSegment[] | null, idx: number) { segs = list; activeIdx = idx; draw(); },
    setInteractive(v: boolean) { interactive = v; wrap.classList.toggle("readonly", !v); },
    destroy() {
      ro.disconnect();
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    },
  };
}
