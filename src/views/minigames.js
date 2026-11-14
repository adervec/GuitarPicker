import { el, pageHead, clear, toast } from "../ui/components.js";
import { Store } from "../state.js";
import { Synth } from "../audio/synth.js";
import { INTERVALS, CHORD_TYPES, chordMidis } from "../music/theory.js";
import { NOTE_SHARP, KEY_SIGNATURES, scaleNotes, nameToMidi } from "../music/notes.js";
import { CLEFS, LETTERS, staffSVG, stepToMidi } from "../music/staff.js";
import { t, fmt } from "../i18n.js";

const QUESTIONS = 8;
const rand = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

function readGame(clef, title, icon, desc) {
  return { title, icon, desc, gen() {
    const { lo, hi } = CLEFS[clef];
    const d = lo + Math.floor(Math.random() * (hi - lo + 1));
    const answer = LETTERS[d % 7];
    return {
      prompt: t("What note is this?"), svg: staffSVG(clef, d),
      choices: shuffle([answer, ...shuffle(LETTERS.filter((l) => l !== answer)).slice(0, 3)]), answer,
      reveal: () => Synth.playMidi(stepToMidi(d), { dur: 0.7 }),   // hear it after answering
    };
  } };
}

// each generator returns { prompt, choices:[str], answer:str, audio?:fn, svg?:str, reveal?:fn }
// Titles and descriptions are translated where they are drawn (GAMES is built at load time):
// i18n-keys: Interval Ear Training | Hear two notes — name the interval. | Chord Quality | Hear a chord — is it major, minor…? | Interval Spelling | From note to note — name the interval. | Key Signatures | How many sharps or flats? | Sight-Reading: Treble | Name the note on the treble staff. | Sight-Reading: Bass | Name the note on the bass staff — bassists, this one's yours. | Scale Degrees | Find the right note in a scale.
const GAMES = {
  interval_ear: {
    title: "Interval Ear Training", icon: "👂", desc: "Hear two notes — name the interval.",
    gen() {
      const base = 55 + Math.floor(Math.random() * 8);
      const iv = rand(INTERVALS.filter((i) => i.semitones > 0));
      const wrong = shuffle(INTERVALS.filter((i) => i.short !== iv.short)).slice(0, 3);
      return {
        prompt: t("Which interval did you hear?"),
        choices: shuffle([iv, ...wrong].map((i) => i.name)),
        answer: iv.name,
        audio: () => { Synth.playMidi(base, { dur: 0.6 }); setTimeout(() => Synth.playMidi(base + iv.semitones, { dur: 0.6 }), 500); },
      };
    },
  },
  chord_ear: {
    title: "Chord Quality", icon: "🎹", desc: "Hear a chord — is it major, minor…?",
    gen() {
      const types = ["maj", "min", "dim", "aug", "dom7", "min7"];
      const ty = rand(types), root = 52 + Math.floor(Math.random() * 8);
      const labels = { maj: t("Major"), min: t("Minor"), dim: t("Diminished"), aug: t("Augmented"), dom7: t("Dominant 7th"), min7: t("Minor 7th") };
      const wrong = shuffle(types.filter((x) => x !== ty)).slice(0, 3);
      return {
        prompt: t("What quality is this chord?"),
        choices: shuffle([ty, ...wrong].map((x) => labels[x])),
        answer: labels[ty],
        audio: () => chordMidis(root, ty).forEach((m) => Synth.playMidi(m, { dur: 1.2 })),
      };
    },
  },
  interval_name: {
    title: "Interval Spelling", icon: "📐", desc: "From note to note — name the interval.",
    gen() {
      const base = rand(NOTE_SHARP);
      const iv = rand(INTERVALS.filter((i) => i.semitones > 0 && i.semitones <= 12));
      const target = NOTE_SHARP[(NOTE_SHARP.indexOf(base) + iv.semitones) % 12];
      const wrong = shuffle(INTERVALS.filter((i) => i.short !== iv.short)).slice(0, 3);
      return {
        prompt: t("What is the interval from {from} up to {to}?", { from: base, to: target }),
        choices: shuffle([iv, ...wrong].map((i) => i.name)),
        answer: iv.name,
      };
    },
  },
  key_sig: {
    title: "Key Signatures", icon: "🗝️", desc: "How many sharps or flats?",
    gen() {
      const key = rand(Object.keys(KEY_SIGNATURES));
      const n = KEY_SIGNATURES[key];
      const label = (m, sharp) => (m === 0 ? t("No sharps or flats")
        : sharp ? t.n("{n} sharp", "{n} sharps", m) : t.n("{n} flat", "{n} flats", m));
      const desc = label(Math.abs(n), n > 0);
      const opts = new Set([desc]);
      while (opts.size < 4) {
        const m = Math.floor(Math.random() * 8) - 0, sharp = Math.random() > 0.5;
        opts.add(label(m, sharp));
      }
      return { prompt: t("How many sharps/flats in {key} major?", { key }), choices: shuffle([...opts]), answer: desc };
    },
  },
  treble_read: readGame("treble", "Sight-Reading: Treble", "🎼", "Name the note on the treble staff."),
  bass_read: readGame("bass", "Sight-Reading: Bass", "🎼", "Name the note on the bass staff — bassists, this one's yours."),
  scale_degree: {
    title: "Scale Degrees", icon: "🪜", desc: "Find the right note in a scale.",
    gen() {
      const root = rand(NOTE_SHARP);
      const degree = 2 + Math.floor(Math.random() * 6); // 3rd..7th
      const pcs = scaleNotes(NOTE_SHARP.indexOf(root), "major");
      const answer = NOTE_SHARP[pcs[degree]];
      // i18n-keys: root | 2nd | 3rd | 4th | 5th | 6th | 7th
      const ordinals = ["root", "2nd", "3rd", "4th", "5th", "6th", "7th"];
      const wrong = shuffle(NOTE_SHARP.filter((n) => n !== answer)).slice(0, 3);
      return { prompt: t("What is the {degree} of the {root} major scale?", { degree: t(ordinals[degree]), root }), choices: shuffle([answer, ...wrong]), answer };
    },
  },
};

export default function minigames(ctx) {
  const { el: root } = ctx;
  clear(root);
  root.appendChild(pageHead(t("Theory Games"), t("Bite-sized quizzes to sharpen your ear and theory. Beat your high score!")));

  const menu = el("div.grid.cards");
  root.appendChild(menu);
  const prog = Store.progressFor("theory");
  for (const [id, g] of Object.entries(GAMES)) {
    const best = prog.drills?.[id] || 0;
    menu.appendChild(el("div.card", { onclick: () => runGame(id) }, [
      el("div.title", { html: `${g.icon} ${t(g.title)}` }),
      el("div.sub", { text: t(g.desc) }),
      el("div.muted", { style: { fontSize: "12px", marginTop: "auto" }, text: t("High score: {score}/{total}", { score: best, total: QUESTIONS }) }),
    ]));
  }

  function runGame(id) {
    const g = GAMES[id];
    let qi = 0, correct = 0, locked = false;
    clear(root);
    const stage = el("div.panel", { style: { maxWidth: "640px", margin: "0 auto" } });
    root.appendChild(pageHead(t(g.title), t(g.desc), [el("button.btn.ghost", { onclick: () => minigames(ctx) }, ["← " + t("Games")])]));
    root.appendChild(stage);
    next();

    function next() {
      if (qi >= QUESTIONS) return finish();
      locked = false;
      const q = g.gen();
      clear(stage);
      stage.appendChild(el("div.spread", {}, [
        el("div.muted", { text: t("Question {n} / {total}", { n: qi + 1, total: QUESTIONS }) }),
        el("div.muted", { text: t("Score: {score}", { score: correct }) }),
      ]));
      stage.appendChild(el("h2", { style: { margin: "12px 0" }, text: q.prompt }));
      if (q.svg) stage.appendChild(el("div.center", { style: { marginBottom: "14px" }, html: q.svg }));
      if (q.audio) {
        stage.appendChild(el("div.center", { style: { marginBottom: "14px" } }, [
          el("button.btn.lg.primary", { onclick: q.audio }, ["🔊 " + t("Play again")]),
        ]));
        q.audio();
      }
      const choices = el("div.quiz-choices");
      q.choices.forEach((ch) => choices.appendChild(el("div.quiz-choice", { text: ch, onclick: (e) => answer(e.currentTarget, ch, q) })));
      stage.appendChild(choices);
    }

    function answer(node, choice, q) {
      if (locked) return; locked = true;
      const right = choice === q.answer;
      q.reveal?.();
      node.classList.add(right ? "correct" : "wrong");
      if (right) correct++;
      else {
        [...node.parentElement.children].forEach((c) => { if (c.textContent === q.answer) c.classList.add("correct"); });
      }
      qi++;
      setTimeout(next, right ? 650 : 1200);
    }

    function finish() {
      const prev = Store.progressFor("theory").drills?.[id] || 0;
      Store.recordDrill("theory", id, correct);
      clear(stage);
      const pct = Math.round((correct / QUESTIONS) * 100);
      stage.appendChild(el("div.center", {}, [
        el("div.big-grade", { text: pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📚" }),
        el("h2", { text: t("{correct} / {total} correct ({pct})", { correct, total: QUESTIONS, pct: fmt.percent(correct / QUESTIONS, 0) }) }),
        correct > prev ? el("p", { style: { color: "var(--good)" }, text: t("New high score!") }) : el("p.muted", { text: t("High score: {score}", { score: Math.max(prev, correct) }) }),
        el("div.row", { style: { justifyContent: "center", marginTop: "10px" } }, [
          el("button.btn.primary", { onclick: () => runGame(id) }, [t("Play again")]),
          el("button.btn", { onclick: () => minigames(ctx) }, ["← " + t("Games")]),
        ]),
      ]));
      if (correct > prev) toast(t("New high score!"), "good");
    }
  }
}
