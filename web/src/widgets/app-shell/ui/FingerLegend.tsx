"use client";

// Topbar finger-color legend, by request with a reference glove image and
// an exact color list: a small hand icon (colored per finger, matching
// TabRoll's own finger-color coding — shared/lib/finger-colors.ts is the
// single source of truth both read from, so they can't drift apart) sits
// on the right of the topbar; clicking it opens a modal explaining which
// finger each color means. Purely a reference — it doesn't do anything
// itself, just documents the colors the Guitar tab editor already paints
// notes with.
//
// The reference image itself (a Gemini-generated glove render) wasn't used
// directly as the icon — it came back as a flat JPEG with a "transparent
// background" checkerboard baked into the actual pixels (no real alpha
// channel), which would render as a broken-looking checkered square at
// icon size. Built as a small inline SVG instead: same finger layout and
// exact colors, crisp at any size, no image asset needed.
import { useEffect, useState } from "react";
import { FINGER_DEFS } from "@/shared/lib/finger-colors";
import styles from "./FingerLegend.module.css";

function colorOf(id: (typeof FINGER_DEFS)[number]["id"]): string {
  return FINGER_DEFS.find((d) => d.id === id)?.color ?? "#8fa0c7";
}

function FingerHandIcon({ size = 26 }: { size?: number }) {
  const thumb = colorOf("T"), index = colorOf(1), middle = colorOf(2), ring = colorOf(3), pinky = colorOf(4);
  return (
    <svg width={size} height={size} viewBox="0 0 100 116" fill="none" aria-hidden="true">
      <rect x="8" y="70" width="15" height="36" rx="7.5" fill={thumb} stroke="#2a3142" strokeWidth="2"
        transform="rotate(-38 15.5 88)" />
      <rect x="18" y="58" width="64" height="50" rx="16" fill={thumb} stroke="#2a3142" strokeWidth="2" />
      <rect x="22" y="26" width="12" height="40" rx="6" fill={index} stroke="#2a3142" strokeWidth="2" />
      <rect x="38" y="10" width="12" height="56" rx="6" fill={middle} stroke="#2a3142" strokeWidth="2" />
      <rect x="54" y="18" width="12" height="48" rx="6" fill={ring} stroke="#2a3142" strokeWidth="2" />
      <rect x="70" y="32" width="11" height="34" rx="5.5" fill={pinky} stroke="#2a3142" strokeWidth="2" />
    </svg>
  );
}

export function FingerLegend() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button className={styles.trigger} onClick={() => setOpen(true)} title="Finger color legend" aria-label="Finger color legend">
        <FingerHandIcon />
      </button>
      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(false)}>
          <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.panelHead}>
              <h2>Finger colors</h2>
              <button className={styles.close} onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <FingerHandIcon size={140} />
            <ul className={styles.list}>
              {FINGER_DEFS.filter((d) => d.id !== null).map((d) => (
                <li key={String(d.id)} className={styles.row}>
                  <span className={styles.swatch} style={{ background: d.color }} />
                  <span>{d.name}</span>
                </li>
              ))}
            </ul>
            <p className={styles.hint}>
              Used in the Song Editor&apos;s Guitar tab view to color each note by which finger frets it.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
