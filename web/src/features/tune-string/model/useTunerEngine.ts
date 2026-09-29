"use client";

// The Tuner's core interaction, as a hook: start/stop the mic, run a
// requestAnimationFrame loop reading pitch every frame, and optionally lock
// onto one string (playing its reference tone briefly). Ported from the
// vanilla app's views/tuner.js — same math (shared/lib/pitch,note-math),
// restructured around React state instead of direct DOM writes.
import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "@/shared/lib/audio-engine";
import { detectPitch, PitchTracker } from "@/shared/lib/pitch";
import { playReferenceTone } from "@/shared/lib/reference-tone";
import { midiToFreq, midiToName, centsTo, freqToMidi, type NoteName } from "@/shared/lib/note-math";

const A4 = 440;
const REFERENCE_TONE_MS = 1500;

export interface TunerReading {
  freq: number;
  refMidi: number;
  cents: number;
  name: NoteName;
}

export function useTunerEngine(tuning: number[]) {
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetIdx, setTargetIdx] = useState<number | null>(null); // null = auto-detect nearest string
  const [reading, setReading] = useState<TunerReading | null>(null);

  const trackerRef = useRef<PitchTracker | null>(null);
  const bufRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const refStopRef = useRef<(() => void) | null>(null);
  const refTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // main detection loop — only while the mic is live. The tracker/buffer are
  // owned by this effect (not lazily created during render — refs can't be
  // touched at render time) and reset fresh on every mic start.
  useEffect(() => {
    if (!running) return undefined;
    trackerRef.current = new PitchTracker();
    bufRef.current = new Float32Array(2048);
    let alive = true;
    function loop() {
      if (!alive) return;
      if (audioEngine.readTimeDomain(bufRef.current!)) {
        const { freq } = detectPitch(bufRef.current!, audioEngine.ctx().sampleRate);
        const f = trackerRef.current!.push(freq, A4);
        if (f > 0) {
          const refMidi = targetIdx != null ? tuning[targetIdx] : freqToMidi(f, A4);
          setReading({ freq: f, refMidi, cents: centsTo(f, refMidi, A4), name: midiToName(refMidi) });
        } else {
          setReading(null);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [running, targetIdx, tuning]);

  // stop everything on unmount
  useEffect(() => () => {
    audioEngine.stopMic();
    if (refStopRef.current) refStopRef.current();
    if (refTimerRef.current) clearTimeout(refTimerRef.current);
  }, []);

  const start = useCallback(async (deviceId?: string) => {
    setStarting(true); setError(null);
    try { await audioEngine.startMic(deviceId); setRunning(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Microphone access failed"); }
    finally { setStarting(false); }
  }, []);

  const stop = useCallback(() => {
    audioEngine.stopMic();
    setRunning(false);
    setReading(null);
  }, []);

  /** idx: string index to lock onto, or null for auto-detect nearest. */
  const pickTarget = useCallback((idx: number | null) => {
    setTargetIdx(idx);
    if (refStopRef.current) { refStopRef.current(); refStopRef.current = null; }
    if (refTimerRef.current) clearTimeout(refTimerRef.current);
    if (idx != null) {
      refStopRef.current = playReferenceTone(midiToFreq(tuning[idx], A4));
      refTimerRef.current = setTimeout(() => {
        if (refStopRef.current) { refStopRef.current(); refStopRef.current = null; }
      }, REFERENCE_TONE_MS);
    }
  }, [tuning]);

  return { running, starting, error, start, stop, targetIdx, pickTarget, reading };
}
