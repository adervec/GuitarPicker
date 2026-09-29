// Fretting-hand finger -> color, shared by the Guitar tab editor (TabRoll,
// where it colors each note) and the sidebar's finger-color legend
// (widgets/app-shell/ui/FingerLegend.tsx) — one source of truth so the two
// can't drift apart. Colors and finger names came directly from a reference
// glove image the user supplied: thumb white/uncolored, index yellow/
// mustard, middle purple, ring light blue, pinky orange-red/terracotta.
import type { Finger } from "@/entities/song/model/song-format";

export interface FingerDef {
  id: Finger;
  name: string;
  color: string;
}

export const FINGER_DEFS: FingerDef[] = [
  { id: 1, name: "Index", color: "#e3a83f" },
  { id: 2, name: "Middle", color: "#8f6fd8" },
  { id: 3, name: "Ring", color: "#6ec3e8" },
  { id: 4, name: "Pinky", color: "#d9704a" },
  { id: "T", name: "Thumb", color: "#f0f0f0" },
  { id: null, name: "Unassigned", color: "#8fa0c7" },
];

export function fingerColor(f: Finger | undefined): string {
  return (FINGER_DEFS.find((d) => d.id === (f ?? null)) ?? FINGER_DEFS[FINGER_DEFS.length - 1]).color;
}
