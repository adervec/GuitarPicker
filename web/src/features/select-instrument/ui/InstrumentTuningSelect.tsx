"use client";

import { instrumentOptions, tuningOptions } from "@/entities/instrument/model/data";
import styles from "./InstrumentTuningSelect.module.css";

export function InstrumentTuningSelect({ instrument, tuningName, onInstrumentChange, onTuningChange }: {
  instrument: string; tuningName: string;
  onInstrumentChange: (id: string) => void; onTuningChange: (name: string) => void;
}) {
  return (
    <div className={styles.row}>
      <label className={styles.field}>
        <span>Instrument</span>
        <select value={instrument} onChange={(e) => onInstrumentChange(e.target.value)}>
          {instrumentOptions().map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span>Tuning</span>
        <select value={tuningName} onChange={(e) => onTuningChange(e.target.value)}>
          {tuningOptions(instrument).map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
