"use client";

// Guitar tab editor for the Song Editor's Piano roll — requested by name,
// "как в Yousician", with a reference screenshot: one horizontal lane per
// string (high string on top, low on bottom, matching printed tab), fret
// numbers drawn on the notes, colored by fretting-hand finger, laid down
// fast via click, drag, or a sequential keyboard-typing mode, with
// undo/redo and a lightweight playback preview.
//
// This is a genuinely different editing model from the piano roll (pitch
// rows) — string + fret + finger, with a stable per-note id for selection/
// drag/undo — so it's its own file/component rather than another branch in
// PianoRoll.tsx's draw effect (which is what it was before this pass; see
// Design.md for the "one pitch can live on more than one string" problem
// that `Note.str` already exists to solve, and why this rewrite needed it
// to also carry `Note.id`/`Note.finger`).
//
// Deliberately trimmed vs. the full brief this was built from: no
// multi-select (shift/ctrl-click, marquee) or bulk edit, no velocity or
// playing techniques (hammer-on/pull-off/slide/bend/vibrato/mute — the
// schema's own `technique` idea), no two-digit keyboard fret entry (frets
// 10+ go through the Inspector, the scroll wheel, or arrow-key nudging), no
// separate minimalist "Play mode" screen (Play/Pause/Stop + the playhead
// live in this same view instead), and playback here is a preview — it
// schedules Synth.playMidi one-shots against a rAF clock, not the
// sample-accurate AudioContext scheduling Play/Karaoke's engines use, which
// would be a lot of machinery to duplicate for an editor scrub tool.
import {
  useCallback, useEffect, useMemo, useRef, useState,
  type KeyboardEvent, type PointerEvent,
} from "react";
import { getVar, toast } from "@/shared/lib/dom";
import { Synth } from "@/shared/lib/synth";
import { getSettings } from "@/shared/lib/player-settings";
import { uid, type Note, type Finger } from "@/entities/song/model/song-format";
import { midiToFret, stringLabel } from "@/entities/instrument/model/data";
import { parseTabEntry, tabEntryFromNotes } from "@/shared/lib/tab-entry";
import { asciiTabToNotes } from "@/shared/lib/ascii-tab";
import { fingerColor } from "@/shared/lib/finger-colors";
import { FingerLegend } from "@/widgets/app-shell/ui/FingerLegend";
import type { EditLayer } from "./PianoRoll";
import styles from "./TabRoll.module.css";

const PX_PER_BEAT = 46;
const ROW_H = 40;

// Short pill labels for this editor's compact finger picker — the sidebar's
// FingerLegend shows the full names (Index/Middle/Ring/Pinky/Thumb); colors
// for both come from shared/lib/finger-colors.ts, not duplicated here.
const FINGERS: { id: Finger; label: string }[] = [
  { id: null, label: "None" },
  { id: 1, label: "1" },
  { id: 2, label: "2" },
  { id: 3, label: "3" },
  { id: 4, label: "4" },
  { id: "T", label: "T" },
];

interface Cursor { beat: number; str: number; }
interface DragState { id: string; startClientX: number; startClientY: number; origFret: number; moved: boolean; origNotes: Note[]; }

export function TabRoll({ editLayer, notes, onChange, bpm, instrument, tabStrings, frets, snap, noteLen }: {
  editLayer: EditLayer;
  notes: Note[];
  onChange: (notes: Note[]) => void;
  bpm: number;
  instrument: string;
  tabStrings: number[];
  frets: number;
  snap: number;
  noteLen: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const historyRef = useRef<Record<EditLayer, Note[][]>>({ notes: [], voice: [] });
  const redoRef = useRef<Record<EditLayer, Note[][]>>({ notes: [], voice: [] });
  const timersRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const playStartRef = useRef<{ perfStart: number; beatStart: number; rate: number } | null>(null);
  const pausedBeatRef = useRef(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sequential, setSequential] = useState(false);
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [currentFinger, setCurrentFinger] = useState<Finger>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [redoAvailable, setRedoAvailable] = useState(false);
  const [quickText, setQuickText] = useState("");

  // Reset selection/cursor when the edited layer (Instrument vs. Vocal)
  // changes out from under us — their ids belong to the other layer's
  // array. React's sanctioned "adjust state when a prop changes" pattern
  // (setState during render, guarded) — kept to state reads only (not
  // refs): this project's lint config treats reading `ref.current` during
  // render as an error, stricter than the plain React docs pattern.
  const [prevLayer, setPrevLayer] = useState(editLayer);
  if (prevLayer !== editLayer) {
    setPrevLayer(editLayer);
    if (selectedId !== null) setSelectedId(null);
    if (cursor !== null) setCursor(null);
  }

  // historyRef/redoRef (below) hold the real undo/redo stacks per layer;
  // undoAvailable/redoAvailable mirror their current-layer lengths into
  // state purely so the toolbar's disabled= can read them without touching
  // a ref during render (same lint constraint as above). Kept in sync from
  // event handlers (pushUndoPoint/undo/redo) and this layer-switch effect.
  useEffect(() => {
    setUndoAvailable(historyRef.current[editLayer].length > 0);
    setRedoAvailable(redoRef.current[editLayer].length > 0);
  }, [editLayer]);

  const spb = 60 / bpm;
  const rows = tabStrings.length;
  const beats = useMemo(() => {
    const end = notes.reduce((m, n) => Math.max(m, n.time + n.dur), 0);
    return Math.max(16, Math.ceil(end / spb + 4));
  }, [notes, spb]);
  const gridWidth = beats * PX_PER_BEAT;

  const stringFor = useCallback((n: Note, midi: number): number | null => {
    if (n.str != null && n.midi.length === 1) return n.str;
    return midiToFret(midi, instrument, tabStrings)?.string ?? null;
  }, [instrument, tabStrings]);

  const selectedNote = selectedId ? notes.find((n) => n.id === selectedId) ?? null : null;

  const pushUndoPoint = useCallback((prev: Note[]) => {
    const h = historyRef.current[editLayer];
    h.push(prev);
    if (h.length > 100) h.shift();
    redoRef.current[editLayer] = [];
    setUndoAvailable(true);
    setRedoAvailable(false);
  }, [editLayer]);
  const commit = useCallback((next: Note[]) => {
    pushUndoPoint(notes);
    onChange(next);
  }, [notes, onChange, pushUndoPoint]);
  function undo() {
    const h = historyRef.current[editLayer];
    if (!h.length) return;
    const prev = h.pop()!;
    redoRef.current[editLayer].push(notes);
    onChange(prev);
    setSelectedId(null);
    setUndoAvailable(h.length > 0);
    setRedoAvailable(true);
  }
  function redo() {
    const r = redoRef.current[editLayer];
    if (!r.length) return;
    const next = r.pop()!;
    historyRef.current[editLayer].push(notes);
    onChange(next);
    setSelectedId(null);
    setRedoAvailable(r.length > 0);
    setUndoAvailable(true);
  }

  function adoptId(n: Note): string {
    if (n.id) return n.id;
    const id = uid();
    onChange(notes.map((x) => (x === n ? { ...x, id } : x)));
    return id;
  }

  // ---------- playback preview ----------
  function stopTimers() {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }
  function endBeat(): number {
    const end = notes.reduce((m, n) => Math.max(m, n.time + n.dur), 0);
    return end / spb + 1;
  }
  function setPlayheadX(beat: number) {
    const el = playheadRef.current;
    if (el) el.style.transform = `translateX(${beat * PX_PER_BEAT}px)`;
    const scroller = scrollerRef.current;
    if (scroller) {
      const x = beat * PX_PER_BEAT;
      if (x < scroller.scrollLeft || x > scroller.scrollLeft + scroller.clientWidth - 80) {
        scroller.scrollLeft = Math.max(0, x - 80);
      }
    }
  }
  function currentBeat(): number {
    const st = playStartRef.current;
    if (!st) return pausedBeatRef.current;
    const elapsedSec = (performance.now() - st.perfStart) / 1000;
    return st.beatStart + (elapsedSec * st.rate) / spb;
  }
  function play(fromBeat = pausedBeatRef.current, rateNow = rate) {
    stopTimers();
    const startTimeSec = fromBeat * spb;
    const perfStart = performance.now();
    playStartRef.current = { perfStart, beatStart: fromBeat, rate: rateNow };
    for (const n of notes) {
      if (n.time < startTimeSec - 0.001) continue;
      const delay = Math.max(0, ((n.time - startTimeSec) * 1000) / rateNow);
      const id = window.setTimeout(() => {
        n.midi.forEach((m) => Synth.playMidi(m, { dur: Math.max(0.1, n.dur / rateNow), instrument }));
      }, delay);
      timersRef.current.push(id);
    }
    setPlaying(true);
    const limit = endBeat();
    const tick = () => {
      if (!playStartRef.current) return;
      const beat = currentBeat();
      setPlayheadX(beat);
      if (beat >= limit) { stop(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }
  function pause() {
    pausedBeatRef.current = currentBeat();
    stopTimers();
    playStartRef.current = null;
    setPlaying(false);
  }
  function stop() {
    stopTimers();
    playStartRef.current = null;
    pausedBeatRef.current = 0;
    setPlaying(false);
    setPlayheadX(0);
  }
  function togglePlay() {
    if (playing) pause(); else play(pausedBeatRef.current, rate);
  }
  function changeRate(next: number) {
    if (playing) {
      const atBeat = currentBeat();
      setRate(next);
      play(atBeat, next);
    } else {
      setRate(next);
    }
  }
  useEffect(() => () => stopTimers(), []);

  // ---------- shared edit helpers (keyboard + inspector both call these) ----------
  function setFretOf(id: string, fret: number) {
    const idx = notes.findIndex((n) => n.id === id);
    if (idx < 0) return;
    const n = notes[idx];
    if (n.midi.length !== 1) return;
    const strIdx = n.str ?? stringFor(n, n.midi[0]);
    if (strIdx == null) return;
    const clamped = Math.min(frets, Math.max(0, Math.round(fret)));
    commit(notes.map((x, i) => (i === idx ? { ...x, midi: [tabStrings[strIdx] + clamped], str: strIdx } : x)));
    Synth.playMidi(tabStrings[strIdx] + clamped, { dur: 0.2, instrument });
  }
  function setStringIdx(id: string, strIdx: number) {
    const idx = notes.findIndex((n) => n.id === id);
    if (idx < 0) return;
    const n = notes[idx];
    if (n.midi.length !== 1) return;
    const curStr = n.str ?? stringFor(n, n.midi[0]) ?? strIdx;
    const fret = Math.min(frets, Math.max(0, n.midi[0] - tabStrings[curStr]));
    commit(notes.map((x, i) => (i === idx ? { ...x, midi: [tabStrings[strIdx] + fret], str: strIdx } : x)));
  }
  function setTimeBeats(id: string, beatsVal: number) {
    commit(notes.map((n) => (n.id === id ? { ...n, time: Math.max(0, +(beatsVal * spb).toFixed(4)) } : n)));
  }
  function setDurBeats(id: string, beatsVal: number) {
    commit(notes.map((n) => (n.id === id ? { ...n, dur: Math.max(0.05, +(beatsVal * spb).toFixed(4)) } : n)));
  }
  function setFingerOf(id: string, finger: Finger) {
    commit(notes.map((n) => (n.id === id ? { ...n, finger } : n)));
  }
  function deleteSelected() {
    if (!selectedId) return;
    commit(notes.filter((n) => n.id !== selectedId));
    setSelectedId(null);
  }
  function duplicateSelected() {
    if (!selectedId) return;
    const n = notes.find((x) => x.id === selectedId);
    if (!n) return;
    const clone: Note = { ...n, id: uid(), time: +(n.time + snap * spb).toFixed(4) };
    commit([...notes, clone]);
    setSelectedId(clone.id!);
  }
  function nudgeTime(deltaBeats: number) {
    if (!selectedId) return;
    commit(notes.map((n) => (n.id === selectedId ? { ...n, time: Math.max(0, +(n.time + deltaBeats * spb).toFixed(4)) } : n)));
  }
  function nudgeString(deltaRows: number) {
    if (!selectedId) return;
    const n = notes.find((x) => x.id === selectedId);
    if (!n || n.midi.length !== 1) return;
    const strIdx = n.str ?? stringFor(n, n.midi[0]);
    if (strIdx == null) return;
    const nextStr = Math.min(rows - 1, Math.max(0, strIdx + deltaRows));
    if (nextStr === strIdx) return;
    const fret = n.midi[0] - tabStrings[strIdx];
    commit(notes.map((x) => (x.id === selectedId ? { ...x, midi: [tabStrings[nextStr] + fret], str: nextStr } : x)));
  }
  function moveCursor(deltaBeat: number, deltaStr: number) {
    setCursor((c) => (c && { beat: Math.max(0, c.beat + deltaBeat), str: Math.min(rows - 1, Math.max(0, c.str + deltaStr)) }));
  }
  function sequentialCreate(digit: number) {
    if (!cursor) return;
    const midi = tabStrings[cursor.str] + digit;
    const note: Note = {
      id: uid(), time: +(cursor.beat * spb).toFixed(4), dur: +(noteLen * spb * 0.92).toFixed(4),
      midi: [midi], str: cursor.str, finger: currentFinger,
    };
    commit([...notes, note]);
    Synth.playMidi(midi, { dur: 0.2, instrument });
    setCursor({ beat: cursor.beat + snap, str: cursor.str });
  }
  function toggleSequential() {
    const next = !sequential;
    setSequential(next);
    if (next && !cursor) setCursor({ beat: 0, str: 0 });
  }

  // ---------- quick entry (string:fret:beats text, e.g. "1:5:1 1:0:1") ----------
  function applyQuickEntry() {
    try {
      const parsed = parseTabEntry(bpm, quickText, tabStrings);
      commit(parsed);
      setSelectedId(null);
      toast(`Quick entry: replaced with ${parsed.length} note(s)`, "good");
    } catch (e) {
      toast("Quick entry: " + (e instanceof Error ? e.message : String(e)), "bad");
    }
  }
  function quickEntryFromTab() {
    setQuickText(tabEntryFromNotes(notes, bpm, instrument, tabStrings));
  }

  // ---------- ASCII tab paste import (a second import path, via a dialog
  // rather than a file — same window.prompt() pattern EditorPage's own
  // "Paste LRC" button already uses) ----------
  function pasteAsciiTab() {
    const text = window.prompt(
      "Paste ASCII tab — one line per string, high string first, e.g.:\n\n" +
      "e|--5--0--5--0--5--4--4--|\nB|------------------------|\nG|------------------------|\n" +
      "D|------------------------|\nA|------------------------|\nE|------------------------|",
    );
    if (text == null) return;
    try {
      const parsed = asciiTabToNotes(text, tabStrings, bpm);
      commit(parsed);
      setSelectedId(null);
      toast(`Pasted ${parsed.length} note(s) from ASCII tab`, "good");
    } catch (e) {
      toast("ASCII tab: " + (e instanceof Error ? e.message : String(e)), "bad");
    }
  }

  // ---------- pointer interaction (click to add/select, drag to move) ----------
  const posFromEvent = useCallback((e: { clientX: number; clientY: number }): { beat: number; row: number; strIdx: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const row = Math.floor(y / ROW_H);
    if (row < 0 || row >= rows) return null;
    return { beat: Math.max(0, x / PX_PER_BEAT), row, strIdx: rows - 1 - row };
  }, [rows]);

  function handlePointerDown(e: PointerEvent<HTMLCanvasElement>) {
    wrapperRef.current?.focus();
    const pos = posFromEvent(e);
    if (!pos) return;
    const idx = notes.findIndex((n) => pos.beat >= n.time / spb && pos.beat <= (n.time + n.dur) / spb &&
      n.midi.some((m) => stringFor(n, m) === pos.strIdx));
    if (idx >= 0) {
      const n = notes[idx];
      const id = adoptId(n);
      setSelectedId(id);
      if (n.midi.length === 1) {
        const strIdx = n.str ?? stringFor(n, n.midi[0]) ?? pos.strIdx;
        dragRef.current = { id, startClientX: e.clientX, startClientY: e.clientY, origFret: n.midi[0] - tabStrings[strIdx], moved: false, origNotes: notes };
        canvasRef.current?.setPointerCapture(e.pointerId);
      }
      return;
    }
    const snapped = Math.floor(pos.beat / snap) * snap;
    const midi = tabStrings[pos.strIdx];
    const note: Note = {
      id: uid(), time: +(snapped * spb).toFixed(4), dur: +(noteLen * spb * 0.92).toFixed(4),
      midi: [midi], str: pos.strIdx, finger: currentFinger,
    };
    commit([...notes, note]);
    setSelectedId(note.id!);
    Synth.playMidi(midi, { dur: 0.3, instrument });
    if (sequential) setCursor({ beat: snapped + snap, str: pos.strIdx });
  }

  function handlePointerMove(e: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startClientX, dy = e.clientY - drag.startClientY;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    const pos = posFromEvent(e);
    if (!pos) return;
    const snapped = Math.max(0, Math.floor(pos.beat / snap) * snap);
    const nextFret = Math.min(frets, Math.max(0, drag.origFret));
    const nextMidi = tabStrings[pos.strIdx] + nextFret;
    onChange(notes.map((n) => (n.id === drag.id ? { ...n, time: +(snapped * spb).toFixed(4), midi: [nextMidi], str: pos.strIdx } : n)));
  }
  function handlePointerUp() {
    const drag = dragRef.current;
    if (drag?.moved) pushUndoPoint(drag.origNotes);
    dragRef.current = null;
  }

  // Scrolling to change a note's fret needs a *native* (non-passive)
  // listener — React attaches its synthetic onWheel at the root as passive
  // for scroll perf, so calling preventDefault() from a plain onWheel prop
  // is silently ignored there and the page scrolls underneath the editor
  // right along with it (the reported bug: hovering a note and scrolling
  // still moved the whole page). Attaching directly to the canvas with
  // { passive: false } is the only way preventDefault actually sticks.
  // Vertical wheel motion (a mouse wheel, or a trackpad scroll) is always
  // captured here so it can never leak to the page, whether or not it
  // lands on a note; a mostly-horizontal gesture (trackpad swipe / shift+
  // wheel) is left alone so it can still pan the timeline via the
  // scroller's own overflow-x.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function onWheelNative(e: globalThis.WheelEvent) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      const pos = posFromEvent(e);
      if (!pos) return;
      const idx = notes.findIndex((n) => n.midi.length === 1 && pos.beat >= n.time / spb && pos.beat <= (n.time + n.dur) / spb &&
        stringFor(n, n.midi[0]) === pos.strIdx);
      if (idx < 0) return;
      const n = notes[idx];
      const strIdx = n.str ?? pos.strIdx;
      const curFret = n.midi[0] - tabStrings[strIdx];
      const nextFret = Math.min(frets, Math.max(0, curFret + (e.deltaY < 0 ? 1 : -1)));
      if (nextFret === curFret) return;
      commit(notes.map((x, i) => (i === idx ? { ...x, midi: [tabStrings[strIdx] + nextFret], str: strIdx } : x)));
      Synth.playMidi(tabStrings[strIdx] + nextFret, { dur: 0.2, instrument });
    }
    canvas.addEventListener("wheel", onWheelNative, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheelNative);
  }, [notes, tabStrings, frets, spb, instrument, stringFor, commit, posFromEvent]);

  // ---------- keyboard ----------
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
    if (e.key === " ") { e.preventDefault(); togglePlay(); return; }
    if (e.key === "Escape") { setSelectedId(null); return; }
    if (selectedId && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); deleteSelected(); return; }
    if (selectedId && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); return; }
    if (/^[0-9]$/.test(e.key)) {
      const digit = +e.key;
      if (selectedId) { setFretOf(selectedId, digit); return; }
      if (sequential && cursor) { e.preventDefault(); sequentialCreate(digit); return; }
      if (digit >= 1 && digit <= 4) { setCurrentFinger(digit as Finger); return; }
      if (digit === 0) { setCurrentFinger(null); return; }
      return;
    }
    if (!selectedId && e.key.toLowerCase() === "t") { setCurrentFinger("T"); return; }
    if (selectedId) {
      if (e.key === "ArrowLeft") { e.preventDefault(); nudgeTime(-snap); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); nudgeTime(snap); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); nudgeString(1); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); nudgeString(-1); return; }
    } else if (sequential && cursor) {
      if (e.key === "ArrowLeft") { e.preventDefault(); moveCursor(-snap, 0); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); moveCursor(snap, 0); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); moveCursor(0, 1); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); moveCursor(0, -1); return; }
    }
  }

  // ---------- draw ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    const c = canvas?.getContext("2d");
    if (!canvas || !c || rows === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = gridWidth + "px";
    canvas.width = gridWidth * dpr; canvas.height = rows * ROW_H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = getVar("--highway"); c.fillRect(0, 0, gridWidth, rows * ROW_H);

    for (let b = 0; b <= beats; b++) {
      const isBar = b % 4 === 0;
      c.strokeStyle = isBar ? getVar("--line") : "rgba(255,255,255,0.04)";
      c.beginPath(); c.moveTo(b * PX_PER_BEAT, 0); c.lineTo(b * PX_PER_BEAT, rows * ROW_H); c.stroke();
      if (isBar) {
        c.fillStyle = getVar("--muted"); c.font = `10px ${getVar("--mono")}`;
        c.fillText(String(b / 4 + 1), b * PX_PER_BEAT + 3, 11);
      }
    }
    const labelStyle = getSettings().stringLabels;
    for (let r = 0; r < rows; r++) {
      const y = r * ROW_H + ROW_H / 2;
      c.strokeStyle = getVar("--line");
      c.beginPath(); c.moveTo(0, y); c.lineTo(gridWidth, y); c.stroke();
      c.fillStyle = getVar("--muted"); c.font = `11px ${getVar("--mono")}`;
      c.fillText(stringLabel(instrument, tabStrings, rows - 1 - r, labelStyle), 4, r * ROW_H + ROW_H - 8);
    }

    const roundRect = (x: number, y: number, w2: number, h: number, r: number) => {
      r = Math.min(r, h / 2, w2 / 2);
      c.beginPath();
      c.moveTo(x + r, y); c.arcTo(x + w2, y, x + w2, y + h, r); c.arcTo(x + w2, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w2, y, r); c.closePath();
    };
    for (const n of notes) {
      const x = (n.time / spb) * PX_PER_BEAT, wRect = Math.max(26, (n.dur / spb) * PX_PER_BEAT);
      for (const m of n.midi) {
        const strIdx = n.str != null && n.midi.length === 1 ? n.str : stringFor(n, m);
        if (strIdx == null) continue;
        const fret = m - tabStrings[strIdx];
        if (fret < 0 || fret > frets) continue;
        const r = rows - 1 - strIdx;
        const y = r * ROW_H;
        c.fillStyle = fingerColor(n.finger);
        roundRect(x + 1, y + 4, wRect - 2, ROW_H - 8, 7); c.fill();
        if (n.id && n.id === selectedId) {
          c.lineWidth = 2; c.strokeStyle = getVar("--text");
          roundRect(x + 1, y + 4, wRect - 2, ROW_H - 8, 7); c.stroke();
        }
        c.fillStyle = "#0b0f1a"; c.font = `bold ${Math.floor(ROW_H * 0.42)}px ${getVar("--mono")}`;
        c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(String(fret), x + wRect / 2 + 1, y + ROW_H / 2 + 1);
        c.textAlign = "left"; c.textBaseline = "alphabetic";
      }
    }
    if (sequential && cursor) {
      const x = cursor.beat * PX_PER_BEAT;
      const r = rows - 1 - cursor.str;
      c.strokeStyle = getVar("--accent"); c.lineWidth = 2;
      c.strokeRect(x + 1, r * ROW_H + 3, Math.max(20, noteLen * PX_PER_BEAT) - 2, ROW_H - 6);
    }
  }, [notes, tabStrings, rows, beats, gridWidth, spb, instrument, selectedId, sequential, cursor, frets, noteLen, stringFor]);

  const labelStyleNow = getSettings().stringLabels;

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.pillRow}>
          <span className={`${styles.pill} ${sequential ? styles.active : ""}`}
            title="Type digit keys 0-9 to place frets on the armed string and auto-advance"
            onClick={toggleSequential}>Sequential input</span>
        </div>
        <span className={styles.muted}>Finger:</span>
        <div className={styles.pillRow}>
          {FINGERS.map((f) => (
            <span key={String(f.id)}
              className={`${styles.pill} ${currentFinger === f.id ? styles.active : ""}`}
              style={currentFinger === f.id ? { background: fingerColor(f.id), borderColor: fingerColor(f.id), color: "#0b0f1a" } : { borderColor: fingerColor(f.id) }}
              onClick={() => setCurrentFinger(f.id)}>{f.label}</span>
          ))}
        </div>
        <FingerLegend />
        <div style={{ flex: 1 }} />
        <button className="btn ghost" onClick={undo} disabled={!undoAvailable} title="Ctrl/Cmd+Z">↺ Undo</button>
        <button className="btn ghost" onClick={redo} disabled={!redoAvailable} title="Ctrl/Cmd+Shift+Z">↻ Redo</button>
        <label className={styles.speedField} title="Preview playback speed — doesn't affect the song itself">
          <span>Speed</span>
          <input
            className={styles.speedRange}
            type="range"
            min={0.1}
            max={2}
            step={0.05}
            value={rate}
            onChange={(e) => changeRate(+e.target.value)}
          />
          <span className={styles.speedValue}>{rate.toFixed(2)}x</span>
        </label>
        <button className="btn" onClick={togglePlay}>{playing ? "⏸ Pause" : "▶ Play"}</button>
        <button className="btn ghost" onClick={stop}>⏹ Stop</button>
      </div>
      <div className={styles.quickEntry}>
        <span className={styles.muted}>Quick entry</span>
        <input
          className={styles.quickInput}
          value={quickText}
          onChange={(e) => setQuickText(e.target.value)}
          placeholder="1:5:1 1:0:1 1:5:1 1:0:1 1:5:1 1:4:1 1:4:1  (string:fret:beats)"
          onKeyDown={(e) => { if (e.key === "Enter") applyQuickEntry(); }}
        />
        <button className="btn ghost" onClick={quickEntryFromTab}>⇣ From tab</button>
        <button className="btn primary" onClick={applyQuickEntry}>Apply</button>
        <button className="btn ghost" onClick={pasteAsciiTab}>📋 Paste ASCII tab</button>
      </div>
      <p className={styles.hint}>
        Quick entry types a whole line as text — <code>string:fret:beats</code> tokens, string 1 is
        the highest-pitched string. Apply replaces every note on this layer with what&apos;s typed;
        From tab fills the box with the layer&apos;s current notes so you can edit them as text. Paste
        ASCII tab reads the classic <code>e|--5--0--|</code>-style block from a dialog — one line per
        string, top = highest string — and replaces this layer with it; the number of lines must match
        this instrument&apos;s string count.
      </p>
      <p className={styles.hint}>
        Click an empty spot to add an open-string note; click a placed note to select it (drag to move it —
        left/right changes timing, up/down changes string, the fret comes along unchanged). Scroll on a note, or
        type a digit while it&apos;s selected, to change its fret. Delete removes the selection, D duplicates it,
        arrows nudge it, Escape clears it, Ctrl/Cmd+Z undoes. With nothing selected, digits 1-4 (and T) arm a
        finger for new notes. Turn on Sequential input and type digits to lay a whole line down without touching
        the mouse — arrows move the cursor, each digit places a note and advances it. Click inside this area
        first so keyboard shortcuts have somewhere to go.
      </p>
      <div className={styles.stageRow}>
        <div className={styles.stage} ref={wrapperRef} tabIndex={0} onKeyDown={handleKeyDown}>
          <div className={styles.scroller} ref={scrollerRef}>
            <div className={styles.canvasWrap} style={{ width: gridWidth }}>
              <canvas
                ref={canvasRef}
                height={rows * ROW_H}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={styles.canvas}
              />
              <div ref={playheadRef} className={styles.playhead} />
            </div>
          </div>
        </div>
        <div className={styles.inspector}>
          {selectedNote ? (
            <>
              <div className={styles.inspectorTitle}>Note</div>
              <label className={styles.field}>
                <span>Time (beat)</span>
                <input type="number" step={0.25} value={+(selectedNote.time / spb).toFixed(3)}
                  onChange={(e) => setTimeBeats(selectedNote.id!, +e.target.value)} />
              </label>
              {selectedNote.midi.length === 1 ? (
                <>
                  <label className={styles.field}>
                    <span>String</span>
                    <select value={selectedNote.str ?? stringFor(selectedNote, selectedNote.midi[0]) ?? 0}
                      onChange={(e) => setStringIdx(selectedNote.id!, +e.target.value)}>
                      {[...tabStrings].map((_, i) => i).sort((a, b) => b - a).map((i) => (
                        <option key={i} value={i}>{stringLabel(instrument, tabStrings, i, labelStyleNow)}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Fret</span>
                    <input type="number" min={0} max={frets}
                      value={selectedNote.midi[0] - tabStrings[selectedNote.str ?? stringFor(selectedNote, selectedNote.midi[0]) ?? 0]}
                      onChange={(e) => setFretOf(selectedNote.id!, +e.target.value)} />
                  </label>
                </>
              ) : (
                <p className={styles.hint}>Chord note (from notation/the piano roll) — string/fret aren&apos;t
                  editable here; use those views, or Delete and re-add it as a single-string tab note.</p>
              )}
              <label className={styles.field}>
                <span>Duration (beats)</span>
                <input type="number" step={0.25} min={0.1} value={+(selectedNote.dur / spb).toFixed(3)}
                  onChange={(e) => setDurBeats(selectedNote.id!, +e.target.value)} />
              </label>
              <div className={styles.field}>
                <span>Finger</span>
                <div className={styles.pillRow}>
                  {FINGERS.map((f) => (
                    <span key={String(f.id)}
                      className={`${styles.pill} ${(selectedNote.finger ?? null) === f.id ? styles.active : ""}`}
                      style={(selectedNote.finger ?? null) === f.id ? { background: fingerColor(f.id), borderColor: fingerColor(f.id), color: "#0b0f1a" } : { borderColor: fingerColor(f.id) }}
                      onClick={() => setFingerOf(selectedNote.id!, f.id)}>{f.label}</span>
                  ))}
                </div>
              </div>
              <div className={styles.row}>
                <button className="btn ghost" onClick={duplicateSelected}>Duplicate</button>
                <button className="btn ghost" onClick={deleteSelected}>Delete</button>
              </div>
            </>
          ) : (
            <p className={styles.hint}>Select a note to edit its time, string, fret, duration, or finger — or
              click an empty spot on the grid to add one.</p>
          )}
        </div>
      </div>
    </div>
  );
}
