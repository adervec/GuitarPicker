"use client";

// Listen & Make's core interaction, as a hook: start/stop the mic, run a
// requestAnimationFrame loop reading pitch every frame (live note + level
// meter + elapsed time), and hand back the raw pitch-frame stream on stop
// for shared/lib/transcribe.ts to turn into notes. Same structure as
// features/tune-string/model/useTunerEngine.ts — mic lifecycle + a
// per-frame pitch-detect loop — because it's the same underlying job.
import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "@/shared/lib/audio-engine";
import { detectPitch, PitchTracker } from "@/shared/lib/pitch";
import { midiToName, freqToMidi, type NoteName } from "@/shared/lib/note-math";
import { getSettings } from "@/shared/lib/player-settings";
import type { PitchFrame } from "@/shared/lib/transcribe";

export function useListenRecorder() {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveNote, setLiveNote] = useState<NoteName | null>(null);
  const [meter, setMeter] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const framesRef = useRef<PitchFrame[]>([]);
  const trackerRef = useRef<PitchTracker | null>(null);
  const bufRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  // main detection loop — only while recording, same shape as useTunerEngine's.
  useEffect(() => {
    if (!recording) return undefined;
    const s = getSettings();
    trackerRef.current = new PitchTracker();
    bufRef.current = new Float32Array(2048);
    startRef.current = performance.now();
    let alive = true;
    function loop() {
      if (!alive) return;
      if (audioEngine.readTimeDomain(bufRef.current!)) {
        const { freq, rms } = detectPitch(bufRef.current!, audioEngine.ctx().sampleRate, s.micGate);
        const t = (performance.now() - startRef.current) / 1000;
        const f = trackerRef.current!.push(freq, s.a4);
        framesRef.current.push({ t, freq: f });
        setMeter(Math.min(100, rms * 600));
        if (f > 0) setLiveNote(midiToName(freqToMidi(f, s.a4)));
      }
      setElapsed((performance.now() - startRef.current) / 1000);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [recording]);

  // stop everything on unmount
  useEffect(() => () => { audioEngine.stopMic(); }, []);

  const start = useCallback(async () => {
    setError(null);
    try { await audioEngine.startMic(getSettings().inputDeviceId); }
    catch (e) { setError(e instanceof Error ? e.message : "Microphone access failed"); return false; }
    framesRef.current = [];
    setLiveNote(null); setMeter(0); setElapsed(0);
    setRecording(true);
    return true;
  }, []);

  /** Stops recording and returns the captured pitch-frame stream. */
  const stop = useCallback((): PitchFrame[] => {
    setRecording(false);
    audioEngine.stopMic();
    return framesRef.current;
  }, []);

  return { recording, error, liveNote, meter, elapsed, start, stop };
}
