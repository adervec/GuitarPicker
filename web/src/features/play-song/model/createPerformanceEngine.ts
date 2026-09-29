// The Performance Mode engine — a second Play variant, requested by name
// ("второй вариант плеер в проигрывателе") from a 26-section brief modeled
// on Yousician: a guitar-tab note highway (string lanes + fret numbers +
// finger colors, same visual model TabRoll edits with) that scrolls right-
// to-left past a fixed playhead in sync with real audio playback, instead
// of the classic engine's pitch-row highway with live grading.
//
// Same imperative-engine shape as createPlayEngine.ts/createKaraokeEngine.ts
// (builds its own DOM + canvas + requestAnimationFrame loop; React just
// owns the mount point) for the same reason: this has a continuous
// real-time loop, so it's not "redraw when data changes" the way TabRoll's
// plain-React canvas is — see that file's own header comment for the
// distinction this pilot has drawn consistently.
//
// Selected via Settings ("Song player": New/Classic, shared/lib/
// player-settings.ts's `playerVersion`, default "new") — the classic engine
// is kept exactly as it was, untouched, not replaced; views/play/ui/
// PlayPage.tsx picks between the two (and always falls back to classic for
// non-fretted instruments, since this engine's whole model is string+fret).
//
// Deliberately scoped to the brief's own MVP list (§26): audio playback,
// synced timeline, string lanes, moving notes, playhead, fret + finger
// colors, active-note highlighting, chord grouping, duration, play/pause,
// seek, current time, fullscreen, speed (pitch-preserving — reuses
// TrackPlayer's existing `preservesPitch` support), loop, auto-scroll (the
// highway's motion *is* the auto-scroll; there's no manual-scroll state to
// reconcile, so "Return to Live" doesn't apply here). Also out for this
// pass: song sections (Intro/Verse/Chorus — no data model or authoring UI
// exists for this anywhere in the pilot, so there's nothing to show; adding
// it would mean designing that from scratch, a separate-sized task), and
// the strum-direction overlay (§11).
//
// A later pass ported the rest of the classic engine's control bar over —
// by request, a plain list of its button labels ("🎤 Karaoke 🎺 Band
// 🔊 Notes 🎸 Frets ⚙ L ☑ Repeat till right 🥁 Metronome ← Songs Full song
// 🔁 Loop ✕ 🎓 Learn") — reusing the exact same underlying modules the
// classic engine already uses for each (Band, autoAccompaniment,
// buildLyricTimeline/activeAt/lineFillHTML, createLearnMode), rather than
// reimplementing any of them. **☑ Repeat till right** stayed disabled at
// that point — a stage-2 exclusion (mic/MIDI performance detection) — and
// a further pass ("добавляем режим считывания нот как и в обычном
// приложении - Repeat till right", "Полная система как в Classic")
// removed that exclusion: live mic pitch detection, per-note grading
// (perfect/good/off/miss), health/score/streak/killfeed, and strict mode's
// freeze-rewind-wait-then-ramp-back-up behavior are all ported from the
// classic engine now — see the "grading" section below.
//
// **🎯 Free mode** ("Тренировка в своём темпе... где идёт ожидание след.
// ноты. Последовательно без автовоспроизведения") is a further mode built
// on top of that same wait mechanism rather than Classic's: strict mode's
// retry already freezes the clock and polls the mic for one note before
// resuming normal timed playback (`retry()`/`waitTick()`/`resolveWait()`
// below); Free mode just chains that same freeze-and-wait through *every*
// note from the start, with no clock-driven playback in between at all —
// no backing/vocal audio, no note-sound/metronome scheduling, no band. Mic
// only, by request — there's no manual "skip to next note" fallback, so a
// denied/unavailable mic simply can't make progress here (`ensureMic()`'s
// own toast is the only feedback). Health/score/streak/killfeed still run
// through the exact same `applyJudgment()` Repeat till right's own wait
// uses, by request — since that wait only ever resolves a note as
// perfect/good (never off/miss; a wrong pitch just keeps waiting, same as
// strict mode), Free mode's killfeed reads the same way: no penalties, just
// a quiet, ungraded-by-time practice pass. Mutually exclusive with Learn
// mode (disables each other's button) — Learn's segment/loop bounds are
// enforced by the normal clock-driven `tick()`, which Free mode never runs.
// Reused verbatim
// where the underlying mechanism doesn't care about strings/frets at all
// (`shared/lib/pitch.ts`'s `detectPitch`/`PitchTracker`, the same
// perfect/good/off/miss cents thresholds, the same health/score/streak
// formulas, the same `addHistory()` entry shape) — adapted only where this
// engine's own architecture genuinely differs from Classic's: notes are
// flattened per-pitch here (`flat`, for the string-lane highway) rather
// than grouped per-chord the way Classic's own `PlayNote[]` is, so grading
// uses its own grouped `gradeNotes` (keyed by the same `groupId` `flat`
// already carries) instead; audio timing here is a real audio-clock
// (`now()`, synced to `player.backing.currentTime` or an
// `AudioContext.currentTime`-anchored clock) rather than Classic's own
// per-frame-accumulated `clock += dt*effRate`, so the strict-mode tempo
// ramp works through a `effRate`/`setEffRate()` split mirroring Classic's
// own `rate`/`effRate` distinction, just re-anchored to this engine's
// clock model instead of accumulated per-frame.
import { el, slider, toast, fmtTime, getVar } from "@/shared/lib/dom";
import { audioEngine as Audio } from "@/shared/lib/audio-engine";
import { Synth } from "@/shared/lib/synth";
import { TrackPlayer } from "@/shared/lib/track-player";
import { Band } from "@/shared/lib/band";
import { autoAccompaniment } from "@/shared/lib/accompany";
import { buildLyricTimeline, activeAt } from "@/shared/lib/karaoke-timeline";
import { lineFillHTML } from "@/shared/lib/karaoke-render";
import { createTimeline } from "@/shared/lib/practice-timeline";
import { createLearnMode } from "@/features/learn-mode/model/createLearnMode";
import { songDuration, pickPart, type Note, type SongPart, type Finger } from "@/entities/song/model/song-format";
import { midiToFret, stringLabel, INSTRUMENTS, type InstrumentDef } from "@/entities/instrument/model/data";
import { fingerColor, FINGER_DEFS } from "@/shared/lib/finger-colors";
import { describeMidiSet } from "@/shared/lib/theory";
import { detectPitch, PitchTracker } from "@/shared/lib/pitch";
import { freqToMidiFloat } from "@/shared/lib/note-math";
import {
  roundRectPath, createNoteBlockElement, createChordTieElement,
  createStringLineElement, createGutterElement, createPlayheadElement,
  type NoteStatus,
} from "./highway-elements";
import type { EngineHost } from "@/shared/lib/player-settings";

/** Reserved for stage 2 — a note-by-note performance record, one per note
 *  event, meant for a richer post-song breakdown than the tallied
 *  perfect/good/off/miss `counts` this pass actually produces and logs via
 *  `addHistory()`. Nothing builds one of these yet. */
export interface NotePerformanceResult {
  noteId: string;
  result: "hit" | "missed" | "early" | "late" | "wrong-string" | "wrong-fret";
  timingOffset?: number;
  confidence?: number;
}

const HIT_PAD = 0.16;
const PERFECT_CENTS = 28;
const GOOD_CENTS = 60;
const RETRY_SLOW_FACTOR = 0.55;
const RETRY_RAMP_MS = 600;

type Grade = "perfect" | "good" | "off" | "miss";

interface GradeNote {
  time: number;
  dur: number;
  midi: number[];
  groupId: number;
  state: Grade | "pending";
  best: number;
  frames: number;
}

interface RetryPhase {
  from: number;
  until: number;
  rampUntil: number;
}

interface FlatNote {
  time: number;
  dur: number;
  midi: number;
  strIdx: number | null;
  finger: Finger | undefined;
  groupId: number;
}

const PLAYHEAD_FRAC = 0.32; // playhead x as a fraction of the note area's width — left-of-center, more room to see what's coming
const PX_PER_SEC = 130;
const GUTTER_W = 44; // fixed left string-label column, notes clip behind it as they exit
const TOP_HUD_RESERVE = 140; // keeps the highway clear of the absolutely-positioned .play-hud overlay — grew from 76 to fit the score/health row grading added

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Ported verbatim from the classic engine's own copies — same HUD markup,
// same grade thresholds, so the two engines' History entries and end-of-
// song banners read consistently.
function scoreHTML(score: number, health: number, streak: number, mult: number, acc = 100, failed = false): string {
  return `<div style="font-size:22px;font-weight:800">${score.toLocaleString()}</div>
    <div class="muted" style="font-size:12px">${acc}% · streak ${streak} · ×${mult}${failed ? ' · <span style="color:var(--bad)">FAILED</span>' : ""}</div>`;
}
function gradeLetter(acc: number, failed: boolean): string {
  if (failed) return "F";
  if (acc >= 97) return "S";
  if (acc >= 92) return "A";
  if (acc >= 82) return "B";
  if (acc >= 70) return "C";
  if (acc >= 60) return "D";
  return "F";
}
function miniStat(num: number | string, label: string): HTMLElement {
  return el("div.stat", {}, [el("div.num", { text: String(num) }), el("div.lbl", { text: label })]);
}

function fingerDefColor(id: (typeof FINGER_DEFS)[number]["id"]): string {
  return FINGER_DEFS.find((d) => d.id === id)?.color ?? "#8fa0c7";
}

// Same hand illustration as widgets/app-shell/ui/FingerLegend.tsx's
// FingerHandIcon — this engine builds its own DOM imperatively (see the
// file header), so it can't mount that React component; this is a plain
// SVG markup string instead, colored from the same shared/lib/
// finger-colors.ts source so the two can't drift apart.
function handIconSVG(size: number): string {
  const thumb = fingerDefColor("T"), index = fingerDefColor(1), middle = fingerDefColor(2),
    ring = fingerDefColor(3), pinky = fingerDefColor(4);
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 116" fill="none" aria-hidden="true">
    <rect x="8" y="70" width="15" height="36" rx="7.5" fill="${thumb}" stroke="#2a3142" stroke-width="2" transform="rotate(-38 15.5 88)"></rect>
    <rect x="18" y="58" width="64" height="50" rx="16" fill="${thumb}" stroke="#2a3142" stroke-width="2"></rect>
    <rect x="22" y="26" width="12" height="40" rx="6" fill="${index}" stroke="#2a3142" stroke-width="2"></rect>
    <rect x="38" y="10" width="12" height="56" rx="6" fill="${middle}" stroke="#2a3142" stroke-width="2"></rect>
    <rect x="54" y="18" width="12" height="48" rx="6" fill="${ring}" stroke="#2a3142" stroke-width="2"></rect>
    <rect x="70" y="32" width="11" height="34" rx="5.5" fill="${pinky}" stroke="#2a3142" stroke-width="2"></rect>
  </svg>`;
}

// String appearance, by request ("толщину струн... и цвета как реальные
// струны"): the low, wound strings are thick and bronze/copper, the high,
// plain strings are thin and silver — a single gradient across `index`
// (0 = lowest string) rather than a hard split, so it generalizes to any
// string count (4-string bass/ukulele included) instead of assuming "the
// bottom 3."
const STRING_COPPER: [number, number, number] = [192, 138, 78]; // low, wound strings
const STRING_SILVER: [number, number, number] = [226, 230, 238]; // high, plain strings
function stringTone(index: number, rows: number): number {
  return rows > 1 ? index / (rows - 1) : 0;
}
function stringColor(index: number, rows: number): string {
  const t = stringTone(index, rows);
  const [r, g, b] = STRING_COPPER.map((c0, i) => Math.round(c0 + (STRING_SILVER[i] - c0) * t));
  return `rgb(${r},${g},${b})`;
}
function stringThickness(index: number, rows: number): number {
  const t = stringTone(index, rows);
  return 5 - 3.2 * t; // 5px for the thickest wound low string down to 1.8px for the thinnest
}

// Same S/M/L scale factors as the classic engine's own fretboard-size
// control (createPlayEngine.ts's FRET_SCALE). Used for two independent
// things here: the main highway's own lane-height clamp (⚙ S/M/L,
// `fretSize`/`fretboardSize`), and the optional fretboard-diagram overlay
// below (🖐 S/M/L, `diagramSize`/`fretDiagramSize`) — same scale factors,
// separate state, so resizing one doesn't resize the other.
const FRET_SCALE: Record<string, number> = { S: 0.78, M: 1, L: 1.3 };

// Standard fretboard inlay positions (single dots, 12th doubled) — used
// both for the numeric labels below the diagram's neck and the actual
// inlay dots drawn on it. No 24: real necks mark up to 21 (sometimes a
// double dot at 24 on extended-range instruments, but that's the
// exception, not the convention this list should default to).
const FRET_MARKERS = [3, 5, 7, 9, 12, 15, 17, 19, 21];

export function createPerformanceEngine(root: HTMLElement, host: EngineHost): () => void {
  const { song } = host;
  const s = host.settings;
  const setSetting = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => { s[k] = v; host.setSetting(k, v); };
  const { parts, index: leadIdx, lead } = pickPart(song, s.instrument);
  const playInst = lead.instrument;
  const inst = (INSTRUMENTS as Record<string, InstrumentDef>)[playInst];
  const tabStrings = inst?.strings ?? [];
  const rows = Math.max(1, tabStrings.length);
  const duration = songDuration({ ...song, notes: lead.notes });
  const beatLen = 60 / (song.bpm || 90);

  const flat: FlatNote[] = [];
  lead.notes.forEach((n: Note, gi) => {
    n.midi.forEach((m) => {
      const strIdx = n.str != null && n.midi.length === 1 ? n.str : (midiToFret(m, playInst, tabStrings)?.string ?? null);
      flat.push({ time: n.time, dur: n.dur || 0.4, midi: m, strIdx, finger: n.finger, groupId: gi });
    });
  });
  flat.sort((a, b) => a.time - b.time);
  const chordGroupSize = new Map<number, number>();
  for (const n of flat) chordGroupSize.set(n.groupId, (chordGroupSize.get(n.groupId) ?? 0) + 1);

  // Grouped (not flattened) notes with fret positions, for the optional
  // fretboard-diagram overlay (`drawDiagram`, ported from the classic
  // engine's `drawFretboard`) — it needs one entry per note/chord, each
  // carrying every pitch's fret position, so it can plot every finger in a
  // chord at once rather than one pitch at a time like `flat`.
  const diagramNotes = lead.notes.map((n) => ({
    time: n.time, dur: n.dur || 0.4, midi: n.midi, finger: n.finger,
    frets: n.midi.map((m) => midiToFret(m, playInst, tabStrings)),
  })).sort((a, b) => a.time - b.time);

  // Grouped grading state — one entry per note/chord (`groupId` matches the
  // same field on `flat`'s per-pitch entries, letting the highway draw
  // color the right block by looking its parent note's grade up here),
  // mutable across a playthrough the same way Classic's own `PlayNote[]`
  // is: `state`/`best`/`frames` reset on restart/rewind, updated as pitch
  // detection matches (or fails to match) each note in turn.
  const gradeNotes: GradeNote[] = lead.notes.map((n, gi) => ({
    time: n.time, dur: n.dur || 0.4, midi: n.midi, groupId: gi,
    state: "pending", best: 999, frames: 0,
  }));
  gradeNotes.sort((a, b) => a.time - b.time);
  const gradeByGroup = new Map<number, GradeNote>();
  for (const gn of gradeNotes) gradeByGroup.set(gn.groupId, gn);
  // Same --j-* judgment colors the classic engine's own note/killfeed
  // coloring uses — resolved once (CSS vars don't change at runtime in
  // this dark-only pilot), not per note per frame.
  const judgmentColor: Record<Grade, string> = {
    perfect: getVar("--j-perfect"), good: getVar("--j-good"), off: getVar("--j-off"), miss: getVar("--j-miss"),
  };

  // ----- audio -----
  const player = new TrackPlayer();
  if (song.audio.backing || song.audio.vocal) player.load(song, s.backingVolume, s.vocalVolume);
  let rate = s.playbackSpeed || 1;
  player.setSpeed(rate);

  // Synthesized backing band — every part of the song that isn't the lead
  // instrument, plus a generated auto-accompaniment when the song doesn't
  // define any of its own. Same construction as the classic engine's;
  // `band.schedule(pos, rate)` is designed to be polled every frame (its
  // own doc comment), which fits this engine's rAF `tick()` loop directly.
  const bandParts: SongPart[] = parts.filter((_, i) => i !== leadIdx);
  bandParts.push(...autoAccompaniment({ ...song, notes: lead.notes, instrument: playInst }, parts));
  const band = new Band(bandParts, { a4: s.a4, volume: s.backingVolume });
  let bandOn = !band.empty && !player.backing && (s.band ?? true);

  // Karaoke word-by-word lyric overlay — same timeline/render helpers the
  // classic engine's own "🎤 Karaoke" toggle uses.
  const lyrics = (song.lyrics || []).slice().sort((a, b) => a.time - b.time);
  const lyricTimeline = lyrics.length ? buildLyricTimeline(song) : null;
  let karaokeLyrics = lyricTimeline ? (s.karaokeLyrics ?? true) : false;

  let noteSounds = s.noteSounds ?? true;
  const FRET_SIZE_ORDER = ["S", "M", "L"];
  let fretSize = FRET_SIZE_ORDER.includes(s.fretboardSize) ? s.fretboardSize : "M";
  // 🎸 Frets now toggles the fretboard-diagram overlay below (matching the
  // classic engine's own Frets button, which has always meant this — a
  // "where to put your fingers" diagram, not the inline fret numbers on the
  // highway, which are unconditional now, not a togglable extra).
  let showDiagram = s.showFingering ?? true;
  let diagramSize = FRET_SIZE_ORDER.includes(s.fretDiagramSize) ? s.fretDiagramSize : "M";

  let playing = false;
  let finished = false;
  let pausedTime = 0;
  let ctxStartTime = 0;
  let clockStartPos = 0;
  const timers: number[] = [];
  let rafId: number | null = null;
  let metroOn = false;
  let loopOn = false, loopStart: number | null = null, loopEnd: number | null = null;

  // ----- grading state (live mic pitch detection, strict mode) -----
  // `effRate` is the *actual* rate driving playback/the clock, separate
  // from `rate` (the user's own Speed-slider setting) — strict mode's
  // retry ramp slows `effRate` down temporarily and eases it back up
  // without disturbing the user's own chosen speed, same split as the
  // classic engine's `rate`/`effRate`.
  let effRate = rate;
  let strict = s.strictMode ?? false;
  // "🎯 Free mode" — see the file header. Chains the same wait mechanism
  // strict mode's `retry()` uses through the whole song, with no
  // clock-driven playback at all; `resolveWait()` branches on this instead
  // of resuming normal playback.
  let freeMode = s.freeMode ?? false;
  let retryPhase: RetryPhase | null = null;
  let waitingFor: GradeNote | null = null;
  let health = 100, failed = false;
  let score = 0, streak = 0, maxStreak = 0, mult = 1;
  const counts: Record<Grade, number> = { perfect: 0, good: 0, off: 0, miss: 0 };
  const tracker = new PitchTracker();
  const buf = new Float32Array(2048);
  let detectedMidi = -1;

  function clearTimers() { timers.forEach((id) => window.clearTimeout(id)); timers.length = 0; }

  function now(): number {
    if (!playing) return pausedTime;
    if (player.backing) return player.backing.currentTime;
    if (player.vocal) return player.vocal.currentTime;
    return clockStartPos + (Audio.ctx().currentTime - ctxStartTime) * effRate;
  }

  function scheduleAudio(fromPos: number) {
    clearTimers();
    if (noteSounds) {
      for (const n of flat) {
        if (n.time < fromPos - 0.001) continue;
        const delay = Math.max(0, ((n.time - fromPos) * 1000) / effRate);
        const id = window.setTimeout(() => {
          Synth.playMidi(n.midi, { dur: Math.max(0.12, n.dur / effRate), instrument: playInst, a4: s.a4 });
        }, delay);
        timers.push(id);
      }
    }
    if (metroOn && song.bpm) {
      const firstBeat = Math.max(0, Math.ceil(fromPos / beatLen));
      const lastBeat = Math.ceil(duration / beatLen) + 1;
      for (let b = firstBeat; b <= lastBeat; b++) {
        const t = b * beatLen;
        const delay = Math.max(0, ((t - fromPos) * 1000) / effRate);
        const id = window.setTimeout(() => Synth.click({ accent: b % 4 === 0 }), delay);
        timers.push(id);
      }
    }
    if (bandOn) band.seek(fromPos);
  }

  // Bounded, unlike the classic engine's own identical-looking helper —
  // `getUserMedia()`'s promise is only guaranteed to settle once the
  // browser actually shows the person a decision to make; if a permission
  // prompt is blocked, ignored, or never rendered at all (confirmed live:
  // the classic engine's own "▶ Start" hangs the exact same way in that
  // situation), the bare `await` blocks forever and Play never recovers.
  // A timeout turns "never settles" into the same graceful "no mic, play
  // anyway" fallback the `catch` below already handles for an explicit
  // denial, rather than a silently dead button.
  async function ensureMic(): Promise<boolean> {
    if (Audio.micLive()) return true;
    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), 8000));
      await Promise.race([Audio.startMic(s.inputDeviceId), timeout]);
      return true;
    } catch (e) {
      toast("Mic off — notes won't be graded. " + (e instanceof Error ? e.message : String(e)), "bad");
      return false;
    }
  }

  function readPitch() {
    if (!Audio.readTimeDomain(buf)) return;
    const { freq } = detectPitch(buf, Audio.ctx().sampleRate, s.micGate);
    const f = tracker.push(freq, s.a4);
    detectedMidi = f > 0 ? freqToMidiFloat(f, s.a4) : -1;
  }

  // ----- DOM shell (reuses .play-shell/.play-stage/.hud-box/.play-controls
  // /.timeline-wrap from app/play-engine.css — the same global stylesheet
  // the classic engine and Karaoke build their own DOM against) -----
  const shell = el("div.play-shell");
  const stage = el("div.play-stage");
  const canvas = el("canvas.perf-canvas") as HTMLCanvasElement;
  const lyricEl = el("div.lyric-line");
  const backBtn = el("button.btn.ghost", { onclick: host.onBack }, ["← Songs"]);
  const songBox = el("div.hud-box", {}, [
    el("div", { html: `<b>${esc(song.title)}</b>` }),
    el("div.muted", { style: { fontSize: "12px" }, text: `${song.artist} · ${song.bpm} BPM · 4/4` }),
  ]);
  const timeBox = el("div.hud-box.muted", { style: { fontVariantNumeric: "tabular-nums" }, text: `0:00 / ${fmtTime(duration)}` });
  const fullscreenBtn = el("button.btn.ghost", { title: "Fullscreen", onclick: () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else shell.requestFullscreen?.().catch(() => toast("Fullscreen isn't available here", "bad"));
  } }, ["⛶"]);
  // Opens this song in the Guitar tab editor — as an independent draft when
  // it's a built-in (see PlayPage.tsx's onEdit), so tweaking a note or
  // setting finger assignments here never touches the track being played.
  const editBtn = host.onEdit ? el("button.btn.ghost", {
    title: "Edit this song — opens as a separate draft, the original stays untouched",
    onclick: host.onEdit,
  }, ["✏️ Edit"]) : null;
  // Score/health/killfeed — ported from the classic engine's own HUD, same
  // markup/classes (scoreHTML(), .healthbar-big, .kill*) so the shared
  // play-engine.css styling applies unmodified. A third HUD row rather than
  // squeezed into the existing two — scoreBox's two-line content made row 2
  // taller than TOP_HUD_RESERVE could absorb without overlapping the
  // highway, so TOP_HUD_RESERVE grew to match (see its own declaration).
  const scoreBox = el("div.hud-box", { html: scoreHTML(0, 100, 0, 1) });
  const healthWrap = el("div.healthbar-big", { style: { width: "150px" } }, [el("i", { style: { width: "100%" } })]);
  const killfeed = el("div.killfeed");
  const banner = el("div.banner.hidden");
  const topHud = el("div.play-hud", {}, [
    el("div.row", { style: { gap: "10px" } }, [el("div.hud-box", {}, [backBtn]), songBox]),
    el("div.row", { style: { gap: "10px" } }, [timeBox, el("div.hud-box", {}, [editBtn, fullscreenBtn])]),
    el("div.row", { style: { gap: "10px", marginTop: "6px" } }, [scoreBox, healthWrap]),
  ]);

  let playBtn!: HTMLElement;
  // Shows "⏸" during a strict-mode wait too, even though `playing` is
  // false then (`now()` needs `playing=false` to freeze — see `retry()`)
  // — the transport reads as "running" the whole time, same as it does in
  // the classic engine, which never flips its own `playing` flag for this.
  function updatePlayBtn() { playBtn.textContent = (playing || waitingFor) ? "⏸" : "▶"; }
  playBtn = el("button.btn.primary", { style: { fontSize: "20px", padding: "10px 22px" }, onclick: () => {
    // Clicking during a wait cancels it (freezes there for good until
    // Play is pressed again) rather than toggling play/pause normally —
    // there's no meaningful "pause" distinct from the wait's own freeze.
    if (waitingFor) { waitingFor = null; if (rafId != null) cancelAnimationFrame(rafId); updatePlayBtn(); return; }
    playing ? pause() : play();
  } }, ["▶"]);

  const speedSlider = slider({
    label: "Speed", min: 0.1, max: 2, step: 0.05, value: rate, fmt: (v) => `${v.toFixed(2)}x`,
    oninput: (v) => setRate(v),
  });
  const metroBtn = el("button.btn", { title: "Metronome click", onclick: () => {
    metroOn = !metroOn; metroBtn.classList.toggle("primary", metroOn);
    if (playing) scheduleAudio(now());
  } }, ["🥁 Metronome"]);
  const bandBtn = band.empty ? null : el("button.btn", {
    class: bandOn ? "primary" : "", title: "Synthesized accompaniment: " + band.names.join(", "),
    onclick: () => {
      bandOn = !bandOn; setSetting("band", bandOn);
      bandBtn!.classList.toggle("primary", bandOn);
      if (bandOn) band.seek(Math.max(0, now())); else band.silence();
    },
  }, ["🎺 Band"]);
  const soundBtn = el("button.btn", { class: noteSounds ? "primary" : "", title: "Sound each note as it reaches the playhead", onclick: () => {
    noteSounds = !noteSounds; setSetting("noteSounds", noteSounds);
    soundBtn.classList.toggle("primary", noteSounds);
    if (playing) scheduleAudio(now());
  } }, ["🔊 Notes"]);
  const karaokeBtn = lyrics.length ? el("button.btn", { class: karaokeLyrics ? "primary" : "", title: "Word-by-word singalong highlight", onclick: () => {
    karaokeLyrics = !karaokeLyrics; setSetting("karaokeLyrics", karaokeLyrics);
    karaokeBtn!.classList.toggle("primary", karaokeLyrics);
    updateLyric(now());
  } }, ["🎤 Karaoke"]) : null;
  const fretBtn = el("button.btn", {
    class: showDiagram ? "primary" : "",
    title: "Show a fretboard diagram for the current/next note — where to put your fingers",
    onclick: () => {
      showDiagram = !showDiagram; setSetting("showFingering", showDiagram);
      fretBtn.classList.toggle("primary", showDiagram);
      draw(now());
    },
  }, ["🎸 Frets"]);
  const diagramSizeBtn = el("button.btn", { title: "Fretboard diagram size — click to cycle Small / Medium / Large", onclick: () => {
    diagramSize = FRET_SIZE_ORDER[(FRET_SIZE_ORDER.indexOf(diagramSize) + 1) % FRET_SIZE_ORDER.length];
    setSetting("fretDiagramSize", diagramSize);
    diagramSizeBtn.textContent = `🖐 ${diagramSize}`;
    draw(now());
  } }, [`🖐 ${diagramSize}`]);
  const fretSizeBtn = el("button.btn", { title: "Highway size — click to cycle Small / Medium / Large", onclick: () => {
    fretSize = FRET_SIZE_ORDER[(FRET_SIZE_ORDER.indexOf(fretSize) + 1) % FRET_SIZE_ORDER.length];
    setSetting("fretboardSize", fretSize);
    fretSizeBtn.textContent = `⚙ ${fretSize}`;
    draw(now());
  } }, [`⚙ ${fretSize}`]);
  const strictBtn = el("button.btn", { class: strict ? "primary" : "",
    title: "Miss or fumble a note and everything stops right there — nothing already played gets replayed, it just waits for you to get this one note, then eases back up to speed (no health/score hit while waiting)",
    onclick: () => { strict = !strict; setSetting("strictMode", strict); strictBtn.classList.toggle("primary", strict); } },
    ["☑ Repeat till right"]) as HTMLButtonElement;
  const backingMuteBtn = song.audio.backing ? el("button.btn.ghost", { title: "Mute backing track", onclick: (e: MouseEvent) => {
    const btn = e.currentTarget as HTMLElement;
    const muted = btn.classList.toggle("primary");
    player.setBackingVolume(muted ? 0 : s.backingVolume);
  } }, ["🎸 Mute"]) : null;
  const vocalMuteBtn = song.audio.vocal ? el("button.btn.ghost", { title: "Mute vocal track", onclick: (e: MouseEvent) => {
    const btn = e.currentTarget as HTMLElement;
    const muted = btn.classList.toggle("primary");
    player.setVocalVolume(muted ? 0 : s.vocalVolume);
  } }, ["🎤 Mute"]) : null;

  const segLabel = el("span.muted", { style: { fontSize: "12px", minWidth: "150px" }, text: "Full song" });
  const loopBtn = el("button.btn", { title: "Loop the selected segment (drag on the timeline below to pick one)", onclick: () => {
    if (loopStart == null || loopEnd == null) { toast("Drag on the timeline to select a segment first", "bad"); return; }
    loopOn = !loopOn; loopBtn.classList.toggle("primary", loopOn);
  } }, ["🔁 Loop"]);
  const clearLoopBtn = el("button.btn.ghost", { title: "Clear the loop / segment (back to the full song)", onclick: () => {
    loopOn = false; loopStart = null; loopEnd = null;
    loopBtn.classList.remove("primary");
    timeline.setSelection(null, null);
    segLabel.textContent = "Full song";
  } }, ["✕"]) as HTMLButtonElement;
  const prevSegBtn = el("button.btn.ghost", { style: { display: "none" }, onclick: () => { learn.prev(); syncLearnUI(); } }, ["◀"]);
  const nextSegBtn = el("button.btn.ghost", { style: { display: "none" }, onclick: () => { learn.next(); syncLearnUI(); } }, ["▶"]);
  const learnBtn = el("button.btn", {
    title: "Split the song into segments and drill them one at a time, starting slow, with an automatic speed-up on a clean pass",
    onclick: () => {
      const on = learn.toggle();
      // createLearnMode's own toggle(false) path already calls setLoop(false)
      // then applySegment(0, duration) to reset the range — that leaves
      // loopStart/loopEnd at (0, duration) rather than truly null, which
      // would make a *subsequent* manual Loop click re-loop the full song
      // (harmless, but not "no segment picked" the way it reads). Reset to
      // the real null state here instead, same as ✕ Clear.
      if (!on) { loopStart = null; loopEnd = null; timeline.setSelection(null, null); }
      learnBtn.classList.toggle("primary", on);
      clearLoopBtn.disabled = on;
      freeModeBtn.disabled = on;
      prevSegBtn.style.display = nextSegBtn.style.display = on ? "" : "none";
      timeline.setInteractive(!on);
      syncLearnUI();
    },
  }, ["🎓 Learn"]) as HTMLButtonElement;

  function updateSegLabel() {
    if (learn.isActive && learn.segments) {
      segLabel.textContent = `Segment ${learn.index + 1}/${learn.segments.length} · ${fmtTime(loopStart ?? 0)}–${fmtTime(loopEnd ?? 0)}`;
    } else if (loopStart != null && loopEnd != null && (loopStart > 0 || loopEnd < duration)) {
      segLabel.textContent = `${fmtTime(loopStart)} – ${fmtTime(loopEnd)}`;
    } else {
      segLabel.textContent = "Full song";
    }
  }
  function syncLearnUI() {
    timeline.setSegments(learn.isActive ? learn.segments : null, learn.index);
    updateSegLabel();
  }
  // Only sets the range + updates the timeline/label — deliberately doesn't
  // touch loopOn itself. Learn mode's own enter()/toggle(off) call
  // host.setLoop(...) right alongside this, so if applySegment also forced
  // loopOn=true unconditionally, exiting Learn mode (which calls
  // setLoop(false) then applySegment(0, duration) to reset the range) would
  // immediately re-enable the loop it just turned off. The manual
  // drag-to-select path (timeline's onSelect below) still turns the loop on
  // itself, right after calling this — same instant-loop feel as before,
  // just decoupled from this function so Learn mode can't be undermined by it.
  function applySegment(start: number, end: number) {
    loopStart = Math.max(0, start); loopEnd = Math.min(duration, end);
    timeline.setSelection(loopStart, loopEnd);
    updateSegLabel();
  }
  const learn = createLearnMode({
    duration, beatLen,
    applySegment,
    rewindTo: seekTo,
    getRate: () => rate,
    setRate: (v) => { setRate(v); speedSlider.setValue(v); },
    setLoop: (v) => { loopOn = v; loopBtn.classList.toggle("primary", v); },
    toast,
  });

  // Practice at your own pace, note by note — see the file header. Disables
  // (and, going on, gets disabled by) Learn mode and Repeat till right's own
  // toggle rather than trying to make all three cooperate: Learn's segment/
  // loop bounds are enforced inside the normal clock-driven `tick()`, which
  // this mode never runs, and Repeat till right's own retry/wait has nothing
  // left to do once every note already waits.
  const freeModeBtn = el("button.btn", { class: freeMode ? "primary" : "",
    title: "Practice note by note at your own pace — no auto-playback (no backing track, note sounds, or metronome); the highway freezes on each note and waits for you to play it correctly (mic only) before moving to the next. Health/score/killfeed work the same as Repeat till right's own wait.",
    onclick: () => {
      freeMode = !freeMode; setSetting("freeMode", freeMode);
      freeModeBtn.classList.toggle("primary", freeMode);
      strictBtn.disabled = freeMode;
      learnBtn.disabled = freeMode;
      if (freeMode && learn.isActive) learnBtn.click();
      // Stop whatever's running either way, not just when turning this ON —
      // toggling it should always leave a clean, stopped state ready for a
      // fresh Play press under the new mode. Bug found in review: with this
      // guarded by `if (freeMode)`, turning Free mode OFF while mid-wait
      // left `waitingFor` set; completing that note then called
      // `resolveWait()`, which re-checks the (now false) `freeMode` and
      // fell into the normal-playback branch — silently starting a
      // strict-mode-style tempo ramp and auto-playback the person never
      // asked for, right after they'd just turned auto-playback off.
      if (waitingFor) { waitingFor = null; if (rafId != null) cancelAnimationFrame(rafId); }
      else if (playing) pause();
      updatePlayBtn();
    } }, ["🎯 Free mode"]) as HTMLButtonElement;
  strictBtn.disabled = freeMode;
  learnBtn.disabled = freeMode;

  // 🎸 Frets + its own 🖐 S/M/L joined into one seamless control (no gap),
  // by request — they're one feature (the diagram and its size), not two.
  const fretGroup = el("div.btn-group", {}, [fretBtn, diagramSizeBtn]);

  const controls = el("div.play-controls", {}, [
    playBtn, speedSlider,
    karaokeBtn, bandBtn, soundBtn, fretGroup, fretSizeBtn, strictBtn, freeModeBtn, metroBtn,
    backingMuteBtn, vocalMuteBtn,
    segLabel, loopBtn, clearLoopBtn, prevSegBtn, learnBtn, nextSegBtn,
  ]);

  const timeline = createTimeline({
    duration,
    // row = which string it's on (0 = lowest string, matching the highway's
    // own row layout), not pitch height — a string-lane highway's vertical
    // position is about the string, not a continuous pitch scale.
    notes: flat.map((n) => ({ time: n.time, dur: n.dur, row: n.strIdx != null ? n.strIdx / Math.max(1, rows - 1) : 0.5 })),
    onSeek: (t) => { if (learn.isActive) return; loopOn = false; loopBtn.classList.remove("primary"); seekTo(t); },
    onSelect: (a, b) => {
      if (learn.isActive) return;
      applySegment(a, b);
      loopOn = true; loopBtn.classList.add("primary");
    },
  });

  // Finger-color legend, by request — moved out of the global topbar
  // (removed there; it cluttered every page for something that only means
  // anything here and in the Song Editor's Guitar tab) and placed in this
  // page's own bottom-right corner instead. TabRoll keeps its own copy of
  // this same widget (a React component there); this is a vanilla-DOM
  // build since this whole engine is imperative, not React — see
  // handIconSVG()'s header comment.
  let legendOpen = false;
  function closeLegend() { legendOpen = false; legendModal.classList.add("hidden"); }
  function openLegend() { legendOpen = true; legendModal.classList.remove("hidden"); }
  const legendModal = el("div.perf-legend-backdrop.hidden", { onclick: closeLegend }, [
    el("div.perf-legend-panel", { onclick: (e: MouseEvent) => e.stopPropagation() }, [
      el("div.perf-legend-head", {}, [
        el("h2", { text: "Finger colors" }),
        el("button.perf-legend-close", { "aria-label": "Close", onclick: closeLegend }, ["✕"]),
      ]),
      el("div", { html: handIconSVG(120) }),
      el("ul.perf-legend-list", {}, FINGER_DEFS.filter((d) => d.id !== null).map((d) =>
        el("li.perf-legend-row", {}, [
          el("span.perf-legend-swatch", { style: { background: d.color } }),
          el("span", { text: d.name }),
        ]))),
      el("p.perf-legend-hint", { text: "Used in the Song Editor's Guitar tab view to color each note by which finger frets it." }),
    ]),
  ]);
  const legendTrigger = el("button.perf-legend-trigger", {
    title: "Finger color legend", "aria-label": "Finger color legend", html: handIconSVG(26), onclick: openLegend,
  });
  function onLegendKeyDown(e: KeyboardEvent) { if (legendOpen && e.key === "Escape") closeLegend(); }
  window.addEventListener("keydown", onLegendKeyDown);

  stage.appendChild(canvas);
  stage.appendChild(topHud);
  stage.appendChild(killfeed);
  stage.appendChild(lyricEl);
  stage.appendChild(banner);

  shell.appendChild(stage);
  shell.appendChild(controls);
  shell.appendChild(timeline.el);
  shell.appendChild(legendTrigger);
  shell.appendChild(legendModal);
  root.appendChild(shell);

  // ----- canvas draw -----
  const c = canvas.getContext("2d")!;
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.max(1, W * dpr); canvas.height = Math.max(1, H * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(now());
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  function draw(pos: number) {
    if (!W || !H) return;
    const sizeScale = FRET_SCALE[fretSize] ?? 1;
    const avail = Math.max(0, H - TOP_HUD_RESERVE);
    const laneH = Math.max(36 * sizeScale, Math.min(90 * sizeScale, avail / rows));
    const laneBlockH = rows * laneH;
    // Centered in whatever's left below the HUD reserve, rather than pinned
    // to the very top — the .play-hud overlay sits over the canvas' top
    // ~76px, so top-aligned lanes used to render right underneath it.
    const yOffset = TOP_HUD_RESERVE + Math.max(0, (avail - laneBlockH) / 2);
    const noteAreaW = W - GUTTER_W;
    const playheadX = GUTTER_W + noteAreaW * PLAYHEAD_FRAC;
    const pastSec = (playheadX - GUTTER_W) / PX_PER_SEC + 0.5;
    const futureSec = (W - playheadX) / PX_PER_SEC + 0.5;

    c.fillStyle = getVar("--highway"); c.fillRect(0, 0, W, H);

    for (let r = 0; r < rows; r++) {
      const strIdx = rows - 1 - r;
      createStringLineElement({
        x0: GUTTER_W, x1: W, y: yOffset + r * laneH + laneH / 2,
        thickness: stringThickness(strIdx, rows), color: stringColor(strIdx, rows),
      }).draw(c);
    }

    c.save();
    c.beginPath(); c.rect(GUTTER_W, yOffset, noteAreaW, laneBlockH); c.clip();

    // chord ties: one soft background band per multi-note group
    const seenGroup = new Set<number>();
    for (const n of flat) {
      if (n.strIdx == null || (chordGroupSize.get(n.groupId) ?? 0) < 2 || seenGroup.has(n.groupId)) continue;
      if (n.time < pos - pastSec || n.time > pos + futureSec) continue;
      seenGroup.add(n.groupId);
      const members = flat.filter((m) => m.groupId === n.groupId && m.strIdx != null);
      const rowsHit = members.map((m) => rows - 1 - m.strIdx!);
      const top = Math.min(...rowsHit), bottom = Math.max(...rowsHit);
      const x = playheadX + (n.time - pos) * PX_PER_SEC;
      const w = Math.max(24, n.dur * PX_PER_SEC);
      createChordTieElement({
        x: x - 4, y: yOffset + top * laneH + 2, w: w + 8, h: (bottom - top + 1) * laneH - 4,
      }).draw(c);
    }

    for (const n of flat) {
      if (n.strIdx == null) continue;
      if (n.time < pos - pastSec || n.time > pos + futureSec) continue;
      const row = rows - 1 - n.strIdx;
      const rowY = yOffset + row * laneH;
      const x = playheadX + (n.time - pos) * PX_PER_SEC;
      const w = Math.max(24, n.dur * PX_PER_SEC);
      const fret = n.midi - tabStrings[n.strIdx];
      const active = pos >= n.time && pos <= n.time + n.dur;
      const past = pos > n.time + n.dur;
      const status: NoteStatus = active ? "active" : past ? "past" : "pending";
      const pad = active ? 2 : 4;
      // Once graded, the block's fill switches from its finger color to the
      // judgment color (matching the classic engine's own note coloring) —
      // looked up via `groupId`, since `flat` is per-pitch but grading is
      // per-note/chord (`gradeNotes`).
      const grade = gradeByGroup.get(n.groupId);
      const color = grade && grade.state !== "pending" ? judgmentColor[grade.state] : fingerColor(n.finger);
      createNoteBlockElement({
        ctx: c,
        x: x + 1, y: rowY + pad, w: w - 2, h: laneH - pad * 2,
        status, content: String(fret), color,
      }).draw(c);
    }
    c.restore();

    // fixed left gutter (drawn last so it occludes notes sliding behind it)
    const labelStyle = s.stringLabels;
    const labels: string[] = [];
    for (let r = 0; r < rows; r++) labels.push(stringLabel(playInst, tabStrings, rows - 1 - r, labelStyle));
    createGutterElement({ width: GUTTER_W, height: H, rows, laneH, yOffset, labels }).draw(c);

    // playhead — spans just the lane block, not the HUD-reserved band above it
    createPlayheadElement({ x: playheadX, yTop: yOffset, yBottom: yOffset + laneBlockH }).draw(c);

    if (showDiagram) drawDiagram(pos);
  }

  // Ported from the classic engine's `drawFretboard` (createPlayEngine.ts)
  // — a "where to put your fingers" panel for the current/next note, drawn
  // bottom-left over the highway. No capo term here (Performance Mode
  // doesn't model capo anywhere else either — the inline fret numbers above
  // don't offset for one, so this stays consistent with those rather than
  // introducing an offset nothing else in this engine uses).
  function drawDiagram(t: number) {
    const cur = diagramNotes.find((n) => t <= n.time + n.dur);
    if (!cur) return;
    const sc = FRET_SCALE[diagramSize] ?? 1;
    const active = t >= cur.time - 0.05;
    const nStr = rows;
    // Was a flat 12 (bug: a chord up the neck drew its dot off the edge of
    // the panel). Briefly sized to whatever the *current* chord needed —
    // by request ("хочу полностью видеть" — I want to see it in full),
    // now always the instrument's own full fret count instead, so the
    // whole neck is there regardless of which chord happens to be showing
    // at the moment, not just the frets a low-fret song ever touches.
    // `fbW` grows to match, roughly keeping each fret the same width
    // rather than cramming more of them into the old fixed panel — still
    // bounded by `W * 0.42`, so a genuinely long neck (a 22-fret electric
    // guitar) compresses gracefully instead of overflowing.
    const FRETS = inst?.frets || 12;
    const fbW = Math.min(340 * (FRETS / 12), W * 0.42) * sc, fbH = (6 + nStr * 13) * sc;
    const x0 = 22, y0 = H - fbH - 44 * sc;
    const nutX = x0 + 22 * sc, cell = (fbW - 30 * sc) / FRETS;
    c.fillStyle = "rgba(0,0,0,0.55)";
    roundRectPath(c, x0 - 10 * sc, y0 - 24 * sc, fbW + 20 * sc, fbH + 44 * sc, 10); c.fill();
    c.fillStyle = active ? getVar("--accent") : getVar("--muted");
    c.font = `bold ${Math.round(12 * sc)}px ${getVar("--font")}`;
    c.fillText((active ? "Now: " : "Next: ") + describeMidiSet(cur.midi), x0, y0 - 8 * sc);
    const sy = (si: number) => y0 + fbH - 6 * sc - si * 13 * sc;
    c.lineWidth = 1;
    c.strokeStyle = "rgba(255,255,255,0.4)";
    for (let si = 0; si < nStr; si++) { const y = sy(si); c.beginPath(); c.moveTo(nutX, y); c.lineTo(nutX + cell * FRETS, y); c.stroke(); }
    c.fillStyle = getVar("--muted"); c.font = `${Math.round(10 * sc)}px ${getVar("--mono")}`;
    for (let si = 0; si < nStr; si++) c.fillText(stringLabel(playInst, tabStrings, si, s.stringLabels), x0 - 2, sy(si) + 3 * sc);
    for (let f = 0; f <= FRETS; f++) {
      const x = nutX + f * cell;
      c.strokeStyle = f === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)";
      c.lineWidth = f === 0 ? 3 : 1;
      c.beginPath(); c.moveTo(x, sy(nStr - 1) - 5 * sc); c.lineTo(x, sy(0) + 5 * sc); c.stroke();
    }
    // Real fretboard inlay dots, drawn on the neck itself (between the
    // strings) — separate from the numeric labels below and from the
    // colored "which finger" dots that sit on a string at a played
    // position. Standard positions and the 12th's double dot, by request.
    const inlayY = (sy(0) + sy(nStr - 1)) / 2;
    c.fillStyle = "rgba(255,255,255,0.28)";
    for (const f of FRET_MARKERS) {
      if (f > FRETS) break;
      const x = nutX + (f - 0.5) * cell;
      const r = 2.2 * sc;
      if (f === 12) {
        c.beginPath(); c.arc(x, inlayY - 5 * sc, r, 0, 7); c.fill();
        c.beginPath(); c.arc(x, inlayY + 5 * sc, r, 0, 7); c.fill();
      } else {
        c.beginPath(); c.arc(x, inlayY, r, 0, 7); c.fill();
      }
    }
    c.fillStyle = getVar("--muted"); c.font = `${Math.round(9 * sc)}px ${getVar("--mono")}`;
    for (const f of FRET_MARKERS) {
      if (f > FRETS) break;
      c.fillText(String(f), nutX + (f - 0.5) * cell - 3, sy(0) + 14 * sc);
    }
    // Finger colors, by request ("на Freets - вставляем цвета пальцев") —
    // the same shared/lib/finger-colors.ts palette the highway and its
    // legend already use, rather than the flat accent/white this diagram
    // drew before. A chord's finger is one value for the whole note (same
    // simplification the highway already makes — see `flat`'s own
    // `finger` field), so every dot in a chord shares one color here too.
    // Still keeps "Now:" vs "Next:" visually distinct without a second
    // color scheme: full opacity when active, dimmed otherwise — same
    // active/next contrast the old accent/white swap gave, just applied to
    // the finger color instead of replacing it.
    const dotColor = fingerColor(cur.finger);
    c.globalAlpha = active ? 1 : 0.55;
    for (const pos of cur.frets) {
      if (!pos) continue;
      const y = sy(pos.string);
      if (pos.fret === 0) {
        c.strokeStyle = dotColor; c.lineWidth = 2;
        c.beginPath(); c.arc(nutX - 9 * sc, y, 4 * sc, 0, 7); c.stroke();
      } else {
        const x = nutX + (pos.fret - 0.5) * cell;
        const lbl = String(pos.fret);
        // Chosen from a live 3-option comparison (S12/M16/L21px shown to
        // the user for each option) — "B: Current." The dot itself grows
        // to match (measured from the label's real ink box, same self-
        // calibrating approach as the highway's own note digits) rather
        // than staying fixed at 6.5*sc and having the number spill past it.
        const fontPx = Math.round(16 * sc);
        c.font = `bold ${fontPx}px ${getVar("--mono")}`;
        const lm = c.measureText(lbl);
        const inkH = (lm.actualBoundingBoxAscent ?? fontPx * 0.7) + (lm.actualBoundingBoxDescent ?? 0);
        const dotR = Math.max(inkH, lm.width) / 2 + 3 * sc;
        c.fillStyle = dotColor; c.beginPath(); c.arc(x, y, dotR, 0, 7); c.fill();
        c.fillStyle = "rgba(0,0,0,0.85)";
        c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(lbl, x, y + 1);
        c.textAlign = "left"; c.textBaseline = "alphabetic";
      }
    }
    c.globalAlpha = 1;
  }

  function updateLyric(t: number) {
    if (!lyrics.length) return;
    if (!karaokeLyrics || !lyricTimeline) { lyricEl.innerHTML = ""; return; }
    const a = activeAt(lyricTimeline, t);
    const lines = lyricTimeline.lines;
    const cur = a.lineIdx >= 0 ? lineFillHTML(lines[a.lineIdx], a.wordIdx, a.wordProgress) : "";
    const nIdx = a.lineIdx >= 0 ? a.lineIdx + 1 : 0;
    const next = lines[nIdx] ? esc(lines[nIdx].text) : "";
    lyricEl.innerHTML =
      `<div style="font-size:26px;line-height:1.2;font-weight:700">${cur}</div>` +
      (next ? `<div style="font-size:15px;opacity:.55;margin-top:2px">${next}</div>` : "");
  }

  // ----- transport -----
  async function play() {
    if (playing || waitingFor) return;
    if (finished) restart();
    if (freeMode) { await playFree(); return; }
    // Mic permission first, same as the classic engine's own togglePlay —
    // and *before* capturing the clock's anchor timestamps, not after:
    // requesting mic access can take a real, user-paced amount of time
    // (a permission prompt), and this clock is wall-clock-anchored
    // (`ctxStartTime`), so anchoring before an await here would make the
    // highway jump forward by however long the prompt took to answer.
    await ensureMic();
    await Audio.resume();
    if (playing) return; // could have been toggled again during the awaits
    playing = true;
    const pos = pausedTime;
    clockStartPos = pos;
    ctxStartTime = Audio.ctx().currentTime;
    if (player.hasAudio()) player.play(pos);
    scheduleAudio(pos);
    updatePlayBtn();
    rafId = requestAnimationFrame(tick);
  }
  function pause() {
    if (!playing) return;
    pausedTime = now();
    playing = false;
    clearTimers();
    player.pause();
    band.silence();
    if (rafId != null) cancelAnimationFrame(rafId);
    updatePlayBtn();
    draw(pausedTime);
    updateLyric(pausedTime);
  }
  function seekTo(t: number) {
    const clamped = Math.max(0, Math.min(duration, t));
    waitingFor = null;
    retryPhase = null;
    // Notes at or after the new position need to be gradable again — same
    // as the classic engine's own `rewindTo`, and needed here whether the
    // seek came from the timeline, Loop, Learn mode, or a strict-mode
    // retry (which calls this too — see `retry()`).
    for (const n of gradeNotes) if (n.time >= clamped - 0.001) { n.state = "pending"; n.best = 999; n.frames = 0; }
    const wasPlaying = playing;
    if (wasPlaying) { playing = false; clearTimers(); player.pause(); band.silence(); if (rafId != null) cancelAnimationFrame(rafId); }
    pausedTime = clamped;
    player.seek(clamped);
    if (wasPlaying) play(); else { draw(clamped); updateLyric(clamped); }
    timeline.setPlayhead(clamped);
    timeBox.textContent = `${fmtTime(clamped)} / ${fmtTime(duration)}`;
    // Covers the case this seek interrupted a strict-mode or Free mode wait
    // (both already cleared above): without this, the button would keep
    // reading "⏸" (playing || waitingFor) even though neither is true and
    // nothing is actually running anymore.
    if (!wasPlaying) updatePlayBtn();
  }
  // The user's own Speed-slider change — persists, and cancels any strict-
  // mode ramp in progress (the user just told us what speed they want).
  function setRate(v: number) {
    rate = v;
    setSetting("playbackSpeed", v);
    retryPhase = null;
    setEffRate(v);
  }
  // The *actual* rate driving playback right now — same as `rate` outside
  // a retry ramp, temporarily different during one. Re-anchors the clock
  // (same as `setRate` used to do unconditionally) but doesn't touch the
  // persisted setting, and doesn't reschedule note-sound timers on every
  // ramp frame (scheduleAudio() is comparatively expensive — clears and
  // rebuilds every remaining note's setTimeout — so the ramp calls it only
  // at its own start/end, accepting a little sound-timing drift during the
  // 600ms ramp itself in exchange for not doing that up to 60x/sec).
  function setEffRate(v: number) {
    const pos = now();
    effRate = v;
    player.setSpeed(v);
    if (playing) { clockStartPos = pos; ctxStartTime = Audio.ctx().currentTime; }
  }
  // Sets `effRate` to the ramp's own starting speed only — the caller
  // (`resolveWait`) immediately follows this with `play()`, which anchors
  // the clock and calls `scheduleAudio()` itself once, at this rate; no
  // need to duplicate that here.
  function beginTempoRamp() {
    const t = performance.now();
    const slow = Math.max(0.1, rate * RETRY_SLOW_FACTOR);
    retryPhase = { from: slow, until: t, rampUntil: t + RETRY_RAMP_MS };
    setEffRate(slow);
  }

  // ----- grading -----
  function grade() {
    const pos = now();
    for (const n of gradeNotes) {
      if (n.state !== "pending") continue;
      const winStart = n.time - HIT_PAD;
      const winEnd = n.time + n.dur + HIT_PAD;
      if (pos < winStart) break;
      if (pos > winEnd) { finalize(n); continue; }
      if (detectedMidi > 0) {
        let bestCents = 999;
        for (const target of n.midi) {
          const diff = detectedMidi - target;
          const cents = Math.abs((diff - Math.round(diff / 12) * 12) * 100);
          if (cents < bestCents) bestCents = cents;
        }
        if (bestCents < GOOD_CENTS) { n.frames++; if (bestCents < n.best) n.best = bestCents; }
      }
    }
  }
  function finalize(n: GradeNote) {
    let q: Grade;
    if (n.frames >= 2 && n.best <= PERFECT_CENTS) q = "perfect";
    else if (n.frames >= 1 && n.best <= GOOD_CENTS) q = "good";
    else if (n.frames >= 1) q = "off";
    else q = "miss";
    if (strict && (q === "off" || q === "miss")) { retry(n); return; }
    n.state = q;
    applyJudgment(q, n);
  }
  // Freeze-rewind-wait, same shape as the classic engine's own `retry()` —
  // adapted to this engine's clock: `seekTo` (rather than a bare rewind)
  // both freezes `now()` (via `playing=false`, see `now()` itself) and
  // resets grading for this note and everything after it, in one call.
  function retry(n: GradeNote) {
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    clearTimers(); player.pause(); band.silence();
    playing = false;
    seekTo(n.time);
    waitingFor = n;
    toast("Get this note, then we'll continue", "bad");
    updatePlayBtn();
    rafId = requestAnimationFrame(waitTick);
  }
  // A dedicated loop while frozen-waiting, distinct from `tick()` — the
  // position genuinely isn't moving (that's the point), so there's nothing
  // for the normal per-frame advance/finish/loop logic to do; this just
  // keeps polling the mic until the right note is heard.
  function waitTick() {
    if (!waitingFor) return;
    readPitch();
    checkWaitingPitch();
    if (waitingFor) { draw(pausedTime); rafId = requestAnimationFrame(waitTick); }
  }
  function checkWaitingPitch() {
    const n = waitingFor!;
    if (detectedMidi <= 0) return;
    let bestCents = 999;
    for (const target of n.midi) {
      const diff = detectedMidi - target;
      const cents = Math.abs((diff - Math.round(diff / 12) * 12) * 100);
      if (cents < bestCents) bestCents = cents;
    }
    if (bestCents < GOOD_CENTS) resolveWait(n, bestCents <= PERFECT_CENTS ? "perfect" : "good");
  }
  function resolveWait(n: GradeNote, q: Grade) {
    waitingFor = null;
    n.state = q;
    applyJudgment(q, n);
    // Free mode has no clock-driven playback to resume — just move the
    // freeze on to the next pending note instead of ramping back up to
    // speed. `pickNextFree()` sets a new `waitingFor` itself when there is
    // one; the caller here is always `waitTick()` (via `checkWaitingPitch`),
    // whose own trailing `if (waitingFor)` check picks the resulting state
    // back up and reschedules itself — this must NOT also schedule a frame,
    // or every note would double the number of scheduled frames.
    if (freeMode) { pickNextFree(); return; }
    beginTempoRamp();
    play();
  }
  // Finds the next not-yet-graded note at or after `pos` (time-sorted, so
  // "first pending from here" is always the right next one — once a note
  // resolves, its own state stops being "pending", so calling this again
  // from that same note's own time naturally finds whatever comes after
  // it). Shared by Free mode's own entry point (`playFree`) and its
  // per-note advance (`resolveWait`, above).
  function firstPendingFrom(pos: number): GradeNote | undefined {
    return gradeNotes.find((gn) => gn.state === "pending" && gn.time >= pos - 0.001);
  }
  function pickNextFree() {
    const next = firstPendingFrom(pausedTime);
    if (!next) { pausedTime = duration; finish(); return; }
    waitingFor = next;
    pausedTime = next.time;
    draw(pausedTime);
    updateLyric(pausedTime);
    timeline.setPlayhead(pausedTime);
    timeBox.textContent = `${fmtTime(pausedTime)} / ${fmtTime(duration)}`;
  }
  // Free mode's own entry point (called from `play()` instead of the normal
  // clock-driven path) — mic only, same as the rest of Free mode: a denied
  // or unavailable mic just can't make progress here, since there's no
  // manual "skip to next note" fallback, so this bails out rather than
  // freezing on a note nothing can ever resolve.
  async function playFree() {
    if (!(await ensureMic())) return;
    await Audio.resume();
    pickNextFree();
    updatePlayBtn();
    if (waitingFor) rafId = requestAnimationFrame(waitTick);
  }
  function applyJudgment(q: Grade, n: GradeNote) {
    counts[q]++;
    learn.record(q, n.time);
    if (q === "perfect") { health = Math.min(100, health + 6); streak++; score += Math.round(100 * mult); }
    else if (q === "good") { health = Math.min(100, health + 3); streak++; score += Math.round(60 * mult); }
    else if (q === "off") { health = Math.max(0, health - 7); streak = 0; score += 10; }
    else { health = Math.max(0, health - 10); streak = 0; }
    maxStreak = Math.max(maxStreak, streak);
    mult = 1 + Math.min(3, Math.floor(streak / 8)) * 0.5;
    if (health <= 0 && !failed) { failed = true; toast("Healthbar empty — keep going, but this run won't count as a pass.", "bad"); }
    pushKill(q, n);
    updateHud();
  }
  function pushKill(q: Grade, n: GradeNote) {
    const label = describeMidiSet(n.midi);
    const k = el(`div.kill.${q}`, { html: `${q[0].toUpperCase() + q.slice(1)} <span class="muted">${esc(label)}</span>` });
    killfeed.appendChild(k);
    while (killfeed.children.length > 6) killfeed.firstChild!.remove();
    setTimeout(() => { k.style.opacity = "0"; k.style.transition = "opacity 500ms"; }, 1400);
    setTimeout(() => k.remove(), 2000);
  }
  function accuracy(): number {
    const total = counts.perfect + counts.good + counts.off + counts.miss;
    if (!total) return 100;
    return Math.round(((counts.perfect + counts.good * 0.6) / total) * 100);
  }
  function updateHud() {
    const acc = accuracy();
    scoreBox.innerHTML = scoreHTML(score, Math.round(health), streak, mult, acc, failed);
    (healthWrap.firstChild as HTMLElement).style.width = health + "%";
  }
  function restart() {
    waitingFor = null; retryPhase = null; effRate = rate;
    finished = false; failed = false;
    health = 100; score = 0; streak = 0; maxStreak = 0; mult = 1;
    counts.perfect = counts.good = counts.off = counts.miss = 0;
    killfeed.innerHTML = "";
    banner.classList.add("hidden");
    for (const n of gradeNotes) { n.state = "pending"; n.best = 999; n.frames = 0; }
    pausedTime = 0;
    player.seek(0);
    draw(0);
    updateLyric(0);
    timeline.setPlayhead(0);
    timeBox.textContent = `0:00 / ${fmtTime(duration)}`;
    updateHud();
  }
  function finish() {
    finished = true;
    playing = false; clearTimers(); player.pause(); band.silence();
    if (rafId != null) cancelAnimationFrame(rafId);
    pausedTime = duration;
    updatePlayBtn();
    draw(duration);
    updateLyric(duration);
    timeline.setPlayhead(duration);
    timeBox.textContent = `${fmtTime(duration)} / ${fmtTime(duration)}`;
    const acc = accuracy();
    const passed = !failed && acc >= 60;
    const grade = gradeLetter(acc, failed);
    host.addHistory({
      ts: Date.now(), songId: song.id ?? "", songTitle: song.title, instrument: playInst,
      score, accuracy: acc, maxStreak, passed, durationSec: Math.round(duration),
      notes: { ...counts }, mode: "performance",
    });
    showBanner(grade, acc, passed);
  }
  function showBanner(grade: string, acc: number, passed: boolean) {
    banner.innerHTML = "";
    banner.appendChild(el("div.panel", {}, [
      el("div.big-grade", { text: grade, style: { color: passed ? getVar("--good") : getVar("--bad") } }),
      el("h2", { text: passed ? "Song complete — passed!" : (failed ? "Finished (failed — healthbar emptied)" : "Finished") }),
      el("div.grid.cards", { style: { margin: "14px 0" } }, [
        miniStat(acc + "%", "Accuracy"), miniStat(score, "Score"), miniStat(maxStreak, "Best streak"),
        miniStat(counts.perfect, "Perfect"), miniStat(counts.miss, "Missed"),
      ]),
      el("div.row", { style: { justifyContent: "center" } }, [
        el("button.btn.primary", { onclick: () => { restart(); play(); } }, ["⟲ Play again"]),
        el("button.btn", { onclick: () => host.onBack() }, ["← Songs"]),
      ]),
    ]));
    banner.classList.remove("hidden");
  }

  function tick() {
    const pos = now();
    if (loopOn && loopEnd != null && pos >= loopEnd) {
      // A segment loop wrapping is how Learn mode judges "did that pass go
      // cleanly enough to speed up" — same trigger point as Classic's own
      // loop-wrap check.
      if (learn.isActive) learn.evaluatePass();
      seekTo(loopStart ?? 0);
      return;
    }
    if (pos > duration + 1.2) { finish(); return; }
    if (retryPhase) {
      const t = performance.now();
      if (t >= retryPhase.rampUntil) { retryPhase = null; setEffRate(rate); scheduleAudio(now()); }
      else setEffRate(retryPhase.from + (rate - retryPhase.from) * ((t - retryPhase.until) / RETRY_RAMP_MS));
    }
    if (bandOn) band.schedule(pos, effRate);
    readPitch();
    grade();
    if (waitingFor) return; // grade() just triggered a retry — waitTick() drives frames now instead
    draw(pos);
    updateLyric(pos);
    timeline.setPlayhead(Math.min(pos, duration));
    timeBox.textContent = `${fmtTime(Math.min(pos, duration))} / ${fmtTime(duration)}`;
    rafId = requestAnimationFrame(tick);
  }

  resize();
  draw(0);
  updateLyric(0);
  updateHud();

  function onKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (e.code === "Space" && !target?.closest("input,select,textarea,button")) {
      e.preventDefault();
      if (waitingFor) { waitingFor = null; if (rafId != null) cancelAnimationFrame(rafId); updatePlayBtn(); return; }
      playing ? pause() : play();
    }
  }
  window.addEventListener("keydown", onKeyDown);

  return () => {
    playing = false;
    waitingFor = null;
    clearTimers();
    if (rafId != null) cancelAnimationFrame(rafId);
    ro.disconnect();
    timeline.destroy();
    player.stop();
    band.stop();
    Audio.stopMic();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keydown", onLegendKeyDown);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
}
