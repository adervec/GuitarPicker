// The Karaoke stage engine: teleprompter with word-by-word fill, per-line
// count-in, backing playback + optional guide vocal, optional sing-and-score
// (mic pitch graded against the vocal melody via the shared Grader). Ported
// near-verbatim from the vanilla app's views/karaoke.js `stage()` — same
// imperative-engine reasoning as features/play-song (see its header comment).
//
// Deliberately NOT ported: the player-avatar HUD badge and navigation to
// Progress (routes that don't exist in this pilot).
import { el, slider, toast, fmtTime, getVar } from "@/shared/lib/dom";
import { audioEngine as Audio } from "@/shared/lib/audio-engine";
import { detectPitch, PitchTracker } from "@/shared/lib/pitch";
import { TrackPlayer } from "@/shared/lib/track-player";
import { Band } from "@/shared/lib/band";
import { songDuration, songParts } from "@/entities/song/model/song-format";
import { autoAccompaniment } from "@/shared/lib/accompany";
import { freqToMidiFloat, midiToName } from "@/shared/lib/note-math";
import { drawBackground } from "@/shared/lib/backgrounds";
import { buildLyricTimeline, activeAt, timelineDuration } from "@/shared/lib/karaoke-timeline";
import { Grader, gradeLetter, vocalTargets, type GradeTarget } from "@/shared/lib/karaoke-grader";
import { lineFillHTML, escapeHTML as esc } from "@/shared/lib/karaoke-render";
import type { EngineHost } from "@/shared/lib/player-settings";

const LEAD_IN = 3.0;
const HIT_PAD = 0.16;
const GAP_COUNTIN = 4.0;

/**
 * root: the DOM node to mount into.
 * host: { song, settings, setSetting(k,v), addHistory(entry), onBack() }
 * Returns a cleanup function, or null if the song has no lyrics to sing
 * (caller should show its own "no lyrics" state in that case — see
 * views/karaoke/ui/KaraokePage.tsx, which checks before calling this).
 */
export function createKaraokeEngine(root: HTMLElement, host: EngineHost): (() => void) | null {
  const { song } = host;
  const s = host.settings;
  const setSetting = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => { s[k] = v; host.setSetting(k, v); };
  const a4 = s.a4;
  let rate = s.playbackSpeed || 1;
  const timeline = buildLyricTimeline(song);
  if (!timeline.lines.length) return null;

  const targets: GradeTarget[] = vocalTargets(song)
    .map((n) => ({ time: n.time, dur: n.dur || 0.4, midi: n.midi, state: "pending" as const, best: 999, frames: 0 }))
    .sort((a, b) => a.time - b.time);

  const lyricEnd = timelineDuration(timeline);
  const noteEnd = targets.reduce((m, n) => Math.max(m, n.time + n.dur), 0);
  const duration = Math.max(lyricEnd, noteEnd, songDuration(song));

  let scoring = (s.karaokeScoring ?? true) && targets.length > 0;

  // ----- DOM -----
  const shell = el("div.play-shell.kara-shell");
  const canvas = el("canvas#kara-canvas") as HTMLCanvasElement;
  const overlay = el("div.play-overlay");

  const scoreBox = el("div.hud-box", { html: scoreHTML(0, 100, 0, 1, 100, false) });
  const songBox = el("div.hud-box", {}, [
    el("div", { html: `<b>${esc(song.title)}</b>` }),
    el("div.muted", { style: { fontSize: "12px" }, text: `${song.artist} · ${song.key} · ${song.bpm} BPM` }),
  ]);
  const healthWrap = el("div.healthbar-big", {}, [el("i", { style: { width: "100%" } })]);
  const hud = el("div.play-hud", {}, [
    songBox,
    el("div.col", { style: { alignItems: "flex-end", gap: "8px" } }, [scoreBox, healthWrap]),
  ]);
  if (!scoring) { scoreBox.style.display = "none"; healthWrap.style.display = "none"; }

  const stageEl = el("div.kara-stage", {}, [
    el("div.kara-countin", { id: "kara-countin" }),
    el("div.kara-prev"), el("div.kara-cur"), el("div.kara-next"), el("div.kara-next2"),
  ]);
  const banner = el("div.banner.hidden");
  overlay.append(hud, stageEl, banner);

  // ----- controls -----
  const playBtn = el("button.btn.primary", { onclick: togglePlay }, ["▶ Start"]);
  const restartBtn = el("button.btn", { onclick: restart }, ["⟲ Restart"]);
  const backBtn = el("button.btn.ghost", { onclick: () => host.onBack() }, ["← Songs"]);

  if (s.outputDeviceId) Audio.setOutputDevice(s.outputDeviceId);
  const player = new TrackPlayer();
  player.load(song, s.backingVolume, s.vocalVolume);
  player.setSpeed(rate);
  let guide = !!player.vocal;

  const allParts = songParts(song);
  const band = new Band([...allParts, ...autoAccompaniment(song, allParts)], { a4, volume: s.backingVolume });
  let bandOn = !band.empty && !player.backing && (s.band ?? true);
  const bandBtn = band.empty ? null : el("button.btn", {
    class: bandOn ? "primary" : "", title: "Synthesized accompaniment: " + band.names.join(", "),
    onclick: () => {
      bandOn = !bandOn; setSetting("band", bandOn);
      bandBtn!.classList.toggle("primary", bandOn);
      if (bandOn) band.seek(Math.max(0, clock)); else band.silence();
    },
  }, ["🎺 Band"]);

  const volB = slider({ label: "Music", value: s.backingVolume, fmt: (v) => Math.round(v * 100) + "%",
    oninput: (v) => { setSetting("backingVolume", v); player.setBackingVolume(v); band.setVolume(v); } });
  const speedSlider = slider({ label: "Speed", min: 0.25, max: 1.25, step: 0.05, value: rate,
    fmt: (v) => Math.round(v * 100) + "%",
    oninput: (v) => { rate = v; setSetting("playbackSpeed", v); player.setSpeed(v); } });
  const guideBtn = el("button.btn", { class: guide ? "primary" : "", onclick: () => {
    guide = !guide; guideBtn.classList.toggle("primary", guide);
    player.setVocalVolume(guide ? (s.vocalVolume || 0.7) : 0);
  } }, ["🎙️ Guide vocal"]);
  const scoreBtn = el("button.btn", { class: scoring ? "primary" : "", onclick: () => {
    if (!targets.length) { toast("This song has no vocal melody to score.", "bad"); return; }
    scoring = !scoring; setSetting("karaokeScoring", scoring);
    scoreBtn.classList.toggle("primary", scoring);
    scoreBox.style.display = healthWrap.style.display = scoring ? "" : "none";
  } }, ["🎯 Score my singing"]);

  const controls = el("div.play-controls", {}, [
    playBtn, restartBtn,
    el("div.muted", { style: { minWidth: "92px" }, id: "kara-clock", text: "0:00" }),
    el("div", { style: { flex: "1" } }),
    (!player.hasAudio() && band.empty) ? el("span.muted", { style: { fontSize: "12px" }, text: "No backing audio — this song uses the synthesized band." }) : null,
    wrapNarrow(speedSlider),
    (player.backing || !band.empty) ? wrapNarrow(volB) : null,
    player.vocal ? guideBtn : null,
    bandBtn, scoreBtn, backBtn,
  ]);
  if (!guide) player.setVocalVolume(0);

  shell.append(el("div.play-stage", {}, [canvas, overlay]), controls);
  root.appendChild(shell);
  const clockEl = controls.querySelector("#kara-clock") as HTMLElement;
  const countinEl = stageEl.querySelector("#kara-countin") as HTMLElement;
  const prevEl = stageEl.querySelector(".kara-prev") as HTMLElement;
  const curEl = stageEl.querySelector(".kara-cur") as HTMLElement;
  const nextEl = stageEl.querySelector(".kara-next") as HTMLElement;
  const next2El = stageEl.querySelector(".kara-next2") as HTMLElement;

  // ----- canvas -----
  const c = canvas.getContext("2d")!;
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  const allMidi = targets.flatMap((n) => n.midi);
  let loM = Math.min(...allMidi) - 2, hiM = Math.max(...allMidi) + 2;
  if (!isFinite(loM)) { loM = 55; hiM = 72; }
  if (hiM - loM < 10) { const mid = (hiM + loM) / 2; loM = mid - 5; hiM = mid + 5; }

  // ----- state -----
  let playing = false, finished = false;
  let clock = -LEAD_IN, lastTs = 0;
  let detectedMidi = -1;
  const grader = new Grader();
  const tracker = new PitchTracker();
  const buf = new Float32Array(2048);

  async function ensureMic(): Promise<boolean> {
    if (!scoring) return true;
    if (Audio.micLive()) return true;
    try { await Audio.startMic(s.inputDeviceId); return true; }
    catch (e) { toast("Mic off — singing won't be scored. " + (e instanceof Error ? e.message : String(e)), "bad"); return false; }
  }
  async function togglePlay() {
    if (finished) { restart(); return; }
    if (playing) { pause(); return; }
    await ensureMic();
    await Audio.resume();
    playing = true; playBtn.textContent = "⏸ Pause";
    if (clock >= 0) player.play(clock);
    lastTs = performance.now();
    requestAnimationFrame(loop);
  }
  function pause() { playing = false; playBtn.textContent = "▶ Resume"; player.pause(); band.silence(); }
  function restart() {
    pause();
    finished = false; banner.classList.add("hidden");
    clock = -LEAD_IN; detectedMidi = -1;
    grader.reset();
    targets.forEach((n) => { n.state = "pending"; n.best = 999; n.frames = 0; });
    player.seek(0); band.seek(0); playBtn.textContent = "▶ Start";
    render(-LEAD_IN); updateHud();
  }

  // ----- main loop -----
  function loop(ts: number) {
    if (!playing) return;
    const dt = Math.min(0.05, (ts - lastTs) / 1000); lastTs = ts;
    if (player.hasAudio() && clock >= 0 && player.backing && !player.backing.paused) {
      clock = player.backing.currentTime;
    } else {
      clock += dt * rate;
      if (clock >= 0 && player.hasAudio() && player.backing?.paused) player.play(clock);
    }
    if (bandOn) band.schedule(clock, rate);
    if (scoring && Audio.readTimeDomain(buf)) {
      const { freq } = detectPitch(buf, Audio.ctx().sampleRate, s.micGate);
      const f = tracker.push(freq, a4);
      detectedMidi = f > 0 ? freqToMidiFloat(f, a4) : -1;
    }
    if (scoring) grade();
    render(clock); updateHud();
    clockEl.textContent = fmtTime(Math.max(0, clock)) + " / " + fmtTime(duration);
    if (clock > duration + 1.2) { finish(); return; }
    requestAnimationFrame(loop);
  }

  function grade() {
    for (const n of targets) {
      if (n.state !== "pending") continue;
      const winStart = n.time - HIT_PAD, winEnd = n.time + n.dur + HIT_PAD;
      if (clock < winStart) break;
      if (clock > winEnd) { grader.finalize(n); continue; }
      grader.observe(n, detectedMidi);
    }
  }

  // ----- rendering -----
  function render(t: number) {
    drawBackground(c, W, H, song.background, Math.max(0, t), duration);
    c.fillStyle = "rgba(0,0,0,0.42)"; c.fillRect(0, 0, W, H);
    if (scoring) drawRibbon(t);
    if (t < 0) {
      const n = Math.ceil(-t);
      c.fillStyle = getVar("--text"); c.font = `bold 120px ${getVar("--font")}`; c.textAlign = "center";
      c.globalAlpha = (1 - (Math.abs(t) % 1)) * 0.9 + 0.1;
      c.fillText(String(n), W / 2, H / 2); c.globalAlpha = 1; c.textAlign = "start";
    }
    updateLyrics(t);
  }

  function drawRibbon(t: number) {
    const top = H - 120, h = 96;
    const hitX = W * 0.18, pps = 150;
    const yFor = (m: number) => top + h - ((m - loM) / (hiM - loM)) * h;
    c.globalAlpha = 0.25; c.fillStyle = getVar("--panel"); c.fillRect(0, top, W, h); c.globalAlpha = 1;
    c.strokeStyle = getVar("--accent"); c.lineWidth = 2; c.beginPath(); c.moveTo(hitX, top); c.lineTo(hitX, top + h); c.stroke();
    const colors: Record<string, string> = { pending: getVar("--accent"), perfect: getVar("--j-perfect"),
      good: getVar("--j-good"), off: getVar("--j-off"), miss: getVar("--j-miss") };
    for (const n of targets) {
      const x = hitX + (n.time - t) * pps, w = Math.max(10, n.dur * pps);
      if (x + w < -10 || x > W + 20) continue;
      for (const m of n.midi) {
        const y = yFor(m);
        c.globalAlpha = n.state === "miss" ? 0.3 : 0.95;
        c.fillStyle = colors[n.state ?? "pending"] || colors.pending;
        roundRect(x, y - 5, w, 10, 5); c.fill();
      }
    }
    c.globalAlpha = 1;
    if (detectedMidi > 0) {
      const m = Math.max(loM, Math.min(hiM, detectedMidi));
      c.fillStyle = getVar("--accent-2"); c.beginPath(); c.arc(hitX, yFor(m), 6, 0, 7); c.fill();
      c.fillStyle = getVar("--muted"); c.font = `10px ${getVar("--mono")}`;
      c.fillText(midiToName(Math.round(detectedMidi)).full, hitX + 10, yFor(m) - 8);
    }
  }
  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    r = Math.min(r, h / 2, w / 2); c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // ----- teleprompter -----
  function updateLyrics(t: number) {
    const a = activeAt(timeline, t);
    const lines = timeline.lines;
    const curIdx = a.lineIdx;
    prevEl.innerHTML = curIdx > 0 ? esc(lines[curIdx - 1].text) : "";
    curEl.innerHTML = curIdx >= 0 ? lineFillHTML(lines[curIdx], a.wordIdx, a.wordProgress) : "";
    const nIdx = curIdx >= 0 ? curIdx + 1 : 0;
    nextEl.innerHTML = lines[nIdx] ? esc(lines[nIdx].text) : "";
    next2El.innerHTML = lines[nIdx + 1] ? esc(lines[nIdx + 1].text) : "";

    const upcoming = lines[nIdx];
    let dots = "";
    if (upcoming) {
      const until = upcoming.time - t;
      const inGap = curIdx < 0 || t >= lines[curIdx].end;
      if (inGap && until > 0.2 && until <= GAP_COUNTIN) {
        const beat = 60 / (song.bpm || 90);
        const n = Math.max(1, Math.min(6, Math.ceil(until / beat)));
        dots = "●".repeat(n);
      }
    }
    countinEl.textContent = dots;
  }

  function updateHud() {
    if (!scoring) return;
    scoreBox.innerHTML = scoreHTML(grader.score, Math.round(grader.health), grader.streak, grader.mult, grader.accuracy(), grader.failed);
    (healthWrap.firstChild as HTMLElement).style.width = grader.health + "%";
  }

  function finish() {
    finished = true; playing = false; player.pause(); band.silence();
    playBtn.textContent = "⟲ Sing again";
    if (!scoring) { showBanner(null, 0, false, false); return; }
    const acc = grader.accuracy();
    const passed = !grader.failed && acc >= 60;
    const entry = {
      ts: Date.now(), songId: song.id ?? "", songTitle: song.title, instrument: "voice",
      score: grader.score, accuracy: acc, maxStreak: grader.maxStreak, passed,
      durationSec: Math.round(duration), notes: { ...grader.counts }, mode: "karaoke",
    };
    host.addHistory(entry);
    showBanner(gradeLetter(acc, grader.failed), acc, passed, true);
  }
  function showBanner(grade: string | null, acc: number, passed: boolean, scored: boolean) {
    banner.innerHTML = "";
    const stats = scored ? el("div.grid.cards", { style: { margin: "14px 0" } }, [
      miniStat(acc + "%", "Accuracy"), miniStat(grader.score, "Score"), miniStat(grader.maxStreak, "Best streak"),
      miniStat(grader.counts.perfect, "Perfect"), miniStat(grader.counts.miss, "Missed"),
    ]) : null;
    banner.appendChild(el("div.panel", {}, [
      scored ? el("div.big-grade", { text: grade, style: { color: passed ? getVar("--good") : getVar("--bad") } }) : el("div.big-grade", { text: "🎤" }),
      el("h2", { text: scored ? (passed ? "Nailed it — passed!" : (grader.failed ? "Finished (failed — healthbar emptied)" : "Finished")) : "Nice singing!" }),
      stats,
      el("div.row", { style: { justifyContent: "center" } }, [
        el("button.btn.primary", { onclick: restart }, ["⟲ Sing again"]),
        el("button.btn", { onclick: () => host.onBack() }, ["← Songs"]),
      ]),
    ]));
    banner.classList.remove("hidden");
  }

  render(-LEAD_IN); updateHud();
  return () => { playing = false; ro.disconnect(); player.stop(); band.stop(); Audio.stopMic(); };
}

// ---------- helpers ----------
function wrapNarrow(node: HTMLElement): HTMLElement { node.style.minWidth = "150px"; return node; }
function miniStat(num: number | string, label: string): HTMLElement { return el("div.stat", {}, [el("div.num", { text: String(num) }), el("div.lbl", { text: label })]); }
function scoreHTML(score: number, health: number, streak: number, mult: number, acc: number, failed: boolean): string {
  return `<div style="font-size:22px;font-weight:800">${score.toLocaleString()}</div>
    <div class="muted" style="font-size:12px">${acc}% · streak ${streak} · ×${mult}${failed ? ' · <span style="color:var(--bad)">FAILED</span>' : ""}</div>`;
}
