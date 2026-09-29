"use client";

// Ported (as JSX — a details/summary reference list, no canvas-game-loop
// reason to stay imperative like Play/Karaoke) from the vanilla app's
// views/instruments.js. Renders entities/instrument/model/guide.js's GUIDE,
// trimmed to this pilot's 16 modeled instruments (see that file's header) —
// grouped by family instead of the vanilla view's `instrumentOptions()`
// group field, which this pilot's trimmed data doesn't carry.
import { INSTRUMENTS } from "@/entities/instrument/model/data";
import { GUIDE, instrumentFacts, harmonicaChart, buildInstrumentsMarkdown } from "@/entities/instrument/model/guide";
import { HARMONICA_BLOW, HARMONICA_DRAW } from "@/entities/instrument/model/data";
import { Synth } from "@/shared/lib/synth";
import { download, toast } from "@/shared/lib/dom";
import styles from "./InstrumentsPage.module.css";

type InstrumentId = keyof typeof INSTRUMENTS;

export function InstrumentsPage() {
  const ids = Object.keys(INSTRUMENTS) as InstrumentId[];
  let lastFamily: string | null = null;

  function exportGuide() {
    download("guitarpicker-web-instruments.md", buildInstrumentsMarkdown(), "text/markdown");
    toast("Guide saved as guitarpicker-web-instruments.md", "good");
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Instruments</h1>
      <p className={styles.subtitle}>
        The instruments this pilot models — specs, playing guides, and how the pilot supports each. Click ▶ to hear reference pitches.
      </p>

      <section className={styles.panel}>
        <div className={styles.row}>
          <span className={styles.muted}>
            Facts below (tunings, ranges, hole charts) come from the pilot&apos;s own data — the guide can&apos;t drift from what it plays.
          </span>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={exportGuide} title="Save this whole guide as a Markdown file">
            ⬇ Download as Markdown
          </button>
        </div>
      </section>

      {ids.map((id) => {
        const g = GUIDE[id];
        const showHeading = g.family !== lastFamily;
        lastFamily = g.family;
        return (
          <div key={id}>
            {showHeading && <h2 className={styles.groupHeading}>{g.family}</h2>}
            <InstrumentPanel id={id} />
          </div>
        );
      })}
    </div>
  );
}

function InstrumentPanel({ id }: { id: InstrumentId }) {
  const g = GUIDE[id];
  const f = instrumentFacts(id);

  const glance: [string, string][] = ([
    ["Family", g.family],
    ["Range (as modeled)", f.range],
    f.strings.length ? ["Strings", `${f.strings.length} — ${f.strings.map((s) => s.note).join(" ")}`] : null,
    f.inst.frets ? ["Frets modeled", String(f.inst.frets)] : null,
    ["Tuner", f.tuner ? "yes" + (f.tunings.length > 1 ? ` (${f.tunings.map((t) => t.name).join(", ")})` : "") : "—"],
    ["Fingering hint", f.panel || "—"],
    ["Built-in songs", String(f.songs)],
  ] as ([string, string] | null)[]).filter((row): row is [string, string] => row !== null);

  const alts = f.tunings.filter((t) => t.name !== "standard");
  const chart = id === "harmonica" ? harmonicaChart() : null;

  return (
    <details className={styles.details}>
      <summary className={styles.summary}>
        <b className={styles.name}>{INSTRUMENTS[id].name}</b>
        <span className={styles.muted}> — {g.tagline}</span>
      </summary>
      <div className={styles.body}>
        <p>{g.overview}</p>
        <table className={styles.data}>
          <tbody>
            {glance.map(([k, v]) => (
              <tr key={k}><th>{k}</th><td>{v}</td></tr>
            ))}
          </tbody>
        </table>

        {f.strings.length > 0 && (
          <>
            <h3>Strings (low string first)</h3>
            <table className={styles.data}>
              <thead>
                <tr><th>String</th><th>Note</th><th>MIDI</th><th>Frequency</th><th /></tr>
              </thead>
              <tbody>
                {f.strings.map((s) => (
                  <tr key={s.midi}>
                    <td>{s.label}</td><td>{s.note}</td><td>{s.midi}</td><td>{s.freq.toFixed(1)} Hz</td>
                    <td>
                      <button className={styles.ghost} title="Hear this open string"
                        onClick={() => Synth.playMidi(s.midi, { dur: 1.2, instrument: id })}>▶</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {alts.length > 0 && (
              <p className={styles.hint}>
                Alternate tunings: {alts.map((t) => `${t.name} = ${t.notes}`).join(" · ")}
              </p>
            )}
          </>
        )}

        {chart && (
          <>
            <h3>Hole chart (Richter-tuned C diatonic)</h3>
            <table className={styles.data}>
              <tbody>
                <tr><th>Hole</th>{chart.map((h) => <th key={h.hole}>{h.hole}</th>)}</tr>
                <tr>
                  <th>Blow ↑</th>
                  {HARMONICA_BLOW.map((m, i) => (
                    <td key={m}>
                      <button className={styles.ghost} title={`Hear hole ${i + 1} blow`}
                        onClick={() => Synth.playMidi(m, { dur: 0.8, instrument: "harmonica" })}>{chart[i].blow}</button>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Draw ↓</th>
                  {HARMONICA_DRAW.map((m, i) => (
                    <td key={m}>
                      <button className={styles.ghost} title={`Hear hole ${i + 1} draw`}
                        onClick={() => Synth.playMidi(m, { dur: 0.8, instrument: "harmonica" })}>{chart[i].draw}</button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </>
        )}

        <ListSection title="Anatomy" items={g.anatomy} />
        <ListSection title="How to play" items={g.playing} ordered />
        <ListSection title="Techniques" items={g.techniques} />
        <ListSection title="Beginner tips" items={g.tips} />
        {g.care && (<><h3>Care</h3><p>{g.care}</p></>)}
        <ListSection title="In GuitarPicker" items={[
          f.panel ? `Play view shows a ${f.panel} fingering hint for every note.` : "Play view grades by pitch alone — no fingering hint for this instrument.",
          ...(g.inApp || []),
        ]} />
      </div>
    </details>
  );
}

function ListSection({ title, items, ordered }: { title: string; items?: string[]; ordered?: boolean }) {
  if (!items || !items.length) return null;
  const Tag = ordered ? "ol" : "ul";
  return (
    <>
      <h3>{title}</h3>
      <Tag>{items.map((t, i) => <li key={i}>{t}</li>)}</Tag>
    </>
  );
}
