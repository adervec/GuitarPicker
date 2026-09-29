// Theory Games quiz generators. Ported verbatim from the vanilla app's
// views/minigames.js (the GAMES table) — pure logic + Synth playback, no
// DOM, so it lives in shared/lib rather than the view.
import { INTERVALS, CHORD_TYPES, chordMidis } from "./theory";
import { NOTE_SHARP, KEY_SIGNATURES, scaleNotes } from "./note-math";
import { Synth } from "./synth";

export const QUESTIONS = 8;

const rand = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const shuffle = <T,>(a: T[]): T[] => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

export interface Question {
  prompt: string;
  choices: string[];
  answer: string;
  audio?: () => void;
}

export interface GameDef {
  title: string;
  icon: string;
  desc: string;
  gen: () => Question;
}

export const GAMES: Record<string, GameDef> = {
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
      const labels: Record<string, string> = { maj: "Major", min: "Minor", dim: "Diminished", aug: "Augmented", dom7: "Dominant 7th", min7: "Minor 7th" };
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
        const m = Math.floor(Math.random() * 8), sharp = Math.random() > 0.5;
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
