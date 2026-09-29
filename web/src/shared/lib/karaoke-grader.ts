// Shared note-grading engine used by instrument play and karaoke vocal
// scoring. Ported verbatim from the vanilla app's src/karaoke/grader.js —
// Play's engine keeps its own inline copy of this logic (ported before this
// file existed here); this is the shared one Karaoke uses, matching the
// vanilla app's own layout (both exist independently there too).
//
// Pitch matching is octave-agnostic: a singer (or a capo'd/transposed
// instrument) may be one or more octaves off the written pitch yet still be
// "right". Defaults mirror Play exactly so the two stay in lockstep.
import type { Song, Note } from "@/entities/song/model/song-format";

export type Grade = "perfect" | "good" | "off" | "miss";

export interface GradeOptions {
  perfectCents: number;
  goodCents: number;
  health: { start: number; max: number; perfect: number; good: number; off: number; miss: number };
  score: { perfect: number; good: number; off: number };
}

export const GRADE_DEFAULTS: GradeOptions = {
  perfectCents: 28,
  goodCents: 60,
  health: { start: 100, max: 100, perfect: +6, good: +3, off: -7, miss: -10 },
  score: { perfect: 100, good: 60, off: 10 },
};

/** A song note being actively graded — the target fields plus the running
 *  best-match state the grader accumulates onto it frame by frame. */
export interface GradeTarget extends Note {
  state?: Grade | "pending";
  best?: number;
  frames?: number;
}

export function centsOff(detectedMidi: number, targets: number[]): number {
  let best = Infinity;
  for (const target of targets) {
    const diff = detectedMidi - target;
    const cents = Math.abs((diff - Math.round(diff / 12) * 12) * 100);
    if (cents < best) best = cents;
  }
  return best;
}

export function classify(frames: number, bestCents: number, opt: GradeOptions = GRADE_DEFAULTS): Grade {
  if (frames >= 2 && bestCents <= opt.perfectCents) return "perfect";
  if (frames >= 1 && bestCents <= opt.goodCents) return "good";
  if (frames >= 1) return "off";
  return "miss";
}

export class Grader {
  opt: GradeOptions;
  counts!: Record<Grade, number>;
  health!: number;
  failed!: boolean;
  score!: number;
  streak!: number;
  maxStreak!: number;
  mult!: number;

  constructor(opt: Partial<GradeOptions> = {}) {
    this.opt = {
      ...GRADE_DEFAULTS, ...opt,
      health: { ...GRADE_DEFAULTS.health, ...(opt.health || {}) },
      score: { ...GRADE_DEFAULTS.score, ...(opt.score || {}) },
    };
    this.reset();
  }

  reset(): void {
    this.counts = { perfect: 0, good: 0, off: 0, miss: 0 };
    this.health = this.opt.health.start;
    this.failed = false;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.mult = 1;
  }

  observe(note: GradeTarget, detectedMidi: number): void {
    if (!(detectedMidi > 0)) return;
    const cents = centsOff(detectedMidi, note.midi);
    if (cents < this.opt.goodCents) {
      note.frames = (note.frames || 0) + 1;
      if (cents < (note.best ?? Infinity)) note.best = cents;
    }
  }

  finalize(note: GradeTarget): Grade {
    const q = classify(note.frames || 0, note.best ?? Infinity, this.opt);
    note.state = q;
    this.apply(q);
    return q;
  }

  apply(q: Grade): Grade {
    const H = this.opt.health, S = this.opt.score;
    this.counts[q]++;
    if (q === "perfect") { this.health = Math.min(H.max, this.health + H.perfect); this.streak++; this.score += Math.round(S.perfect * this.mult); }
    else if (q === "good") { this.health = Math.min(H.max, this.health + H.good); this.streak++; this.score += Math.round(S.good * this.mult); }
    else if (q === "off") { this.health = Math.max(0, this.health + H.off); this.streak = 0; this.score += S.off; }
    else { this.health = Math.max(0, this.health + H.miss); this.streak = 0; }
    this.maxStreak = Math.max(this.maxStreak, this.streak);
    this.mult = 1 + Math.min(3, Math.floor(this.streak / 8)) * 0.5;
    if (this.health <= 0) this.failed = true;
    return q;
  }

  accuracy(): number {
    const c = this.counts;
    const total = c.perfect + c.good + c.off + c.miss;
    if (!total) return 100;
    return Math.round(((c.perfect + c.good * 0.6) / total) * 100);
  }
}

/** An authored vocal melody (`song.voice.notes`) when present, else the
 *  instrument melody, so any lyric song stays singable/scorable. */
export function vocalTargets(song: Song | null | undefined): Note[] {
  const v = song && song.voice && song.voice.notes;
  return (v && v.length ? v : (song && song.notes) || []);
}

export function gradeLetter(acc: number, failed: boolean): string {
  if (failed) return "F";
  if (acc >= 97) return "S";
  if (acc >= 92) return "A";
  if (acc >= 82) return "B";
  if (acc >= 70) return "C";
  if (acc >= 60) return "D";
  return "F";
}
