"use client";

// FSD "pages" layer: composes entities/features/widgets into the routed
// screen. Next's own app/tuner/page.js is just a thin wrapper around this.
import { useMemo, useState } from "react";
import { InstrumentTuningSelect } from "@/features/select-instrument/ui/InstrumentTuningSelect";
import { StringChips } from "@/features/tune-string/ui/StringChips";
import { useTunerEngine } from "@/features/tune-string/model/useTunerEngine";
import { tuningFor } from "@/entities/instrument/model/data";
import { getSettings } from "@/shared/lib/player-settings";
import styles from "./TunerPage.module.css";

export function TunerPage() {
  const [instrument, setInstrument] = useState("acoustic-guitar");
  const [tuningName, setTuningName] = useState("standard");
  const [labelStyle, setLabelStyle] = useState("notes");

  const tuning = useMemo(() => tuningFor(instrument, tuningName), [instrument, tuningName]);
  const engine = useTunerEngine(tuning);

  function changeInstrument(id: string) {
    setInstrument(id);
    setTuningName("standard");
    engine.pickTarget(null);
  }
  function changeTuning(name: string) {
    setTuningName(name);
    engine.pickTarget(null);
  }

  const { reading } = engine;
  const cents = reading ? Math.max(-50, Math.min(50, reading.cents)) : 0;
  const inTune = reading ? Math.abs(reading.cents) <= 5 : false;

  // which chip to highlight: the locked target, or (in Auto) whichever
  // string is closest to the detected pitch — only once it's actually in tune
  const matchedIdx = useMemo(() => {
    if (!reading || !inTune) return null;
    if (engine.targetIdx != null) return engine.targetIdx;
    let best = 0, bestD = Infinity;
    tuning.forEach((m, i) => { const d = Math.abs(m - reading.refMidi); if (d < bestD) { bestD = d; best = i; } });
    return best;
  }, [reading, inTune, engine.targetIdx, tuning]);

  const verdict = !reading
    ? "Listening…"
    : inTune
      ? "✓ In tune"
      : reading.cents < 0
        ? `♭ ${Math.abs(reading.cents)}¢ flat — tune up`
        : `♯ ${reading.cents}¢ sharp — tune down`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>🎸 Tuner</h1>
          <p className={styles.subtitle}>
            FSD + Next.js + TanStack Query pilot — see Design.md for scope.
          </p>
        </div>
      </header>

      <section className={styles.panel}>
        <InstrumentTuningSelect
          instrument={instrument}
          tuningName={tuningName}
          onInstrumentChange={changeInstrument}
          onTuningChange={changeTuning}
        />
        <div className={styles.controls}>
          <button
            className={styles.startBtn}
            onClick={() => (engine.running ? engine.stop() : engine.start(getSettings().inputDeviceId))}
            disabled={engine.starting}
          >
            {engine.running ? "Stop tuning" : engine.starting ? "Starting…" : "Start tuning"}
          </button>
          <label className={styles.labelStyleToggle}>
            <span>String labels</span>
            <select value={labelStyle} onChange={(e) => setLabelStyle(e.target.value)}>
              <option value="notes">Note names</option>
              <option value="numbers">Numbers (1–6)</option>
            </select>
          </label>
          {engine.error && <span className={styles.error}>{engine.error}</span>}
        </div>
      </section>

      <section className={styles.display}>
        <div className={styles.note} style={{ opacity: reading ? 1 : 0.4 }}>
          {reading ? (
            <>
              {reading.name.name}
              <small>{reading.name.octave}</small>
            </>
          ) : "—"}
        </div>
        <div className={styles.freq}>
          {reading ? `${reading.freq.toFixed(1)} Hz` : "Play a note…"}
        </div>
        <div className={styles.meter}>
          <div className={styles.center} />
          <div
            className={styles.needle}
            style={{
              transform: `rotate(${cents * 0.9}deg)`,
              background: !reading ? "#5a6376" : inTune ? "#58d68d" : "#e8b339",
            }}
          />
        </div>
        <div className={`${styles.verdict} ${inTune ? styles.verdictGood : ""}`}>{verdict}</div>

        <StringChips
          instrument={instrument}
          tuning={tuning}
          labelStyle={labelStyle}
          targetIdx={engine.targetIdx}
          matchedIdx={matchedIdx}
          onPick={engine.pickTarget}
        />
      </section>
    </div>
  );
}
