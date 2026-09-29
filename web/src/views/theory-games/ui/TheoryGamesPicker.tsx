"use client";

// The Theory Games menu — one card per quiz, with a live high score. Ported
// (as JSX — a card grid, no canvas-game-loop reason to go imperative) from
// the vanilla app's views/minigames.js's menu half; the quiz runner itself
// is TheoryGamePage, same split as Karaoke's picker + stage.
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { GAMES, QUESTIONS } from "@/shared/lib/theory-games";
import { getDrillScores } from "@/shared/lib/theory-progress";
import styles from "./TheoryGamesPicker.module.css";

const EMPTY_SCORES: Record<string, number> = {};
const noSubscribe = () => () => {};
function useDrillScores() {
  return useSyncExternalStore(noSubscribe, getDrillScores, () => EMPTY_SCORES);
}

export function TheoryGamesPicker() {
  const scores = useDrillScores();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Theory Games</h1>
      <p className={styles.subtitle}>Bite-sized quizzes to sharpen your ear and theory. Beat your high score!</p>
      <div className={styles.grid}>
        {Object.entries(GAMES).map(([id, g]) => (
          <Link key={id} href={`/theory-games/${id}`} className={styles.card}>
            <div className={styles.cardTitle}>{g.icon} {g.title}</div>
            <div className={styles.cardSub}>{g.desc}</div>
            <div className={styles.score}>High score: {scores[id] || 0}/{QUESTIONS}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
