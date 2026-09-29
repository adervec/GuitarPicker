"use client";

// Ported (as JSX — form controls + filtering, no canvas-game-loop reason to
// stay imperative like Play/Karaoke) from the vanilla app's views/glossary.js.
// Interactive reference (chord/scale explorer, interval table, circle of
// fifths) plus a searchable/filterable term dictionary.
import { useMemo, useState } from "react";
import { NOTE_SHARP, SCALES, scaleNotes, midiToName, CIRCLE_OF_FIFTHS } from "@/shared/lib/note-math";
import { CHORD_TYPES, INTERVALS, chordMidis, chordName } from "@/shared/lib/theory";
import { nameToMidi } from "@/entities/instrument/model/data";
import { GLOSSARY, CATEGORIES } from "@/shared/lib/glossary-data";
import { Synth } from "@/shared/lib/synth";
import styles from "./GlossaryPage.module.css";

const CHORD_TYPE_IDS = Object.keys(CHORD_TYPES);
const SCALE_IDS = Object.keys(SCALES);

export function GlossaryPage() {
  const [chordRoot, setChordRoot] = useState("C");
  const [chordType, setChordType] = useState("maj");
  const [scaleRoot, setScaleRoot] = useState("C");
  const [scaleType, setScaleType] = useState("major");
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const chordRootMidi = nameToMidi(chordRoot + "3") ?? 48;
  const chordMidiSet = chordMidis(chordRootMidi, chordType);
  const chordLabel = `${chordName(chordRootMidi % 12, chordType)} = ${chordMidiSet.map((m) => midiToName(m).full).join(" · ")}`;

  const scalePcs = scaleNotes(NOTE_SHARP.indexOf(scaleRoot), scaleType);
  const scaleLabel = scalePcs.map((pc) => NOTE_SHARP[pc]).join(" · ");

  function playChord() {
    chordMidiSet.forEach((m) => Synth.playMidi(m, { dur: 1.1 }));
  }
  function playScale() {
    const base = (nameToMidi(scaleRoot + "4") ?? 60);
    const seq = [...scalePcs.map((pc) => base + ((pc - (base % 12) + 12) % 12)), base + 12];
    seq.forEach((m, i) => setTimeout(() => Synth.playMidi(m, { dur: 0.4 }), i * 230));
  }
  function playInterval(semitones: number) {
    Synth.playMidi(60);
    setTimeout(() => Synth.playMidi(60 + semitones), 250);
  }

  const q = query.trim().toLowerCase();
  const terms = useMemo(() => GLOSSARY.filter(([term, cat, def]) =>
    (catFilter === "all" || cat === catFilter) &&
    (!q || term.toLowerCase().includes(q) || def.toLowerCase().includes(q))
  ), [q, catFilter]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Glossary &amp; Reference</h1>
      <p className={styles.subtitle}>A music dictionary plus interactive theory tools — hear intervals, chords, and scales.</p>

      <section className={styles.panel}>
        <h2>Interactive reference</h2>
        <div className={styles.grid2}>
          <div className={styles.subPanel}>
            <h3>Chord explorer</h3>
            <div className={styles.row}>
              <select value={chordRoot} onChange={(e) => setChordRoot(e.target.value)}>
                {NOTE_SHARP.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={chordType} onChange={(e) => setChordType(e.target.value)}>
                {CHORD_TYPE_IDS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button className="btn" onClick={playChord}>🔊 Play</button>
            </div>
            <div className={styles.muted}>{chordLabel}</div>
          </div>
          <div className={styles.subPanel}>
            <h3>Scale explorer</h3>
            <div className={styles.row}>
              <select value={scaleRoot} onChange={(e) => setScaleRoot(e.target.value)}>
                {NOTE_SHARP.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={scaleType} onChange={(e) => setScaleType(e.target.value)}>
                {SCALE_IDS.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
              <button className="btn" onClick={playScale}>🔊 Play</button>
            </div>
            <div className={styles.muted}>{scaleLabel}</div>
          </div>
        </div>

        <details className={styles.details}>
          <summary><b>Intervals</b> — click ▶ to hear each one</summary>
          <table className={styles.data}>
            <thead><tr><th>Interval</th><th>Semitones</th><th /></tr></thead>
            <tbody>
              {INTERVALS.map((iv) => (
                <tr key={iv.short}>
                  <td>{iv.name} ({iv.short})</td>
                  <td>{iv.semitones}</td>
                  <td><button className={styles.ghost} onClick={() => playInterval(iv.semitones)}>▶</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>

        <details className={styles.details}>
          <summary><b>Circle of fifths</b></summary>
          <div className={styles.pillRow}>
            {CIRCLE_OF_FIFTHS.map((k) => <span key={k} className={styles.pill}>{k}</span>)}
          </div>
          <p className={styles.hint}>Clockwise adds sharps; counter-clockwise adds flats. Neighbours share most notes and sound good together.</p>
        </details>
      </section>

      <h1 className={styles.title}>Dictionary</h1>
      <section className={styles.panel}>
        <div className={styles.row}>
          <input
            className={styles.search}
            type="search"
            placeholder="Search terms…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className={styles.pillRow}>
            {["all", ...CATEGORIES].map((cat) => (
              <span
                key={cat}
                className={`${styles.pill} ${styles.pillClickable} ${catFilter === cat ? styles.active : ""}`}
                onClick={() => setCatFilter(cat)}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.grid}>
        {terms.length === 0 && <p className={styles.muted}>No matching terms.</p>}
        {terms.map(([term, cat, def]) => (
          <div key={term} className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitle}>{term}</div>
              <span className={styles.tag}>{cat}</span>
            </div>
            <div className={styles.cardSub}>{def}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
