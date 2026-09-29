// One-shot synth: note previews and the metronome click. Ported from the
// vanilla app's src/audio/synth.js (its `reference()` already lives in this
// project as reference-tone.js, used by the Tuner pilot).
import { audioEngine } from "./audio-engine";
import { playVoice, voiceFor, type KillFn } from "./voices";

export const Synth = {
  /** Play a midi note in an instrument's voice. Returns kill(when). */
  playMidi(midi: number, { dur = 0.7, gain = 0.25, a4 = 440, instrument = null, voice = null }: {
    dur?: number; gain?: number; a4?: number; instrument?: string | null; voice?: string | null;
  } = {}): KillFn {
    const ctx = audioEngine.ctx(); audioEngine.resume();
    return playVoice(ctx, ctx.destination, voice || (instrument ? voiceFor(instrument) : null), midi, { dur, gain, a4 });
  },

  click({ accent = false }: { accent?: boolean } = {}): void {
    const ctx = audioEngine.ctx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.frequency.value = accent ? 1500 : 900;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(accent ? 0.35 : 0.2, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t + 0.06);
  },
};
