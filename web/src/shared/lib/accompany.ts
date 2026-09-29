// Auto-accompaniment: give any song a band even when it ships no audio and no
// authored parts. Ported verbatim from the vanilla app's
// src/music/accompany.js — assumes 4/4, one chord per bar, root-position
// voicing (documented limitation there too).
import { CHORD_TYPES, chordMidis, identifyChord } from "./theory";
import { INSTRUMENTS, type InstrumentDef } from "@/entities/instrument/model/data";
import { KICK, SNARE, HAT } from "./voices";
import type { Song, SongPart, Note } from "@/entities/song/model/song-format";

const PC: Record<string, number> = { c: 0, "c#": 1, db: 1, d: 2, "d#": 3, eb: 3, e: 4, f: 5, "f#": 6, gb: 6,
             g: 7, "g#": 8, ab: 8, a: 9, "a#": 10, bb: 10, b: 11 };

export function parseKey(key: string | undefined): { pc: number; minor: boolean } {
  const m = String(key || "C").trim().replace(/♯/g, "#").replace(/♭/g, "b").match(/^([a-gA-G][#b]?)\s*(m|min)?/);
  if (!m) return { pc: 0, minor: false };
  return { pc: PC[m[1].toLowerCase()] ?? 0, minor: !!m[2] };
}

const MAJOR: [number, string][] = [[0, "maj"], [7, "maj"], [5, "maj"], [9, "min"], [2, "min"], [4, "min"], [11, "dim"]];
const MINOR: [number, string][] = [[0, "min"], [7, "maj"], [5, "min"], [8, "maj"], [3, "maj"], [10, "maj"], [2, "dim"]];

interface ChordPlanEntry {
  bar: number;
  at: number;
  pc: number;
  type: string;
}

const inst = (id: string): InstrumentDef | undefined => (INSTRUMENTS as Record<string, InstrumentDef>)[id];

export function chordPlan(song: Song): ChordPlanEntry[] {
  const bpm = song.bpm || 90;
  const spb = 60 / bpm, barLen = 4 * spb;
  const notes = (song.notes || []).filter((n) => n.midi?.length);
  if (!notes.length) return [];
  const end = notes.reduce((m, n) => Math.max(m, n.time + (n.dur || spb)), 0);
  const { pc: keyPc, minor } = parseKey(song.key);
  const pool = (minor ? MINOR : MAJOR).map(([off, type], rank) => ({ pc: (keyPc + off) % 12, type, rank }));

  const plan: ChordPlanEntry[] = [];
  let prev = pool[0];
  for (let bar = 0; bar * barLen < end - 1e-6; bar++) {
    const t0 = bar * barLen, t1 = t0 + barLen;
    const inBar = notes.filter((n) => n.time >= t0 - 1e-6 && n.time < t1 - 1e-6);
    let choice: { pc: number; type: string; rank: number } | null = null;

    const stated = inBar.find((n) => n.midi.length > 2 && identifyChord(n.midi));
    if (stated) {
      const c = identifyChord(stated.midi)!;
      choice = { pc: c.rootPc, type: CHORD_TYPES[c.type] ? c.type : "maj", rank: 0 };
    } else if (inBar.length) {
      const w = new Array(12).fill(0);
      for (const n of inBar) for (const m of n.midi) w[((m % 12) + 12) % 12] += (n.dur || spb);
      let best: { covered: number; cand: { pc: number; type: string; rank: number } } | null = null;
      for (const cand of pool) {
        const tones = chordMidis(cand.pc, cand.type).map((m) => m % 12);
        const covered = tones.reduce((s, pcv) => s + w[pcv], 0) + w[cand.pc] * 0.4;
        if (!best || covered > best.covered + 1e-9 || (covered > best.covered - 1e-9 && cand.rank < best.cand.rank)) {
          best = { covered, cand };
        }
      }
      choice = best!.cand;
    }
    if (!choice) choice = prev;
    prev = choice;
    plan.push({ bar, at: t0, pc: choice.pc, type: choice.type });
  }
  return plan;
}

interface RolePart {
  instrument: string;
  notes?: Note[];
}

function roleOf(part: RolePart): string | null {
  const kind = inst(part.instrument)?.kind;
  if (kind === "percussion") return "drums";
  if (/bass/.test(part.instrument || "")) return "bass";
  const notes = part.notes || [];
  const chords = notes.filter((n) => (n.midi?.length ?? 0) > 2).length;
  if (notes.length && chords / notes.length > 0.6) return "comp";
  return null;
}

const QUIET = new Set(["Classical", "Hymn/Gospel"]);
const DRUMMY = new Set(["Rock", "Blues", "Pop", "Country", "Funk/Soul", "Jazz", "Electronic", "World"]);

/** Parts to add under a song. `existing` is every part already sounding. */
export function autoAccompaniment(song: Song, existing: RolePart[] = []): SongPart[] {
  if (inst(song.instrument)?.kind === "percussion") return [];
  const plan = chordPlan(song);
  if (!plan.length) return [];
  const spb = 60 / (song.bpm || 90);
  const have = new Set(existing.map(roleOf).filter((r): r is string => !!r));
  const leadKind = inst(song.instrument)?.kind;
  const bass: Note[] = [], comp: Note[] = [], drums: Note[] = [];
  const wantDrums = !have.has("drums") && !QUIET.has(song.genre) &&
    (DRUMMY.has(song.genre) || (song.bpm || 90) >= 84);

  for (const { at, pc, type } of plan) {
    if (!have.has("bass")) {
      const root = 36 + pc;
      const fifth = root + 7 > 47 ? root - 5 : root + 7;
      bass.push({ time: at, dur: spb * 1.8, midi: [root] });
      bass.push({ time: at + spb * 2, dur: spb * 1.8, midi: [fifth], gain: 0.85 });
    }
    if (!have.has("comp")) {
      const voicing = chordMidis(48 + pc, type);
      for (let b = 0; b < 4; b++) {
        comp.push({ time: at + b * spb, dur: spb * 0.9, midi: voicing, gain: b === 0 ? 0.9 : 0.55 });
      }
    }
    if (wantDrums) {
      drums.push({ time: at, dur: 0.2, midi: [KICK] }, { time: at + spb * 2, dur: 0.2, midi: [KICK], gain: 0.85 });
      drums.push({ time: at + spb, dur: 0.2, midi: [SNARE] }, { time: at + spb * 3, dur: 0.2, midi: [SNARE] });
      for (let h = 0; h < 8; h++) drums.push({ time: at + h * spb * 0.5, dur: 0.05, midi: [HAT], gain: h % 2 ? 0.35 : 0.55 });
    }
  }

  const compInst = leadKind === "keys" ? "acoustic-guitar" : "piano";
  const result: (SongPart | null)[] = [
    bass.length ? { instrument: "bass", name: "Bass", notes: bass, gain: 0.9 } : null,
    comp.length ? { instrument: compInst, name: inst(compInst)?.name ?? compInst, notes: comp, gain: 0.55 } : null,
    drums.length ? { instrument: "drum-kit", name: "Drums", notes: drums, gain: 0.7 } : null,
  ];
  return result.filter((p): p is SongPart => p !== null);
}
