"use client";

// The pilot's landing page ("/", replacing the earlier redirect(/library)).
// Trimmed port of the vanilla app's views/home.js: the "continue where you
// left off" hero, stats, and a "jump back in" song row. Dropped entirely —
// XP/leveling, the coin economy, the avatar/guitar "Your setup" panel and
// the whole gamified "Today's Practice" checklist with its streak/coin
// rewards, since none of Locker/cosmetics/daily-activities is part of this
// pilot (same rationale as Settings dropping theming/Locker, and History
// dropping the coins column and daily-streak report line).
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { allSongs } from "@/entities/song/model/catalog";
import { getHistory, getSettings, subscribeSettings, DEFAULTS, type HistoryEntry } from "@/shared/lib/player-settings";
import { INSTRUMENTS, type InstrumentDef } from "@/entities/instrument/model/data";
import { fmtTime } from "@/shared/lib/dom";
import styles from "./HomePage.module.css";

const EMPTY_HISTORY: HistoryEntry[] = [];
const noSubscribe = () => () => {};
function useHistoryRows() {
  return useSyncExternalStore(noSubscribe, getHistory, () => EMPTY_HISTORY);
}
function useSettingsValue() {
  return useSyncExternalStore(subscribeSettings, getSettings, () => DEFAULTS);
}

export function HomePage() {
  const rows = useHistoryRows();
  const s = useSettingsValue();
  const songs = allSongs();
  const inst = s.instrument;

  const totalSessions = rows.length;
  const avgAcc = rows.length ? Math.round(rows.reduce((a, h) => a + h.accuracy, 0) / rows.length) : 0;
  const totalTime = rows.reduce((a, h) => a + (h.durationSec || 0), 0);
  const bestStreak = rows.reduce((a, h) => Math.max(a, h.maxStreak || 0), 0);

  const instDef = (INSTRUMENTS as Record<string, InstrumentDef>)[inst];
  const tunable = (instDef?.strings.length || 0) > 0;

  const recent = rows[0];
  const recentSong = recent && songs.find((song) => song.id === recent.songId);

  const forInst = songs.filter((song) => (song.instrument || "acoustic-guitar") === inst);
  const featured = [...forInst, ...songs.filter((song) => !forInst.includes(song))].slice(0, 6);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Welcome back 🎵</h1>
      <p className={styles.subtitle}>Pick up where you left off, or explore something new.</p>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.muted}>Current instrument</div>
          <div className={styles.instName}>{instDef?.name || inst}</div>
        </div>
        <div className={styles.heroActions}>
          {recentSong && (
            <Link href={`/play/${recentSong.id}`} className={`btn primary ${styles.lg}`}>
              ▶ Continue: {recentSong.title}
            </Link>
          )}
          <Link href="/library" className={`btn ${styles.lg}`}>Browse songs</Link>
          {tunable
            ? <Link href="/tuner" className={`btn ${styles.lg}`}>🎚️ Tune up</Link>
            : <Link href="/instruments" className={`btn ${styles.lg}`}>📖 Instrument guide</Link>}
        </div>
      </section>

      {rows.length > 0 && (
        <div className={styles.summary}>
          <Stat num={totalSessions} label="Sessions" />
          <Stat num={`${avgAcc}%`} label="Avg accuracy" />
          <Stat num={fmtTime(totalTime)} label="Time played" />
          <Stat num={bestStreak} label="Best streak" />
        </div>
      )}

      <h2 className={styles.sectionTitle}>Jump back in</h2>
      <div className={styles.grid}>
        {featured.map((song) => (
          <Link key={song.id} href={`/play/${song.id}`} className={styles.card}>
            <div className={styles.cardTitle}>{song.title}</div>
            <div className={styles.cardSub}>{song.artist} · {(INSTRUMENTS as Record<string, InstrumentDef>)[song.instrument]?.name || song.instrument}</div>
            <div className={styles.tags}>
              <span className={styles.tag}>{song.difficulty}</span>
              {song.genre ? <span className={styles.tag}>{song.genre}</span> : null}
            </div>
          </Link>
        ))}
      </div>

      <section className={styles.panel}>
        <h3>Getting set up</h3>
        <ul className={styles.tips}>
          <li>Open <b>Settings</b> to pick your microphone &amp; output device.</li>
          <li>{tunable
            ? <>Use the <b>Tuner</b> before playing — it tells you when a string is out of tune.</>
            : <>New to this one? The <b>Instruments</b> guide covers how to hold it, first notes, and care.</>}</li>
        </ul>
      </section>
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
