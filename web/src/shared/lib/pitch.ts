// Monophonic pitch detection via normalized autocorrelation. Pure DSP, no
// framework dependency. Ported verbatim from the vanilla app's
// src/audio/pitch.js.
import { freqToMidiFloat } from "./note-math";

const MIN_FREQ = 60;    // a bit below low bass B/E
const MAX_FREQ = 1400;  // high fretted notes

export interface PitchReading {
  freq: number;
  rms: number;
  clarity: number;
}

/** @param buf time-domain samples in [-1,1] */
export function detectPitch(buf: Float32Array, sampleRate: number, gate = 0.012): PitchReading {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < gate) return { freq: -1, rms, clarity: 0 };

  const minLag = Math.floor(sampleRate / MAX_FREQ);
  const maxLag = Math.min(Math.floor(sampleRate / MIN_FREQ), Math.floor(n / 2));

  let bestLag = -1, bestVal = 0;
  let prevCorr = 0, ascending = false;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0, normA = 0, normB = 0;
    for (let i = 0; i < n - lag; i++) {
      corr += buf[i] * buf[i + lag];
      normA += buf[i] * buf[i];
      normB += buf[i + lag] * buf[i + lag];
    }
    const nsdf = (2 * corr) / (normA + normB || 1);
    if (nsdf > prevCorr) ascending = true;
    if (ascending && nsdf < prevCorr) {
      const peakLag = lag - 1;
      if (prevCorr > bestVal) { bestVal = prevCorr; bestLag = peakLag; }
      ascending = false;
      if (bestVal > 0.92) break;
    }
    prevCorr = nsdf;
  }

  if (bestLag < 0 || bestVal < 0.5) return { freq: -1, rms, clarity: bestVal };

  const y0 = nsdfAt(buf, n, bestLag - 1), y1 = nsdfAt(buf, n, bestLag), y2 = nsdfAt(buf, n, bestLag + 1);
  const denom = (y0 - 2 * y1 + y2);
  const shift = denom ? 0.5 * (y0 - y2) / denom : 0;
  const refinedLag = bestLag + shift;
  const freq = sampleRate / refinedLag;
  if (freq < MIN_FREQ || freq > MAX_FREQ) return { freq: -1, rms, clarity: bestVal };
  return { freq, rms, clarity: bestVal };
}

function nsdfAt(buf: Float32Array, n: number, lag: number): number {
  if (lag < 1) lag = 1;
  let corr = 0, normA = 0, normB = 0;
  for (let i = 0; i < n - lag; i++) {
    corr += buf[i] * buf[i + lag];
    normA += buf[i] * buf[i];
    normB += buf[i + lag] * buf[i + lag];
  }
  return (2 * corr) / (normA + normB || 1);
}

/** Smoother that suppresses octave jumps and brief dropouts. */
export class PitchTracker {
  last = -1;
  lastMidi = -1;
  holds = 0;

  push(freq: number, a4 = 440): number {
    if (freq <= 0) {
      this.holds++;
      if (this.holds > 4) { this.last = -1; this.lastMidi = -1; }
      return this.last;
    }
    this.holds = 0;
    if (this.last > 0) {
      const candidates = [freq, freq / 2, freq * 2];
      candidates.sort((a, b) => Math.abs(a - this.last) - Math.abs(b - this.last));
      freq = candidates[0];
    }
    this.last = this.last > 0 ? this.last * 0.4 + freq * 0.6 : freq;
    this.lastMidi = freqToMidiFloat(this.last, a4);
    return this.last;
  }
}
