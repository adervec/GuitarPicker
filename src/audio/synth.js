// Lightweight oscillator synth for note previews, reference tones, and metronome.
import { Audio } from "./engine.js";
import { midiToFreq } from "../music/notes.js";

export const Synth = {
  /** Pluck-ish tone for a midi note. */
  playMidi(midi, { dur = 0.7, type = "triangle", gain = 0.25, a4 = 440 } = {}) {
    const ctx = Audio.ctx(); Audio.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = midiToFreq(midi, a4);
    osc.type = type; osc.frequency.value = f;
    // subtle second partial
    const osc2 = ctx.createOscillator(); osc2.type = "sine"; osc2.frequency.value = f * 2;
    const g2 = ctx.createGain(); g2.gain.value = gain * 0.3;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(g); osc2.connect(g2); g2.connect(g); g.connect(ctx.destination);
    osc.start(t); osc2.start(t); osc.stop(t + dur + 0.05); osc2.stop(t + dur + 0.05);
  },

  /** Sustained reference tone for tuning a single string. Returns a stop() fn. */
  reference(freq, { gain = 0.18 } = {}) {
    const ctx = Audio.ctx(); Audio.resume();
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.05);
    osc.connect(g); g.connect(ctx.destination); osc.start();
    return () => {
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
      osc.stop(ctx.currentTime + 0.1);
    };
  },

  click({ accent = false } = {}) {
    const ctx = Audio.ctx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.frequency.value = accent ? 1500 : 900;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(accent ? 0.35 : 0.2, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t + 0.06);
  },
};
