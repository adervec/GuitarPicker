"use client";

// The Theory Games quiz runner — one question at a time, four choices,
// instant feedback, a finish screen with a high-score check. Ported (as
// JSX — form/quiz state, no canvas-game-loop reason to go imperative) from
// the vanilla app's views/minigames.js's runGame() half; the menu is
// TheoryGamesPicker, same split as Karaoke's picker + stage.
import { useEffect, useState } from "react";
import Link from "next/link";
import { GAMES, QUESTIONS, type Question } from "@/shared/lib/theory-games";
import { recordDrillScore, getDrillScores } from "@/shared/lib/theory-progress";
import styles from "./TheoryGamePage.module.css";

interface AnsweredState {
  choice: string;
  right: boolean;
}

// `question` starts `null` — deterministic and identical on the server and
// the client's first (hydration) render — and is only ever generated inside
// a `useEffect` or an event handler, never during render/a lazy initializer.
// An earlier draft generated the first question with `game.gen()` inside a
// lazy `useState` initializer, reasoning that it would dodge
// `react-hooks/set-state-in-effect` the way `useSyncExternalStore` fixes did
// elsewhere in this pilot; that avoided the lint rule, but `game.gen()` uses
// `Math.random()`, and lazy initializers run during SSR too, so the server
// and the client computed *different* questions — a hydration mismatch on
// every quiz's first question (disclosed but left as a known issue when
// found — see Design.md's Theory Games / Song Editor entries). Generating
// it in this mount effect instead is the correct fix: effects never run
// during SSR, so there is nothing for the client to mismatch against, and
// this is exactly what an effect is for — synchronizing with something
// (`Math.random()`) that is, by definition, outside what render can
// deterministically reproduce, the same class of case React's own docs use
// timestamps to illustrate. Playing the question's audio lives in the same
// effect (also SSR-unsafe, needs `window`) instead of a second one keyed on
// `question`, since both only need to happen once per new question.
export function TheoryGamePage({ gameId }: { gameId: string }) {
  const game = GAMES[gameId];
  const [qi, setQi] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answered, setAnswered] = useState<AnsweredState | null>(null);
  const [finished, setFinished] = useState(false);
  const [prevBest, setPrevBest] = useState(() => (game ? getDrillScores()[gameId] || 0 : 0));
  const [newBest, setNewBest] = useState(false);

  // Deliberate react-hooks/set-state-in-effect override: this generates
  // Math.random()-based content, which render can't do deterministically
  // across SSR and the client (see the comment above this component) — an
  // effect, which never runs during SSR, is the correct place for it, not a
  // derived-during-render value the rule otherwise rightly steers away from.
  useEffect(() => {
    if (!game) return;
    const q = game.gen();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuestion(q);
    q.audio?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount (key={gameId} in app/theory-games/[id]/page.tsx gives each game id a fresh instance); it deliberately does not re-run when `game` is the same reference on every render
  }, []);

  function startQuestion() {
    setAnswered(null);
    setQuestion(game.gen());
  }

  function answer(choice: string) {
    if (!question || answered) return;
    const right = choice === question.answer;
    setAnswered({ choice, right });
    const nextCorrect = right ? correct + 1 : correct;
    if (right) setCorrect(nextCorrect);
    const nextQi = qi + 1;
    setTimeout(() => {
      if (nextQi >= QUESTIONS) {
        recordDrillScore(gameId, nextCorrect);
        setNewBest(nextCorrect > prevBest);
        setFinished(true);
      } else {
        setQi(nextQi);
        startQuestion();
      }
    }, right ? 650 : 1200);
  }

  function restart() {
    setQi(0); setCorrect(0); setFinished(false); setNewBest(false);
    setPrevBest(getDrillScores()[gameId] || 0);
    startQuestion();
  }

  if (!game) {
    return (
      <div className={styles.page}>
        <h2>Game not found</h2>
        <Link href="/theory-games" className="btn">← Games</Link>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((correct / QUESTIONS) * 100);
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <div className={styles.bigGrade}>{pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📚"}</div>
          <h2>{correct} / {QUESTIONS} correct ({pct}%)</h2>
          {newBest
            ? <p className={styles.good}>New high score!</p>
            : <p className={styles.muted}>High score: {Math.max(prevBest, correct)}</p>}
          <div className={styles.row}>
            <button className="btn primary" onClick={restart}>Play again</button>
            <Link href="/theory-games" className="btn">← Games</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{game.title}</h1>
        <Link href="/theory-games" className="btn ghost">← Games</Link>
      </div>
      <p className={styles.subtitle}>{game.desc}</p>
      <div className={styles.panel}>
        <div className={styles.spread}>
          <span className={styles.muted}>Question {qi + 1} / {QUESTIONS}</span>
          <span className={styles.muted}>Score: {correct}</span>
        </div>
        {question && (
          <>
            <h2 className={styles.prompt}>{question.prompt}</h2>
            {question.audio && (
              <div className={styles.center}>
                <button className="btn primary" onClick={question.audio}>🔊 Play again</button>
              </div>
            )}
            <div className={styles.choices}>
              {question.choices.map((choice) => {
                const isAnswer = choice === question.answer;
                const cls = [
                  styles.choice,
                  answered && answered.choice === choice && answered.right ? styles.correct : "",
                  answered && answered.choice === choice && !answered.right ? styles.wrong : "",
                  answered && !answered.right && isAnswer ? styles.correct : "",
                ].join(" ");
                return (
                  <div key={choice} className={cls} onClick={() => answer(choice)}>
                    {choice}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
