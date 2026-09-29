"use client";

import { stringLabel } from "@/entities/instrument/model/data";
import styles from "./StringChips.module.css";

/** "Auto" + one chip per string. Clicking a string locks the tuner onto it
 *  and briefly plays its reference tone; clicking Auto detects the nearest. */
export function StringChips({ instrument, tuning, labelStyle, targetIdx, onPick, matchedIdx }: {
  instrument: string; tuning: number[]; labelStyle: string;
  targetIdx: number | null; onPick: (idx: number | null) => void; matchedIdx: number | null;
}) {
  return (
    <div className={styles.row}>
      <button
        className={`${styles.chip} ${targetIdx == null ? styles.active : ""}`}
        onClick={() => onPick(null)}
      >
        Auto
      </button>
      {tuning.map((midi, i) => (
        <button
          key={i}
          className={`${styles.chip} ${targetIdx === i ? styles.active : ""} ${matchedIdx === i ? styles.inTune : ""}`}
          onClick={() => onPick(i)}
        >
          {stringLabel(instrument, tuning, i, labelStyle)}
        </button>
      ))}
    </div>
  );
}
