"use client";

// The Song Editor's note grid — two views over the same Note[] data:
//   - Piano roll (this file): click an empty cell to add a note (and hear
//     it), click an existing note to delete it. Ported verbatim from
//     views/editor.js's canvas — a React component instead of the vanilla
//     view's direct canvas-2d imperative code, since (unlike Play/Karaoke)
//     there is no continuous game loop here, just "redraw when the data
//     changes," which fits a plain effect far better than a mounted engine.
//   - Guitar tab (./TabRoll.tsx): one horizontal lane per string, fret
//     numbers on the notes, finger/color assignment, sequential keyboard
//     entry, drag, undo/redo, playback — its own file, since it's a
//     genuinely separate editing model (string+fret+finger, not pitch),
//     not just a different canvas draw routine. Only offered for fretted
//     instruments (INSTRUMENTS[...].strings.length > 0).
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { midiToName } from "@/shared/lib/note-math";
import { getVar } from "@/shared/lib/dom";
import { Synth } from "@/shared/lib/synth";
import { songDuration, type Song, type Note } from "@/entities/song/model/song-format";
import { INSTRUMENTS, type InstrumentDef } from "@/entities/instrument/model/data";
import { TabRoll } from "./TabRoll";
import styles from "./PianoRoll.module.css";

const ROW_H = 16, OCTAVES = 4, LOW = 36; // C2..C6
const ROWS = OCTAVES * 12;
const PX_PER_BEAT = 46;
const SNAP_OPTIONS: [string, string][] = [["1", "1 beat"], ["0.5", "½"], ["0.25", "¼"]];
const LEN_OPTIONS: [string, string][] = [["2", "2 beats"], ["1", "1 beat"], ["0.5", "½"], ["0.25", "¼"]];

export type EditLayer = "notes" | "voice";
type ViewMode = "roll" | "tab";

export function PianoRoll({ song, editLayer, onLayerChange, onNotesChange }: {
  song: Song;
  editLayer: EditLayer;
  onLayerChange: (layer: EditLayer) => void;
  onNotesChange: (layer: EditLayer, notes: Note[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snap, setSnap] = useState(0.5);
  const [noteLen, setNoteLen] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("roll");

  const instrumentNotes = song.notes;
  const voiceNotes = song.voice.notes;
  const activeNotes = editLayer === "voice" ? voiceNotes : instrumentNotes;

  const inst = (INSTRUMENTS as Record<string, InstrumentDef>)[song.instrument];
  const tabStrings = inst?.strings ?? [];
  const tabAvailable = tabStrings.length > 0;
  const mode: ViewMode = viewMode === "tab" && !tabAvailable ? "roll" : viewMode;

  useEffect(() => {
    if (mode !== "roll") return;
    const canvas = canvasRef.current;
    const c = canvas?.getContext("2d");
    if (!canvas || !c) return;
    const spb = 60 / (song.bpm || 90);
    const voiceEnd = voiceNotes.reduce((m, n) => Math.max(m, n.time + (n.dur || 0)), 0);
    const beats = Math.max(16, Math.ceil((Math.max(songDuration(song), voiceEnd) / spb) + 4));
    const w = beats * PX_PER_BEAT;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = w + "px";
    canvas.width = w * dpr; canvas.height = ROWS * ROW_H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = getVar("--highway"); c.fillRect(0, 0, w, ROWS * ROW_H);

    for (let r = 0; r < ROWS; r++) {
      const midi = LOW + ROWS - 1 - r;
      const pc = ((midi % 12) + 12) % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(pc);
      c.fillStyle = isBlack ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)";
      c.fillRect(0, r * ROW_H, w, ROW_H);
      if (pc === 0) {
        c.strokeStyle = getVar("--line"); c.beginPath(); c.moveTo(0, r * ROW_H); c.lineTo(w, r * ROW_H); c.stroke();
        c.fillStyle = getVar("--muted"); c.font = `9px ${getVar("--mono")}`; c.fillText(midiToName(midi).full, 2, r * ROW_H + 11);
      }
    }
    for (let b = 0; b <= beats; b++) {
      c.strokeStyle = b % 4 === 0 ? getVar("--line") : "rgba(255,255,255,0.04)";
      c.beginPath(); c.moveTo(b * PX_PER_BEAT, 0); c.lineTo(b * PX_PER_BEAT, ROWS * ROW_H); c.stroke();
    }

    const roundRect = (x: number, y: number, w2: number, h: number, r: number) => {
      r = Math.min(r, h / 2, w2 / 2);
      c.beginPath();
      c.moveTo(x + r, y); c.arcTo(x + w2, y, x + w2, y + h, r); c.arcTo(x + w2, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w2, y, r); c.closePath();
    };
    const yAtMidi = (m: number) => (LOW + ROWS - 1 - m) * ROW_H;
    const drawNotes = (notes: Note[], color: string, active: boolean) => {
      for (const n of notes) {
        const x = (n.time / spb) * PX_PER_BEAT, wRect = Math.max(8, (n.dur / spb) * PX_PER_BEAT);
        for (const m of n.midi) {
          if (m < LOW || m >= LOW + ROWS) continue;
          const y = yAtMidi(m);
          c.fillStyle = getVar(color);
          if (active) { c.globalAlpha = 1; roundRect(x + 1, y + 2, wRect - 2, ROW_H - 4, 4); c.fill(); }
          else { c.globalAlpha = 0.5; roundRect(x + 1, y + ROW_H / 2 - 2, wRect - 2, 4, 2); c.fill(); c.globalAlpha = 1; }
        }
      }
    };
    const voiceActive = editLayer === "voice";
    drawNotes(voiceActive ? instrumentNotes : voiceNotes, voiceActive ? "--accent" : "--accent-2", false);
    drawNotes(voiceActive ? voiceNotes : instrumentNotes, voiceActive ? "--accent-2" : "--accent", true);
  }, [song, instrumentNotes, voiceNotes, editLayer, mode]);

  function handleClick(e: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const midi = LOW + ROWS - 1 - Math.floor(y / ROW_H);
    const beat = x / PX_PER_BEAT;
    const spb = 60 / (song.bpm || 90);

    const hitIdx = activeNotes.findIndex((n) => n.midi.includes(midi) &&
      beat >= n.time / spb && beat <= (n.time + n.dur) / spb);
    if (hitIdx >= 0) {
      onNotesChange(editLayer, activeNotes.filter((_, i) => i !== hitIdx));
      return;
    }
    const snapped = Math.floor(beat / snap) * snap;
    const note: Note = { time: +(snapped * spb).toFixed(4), dur: +(noteLen * spb * 0.92).toFixed(4), midi: [midi] };
    onNotesChange(editLayer, [...activeNotes, note]);
    Synth.playMidi(midi, { dur: 0.3, instrument: song.instrument });
  }

  return (
    <div>
      <div className={styles.controls}>
        <span className={styles.muted}>Editing:</span>
        <div className={styles.pillRow}>
          <span className={`${styles.pill} ${editLayer === "notes" ? styles.active : ""}`}
            title="Edit the instrument melody" onClick={() => onLayerChange("notes")}>Instrument</span>
          <span className={`${styles.pill} ${editLayer === "voice" ? styles.active : ""}`}
            title="Edit the karaoke vocal melody" onClick={() => onLayerChange("voice")}>Vocal</span>
        </div>
        {tabAvailable && (
          <>
            <span className={styles.muted}>View:</span>
            <div className={styles.pillRow}>
              <span className={`${styles.pill} ${mode === "roll" ? styles.active : ""}`}
                onClick={() => setViewMode("roll")}>Piano roll</span>
              <span className={`${styles.pill} ${mode === "tab" ? styles.active : ""}`}
                onClick={() => setViewMode("tab")}>Guitar tab</span>
            </div>
          </>
        )}
        <label className={styles.field}>
          <span>Snap</span>
          <select value={String(snap)} onChange={(e) => setSnap(+e.target.value)}>
            {SNAP_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>New note length</span>
          <select value={String(noteLen)} onChange={(e) => setNoteLen(+e.target.value)}>
            {LEN_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <div style={{ flex: 1 }} />
        <button className="btn ghost" onClick={() => onNotesChange(editLayer, [])}>Clear layer</button>
      </div>
      {mode === "tab" ? (
        <TabRoll
          editLayer={editLayer}
          notes={activeNotes}
          onChange={(next) => onNotesChange(editLayer, next)}
          bpm={song.bpm || 90}
          instrument={song.instrument}
          tabStrings={tabStrings}
          frets={inst?.frets ?? 24}
          snap={snap}
          noteLen={noteLen}
        />
      ) : (
        <div className={styles.rollWrap}>
          <div className={styles.scroller}>
            <canvas ref={canvasRef} height={ROWS * ROW_H} onClick={handleClick} className={styles.canvas} />
          </div>
        </div>
      )}
    </div>
  );
}
