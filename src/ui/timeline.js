// A Sony-Vegas-style horizontal timeline: click to seek, click-drag to select a
// range, with an optional overlay of fixed segments (for Learn mode) showing
// which one is active. Canvas-based, resizes with its container.
import { el, getVar } from "./components.js";

/** duration: song length in seconds.
 *  onSeek(t): a plain click (no drag) — move the playhead here.
 *  onSelect(start, end): a click-drag — mark this range. */
export function createTimeline({ duration, onSeek, onSelect }) {
  const wrap = el("div.timeline-wrap");
  const canvas = el("canvas.timeline-canvas");
  wrap.appendChild(canvas);
  const c = canvas.getContext("2d");

  let W = 0, H = 0, dpr = 1;
  let playhead = 0;
  let selStart = null, selEnd = null;
  let segs = null, activeIdx = -1;
  let interactive = true;
  let dragging = false, dragStartT = 0, dragged = false;

  const xToT = (x) => duration ? Math.max(0, Math.min(duration, (x / W) * duration)) : 0;
  const tToX = (t) => duration ? (t / duration) * W : 0;

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

  function pointerT(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return xToT(clientX - rect.left);
  }
  function down(e) {
    if (!interactive) return;
    dragging = true; dragged = false;
    dragStartT = pointerT(e);
    selStart = dragStartT; selEnd = dragStartT;
    draw();
  }
  function move(e) {
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
    else onSelect && onSelect(selStart, selEnd);
  }
  function touchDown(e) { down(e); e.preventDefault(); }
  function touchMove(e) { move(e); e.preventDefault(); }

  canvas.addEventListener("mousedown", down);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
  canvas.addEventListener("touchstart", touchDown, { passive: false });
  canvas.addEventListener("touchmove", touchMove, { passive: false });
  canvas.addEventListener("touchend", up);

  resize();

  return {
    el: wrap,
    setPlayhead(t) { playhead = t; draw(); },
    setSelection(start, end) { selStart = start; selEnd = end; draw(); },
    setSegments(list, idx) { segs = list; activeIdx = idx; draw(); },
    setInteractive(v) { interactive = v; wrap.classList.toggle("readonly", !v); },
    destroy() {
      ro.disconnect();
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    },
  };
}
