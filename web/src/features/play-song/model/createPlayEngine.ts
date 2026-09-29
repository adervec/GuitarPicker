// The Play engine: note-highway gameplay (grading, healthbar, killfeed,
// strict-mode freeze-and-wait, the practice timeline, Learn mode). A
// near-verbatim port of the vanilla app's views/play.js — same imperative
// canvas-game structure (it builds its own DOM subtree and runs its own
// requestAnimationFrame loop), same reasoning as porting a Three.js scene or
// a Phaser game into a React app: React owns the page and the mount point
// (see views/play/ui/PlayPage.tsx), this owns everything happening inside it.
//
// Deliberately NOT ported: the player-avatar HUD badge (cosmetics/Locker
// aren't part of this pilot) and navigation to Progress/Locker/Library, none
// of which exist as routes here yet.
import { el, slider, toast, fmtTime, getVar } from "@/shared/lib/dom";
import { audioEngine as Audio } from "@/shared/lib/audio-engine";
import { detectPitch, PitchTracker } from "@/shared/lib/pitch";
import { Synth } from "@/shared/lib/synth";
import { TrackPlayer } from "@/shared/lib/track-player";
import { Band } from "@/shared/lib/band";
import { songDuration, pickPart, type Note, type SongPart } from "@/entities/song/model/song-format";
import { autoAccompaniment } from "@/shared/lib/accompany";
import { freqToMidiFloat, midiToName } from "@/shared/lib/note-math";
import { midiToFret, midiToHole, stringLabel, INSTRUMENTS, type InstrumentDef, type FretPosition, type HoleTarget } from "@/entities/instrument/model/data";
import { suggestCapo, describeMidiSet } from "@/shared/lib/theory";
import { drawBackground } from "@/shared/lib/backgrounds";
import { buildLyricTimeline, activeAt } from "@/shared/lib/karaoke-timeline";
import { lineFillHTML, escapeHTML as esc } from "@/shared/lib/karaoke-render";
import { createTimeline } from "@/shared/lib/practice-timeline";
import { createLearnMode } from "@/features/learn-mode/model/createLearnMode";
import type { EngineHost } from "@/shared/lib/player-settings";

const LEAD_IN = 3.0;
const HIT_PAD = 0.16;
const PERFECT_CENTS = 28;
const GOOD_CENTS = 60;

type Grade = "perfect" | "good" | "off" | "miss";

interface PlayNote extends Note {
  state: Grade | "pending";
  best: number;
  frames: number;
  frets: (FretPosition | null)[] | null;
  holes: (HoleTarget | null)[] | null;
}

interface RetryPhase {
  from: number;
  until: number;
  rampUntil: number;
}

/**
 * root: the DOM node to mount into (a React ref's .current, already empty).
 * host: { song, settings, setSetting(k,v), addHistory(entry), onBack() }
 * Returns a cleanup function — call it on unmount.
 */
export function createPlayEngine(root: HTMLElement, host: EngineHost): () => void {
  const { song } = host;
  const s = host.settings;
  const setSetting = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => { s[k] = v; host.setSetting(k, v); };
  const a4 = s.a4;
  const speed = s.noteSpeed;
  let rate = s.playbackSpeed || 1;
  let effRate = rate;
  let retryPhase: RetryPhase | null = null;
  let waitingFor: PlayNote | null = null;
  const { parts, index: leadIdx, lead } = pickPart(song, s.instrument);
  const playInst = lead.instrument;
  const duration = songDuration({ ...song, notes: lead.notes });
  const beatLen = 60 / song.bpm;
  let segStart = 0, segEnd = duration, loopOn = false;
  const capo = song.capo || suggestCapo(((lead.notes[0]?.midi[0] ?? 60) % 12)).capo;
  const inst = (INSTRUMENTS as Record<string, InstrumentDef>)[playInst] || INSTRUMENTS["acoustic-guitar"];
  const fretted = inst.kind === "fretted";
  const harp = playInst === "harmonica";
  const percussion = inst.kind === "percussion";
  const capoStrings = fretted ? inst.strings.map((v) => v + capo) : null;

  const lyrics = (song.lyrics || []).slice().sort((a, b) => a.time - b.time);
  const lyricTimeline = lyrics.length ? buildLyricTimeline(song) : null;
  let karaokeLyrics = lyricTimeline ? (s.karaokeLyrics ?? true) : false;

  const notes: PlayNote[] = lead.notes.map((n) => ({
    time: n.time, dur: n.dur || 0.4, midi: n.midi, chord: n.chord || n.midi.length > 1,
    state: "pending", best: 999, frames: 0,
    frets: fretted ? n.midi.map((m) => midiToFret(m, playInst, capoStrings ?? undefined)) : null,
    holes: harp ? n.midi.map(midiToHole) : null,
  }));
  notes.sort((a, b) => a.time - b.time);

  // Moved up from right before the highway's own resize/draw setup — the
  // practice timeline's note-preview strip needs this too (to place ticks
  // by pitch height, same as `yFor` below), and it only depends on `notes`.
  const allMidi = notes.flatMap((n) => n.midi);
  let loM = Math.min(...allMidi) - 3, hiM = Math.max(...allMidi) + 3;
  if (!isFinite(loM)) { loM = 48; hiM = 72; }
  if (hiM - loM < 12) { const mid = (hiM + loM) / 2; loM = mid - 6; hiM = mid + 6; }

  // ----- DOM -----
  const shell = el("div.play-shell");
  const canvas = el("canvas#highway-canvas") as HTMLCanvasElement;
  const overlay = el("div.play-overlay");
  const scoreBox = el("div.hud-box", { html: scoreHTML(0, 100, 0, 1) });
  const songBox = el("div.hud-box", {}, [
    el("div", { html: `<b>${esc(song.title)}</b>` }),
    el("div.muted", { style: { fontSize: "12px" }, html:
      `${esc(song.artist)} · key ${esc(song.key)} · ${song.bpm} BPM` + (capo ? ` · <span class="capo-note" style="padding:2px 8px">🔼 Capo ${capo}</span>` : "") }),
    parts.length > 1 ? el("div.muted", { style: { fontSize: "12px", marginTop: "2px" },
      text: `🎯 Your part: ${inst.name}` }) : null,
    (song.lyrics && song.lyrics.length)
      ? el("div.muted", { style: { fontSize: "12px", marginTop: "2px" }, text: `🎤 Singalong${song.genre ? " · " + song.genre : ""}` })
      : (song.genre ? el("div.muted", { style: { fontSize: "12px", marginTop: "2px" }, text: song.genre }) : null),
  ]);
  const healthWrap = el("div.healthbar-big", {}, [el("i", { style: { width: "100%" } })]);
  const killfeed = el("div.killfeed");
  const lyric = el("div.lyric-line");
  const banner = el("div.banner.hidden");

  const hud = el("div.play-hud", {}, [
    songBox,
    el("div.col", { style: { alignItems: "flex-end", gap: "8px" } }, [scoreBox, healthWrap]),
  ]);
  overlay.append(hud, killfeed, lyric, el("div.play-bottom-fade"), banner);

  // controls
  const playBtn = el("button.btn.primary", { onclick: togglePlay }, ["▶ Start"]);
  const restartBtn = el("button.btn", { onclick: restart }, ["⟲ Restart"]);
  const backBtn = el("button.btn.ghost", { onclick: () => host.onBack() }, ["← Songs"]);
  if (s.outputDeviceId) Audio.setOutputDevice(s.outputDeviceId);
  const player = new TrackPlayer();
  player.load(song, s.backingVolume, s.vocalVolume);
  player.setSpeed(rate);

  // ----- synth backing band -----
  const bandParts: SongPart[] = parts.filter((_, i) => i !== leadIdx);
  bandParts.push(...autoAccompaniment({ ...song, notes: lead.notes, instrument: playInst }, parts));
  const band = new Band(bandParts, { a4, volume: s.backingVolume });
  let bandOn = !band.empty && !player.backing && (s.band ?? true);
  const bandBtn = band.empty ? null : el("button.btn", {
    class: bandOn ? "primary" : "", title: "Synthesized accompaniment: " + band.names.join(", "),
    onclick: () => {
      bandOn = !bandOn; setSetting("band", bandOn);
      bandBtn!.classList.toggle("primary", bandOn);
      if (bandOn) band.seek(Math.max(0, clock)); else band.silence();
    },
  }, ["🎺 Band"]);

  const volB = slider({ label: "Backing", value: s.backingVolume, fmt: (v) => Math.round(v * 100) + "%",
    oninput: (v) => { setSetting("backingVolume", v); player.setBackingVolume(v); band.setVolume(v); } });
  const volV = slider({ label: "Vocal", value: s.vocalVolume, fmt: (v) => Math.round(v * 100) + "%",
    oninput: (v) => { setSetting("vocalVolume", v); player.setVocalVolume(v); } });
  const speedSlider = slider({ label: "Speed", min: 0.25, max: 1.25, step: 0.05, value: rate,
    fmt: (v) => Math.round(v * 100) + "%",
    oninput: (v) => { applyRate(v); setSetting("playbackSpeed", v); } });
  const metroBtn = el("button.btn", { onclick: () => { metro = !metro; metroBtn.classList.toggle("primary", metro); } }, ["🥁 Metronome"]);
  let metro = false;
  let noteSounds = s.noteSounds ?? true;
  const soundBtn = el("button.btn", { class: noteSounds ? "primary" : "", title: "Sound each note as it reaches the hit line", onclick: () => {
    noteSounds = !noteSounds; setSetting("noteSounds", noteSounds);
    soundBtn.classList.toggle("primary", noteSounds);
  } }, ["🔊 Notes"]);
  let showFrets = fretted || harp ? (s.showFingering ?? true) : false;
  const fretBtn = fretted || harp ? el("button.btn", { class: showFrets ? "primary" : "", title: harp ? "Show harmonica hole and breath direction" : "Show finger positions on a fretboard", onclick: () => {
    showFrets = !showFrets; setSetting("showFingering", showFrets);
    fretBtn!.classList.toggle("primary", showFrets);
    if (!playing) render(clock);
  } }, [harp ? "🎺 Holes" : "🎸 Frets"]) : null;
  const FRET_SIZE_ORDER = ["S", "M", "L"];
  let fretSize = FRET_SIZE_ORDER.includes(s.fretboardSize) ? s.fretboardSize : "M";
  const fretSizeBtn = (fretted || harp) ? el("button.btn", { title: "Fretboard/holes display size — click to cycle Small / Medium / Large", onclick: () => {
    fretSize = FRET_SIZE_ORDER[(FRET_SIZE_ORDER.indexOf(fretSize) + 1) % FRET_SIZE_ORDER.length];
    setSetting("fretboardSize", fretSize);
    fretSizeBtn!.textContent = `⚙ ${fretSize}`;
    if (!playing) render(clock);
  } }, [`⚙ ${fretSize}`]) : null;
  let strict = s.strictMode ?? false;
  const strictBtn = el("button.btn", { class: strict ? "primary" : "",
    title: "Miss or fumble a note and everything stops right there — nothing already played gets replayed, it just waits for you to get this one note, then eases back up to speed (no health/score hit while waiting)",
    onclick: () => { strict = !strict; setSetting("strictMode", strict); strictBtn.classList.toggle("primary", strict); } },
    ["☑ Repeat till right"]);

  // ----- practice timeline + Learn mode -----
  const timeline = createTimeline({
    duration,
    // row = pitch height, normalized across the song's own range (same
    // loM/hiM `yFor` below uses) — Classic's own highway is pitch-height,
    // not string-lanes, so this still matches "what's on the big" for it.
    notes: notes.flatMap((n) => n.midi.map((m) => ({ time: n.time, dur: n.dur, row: (m - loM) / (hiM - loM) }))),
    onSeek: (t) => { if (!learn.isActive) { rewindTo(t); if (!playing) render(clock); } },
    onSelect: (a, b) => { if (!learn.isActive) applySegment(a, b); },
  });
  const learn = createLearnMode({
    duration, beatLen,
    applySegment,
    rewindTo,
    getRate: () => rate,
    setRate: (v) => { applyRate(v); speedSlider.setValue(v); setSetting("playbackSpeed", v); },
    setLoop: (v) => { loopOn = v; loopBtn.classList.toggle("primary", v); },
    toast,
  });
  const segLabel = el("span.muted", { style: { fontSize: "12px", minWidth: "170px" }, text: "Full song" });
  const loopBtn = el("button.btn", { title: "Loop the selected segment (drag on the timeline to pick one)", onclick: () => {
    if (segEnd <= segStart) { toast("Drag on the timeline to mark a segment first", "bad"); return; }
    loopOn = !loopOn; loopBtn.classList.toggle("primary", loopOn);
    if (loopOn && (clock < segStart || clock > segEnd)) rewindTo(segStart);
  } }, ["🔁 Loop"]);
  const clearSegBtn = el("button.btn.ghost", { title: "Clear the practice segment (back to the full song)", onclick: () => {
    loopOn = false; loopBtn.classList.remove("primary");
    applySegment(0, duration);
  } }, ["✕"]) as HTMLButtonElement;
  const prevSegBtn = el("button.btn.ghost", { style: { display: "none" }, onclick: () => { learn.prev(); syncLearnUI(); } }, ["◀"]);
  const nextSegBtn = el("button.btn.ghost", { style: { display: "none" }, onclick: () => { learn.next(); syncLearnUI(); } }, ["▶"]);
  const learnBtn = el("button.btn", {
    title: "Split the song into segments and drill them one at a time — each segment starts slow and speeds up automatically once you're playing it cleanly",
    onclick: () => {
      const on = learn.toggle();
      learnBtn.classList.toggle("primary", on);
      clearSegBtn.disabled = on;
      prevSegBtn.style.display = nextSegBtn.style.display = on ? "" : "none";
      timeline.setInteractive(!on);
      syncLearnUI();
    },
  }, ["🎓 Learn"]);
  function syncLearnUI() {
    timeline.setSegments(learn.isActive ? learn.segments : null, learn.index);
    updateSegLabel();
  }
  const karaokeBtn = lyrics.length ? el("button.btn", { class: karaokeLyrics ? "primary" : "", title: "Word-by-word singalong highlight", onclick: () => {
    karaokeLyrics = !karaokeLyrics; setSetting("karaokeLyrics", karaokeLyrics);
    karaokeBtn!.classList.toggle("primary", karaokeLyrics);
    updateLyric(clock);
  } }, ["🎤 Karaoke"]) : null;

  const controls = el("div.play-controls", {}, [
    playBtn, restartBtn,
    el("div.muted", { style: { minWidth: "70px" }, id: "play-clock", text: "0:00" }),
    el("div", { style: { flex: "1" } }),
    (!player.hasAudio() && band.empty) ? el("span.muted", { style: { fontSize: "12px" }, text: "No backing audio — this song uses the synthesized band." }) : null,
    wrapNarrow(speedSlider),
    (player.backing || !band.empty) ? wrapNarrow(volB) : null,
    player.vocal ? wrapNarrow(volV) : null,
    karaokeBtn, bandBtn, soundBtn, fretBtn, fretSizeBtn, strictBtn, metroBtn, backBtn,
  ]);
  const controls2 = el("div.play-controls", { style: { marginTop: "6px" } }, [
    segLabel, loopBtn, clearSegBtn,
    el("div", { style: { flex: "1" } }),
    prevSegBtn, learnBtn, nextSegBtn,
  ]);

  shell.append(el("div.play-stage", {}, [canvas, overlay]), timeline.el, controls, controls2);
  root.appendChild(shell);
  const clockEl = controls.querySelector("#play-clock") as HTMLElement;

  // ----- canvas sizing -----
  const c = canvas.getContext("2d")!;
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  resize();

  // ----- game state -----
  let playing = false, started = false, finished = false;
  let clock = -LEAD_IN;
  let lastTs = 0;
  let health = 100, failed = false;
  let score = 0, streak = 0, maxStreak = 0, mult = 1;
  const counts: Record<Grade, number> = { perfect: 0, good: 0, off: 0, miss: 0 };
  let lastMetroBeat = -1;
  let soundIdx = 0;

  const tracker = new PitchTracker();
  const buf = new Float32Array(2048);
  let detectedMidi = -1;
  let lastRms = 0, onsetAt = -1, lastOnsetAt = -10;

  const PPS = () => Math.min(240, (W * 0.84) / 4) * speed;
  const HIT_X = () => W * 0.16;
  const yFor = (midi: number) => {
    const pad = 46;
    return H - pad - ((midi - loM) / (hiM - loM)) * (H - pad * 2);
  };

  async function ensureMic(): Promise<boolean> {
    if (Audio.micLive()) return true;
    try { await Audio.startMic(s.inputDeviceId); return true; }
    catch (e) { toast("Mic off — notes won't be graded. " + (e instanceof Error ? e.message : String(e)), "bad"); return false; }
  }

  async function togglePlay() {
    if (finished) { restart(); return; }
    if (playing) { pause(); return; }
    await ensureMic();
    await Audio.resume();
    playing = true; started = true;
    playBtn.textContent = "⏸ Pause";
    if (clock >= 0) player.play(clock);
    lastTs = performance.now();
    requestAnimationFrame(loop);
  }
  function pause() {
    playing = false; playBtn.textContent = "▶ Resume";
    player.pause(); band.silence();
  }
  function restart() {
    pause();
    finished = false; banner.classList.add("hidden");
    health = 100; failed = false; score = 0; streak = 0; maxStreak = 0; mult = 1;
    counts.perfect = counts.good = counts.off = counts.miss = 0;
    killfeed.innerHTML = "";
    if (loopOn) { rewindTo(segStart); render(clock); }
    else { clock = -LEAD_IN; notes.forEach((n) => { n.state = "pending"; n.best = 999; n.frames = 0; });
      soundIdx = 0; onsetAt = -1; lastOnsetAt = -10; lastRms = 0; player.seek(0); band.seek(0); render(0); }
    playBtn.textContent = "▶ Start";
    updateHud();
  }

  // ----- practice segment + playback-rate helpers -----
  function fmtSeg(a: number, b: number) { return `${fmtTime(a)}–${fmtTime(b)}`; }
  function updateSegLabel() {
    if (learn.isActive && learn.segments) segLabel.textContent = `Segment ${learn.index + 1}/${learn.segments.length} · ${fmtSeg(segStart, segEnd)}`;
    else if (segStart > 0 || segEnd < duration) segLabel.textContent = `Segment ${fmtSeg(segStart, segEnd)}`;
    else segLabel.textContent = "Full song";
  }
  function applySegment(start: number, end: number) {
    segStart = Math.max(0, start); segEnd = Math.min(duration, end);
    timeline.setSelection(segStart > 0 || segEnd < duration ? segStart : null, segStart > 0 || segEnd < duration ? segEnd : null);
    updateSegLabel();
  }
  function rewindTo(target: number) {
    clock = Math.max(0, target);
    for (const n of notes) if (n.time >= clock - 0.001) { n.state = "pending"; n.best = 999; n.frames = 0; }
    soundIdx = notes.findIndex((n) => n.time >= clock);
    if (soundIdx < 0) soundIdx = notes.length;
    onsetAt = -1; lastOnsetAt = -10; lastRms = 0;
    lastMetroBeat = Math.floor(clock / beatLen);
    player.seek(clock);
    band.seek(clock);
  }
  function setEffRate(v: number) { effRate = v; player.setSpeed(v); }
  function applyRate(v: number) { rate = v; retryPhase = null; setEffRate(v); }
  const RETRY_SLOW_FACTOR = 0.55;
  const RETRY_RAMP_MS = 600;
  function beginTempoRamp() {
    const now = performance.now();
    const slow = Math.max(0.2, rate * RETRY_SLOW_FACTOR);
    retryPhase = { from: slow, until: now, rampUntil: now + RETRY_RAMP_MS };
    setEffRate(slow);
  }

  function readPitch() {
    if (!Audio.readTimeDomain(buf)) return;
    const { freq, rms } = detectPitch(buf, Audio.ctx().sampleRate, s.micGate);
    if (percussion) {
      if (rms > s.micGate * 3 && rms > lastRms * 2 && clock - lastOnsetAt > 0.09) { onsetAt = clock; lastOnsetAt = clock; }
      lastRms = rms;
    }
    const f = tracker.push(freq, a4);
    detectedMidi = f > 0 ? freqToMidiFloat(f, a4) : -1;
  }

  // ----- main loop -----
  function loop(ts: number) {
    if (!playing) return;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    if (waitingFor) {
      readPitch();
      checkWaitingPitch();
      timeline.setPlayhead(Math.max(0, clock));
      render(clock);
      updateHud();
      requestAnimationFrame(loop);
      return;
    }

    if (retryPhase) {
      if (ts >= retryPhase.rampUntil) { retryPhase = null; setEffRate(rate); }
      else setEffRate(retryPhase.from + (rate - retryPhase.from) * ((ts - retryPhase.until) / RETRY_RAMP_MS));
    }

    if (player.hasAudio() && clock >= 0 && player.backing && !player.backing.paused) {
      clock = player.backing.currentTime;
    } else {
      clock += dt * effRate;
      if (clock >= 0 && player.hasAudio() && (player.backing?.paused)) player.play(clock);
    }

    if (bandOn) band.schedule(clock, effRate);

    if (metro) {
      const beat = Math.floor(clock / beatLen);
      if (beat !== lastMetroBeat && clock >= -LEAD_IN) { Synth.click({ accent: beat % 4 === 0 }); lastMetroBeat = beat; }
    }

    while (soundIdx < notes.length && notes[soundIdx].time <= clock) {
      const n = notes[soundIdx++];
      if (noteSounds && clock - n.time < 0.3) {
        for (const m of n.midi) Synth.playMidi(m, { dur: Math.max(0.4, Math.min(n.dur, 2)), a4, gain: 0.18, instrument: playInst });
      }
    }

    readPitch();
    grade();

    if (loopOn && clock > segEnd) {
      if (learn.isActive) learn.evaluatePass();
      rewindTo(segStart);
    }

    timeline.setPlayhead(Math.max(0, clock));
    render(clock);
    updateHud();

    clockEl.textContent = fmtTime(Math.max(0, clock)) + " / " + fmtTime(duration);

    if (clock > duration + 1.2) { finish(); return; }
    requestAnimationFrame(loop);
  }

  // ----- grading -----
  function grade() {
    if (percussion) {
      if (onsetAt >= 0) {
        let best: PlayNote | null = null;
        for (const n of notes) {
          if (n.state !== "pending") continue;
          if (n.time - HIT_PAD > onsetAt) break;
          if (onsetAt <= n.time + n.dur + HIT_PAD &&
              (!best || Math.abs(n.time - onsetAt) < Math.abs(best.time - onsetAt))) best = n;
        }
        if (best) { best.frames++; best.best = Math.min(best.best, Math.abs(best.time - onsetAt)); }
        onsetAt = -1;
      }
      for (const n of notes) {
        if (n.state !== "pending") continue;
        if (clock < n.time - HIT_PAD) break;
        if (clock > n.time + n.dur + HIT_PAD) finalize(n);
      }
      return;
    }
    for (const n of notes) {
      if (n.state !== "pending") continue;
      const winStart = n.time - HIT_PAD;
      const winEnd = n.time + n.dur + HIT_PAD;
      if (clock < winStart) break;
      if (clock > winEnd) { finalize(n); continue; }
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
  function finalize(n: PlayNote) {
    let q: Grade;
    if (percussion) {
      if (n.frames && n.best <= 0.07) q = "perfect";
      else if (n.frames && n.best <= 0.15) q = "good";
      else if (n.frames) q = "off";
      else q = "miss";
    } else if (n.frames >= 2 && n.best <= PERFECT_CENTS) q = "perfect";
    else if (n.frames >= 1 && n.best <= GOOD_CENTS) q = "good";
    else if (n.frames >= 1) q = "off";
    else q = "miss";
    if (strict && (q === "off" || q === "miss")) { retry(n); return; }
    n.state = q;
    applyJudgment(q, n);
  }
  function retry(n: PlayNote) {
    rewindTo(n.time);
    player.pause(); band.silence();
    waitingFor = n;
    toast("Get this note, then we'll continue", "bad");
  }
  function checkWaitingPitch() {
    const n = waitingFor!;
    if (percussion) {
      if (onsetAt >= 0) { onsetAt = -1; resolveWait(n, "good"); }
      return;
    }
    if (detectedMidi <= 0) return;
    let bestCents = 999;
    for (const target of n.midi) {
      const diff = detectedMidi - target;
      const cents = Math.abs((diff - Math.round(diff / 12) * 12) * 100);
      if (cents < bestCents) bestCents = cents;
    }
    if (bestCents < GOOD_CENTS) resolveWait(n, bestCents <= PERFECT_CENTS ? "perfect" : "good");
  }
  function resolveWait(n: PlayNote, q: Grade) {
    waitingFor = null;
    n.state = q;
    applyJudgment(q, n);
    beginTempoRamp();
    if (clock >= 0) player.play(clock);
  }
  function applyJudgment(q: Grade, n: PlayNote) {
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
  }
  function pushKill(q: Grade, n: PlayNote) {
    const label = describeMidiSet(n.midi);
    const k = el(`div.kill.${q}`, { html: `${q[0].toUpperCase() + q.slice(1)} <span class="muted">${esc(label)}</span>` });
    killfeed.appendChild(k);
    while (killfeed.children.length > 6) killfeed.firstChild!.remove();
    setTimeout(() => { k.style.opacity = "0"; k.style.transition = "opacity 500ms"; }, 1400);
    setTimeout(() => k.remove(), 2000);
  }

  // ----- rendering -----
  function render(t: number) {
    drawBackground(c, W, H, song.background, Math.max(0, t), duration);
    c.fillStyle = "rgba(0,0,0,0.28)"; c.fillRect(0, 0, W, H);

    const hitX = HIT_X(), pps = PPS();

    c.strokeStyle = getVar("--highway-line"); c.lineWidth = 1; c.font = `10px ${getVar("--mono")}`; c.fillStyle = getVar("--muted");
    for (let m = Math.ceil(loM / 12) * 12; m <= hiM; m += 12) {
      const y = yFor(m); c.globalAlpha = 0.5; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
      c.globalAlpha = 1; c.fillText(midiToName(m).full, 4, y - 3);
    }

    c.globalAlpha = 1;
    const grd = c.createLinearGradient(hitX - 30, 0, hitX + 30, 0);
    grd.addColorStop(0, "rgba(255,255,255,0)"); grd.addColorStop(0.5, getVar("--accent")); grd.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = grd; c.fillRect(hitX - 30, 0, 60, H);
    c.strokeStyle = getVar("--accent"); c.lineWidth = 2; c.beginPath(); c.moveTo(hitX, 0); c.lineTo(hitX, H); c.stroke();

    for (const n of notes) {
      const x = hitX + (n.time - t) * pps;
      const wRect = Math.max(16, n.dur * pps);
      if (x + wRect < -20 || x > W + 40) continue;
      for (const midi of n.midi) {
        const y = yFor(midi);
        drawNote(x, y, wRect, n.state, midi, !!n.chord);
      }
    }

    if (!percussion && detectedMidi > 0) {
      const y = yFor(detectedMidi);
      c.fillStyle = getVar("--accent-2");
      c.beginPath(); c.arc(hitX, y, 7, 0, 7); c.fill();
      c.globalAlpha = 0.3; c.fillRect(0, y - 1.5, hitX, 3); c.globalAlpha = 1;
    }

    if (showFrets) (harp ? drawHoles : drawFretboard)(t);

    if (t < 0) {
      const n = Math.ceil(-t);
      c.fillStyle = getVar("--text"); c.font = `bold 120px ${getVar("--font")}`; c.textAlign = "center";
      c.globalAlpha = (1 - (Math.abs(t) % 1)) * 0.9 + 0.1;
      c.fillText(String(n), W / 2, H / 2 + 40); c.globalAlpha = 1; c.textAlign = "start";
    }

    updateLyric(t);
  }

  function drawNote(x: number, y: number, w: number, state: Grade | "pending", midi: number, chord: boolean) {
    const h = 26;
    const colors: Record<string, string> = { pending: getVar("--accent"), perfect: getVar("--j-perfect"),
      good: getVar("--j-good"), off: getVar("--j-off"), miss: getVar("--j-miss") };
    const col = colors[state] || colors.pending;
    c.globalAlpha = state === "miss" ? 0.35 : 1;
    roundRect(x, y - h / 2, w, h, 8);
    const g = c.createLinearGradient(x, y - h / 2, x, y + h / 2);
    g.addColorStop(0, col); g.addColorStop(1, shade(col, -0.25));
    c.fillStyle = g; c.fill();
    if (state === "pending") { c.shadowColor = col; c.shadowBlur = 10; c.fill(); c.shadowBlur = 0; }
    c.globalAlpha = 1;
    c.fillStyle = "rgba(0,0,0,0.8)"; c.font = `bold 11px ${getVar("--font")}`;
    const lbl = chord ? "" : midiToName(midi).name;
    if (lbl && w > 22) c.fillText(lbl, x + 5, y + 4);
  }

  const FRET_SCALE: Record<string, number> = { S: 0.78, M: 1, L: 1.3 };
  // Standard fretboard inlay positions (single dots, 12th doubled) — used
  // both for the numeric labels below the diagram's neck and the actual
  // inlay dots drawn on it. No 24: real necks mark up to 21 (sometimes a
  // double dot at 24 on extended-range instruments, but that's the
  // exception, not the convention this list should default to).
  const FRET_MARKERS = [3, 5, 7, 9, 12, 15, 17, 19, 21];
  function drawFretboard(t: number) {
    const cur = notes.find((n) => n.frets && t <= n.time + n.dur);
    if (!cur) return;
    const sc = FRET_SCALE[fretSize] || 1;
    const now = t >= cur.time - 0.05;
    const nStr = inst.strings.length;
    // Was a flat 12 (bug: a chord up the neck drew its dot off the edge of
    // the panel). Briefly sized to whatever the *current* chord needed —
    // by request ("хочу полностью видеть" — I want to see it in full),
    // now always the instrument's own full fret count instead, so the
    // whole neck is there regardless of which chord happens to be showing
    // at the moment, not just the frets a low-fret song ever touches.
    // `fbW` grows to match, roughly keeping each fret the same width
    // rather than cramming more of them into the old fixed panel — still
    // bounded by `W * 0.42`, so a genuinely long neck compresses
    // gracefully instead of overflowing.
    const FRETS = inst.frets || 12;
    const fbW = Math.min(340 * (FRETS / 12), W * 0.42) * sc, fbH = (6 + nStr * 13) * sc;
    const x0 = 22, y0 = H - fbH - 44 * sc;
    const nutX = x0 + 22 * sc, cell = (fbW - 30 * sc) / FRETS;
    c.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(x0 - 10 * sc, y0 - 24 * sc, fbW + 20 * sc, fbH + 44 * sc, 10); c.fill();
    c.fillStyle = now ? getVar("--accent") : getVar("--muted");
    c.font = `bold ${Math.round(12 * sc)}px ${getVar("--font")}`;
    c.fillText((now ? "Now: " : "Next: ") + describeMidiSet(cur.midi) + (capo ? ` · capo ${capo}` : ""), x0, y0 - 8 * sc);
    const sy = (si: number) => y0 + fbH - 6 * sc - si * 13 * sc;
    c.lineWidth = 1;
    c.strokeStyle = "rgba(255,255,255,0.4)";
    for (let si = 0; si < nStr; si++) { const y = sy(si); c.beginPath(); c.moveTo(nutX, y); c.lineTo(nutX + cell * FRETS, y); c.stroke(); }
    c.fillStyle = getVar("--muted"); c.font = `${Math.round(10 * sc)}px ${getVar("--mono")}`;
    for (let si = 0; si < nStr; si++) c.fillText(stringLabel(playInst, inst.strings, si, s.stringLabels), x0 - 2, sy(si) + 3 * sc);
    for (let f = 0; f <= FRETS; f++) {
      const x = nutX + f * cell;
      c.strokeStyle = f === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)";
      c.lineWidth = f === 0 ? 3 : 1;
      c.beginPath(); c.moveTo(x, sy(nStr - 1) - 5 * sc); c.lineTo(x, sy(0) + 5 * sc); c.stroke();
    }
    // Real fretboard inlay dots, drawn on the neck itself (between the
    // strings) — separate from the numeric labels below and from the
    // played-note dots. Standard positions and the 12th's double dot.
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
      c.fillText(String(f + capo), nutX + (f - 0.5) * cell - 3, sy(0) + 14 * sc);
    }
    const col = now ? getVar("--accent") : "rgba(255,255,255,0.75)";
    for (const pos of cur.frets!) {
      if (!pos) continue;
      const y = sy(pos.string);
      if (pos.fret === 0) {
        c.strokeStyle = col; c.lineWidth = 2;
        c.beginPath(); c.arc(nutX - 9 * sc, y, 4 * sc, 0, 7); c.stroke();
      } else {
        const x = nutX + (pos.fret - 0.5) * cell;
        c.fillStyle = col; c.beginPath(); c.arc(x, y, 6.5 * sc, 0, 7); c.fill();
        const lbl = String(pos.fret + capo);
        c.fillStyle = "rgba(0,0,0,0.85)"; c.font = `bold ${Math.round(9 * sc)}px ${getVar("--mono")}`;
        c.fillText(lbl, x - lbl.length * 2.5, y + 3 * sc);
      }
    }
  }

  function drawHoles(t: number) {
    const cur = notes.find((n) => n.holes && t <= n.time + n.dur);
    if (!cur) return;
    const sc = FRET_SCALE[fretSize] || 1;
    const now = t >= cur.time - 0.05;
    const cell = 28 * sc, x0 = 22, fbW = 10 * cell + 4 * sc, fbH = 56 * sc;
    const y0 = H - fbH - 44 * sc;
    c.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(x0 - 10 * sc, y0 - 24 * sc, fbW + 20 * sc, fbH + 34 * sc, 10); c.fill();
    const played = cur.holes!.filter((h): h is HoleTarget => !!h);
    const label = played.length
      ? played.map((p) => `hole ${p.hole} ${p.draw ? "draw ↓" : "blow ↑"}`).join(" · ")
      : "not on a C harp";
    c.fillStyle = now ? getVar("--accent") : getVar("--muted");
    c.font = `bold ${Math.round(12 * sc)}px ${getVar("--font")}`;
    c.fillText((now ? "Now: " : "Next: ") + describeMidiSet(cur.midi) + " — " + label, x0, y0 - 8 * sc);
    const col = now ? getVar("--accent") : "rgba(255,255,255,0.75)";
    for (let i = 0; i < 10; i++) {
      const x = x0 + i * cell;
      const p = played.find((h) => h.hole === i + 1);
      roundRect(x, y0, cell - 5 * sc, 34 * sc, 5);
      if (p) { c.fillStyle = col; c.fill(); }
      c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 1; c.stroke();
      c.fillStyle = p ? "rgba(0,0,0,0.85)" : getVar("--muted");
      c.font = `bold ${Math.round(11 * sc)}px ${getVar("--mono")}`;
      const num = String(i + 1);
      c.fillText(num, x + (cell - 5 * sc) / 2 - num.length * 3, y0 + 21 * sc);
      if (p) {
        c.fillStyle = col; c.font = `bold ${Math.round(14 * sc)}px ${getVar("--font")}`;
        c.fillText(p.draw ? "↓" : "↑", x + (cell - 5 * sc) / 2 - 4, y0 + 52 * sc);
      }
    }
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    r = Math.min(r, h / 2, w / 2);
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  function updateLyric(t: number) {
    if (!lyrics.length) { lyric.innerHTML = ""; return; }
    if (karaokeLyrics && lyricTimeline) {
      const a = activeAt(lyricTimeline, t);
      const lines = lyricTimeline.lines;
      const cur = a.lineIdx >= 0 ? lineFillHTML(lines[a.lineIdx], a.wordIdx, a.wordProgress) : "";
      const nIdx = a.lineIdx >= 0 ? a.lineIdx + 1 : 0;
      const next = lines[nIdx] ? esc(lines[nIdx].text) : "";
      lyric.innerHTML =
        `<div style="font-size:26px;line-height:1.2;font-weight:700">${cur}</div>` +
        (next ? `<div style="font-size:15px;opacity:.55;margin-top:2px">${next}</div>` : "");
      return;
    }
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) { if (t >= lyrics[i].time) idx = i; else break; }
    const cur = idx >= 0 ? lyrics[idx].text : "";
    const next = lyrics[idx + 1] ? lyrics[idx + 1].text : "";
    lyric.innerHTML =
      `<div style="font-size:26px;line-height:1.2">${esc(cur)}</div>` +
      (next ? `<div style="font-size:15px;opacity:.55;margin-top:2px">${esc(next)}</div>` : "");
  }

  function updateHud() {
    const acc = accuracy();
    scoreBox.innerHTML = scoreHTML(score, Math.round(health), streak, mult, acc, failed);
    (healthWrap.firstChild as HTMLElement).style.width = health + "%";
  }
  function accuracy() {
    const total = counts.perfect + counts.good + counts.off + counts.miss;
    if (!total) return 100;
    return Math.round(((counts.perfect + counts.good * 0.6) / total) * 100);
  }

  function finish() {
    finished = true; playing = false; player.pause(); band.silence();
    playBtn.textContent = "⟲ Play again";
    const acc = accuracy();
    const passed = !failed && acc >= 60;
    const grade = gradeLetter(acc, failed);
    const entry = {
      ts: Date.now(), songId: song.id ?? "", songTitle: song.title, instrument: playInst,
      score, accuracy: acc, maxStreak, passed, durationSec: Math.round(duration),
      notes: { ...counts },
    };
    host.addHistory(entry);
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
        el("button.btn.primary", { onclick: restart }, ["⟲ Play again"]),
        el("button.btn", { onclick: () => host.onBack() }, ["← Songs"]),
      ]),
    ]));
    banner.classList.remove("hidden");
  }

  const onKey = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (e.code === "Space" && !target?.closest("input,select,textarea,button")) { e.preventDefault(); togglePlay(); }
  };
  window.addEventListener("keydown", onKey);

  render(-LEAD_IN); updateHud();

  return () => {
    playing = false; ro.disconnect(); timeline.destroy(); player.stop(); band.stop(); Audio.stopMic();
    window.removeEventListener("keydown", onKey);
  };
}

// ---------- helpers ----------
function wrapNarrow(node: HTMLElement): HTMLElement { node.style.minWidth = "150px"; return node; }
function miniStat(num: number | string, label: string): HTMLElement {
  return el("div.stat", {}, [el("div.num", { text: String(num) }), el("div.lbl", { text: label })]);
}
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
function shade(hex: string, amt: number): string {
  hex = (hex || "#6ea8fe").trim();
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.min(255, Math.round(r * (1 + amt))));
  g = Math.max(0, Math.min(255, Math.round(g * (1 + amt))));
  b = Math.max(0, Math.min(255, Math.round(b * (1 + amt))));
  return `rgb(${r},${g},${b})`;
}
