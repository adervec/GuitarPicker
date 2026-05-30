import { el, pageHead, clear, toast } from "../ui/components.js";
import { Store } from "../state.js";
import { Synth } from "../audio/synth.js";
import { INTERVALS, CHORD_TYPES, chordMidis } from "../music/theory.js";
import { NOTE_SHARP, KEY_SIGNATURES, scaleNotes, nameToMidi } from "../music/notes.js";

const QUESTIONS = 8;
const rand = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

// each generator returns { prompt, choices:[str], answer:str, audio?:fn }
const GAMES = {
  interval_ear: {
    title: "Interval Ear Training", icon: "👂", desc: "Hear two notes — name the interval.",
    gen() {
      const base = 55 + Math.floor(Math.random() * 8);
      const iv = rand(INTERVALS.filter((i) => i.semitones > 0));
      const wrong = shuffle(INTERVALS.filter((i) => i.short !== iv.short)).slice(0, 3);
      return {
        prompt: "Which interval did you hear?",
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
      const t = rand(types), root = 52 + Math.floor(Math.random() * 8);
      const labels = { maj: "Major", min: "Minor", dim: "Diminished", aug: "Augmented", dom7: "Dominant 7th", min7: "Minor 7th" };
      const wrong = shuffle(types.filter((x) => x !== t)).slice(0, 3);
      return {
        prompt: "What quality is this chord?",
        choices: shuffle([t, ...wrong].map((x) => labels[x])),
        answer: labels[t],
        audio: () => chordMidis(root, t).forEach((m) => Synth.playMidi(m, { dur: 1.2 })),
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
        prompt: `What is the interval from ${base} up to ${target}?`,
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
      const desc = n === 0 ? "No sharps or flats" : `${Math.abs(n)} ${n > 0 ? "sharp" : "flat"}${Math.abs(n) > 1 ? "s" : ""}`;
      const opts = new Set([desc]);
      while (opts.size < 4) {
        const m = Math.floor(Math.random() * 8) - 0, sharp = Math.random() > 0.5;
        opts.add(m === 0 ? "No sharps or flats" : `${m} ${sharp ? "sharp" : "flat"}${m > 1 ? "s" : ""}`);
      }
      return { prompt: `How many sharps/flats in ${key} major?`, choices: shuffle([...opts]), answer: desc };
    },
  },
  scale_degree: {
    title: "Scale Degrees", icon: "🪜", desc: "Find the right note in a scale.",
    gen() {
      const root = rand(NOTE_SHARP);
      const degree = 2 + Math.floor(Math.random() * 6); // 3rd..7th
      const pcs = scaleNotes(NOTE_SHARP.indexOf(root), "major");
      const answer = NOTE_SHARP[pcs[degree]];
      const ordinals = ["root", "2nd", "3rd", "4th", "5th", "6th", "7th"];
      const wrong = shuffle(NOTE_SHARP.filter((n) => n !== answer)).slice(0, 3);
      return { prompt: `What is the ${ordinals[degree]} of the ${root} major scale?`, choices: shuffle([answer, ...wrong]), answer };
    },
  },
};

export default function minigames(ctx) {
  const { el: root } = ctx;
  clear(root);
  root.appendChild(pageHead("Theory Games", "Bite-sized quizzes to sharpen your ear and theory. Beat your high score!"));

  const menu = el("div.grid.cards");
  root.appendChild(menu);
  const prog = Store.progressFor("theory");
  for (const [id, g] of Object.entries(GAMES)) {
    const best = prog.drills?.[id] || 0;
    menu.appendChild(el("div.card", { onclick: () => runGame(id) }, [
      el("div.title", { html: `${g.icon} ${g.title}` }),
      el("div.sub", { text: g.desc }),
      el("div.muted", { style: { fontSize: "12px", marginTop: "auto" }, text: `High score: ${best}/${QUESTIONS}` }),
    ]));
  }

  function runGame(id) {
    const g = GAMES[id];
    let qi = 0, correct = 0, locked = false;
    clear(root);
    const stage = el("div.panel", { style: { maxWidth: "640px", margin: "0 auto" } });
    root.appendChild(pageHead(g.title, g.desc, [el("button.btn.ghost", { onclick: () => minigames(ctx) }, ["← Games"])]));
    root.appendChild(stage);
    next();

    function next() {
      if (qi >= QUESTIONS) return finish();
      locked = false;
      const q = g.gen();
      clear(stage);
      stage.appendChild(el("div.spread", {}, [
        el("div.muted", { text: `Question ${qi + 1} / ${QUESTIONS}` }),
        el("div.muted", { text: `Score: ${correct}` }),
      ]));
      stage.appendChild(el("h2", { style: { margin: "12px 0" }, text: q.prompt }));
      if (q.audio) {
        stage.appendChild(el("div.center", { style: { marginBottom: "14px" } }, [
          el("button.btn.lg.primary", { onclick: q.audio }, ["🔊 Play again"]),
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
        el("h2", { text: `${correct} / ${QUESTIONS} correct (${pct}%)` }),
        correct > prev ? el("p", { style: { color: "var(--good)" }, text: "New high score!" }) : el("p.muted", { text: `High score: ${Math.max(prev, correct)}` }),
        el("div.row", { style: { justifyContent: "center", marginTop: "10px" } }, [
          el("button.btn.primary", { onclick: () => runGame(id) }, ["Play again"]),
          el("button.btn", { onclick: () => minigames(ctx) }, ["← Games"]),
        ]),
      ]));
      if (correct > prev) toast("New high score!", "good");
    }
  }
}
