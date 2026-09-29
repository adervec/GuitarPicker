"use client";

// Record a melody with the microphone and transcribe it into a draft song,
// then hand it to the Song Editor to name/tweak/save. Ported (as JSX — form
// controls + a record button, no canvas-game-loop reason to stay
// imperative) from the vanilla app's views/listen.js, trimmed to just the
// microphone path: dropped entirely is the optional screen-capture
// slideshow (getDisplayMedia + periodic snapshots composited behind the
// notes — a second, unrelated capture pipeline), and the in-page
// difficulty-level (beginner/intermediate/advanced note-simplification)
// and background pickers with their own Play/Save buttons — this pilot's
// flow is simpler: transcribe once, then refine everything (including
// re-picking notes via notation) in the Editor, which already owns that
// job for every other song source.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useListenRecorder } from "@/features/listen-record/model/useListenRecorder";
import { framesToNotes } from "@/shared/lib/transcribe";
import { newSong, uid } from "@/entities/song/model/song-format";
import { saveUserSong } from "@/entities/song/model/user-songs";
import { getSettings } from "@/shared/lib/player-settings";
import { toast, fmtTime } from "@/shared/lib/dom";
import styles from "./ListenPage.module.css";

export function ListenPage() {
  const router = useRouter();
  const rec = useListenRecorder();
  const [bpm, setBpm] = useState(90);
  const [taps, setTaps] = useState<number[]>([]);
  const [result, setResult] = useState<ReturnType<typeof framesToNotes> | null>(null);

  function tapTempo() {
    const now = performance.now();
    const recent = [...taps, now].filter((t) => now - t < 3000);
    setTaps(recent);
    if (recent.length >= 2) {
      const intervals = [];
      for (let i = 1; i < recent.length; i++) intervals.push(recent[i] - recent[i - 1]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setBpm(Math.round(60000 / avg));
    }
  }

  async function toggleRecord() {
    if (rec.recording) {
      const frames = rec.stop();
      if (frames.length < 5) { toast("Didn't hear enough — try again, a bit louder.", "bad"); return; }
      const notes = framesToNotes(frames, bpm, getSettings().a4);
      if (!notes.length) { toast("Couldn't find clear notes — try a melody with single notes.", "bad"); return; }
      setResult(notes);
      return;
    }
    setResult(null);
    const ok = await rec.start();
    if (!ok) toast("Mic failed: " + (rec.error || "unknown error"), "bad");
  }

  function openInEditor() {
    if (!result) return;
    const s = getSettings();
    const song = newSong({
      id: uid(),
      title: `Recording ${new Date().toLocaleString()}`,
      artist: "You",
      instrument: s.instrument,
      bpm,
      source: "listen",
      notes: result,
    });
    saveUserSong(song);
    router.push(`/editor/${song.id}`);
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Listen &amp; Make</h1>
      <p className={styles.subtitle}>Play or sing something — GuitarPicker transcribes it into a draft song you can refine in the Editor.</p>

      <section className={styles.panel}>
        <h2>1 · Set up</h2>
        <div className={styles.row}>
          <label className={styles.tempo}>
            <span>Tempo (for note alignment)</span>
            <input type="range" min={50} max={200} step={1} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
            <span className={styles.tempoVal}>{bpm} BPM</span>
          </label>
          <button className="btn" onClick={tapTempo}>Tap tempo</button>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.center}`}>
        <h2>2 · Record</h2>
        <div className={styles.liveNote}>
          {rec.liveNote ? <>{rec.liveNote.name}<small>{rec.liveNote.octave}</small></> : "—"}
        </div>
        <div className={styles.meterTrack}><div className={styles.meterFill} style={{ width: rec.meter + "%" }} /></div>
        <div className={styles.row} style={{ justifyContent: "center" }}>
          <button className={`btn ${rec.recording ? "" : "primary"} ${styles.recordBtn}`} onClick={toggleRecord}>
            {rec.recording ? "■ Stop" : "● Record"}
          </button>
          <span className={styles.muted}>{fmtTime(rec.elapsed)}</span>
        </div>
      </section>

      {result && (
        <section className={styles.panel}>
          <h2>3 · Your transcription</h2>
          <p className={styles.muted}>
            Detected {result.length} note{result.length === 1 ? "" : "s"} over{" "}
            {fmtTime(Math.max(0, ...result.map((n) => n.time + n.dur)))}.
          </p>
          <button className="btn primary" onClick={openInEditor}>✎ Open in Editor</button>
        </section>
      )}
    </div>
  );
}
