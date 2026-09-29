"use client";

// Ported (as JSX — plain filtering/rendering, no canvas-game-loop reason to
// keep it imperative like Play/Karaoke) from the vanilla app's views/history.js.
// Dropped: the cosmetics/coin "Collection" panel (Locker isn't part of this
// pilot) and any coins column — session entries here never carry `.coins`
// since Play/Karaoke's ported `finish()` doesn't set it either.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getHistory, type HistoryEntry } from "@/shared/lib/player-settings";
import { INSTRUMENTS, type InstrumentDef } from "@/entities/instrument/model/data";
import { fmtTime, getVar, lineChart, download, toast } from "@/shared/lib/dom";
import { buildProgressReport } from "../model/buildProgressReport";
import styles from "./HistoryPage.module.css";

// `getHistory()` reads localStorage, which doesn't exist during SSR — reading
// it straight in render (or via setState-in-an-effect, which a newer
// react-hooks lint rule now flags) would make server and client disagree on
// the first paint. `useSyncExternalStore` is React's sanctioned fix: its
// `getServerSnapshot` matches SSR (empty), and it reconciles the real
// (cached, stable-reference — see player-settings.js) client value right
// after hydration. Same pattern as widgets/cloud-account-badge.
const EMPTY_HISTORY: HistoryEntry[] = [];
const noSubscribe = () => () => {};
function useHistoryRows() {
  return useSyncExternalStore(noSubscribe, getHistory, () => EMPTY_HISTORY);
}

export function HistoryPage() {
  const rows = useHistoryRows();
  const [instFilter, setInstFilter] = useState("all");
  const [viewMode, setViewMode] = useState("all");

  const usedInstruments = useMemo(() => [...new Set(rows.map((h) => h.instrument))], [rows]);

  const filtered = useMemo(() => {
    let r = instFilter === "all" ? rows : rows.filter((h) => h.instrument === instFilter);
    if (viewMode === "today") {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      r = r.filter((h) => h.ts >= start.getTime());
    }
    return r;
  }, [rows, instFilter, viewMode]);

  const summary = useMemo(() => {
    const avgAcc = filtered.length ? Math.round(filtered.reduce((a, h) => a + h.accuracy, 0) / filtered.length) : 0;
    const totalTime = filtered.reduce((a, h) => a + (h.durationSec || 0), 0);
    const best = filtered.reduce((a, h) => Math.max(a, h.maxStreak || 0), 0);
    const passes = filtered.filter((h) => h.passed).length;
    return { count: filtered.length, avgAcc, totalTime, best, passes };
  }, [filtered]);

  const display = useMemo(() => {
    if (viewMode === "bysong") {
      const bySong = new Map<string, HistoryEntry>();
      for (const h of filtered) {
        const cur = bySong.get(h.songId);
        if (!cur || h.score > cur.score) bySong.set(h.songId, h);
      }
      return [...bySong.values()].sort((a, b) => b.score - a.score).slice(0, 200);
    }
    return filtered.slice().sort((a, b) => b.ts - a.ts).slice(0, 200);
  }, [filtered, viewMode]);

  const accCanvasRef = useRef(null);
  const scoreCanvasRef = useRef(null);

  useEffect(() => {
    function draw() {
      const chrono = filtered.slice().sort((a, b) => a.ts - b.ts);
      const accPts = chrono.map((h, i) => ({ x: i, y: h.accuracy }));
      const scorePts = chrono.map((h, i) => ({ x: i, y: Math.min(100, h.score / 50) }));
      if (accCanvasRef.current) lineChart(accCanvasRef.current, [{ color: getVar("--good"), points: accPts }], { minY: 0, maxY: 100 });
      if (scoreCanvasRef.current) lineChart(scoreCanvasRef.current, [{ color: getVar("--accent"), points: scorePts }], { minY: 0, maxY: 100 });
    }
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [filtered]);

  function exportForClaude() {
    const d = new Date().toISOString().slice(0, 10);
    download(`guitarpicker-progress-${d}.md`, buildProgressReport(rows), "text/markdown");
    toast("Report saved — open it with Claude for analysis", "good");
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Progress</h1>
      <p className={styles.subtitle}>Track your improvement across instruments and sessions.</p>

      {rows.length === 0 ? (
        <div className={`${styles.panel} ${styles.center}`}>
          <h2>No sessions yet</h2>
          <p className={styles.muted}>Play a song or sing a karaoke to start trending here.</p>
        </div>
      ) : (
        <>
          <div className={`${styles.panel} ${styles.filters}`}>
            <label className={styles.field}>
              <span>Instrument</span>
              <select value={instFilter} onChange={(e) => setInstFilter(e.target.value)}>
                <option value="all">All instruments</option>
                {usedInstruments.map((i) => (
                  <option key={i} value={i}>{(INSTRUMENTS as Record<string, InstrumentDef>)[i]?.name || i}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>View</span>
              <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
                <option value="all">All sessions</option>
                <option value="today">Today</option>
                <option value="bysong">By song (best)</option>
              </select>
            </label>
            <div style={{ flex: 1 }} />
            <button
              className="btn"
              title="Download a Markdown practice report — drop it into Claude for coaching and trend analysis"
              onClick={exportForClaude}
            >
              🤖 Export for Claude
            </button>
          </div>

          <div className={styles.summary}>
            <Stat num={summary.count} label="Sessions" />
            <Stat num={`${summary.avgAcc}%`} label="Avg accuracy" />
            <Stat num={summary.passes} label="Passes" />
            <Stat num={summary.best} label="Best streak" />
            <Stat num={fmtTime(summary.totalTime)} label="Time played" />
          </div>

          <div className={styles.panel}>
            <h2>Trends</h2>
            <div className={styles.legend}>
              <span><i style={{ background: "var(--good)" }} />Accuracy %</span>
              <span><i style={{ background: "var(--accent)" }} />Score (scaled)</span>
            </div>
            <canvas ref={accCanvasRef} className={styles.chart} />
            <canvas ref={scoreCanvasRef} className={styles.chart} />
          </div>

          <div className={styles.panel}>
            <h2>Sessions</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  {["When", "Song", "Instrument", "Score", "Accuracy", "Streak", "Result"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {display.map((h, i) => (
                  <tr key={`${h.ts}-${i}`}>
                    <td>{new Date(h.ts).toLocaleString()}</td>
                    <td>{h.songTitle || h.songId}</td>
                    <td>{(INSTRUMENTS as Record<string, InstrumentDef>)[h.instrument]?.name || h.instrument}</td>
                    <td>{h.score.toLocaleString()}</td>
                    <td>{h.accuracy}%</td>
                    <td>{h.maxStreak}</td>
                    <td style={{ color: h.passed ? "var(--good)" : "var(--bad)" }}>{h.passed ? "Pass" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ num, label }: { num: number | string; label: string }) {
  return (
    <div className="stat">
      <div className="num">{num}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}
