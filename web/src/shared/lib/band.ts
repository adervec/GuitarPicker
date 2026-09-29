// The synth backing band: plays every part of a song you are not playing
// yourself. Sample-accurate — notes are scheduled ahead into the AudioContext
// clock rather than fired from requestAnimationFrame. Ported verbatim from
// the vanilla app's src/audio/band.js (including its rate-aware scheduling —
// see Design.md's strict-mode/practice-speed entries for why `rate` exists).
import { audioEngine } from "./audio-engine";
import { playVoice, voiceFor, type KillFn } from "./voices";
import type { SongPart, Note } from "@/entities/song/model/song-format";

const LOOKAHEAD = 0.4;   // seconds of notes to queue ahead of the transport clock

interface BandPart {
  instrument: string;
  name: string;
  voice: string;
  gain: number;
  notes: Note[];
  i: number;
}

interface LiveVoice {
  kill: KillFn;
  end: number;
}

export interface BandPartInput extends Partial<SongPart> {
  instrument: string;
  voice?: string;
  gain?: number;
}

export class Band {
  parts: BandPart[];
  a4: number;
  volume: number;
  private _ctxOverride: BaseAudioContext | null;
  private _live: LiveVoice[];
  private _g: GainNode | null;

  /** parts: [{ instrument, name?, notes:[{time,dur,midi[],gain?}], gain? }]
   *  `ctx` overrides the shared AudioContext — only a test harness would pass it. */
  constructor(parts: BandPartInput[] | null | undefined, { a4 = 440, volume = 0.7, ctx = null }: { a4?: number; volume?: number; ctx?: BaseAudioContext | null } = {}) {
    this.parts = (parts || []).filter((p) => p && p.notes?.length).map((p) => ({
      instrument: p.instrument,
      name: p.name || p.instrument,
      voice: p.voice || voiceFor(p.instrument),
      gain: p.gain ?? 1,
      notes: [...(p.notes || [])].sort((a, b) => a.time - b.time),
      i: 0,
    }));
    this.a4 = a4;
    this.volume = volume;
    this._ctxOverride = ctx;
    this._live = [];
    this._g = null;
  }

  get empty(): boolean { return this.parts.length === 0; }
  get names(): string[] { return this.parts.map((p) => p.name); }

  _ctx(): BaseAudioContext { return this._ctxOverride || audioEngine.ctx(); }

  _dest(): GainNode {
    if (!this._g) {
      const ctx = this._ctx();
      this._g = ctx.createGain();
      this._g.gain.value = this.volume;
      this._g.connect(ctx.destination);
    }
    return this._g;
  }

  setVolume(v: number): void { this.volume = v; if (this._g) this._g.gain.value = v; }

  /** Move the playhead; anything already queued is dropped. */
  seek(sec: number): void {
    for (const p of this.parts) {
      let i = 0;
      while (i < p.notes.length && p.notes[i].time < sec) i++;
      p.i = i;
    }
    this.silence();
  }

  /** Call once per frame with the transport clock (seconds, may be negative) and
   *  the current practice-speed rate (1 = normal; <1 slows the whole song down). */
  schedule(clock: number, rate = 1): void {
    if (this.empty) return;
    const ctx = this._ctx();
    const dest = this._dest();
    const now = ctx.currentTime;
    const horizon = clock + LOOKAHEAD * rate;
    for (const p of this.parts) {
      while (p.i < p.notes.length && p.notes[p.i].time < horizon) {
        const n = p.notes[p.i++];
        const at = now + (n.time - clock) / rate;
        if (at < now) continue;
        const dur = n.dur || 0.4;
        for (const m of n.midi) {
          this._live.push({ kill: playVoice(ctx, dest, p.voice, m, { at, dur, gain: (n.gain ?? 1) * p.gain * 0.34, a4: this.a4 }), end: at + dur + 1.5 });
        }
      }
    }
    if (this._live.length > 64) this._live = this._live.filter((l) => l.end > ctx.currentTime);
  }

  /** Cut everything currently sounding (pause / seek / toggle off). */
  silence(): void {
    if (!this._live.length) return;
    const t = this._ctx().currentTime;
    for (const l of this._live) l.kill(t);
    this._live = [];
  }

  stop(): void {
    this.silence();
    if (this._g) { try { this._g.disconnect(); } catch { /* already gone */ } this._g = null; }
  }
}
