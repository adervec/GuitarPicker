// Presentation helpers for karaoke lyrics — framework-agnostic HTML strings.
// Ported verbatim from the vanilla app's src/karaoke/render.js.
import type { TimelineLine } from "./karaoke-timeline";

export function escapeHTML(s: unknown): string {
  return String(s == null ? "" : s).replace(/[&<>]/g, (c) => (({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as Record<string, string>)[c]));
}

export function lineFillHTML(line: TimelineLine | null | undefined, wordIdx: number, wordProgress: number): string {
  if (!line || !line.words || !line.words.length) return escapeHTML(line ? line.text : "");
  return line.words.map((w, i) => {
    if (i < wordIdx) return `<span class="kw done">${escapeHTML(w.text)}</span>`;
    if (i === wordIdx) {
      const p = Math.round((wordProgress || 0) * 100);
      return `<span class="kw cur" style="background:linear-gradient(90deg,var(--accent) ${p}%,var(--kw-future) ${p}%)">${escapeHTML(w.text)}</span>`;
    }
    return `<span class="kw">${escapeHTML(w.text)}</span>`;
  }).join(" ");
}
