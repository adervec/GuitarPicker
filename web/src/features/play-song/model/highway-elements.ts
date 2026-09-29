// Canvas "components" for Performance Mode's note highway — by request,
// broken out of createPerformanceEngine.ts's monolithic draw() loop into
// small, self-contained units with their own state (a note block's status/
// content/font size, in particular) and a draw(ctx) method, so each piece
// can be reasoned about and changed on its own. Still rendered through the
// same Canvas2D context every frame, not as DOM/React elements — this
// highway is a real-time, 60fps scrolling view, and canvas is the right
// tool for that (see createPerformanceEngine.ts's own header comment for
// why this whole engine is imperative-canvas rather than React to begin
// with). Each factory below returns a fresh, plain object per call —
// cheap at this note count (tens, not thousands) and simpler to reason
// about than a persistent object pool would be.
import { getVar } from "@/shared/lib/dom";

// Canvas2D's own `font` property does NOT resolve CSS custom properties —
// `ctx.font = "16px var(--mono)"` is invalid as far as the canvas font
// parser is concerned and gets silently rejected (leaving `ctx.font`
// unchanged, at whatever it was previously — the canvas default "10px
// sans-serif" if nothing valid was ever set), even when `--mono` itself is
// properly defined elsewhere and every color-driven `getVar()` call in the
// same file resolves fine. `getVar()` (below) does the CSS-variable lookup
// in JS instead, so the literal resolved font-family string ends up in the
// `ctx.font` template — the only way this actually reaches the canvas.
const monoFont = () => getVar("--mono");

export interface CanvasElement {
  draw(ctx: CanvasRenderingContext2D): void;
}

/** Shared by every rounded-rect element below (and by the fretboard-
 *  diagram overlay) — traces the path only; caller still does fill/stroke,
 *  so one path can be used for both when a note needs an active outline. */
export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  r = Math.min(r, h / 2, Math.max(1, w / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** A note block's lifecycle relative to the playhead — drives its fill
 *  alpha and whether it gets the white "currently sounding" outline. */
export type NoteStatus = "pending" | "active" | "past";

export interface NoteBlockElement extends CanvasElement {
  x: number; y: number; w: number; h: number;
  status: NoteStatus;
  content: string;
  color: string;
  /** The font size this instance settled on — exposed mainly so callers
   *  (or tests) can inspect the fit-to-block result without re-deriving it. */
  fontSize: number;
}

/** One note's on-highway block: fill/border react to `status`, and
 *  `content`'s font size is fit to the block itself — starts near-filling
 *  the block's own height, then shrinks only as far as needed so a narrow
 *  block (a short chord member, say) doesn't spill its digit past its own
 *  width. Needs `ctx` up front (not just at draw time) because sizing the
 *  text requires `measureText()`, which is itself a canvas operation. */
export function createNoteBlockElement(params: {
  ctx: CanvasRenderingContext2D;
  x: number; y: number; w: number; h: number;
  status: NoteStatus;
  content: string;
  color: string;
}): NoteBlockElement {
  const { ctx, x, y, w, h, status, content, color } = params;

  // Measures the digit's *actual* ink box at a reference size and scales
  // from that, rather than assuming a fixed cap-height ratio — a fixed
  // ratio only holds for the one font it was eyeballed against, and a
  // wrong guess either overflows the block or leaves it too small (this
  // is exactly what happened before `monoFont()` existed: sized against
  // whatever fallback font canvas silently substituted, not the real one).
  const PROBE = 100;
  ctx.font = `bold ${PROBE}px ${monoFont()}`;
  const probe = ctx.measureText(content);
  const inkH = (probe.actualBoundingBoxAscent ?? PROBE * 0.7) + (probe.actualBoundingBoxDescent ?? 0);
  const inkW = probe.width;
  // Was a flat 0.85 (fill 85% of the block's own height); dialed down to
  // 0.7x that by request ("если сейчас 1, то я хочу 0.7 от текущего
  // размера") — kept as `0.85 * 0.7` rather than pre-multiplied so the
  // relationship to the original ratio stays visible in the source.
  const targetH = h * 0.85 * 0.7;
  const targetW = w - 6; // small side margin so it never touches the block's edges
  const scale = Math.min(targetH / inkH, targetW / inkW);
  const fontSize = Math.max(8, Math.floor(PROBE * scale));

  return {
    x, y, w, h, status, content, color, fontSize,
    draw(ctx: CanvasRenderingContext2D) {
      ctx.globalAlpha = status === "past" ? 0.35 : 1;
      ctx.fillStyle = color;
      roundRectPath(ctx, x, y, w, h, 8);
      ctx.fill();
      if (status === "active") {
        ctx.lineWidth = 2.5; ctx.strokeStyle = "#fff";
        roundRectPath(ctx, x, y, w, h, 8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.font = `bold ${fontSize}px ${monoFont()}`;
      ctx.fillStyle = "#0b0f1a";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(content, x + w / 2, y + h / 2 + 1);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    },
  };
}

/** The soft background band tying a chord's members together across rows. */
export function createChordTieElement(params: { x: number; y: number; w: number; h: number }): CanvasElement {
  const { x, y, w, h } = params;
  return {
    draw(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      roundRectPath(ctx, x, y, w, h, 10);
      ctx.fill();
    },
  };
}

/** One horizontal string across the full lane width — a colored/weighted
 *  line plus a faint white sheen down its middle, so a flat color alone
 *  doesn't read as a UI rule rather than a wound/plain metal string. */
export function createStringLineElement(params: {
  x0: number; x1: number; y: number; thickness: number; color: string;
}): CanvasElement {
  const { x0, x1, y, thickness, color } = params;
  return {
    draw(ctx: CanvasRenderingContext2D) {
      ctx.lineCap = "round";
      ctx.lineWidth = thickness;
      ctx.strokeStyle = color;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.lineWidth = Math.max(0.6, thickness * 0.35);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.lineCap = "butt";
    },
  };
}

/** The fixed left column: background, a dividing line, and each string's
 *  label — drawn last in the frame so it occludes notes sliding behind it. */
export function createGutterElement(params: {
  width: number; height: number; rows: number; laneH: number; yOffset: number; labels: string[];
}): CanvasElement {
  const { width, height, rows, laneH, yOffset, labels } = params;
  return {
    draw(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = getVar("--bg-2"); ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = getVar("--line");
      ctx.beginPath(); ctx.moveTo(width, 0); ctx.lineTo(width, height); ctx.stroke();
      ctx.fillStyle = getVar("--muted"); ctx.font = `11px ${monoFont()}`;
      for (let r = 0; r < rows; r++) ctx.fillText(labels[r], 6, yOffset + r * laneH + laneH / 2 + 4);
    },
  };
}

/** The vertical accent line marking "now," spanning just the lane block. */
export function createPlayheadElement(params: { x: number; yTop: number; yBottom: number }): CanvasElement {
  const { x, yTop, yBottom } = params;
  return {
    draw(ctx: CanvasRenderingContext2D) {
      ctx.strokeStyle = getVar("--accent"); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, yBottom); ctx.stroke();
    },
  };
}
