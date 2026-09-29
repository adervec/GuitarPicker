"use client";

// Song picker for Karaoke — every built-in song that carries lyrics. Ported
// (as JSX; it's plain markup, no canvas/audio/game-loop reason to keep it
// imperative like the stage) from the vanilla app's views/karaoke.js `picker()`.
import Link from "next/link";
import { allSongs } from "@/entities/song/model/catalog";
import styles from "./KaraokePicker.module.css";

export function KaraokePicker() {
  const withLyrics = allSongs().filter((s) => (s.lyrics || []).length);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>🎤 Karaoke</h1>
      <p className={styles.subtitle}>Pick a song with lyrics. Sing along — turn on scoring to be graded.</p>
      {withLyrics.length === 0 ? (
        <p className={styles.empty}>No songs with lyrics in this pilot&apos;s library.</p>
      ) : (
        <div className={styles.grid}>
          {withLyrics.map((s) => {
            const wordTimed = (s.lyrics || []).some((l) => Array.isArray(l.words) && l.words.length);
            return (
              <Link key={s.id} href={`/karaoke/${s.id}`} className={styles.card}>
                <div className={styles.cardTitle}>{s.title}</div>
                <div className={styles.cardSub}>{s.artist} · {s.key} · {s.bpm} BPM</div>
                <div className={styles.tags}>
                  <span className={styles.tag}>{(s.lyrics || []).length} lines</span>
                  <span className={`${styles.tag} ${wordTimed ? styles.tagGood : ""}`}>
                    {wordTimed ? "word-timed" : "auto-timed"}
                  </span>
                  {s.voice?.notes?.length ? <span className={styles.tag}>scored melody</span> : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
