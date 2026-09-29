// Markdown practice report for AI analysis (Claude / Claude Cowork). Ported
// (trimmed) from the vanilla app's views/history.js — dropped the daily
// practice streak line, since streak tracking (Home's "Today's Practice"
// checklist) isn't part of this pilot, so it would only ever read 0/0.
import { fmtTime } from "@/shared/lib/dom";
import { INSTRUMENTS, type InstrumentDef } from "@/entities/instrument/model/data";
import type { HistoryEntry } from "@/shared/lib/player-settings";

interface SongAgg {
  title: string;
  inst: string;
  attempts: number;
  passes: number;
  bestScore: number;
  bestAcc: number;
}

export function buildProgressReport(all: HistoryEntry[]): string {
  const rows = all.slice().sort((a, b) => b.ts - a.ts);
  const day = (ts: number) => new Date(ts).toISOString().slice(0, 10);
  const avgAcc = Math.round(rows.reduce((a, h) => a + h.accuracy, 0) / rows.length);
  const totalTime = rows.reduce((a, h) => a + (h.durationSec || 0), 0);

  const bySong = new Map<string, SongAgg>();
  for (const h of rows) {
    const s = bySong.get(h.songId) || { title: h.songTitle || h.songId, inst: h.instrument, attempts: 0, passes: 0, bestScore: 0, bestAcc: 0 };
    s.attempts++; if (h.passed) s.passes++;
    s.bestScore = Math.max(s.bestScore, h.score); s.bestAcc = Math.max(s.bestAcc, h.accuracy);
    bySong.set(h.songId, s);
  }
  const songRows = [...bySong.values()].sort((a, b) => b.attempts - a.attempts)
    .map((s) => `| ${s.title} | ${(INSTRUMENTS as Record<string, InstrumentDef>)[s.inst]?.name || s.inst} | ${s.attempts} | ${s.passes} | ${s.bestAcc}% | ${s.bestScore.toLocaleString()} |`);

  const sessionRows = rows.map((h) => {
    const n = h.notes || { perfect: 0, good: 0, off: 0, miss: 0 };
    return `| ${new Date(h.ts).toISOString().slice(0, 16).replace("T", " ")} | ${h.songTitle || h.songId} | ${h.accuracy}% | ${h.score.toLocaleString()} | ${h.maxStreak} | ${h.passed ? "pass" : "fail"} | ${n.perfect ?? ""}/${n.good ?? ""}/${n.off ?? ""}/${n.miss ?? ""} |`;
  });

  return `# GuitarPicker practice report

Generated ${new Date().toISOString().slice(0, 10)} · exported from GuitarPicker (accuracy = pitch-detection grading of real playing).

> **Suggested prompt:** Act as my guitar teacher. Analyze this practice log: accuracy and score trends over time, consistency of practice, which songs need the most work, and where I plateau. Finish with a focused practice plan for the next week.

## Summary

- Sessions: ${rows.length} (${day(rows[rows.length - 1].ts)} → ${day(rows[0].ts)})
- Average accuracy: ${avgAcc}% · passes: ${rows.filter((h) => h.passed).length}/${rows.length}
- Total time played: ${fmtTime(totalTime)}

## Per song

| Song | Instrument | Attempts | Passes | Best accuracy | Best score |
|---|---|---|---|---|---|
${songRows.join("\n")}

## Sessions (newest first — Notes column is perfect/good/off/miss counts)

| When (UTC) | Song | Accuracy | Score | Best streak | Result | Notes |
|---|---|---|---|---|---|---|
${sessionRows.join("\n")}
`;
}
