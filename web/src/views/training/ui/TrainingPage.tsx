"use client";

// Course progression + skill drills. Ported (as JSX — plain lists/cards, no
// canvas-game-loop reason to stay imperative) from the vanilla app's
// views/training.js, dropping only the XP/level stat pair from the header
// row (Locker/cosmetics/coin economy aren't part of this pilot — same
// exclusion as Home and Theory Games) — step-lock/pass state itself was
// never XP-based in the vanilla source either, it's derived straight from
// session history, so that part carries over unchanged.
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { COURSES, DRILLS, getDrill, buildDrillSong, type Drill } from "@/shared/lib/drills";
import { getHistory, getSettings, subscribeSettings, DEFAULTS, type HistoryEntry } from "@/shared/lib/player-settings";
import { saveUserSong } from "@/entities/song/model/user-songs";
import { INSTRUMENTS, type InstrumentDef } from "@/entities/instrument/model/data";
import styles from "./TrainingPage.module.css";

const EMPTY_HISTORY: HistoryEntry[] = [];
const noSubscribe = () => () => {};
function useHistoryRows() {
  return useSyncExternalStore(noSubscribe, getHistory, () => EMPTY_HISTORY);
}
function useSettingsValue() {
  return useSyncExternalStore(subscribeSettings, getSettings, () => DEFAULTS);
}

interface Best {
  passed: boolean;
  bestAcc: number;
  bestScore: number;
  attempts: number;
}

function bestFor(rows: HistoryEntry[], id: string): Best | null {
  const matched = rows.filter((h) => h.songId === id);
  if (!matched.length) return null;
  return {
    passed: matched.some((r) => r.passed),
    bestAcc: Math.max(...matched.map((r) => r.accuracy)),
    bestScore: Math.max(...matched.map((r) => r.score)),
    attempts: matched.length,
  };
}

export function TrainingPage() {
  const router = useRouter();
  const rows = useHistoryRows();
  const s = useSettingsValue();
  const instDef = (INSTRUMENTS as Record<string, InstrumentDef>)[s.instrument];
  const [bpms, setBpms] = useState<Record<string, number>>(() =>
    Object.fromEntries(DRILLS.map((d) => [d.id, d.bpm])));

  const stepsPassed = COURSES.reduce((sum, c) => sum + c.steps.filter((st) => bestFor(rows, st.ref)?.passed).length, 0);
  const totalSteps = COURSES.reduce((sum, c) => sum + c.steps.length, 0);
  const drillsTried = DRILLS.filter((d) => bestFor(rows, d.id)).length;
  const passes = rows.filter((h) => h.passed).length;

  function launchDrill(drill: Drill, bpm: number) {
    const song = buildDrillSong(drill, bpm);
    saveUserSong(song);
    router.push(`/play/${song.id}`);
  }
  function launchStep(ref: string) {
    const drill = getDrill(ref);
    if (drill) { launchDrill(drill, bpms[drill.id] ?? drill.bpm); return; }
    router.push(`/play/${ref}`);
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Training</h1>
      <p className={styles.subtitle}>Course progression and skill drills for {instDef?.name || s.instrument}.</p>

      <div className={styles.summary}>
        <Stat num={`${stepsPassed}/${totalSteps}`} label="Steps passed" />
        <Stat num={drillsTried} label="Drills tried" />
        <Stat num={passes} label="Passes" />
      </div>

      <h2 className={styles.sectionTitle}>Courses</h2>
      {COURSES.map((course) => {
        const done = course.steps.filter((st) => bestFor(rows, st.ref)?.passed).length;
        const pct = Math.round((done / course.steps.length) * 100);
        return (
          <section key={course.id} className={styles.panel}>
            <div className={styles.spread}>
              <div>
                <h3 className={styles.courseTitle}>{course.title}</h3>
                <div className={styles.muted}>{course.desc}</div>
              </div>
              <span className={styles.tag}>{course.level}</span>
            </div>
            <div className={styles.barTrack}><div className={styles.barFill} style={{ width: pct + "%" }} /></div>
            <div className={styles.stepsCaption}>{done} / {course.steps.length} steps passed</div>
            <div className={styles.stepList}>
              {course.steps.map((st, i) => {
                const b = bestFor(rows, st.ref);
                const locked = i > 0 && !bestFor(rows, course.steps[i - 1].ref)?.passed;
                return (
                  <div key={st.id} className={`${styles.step} ${b?.passed ? styles.stepDone : ""} ${locked ? styles.stepLocked : ""}`}>
                    <div className={styles.stepInfo}>
                      <span>{b?.passed ? "✅" : locked ? "🔒" : "▷"}</span>
                      <div>
                        <div>{st.title}</div>
                        {b && <div className={styles.stepBest}>best {b.bestAcc}% · {b.attempts} {b.attempts === 1 ? "try" : "tries"}</div>}
                      </div>
                    </div>
                    <button className="btn" onClick={() => launchStep(st.ref)} disabled={locked}>
                      {b?.passed ? "Replay" : "Start"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <h2 className={styles.sectionTitle}>Skill drills</h2>
      <p className={styles.subtitle}>Short, repeatable exercises. Adjust the tempo to grind a weak skill up to speed.</p>
      <div className={styles.grid}>
        {DRILLS.map((d) => {
          const best = bestFor(rows, d.id);
          const bpm = bpms[d.id] ?? d.bpm;
          return (
            <div key={d.id} className={styles.card}>
              <div className={styles.spread}>
                <div className={styles.cardTitle}>{d.title}</div>
                <span className={styles.tag}>{d.difficulty}</span>
              </div>
              <div className={styles.cardSub}>{d.desc}</div>
              <div className={styles.muted}>{best ? `best ${best.bestAcc}% · score ${best.bestScore.toLocaleString()}` : "not attempted yet"}</div>
              <label className={styles.tempo}>
                <span>Tempo</span>
                <input type="range" min={50} max={180} step={5} value={bpm}
                  onChange={(e) => setBpms((prev) => ({ ...prev, [d.id]: +e.target.value }))} />
                <span className={styles.tempoVal}>{bpm} BPM</span>
              </label>
              <button className="btn primary" onClick={() => launchDrill(d, bpm)}>▶ Start drill</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ num, label }: { num: number | string; label: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statNum}>{num}</div>
      <div className={styles.statLbl}>{label}</div>
    </div>
  );
}
