// Sustained reference tone for tuning a single string. Ported from the
// vanilla app's Synth.reference() (src/audio/synth.js), trimmed to just this.
import { audioEngine } from "./audio-engine";

/** Starts a sine tone at `freq`. Returns a stop() fn (call it to fade it out). */
export function playReferenceTone(freq: number, { gain = 0.18 }: { gain?: number } = {}): () => void {
  const ctx = audioEngine.ctx();
  audioEngine.resume();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.05);
  osc.connect(g); g.connect(ctx.destination); osc.start();
  return () => {
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
    osc.stop(ctx.currentTime + 0.1);
  };
}
