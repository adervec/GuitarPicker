// Karaoke view: a lyrics-first, vocals-first sing-along built on the shared
// karaoke engine (timeline + grader). Two entry points:
//   #/karaoke        -> a picker of every song that carries lyrics
//   #/karaoke/:id    -> the karaoke stage for that song
// The stage shows a scrolling teleprompter with word-by-word highlight, a
// per-line count-in, backing playback + an optional guide vocal, and an
// optional sing-and-score pass (mic pitch graded against the vocal melody,
// octave-agnostically) with the same health/score/grade as instrument play.
import { el, slider, toast, fmtTime, getVar } from "../ui/components.js";
import { Store } from "../state.js";
import { Audio } from "../audio/engine.js";
import { detectPitch, PitchTracker } from "../audio/pitch.js";
import { TrackPlayer } from "../audio/player.js";
import { Band } from "../audio/band.js";
import { findSong, allSongs } from "../music/catalog.js";
import { songDuration, songParts } from "../music/song-format.js";
import { autoAccompaniment } from "../music/accompany.js";
import { freqToMidiFloat, midiToName } from "../music/notes.js";
import { drawBackground } from "../ui/backgrounds.js";
import { renderAvatar } from "../cosmetics/index.js";
import { buildLyricTimeline, activeAt, timelineDuration } from "../karaoke/timeline.js";
import { Grader, gradeLetter, vocalTargets } from "../karaoke/grader.js";
import { lineFillHTML, escapeHTML as esc } from "../karaoke/render.js";

const LEAD_IN = 3.0;        // count-in seconds before the song starts
const HIT_PAD = 0.16;       // detection window pad around a vocal note
const GAP_COUNTIN = 4.0;    // show line count-in this many seconds before a gap ends

export default async function karaoke(ctx) {
  const { el: root, params, navigate } = ctx;
  const song = params[0] ? findSong(params[0]) : null;
  if (!song) return picker(root, navigate);
  return stage(ctx, song);
}

// ---------- song picker (no id) ----------
function picker(root, navigate) {
  const withLyrics = allSongs().filter((s) => (s.lyrics || []).length);
  const wrap = el("div.view-pad", {}, [
    el("div.page-head", {}, [el("h1", { text: "🎤 Karaoke" }),
      el("p.muted", { text: "Pick a song with lyrics. Sing along — turn on scoring to be graded." })]),
  ]);
  if (!withLyrics.length) {
    wrap.appendChild(el("div.panel", {}, [el("p", { text: "No songs with lyrics yet. Add lyrics in the Song Editor." }),
      el("button.btn", { onclick: () => navigate("#/editor") }, ["Open Editor"])]));
    root.appendChild(wrap);
    return;
  }
  const grid = el("div.grid.cards");
  for (const s of withLyrics) {
    const wordTimed = (s.lyrics || []).some((l) => Array.isArray(l.words) && l.words.length);
    grid.appendChild(el("div.panel.tight.kara-pick", { onclick: () => navigate(`#/karaoke/${s.id}`) }, [
      el("div", { html: `<b>${esc(s.title)}</b>` }),
      el("div.muted", { style: { fontSize: "12px" }, text: `${s.artist} · ${s.key} · ${s.bpm} BPM` }),
      el("div.row", { style: { gap: "6px", marginTop: "6px" } }, [
        el("span.tag", { text: `${(s.lyrics || []).length} lines` }),
        wordTimed ? el("span.tag.good", { text: "word-timed" }) : el("span.tag", { text: "auto-timed" }),
        s.voice?.notes?.length ? el("span.tag", { text: "scored melody" }) : null,
        s.audio?.vocal ? el("span.tag", { text: "guide vocal" }) : null,
      ]),
    ]));
  }
  wrap.appendChild(grid);
  root.appendChild(wrap);
}

// ---------- karaoke stage ----------
function stage(ctx, song) {
  const { el: root, navigate } = ctx;
  const s = Store.settings();
  const a4 = s.a4;
  const timeline = buildLyricTimeline(song);
  if (!timeline.lines.length) {
    root.appendChild(el("div.panel", { style: { margin: "22px" } }, [
      el("h2", { text: "No lyrics to sing" }),
      el("p.muted", { text: "This song has no lyric track. Add one in the Song Editor." }),
      el("button.btn", { onclick: () => navigate("#/karaoke") }, ["← Karaoke songs"]),
    ]));
    return;
  }

  // Vocal-melody scoring targets: an authored voice melody if present, else the
  // song's (instrument) melody so any lyric song is singable.
  const targets = vocalTargets(song)
    .map((n) => ({ time: n.time, dur: n.dur || 0.4, midi: n.midi, state: "pending", best: 999, frames: 0 }))
    .sort((a, b) => a.time - b.time);

  const lyricEnd = timelineDuration(timeline);
  const noteEnd = targets.reduce((m, n) => Math.max(m, n.time + n.dur), 0);
  const duration = Math.max(lyricEnd, noteEnd, songDuration(song));

  let scoring = (s.karaokeScoring ?? true) && targets.length > 0;

  // ----- DOM -----
  const shell = el("div.play-shell.kara-shell");
  const canvas = el("canvas#kara-canvas");
  const overlay = el("div.play-overlay");

  const scoreBox = el("div.hud-box", { html: scoreHTML(0, 100, 0, 1, 100, false) });
  const avatarBadge = el("div.play-avatar", { html: renderAvatar() });
  const songBox = el("div.hud-box", {}, [
    el("div", { html: `<b>${esc(song.title)}</b>` }),
    el("div.muted", { style: { fontSize: "12px" }, text: `${song.artist} · ${song.key} · ${song.bpm} BPM` }),
  ]);
  const healthWrap = el("div.healthbar-big", {}, [el("i", { style: { width: "100%" } })]);
  const hud = el("div.play-hud", {}, [
    el("div.row", { style: { gap: "10px", alignItems: "flex-start" } }, [avatarBadge, songBox]),
    el("div.col", { style: { alignItems: "flex-end", gap: "8px" } }, [scoreBox, healthWrap]),
  ]);
  // hide score column when not grading
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
  const backBtn = el("button.btn.ghost", { onclick: () => navigate("#/karaoke") }, ["← Songs"]);

  const player = new TrackPlayer();
  player.load(song);
  let guide = !!player.vocal;     // guide vocal on when the song has one

  // You sing, so the whole arrangement is synthesized — every part plus a
  // generated bass/comp/drums for the roles the song doesn't already cover.
  const allParts = songParts(song);
  const band = new Band([...allParts, ...autoAccompaniment(song, allParts)], { a4, volume: s.backingVolume });
  let bandOn = !band.empty && !player.backing && (s.band ?? true);
  const bandBtn = band.empty ? null : el("button.btn", {
    class: bandOn ? "primary" : "", title: "Synthesized accompaniment: " + band.names.join(", "),
    onclick: () => {
      bandOn = !bandOn; Store.setSetting("band", bandOn);
      bandBtn.classList.toggle("primary", bandOn);
      if (bandOn) band.seek(Math.max(0, clock)); else band.silence();
    },
  }, ["🎺 Band"]);

  const volB = slider({ label: "Music", value: s.backingVolume, fmt: (v) => Math.round(v * 100) + "%",
    oninput: (v) => { Store.setSetting("backingVolume", v); player.setBackingVolume(v); band.setVolume(v); } });
  const guideBtn = el("button.btn", { class: guide ? "primary" : "", onclick: () => {
    guide = !guide; guideBtn.classList.toggle("primary", guide);
    player.setVocalVolume(guide ? (Store.settings().vocalVolume || 0.7) : 0);
  } }, ["🎙️ Guide vocal"]);
  const scoreBtn = el("button.btn", { class: scoring ? "primary" : "", onclick: () => {
    if (!targets.length) { toast("This song has no vocal melody to score.", "bad"); return; }
    scoring = !scoring; Store.setSetting("karaokeScoring", scoring);
    scoreBtn.classList.toggle("primary", scoring);
    scoreBox.style.display = healthWrap.style.display = scoring ? "" : "none";
  } }, ["🎯 Score my singing"]);

  const controls = el("div.play-controls", {}, [
    playBtn, restartBtn,
    el("div.muted", { style: { minWidth: "92px" }, id: "kara-clock", text: "0:00" }),
    el("div", { style: { flex: "1" } }),
    (!player.hasAudio() && band.empty) ? el("span.muted", { style: { fontSize: "12px" }, text: "No backing audio — import one in the Song Editor." }) : null,
    (player.backing || !band.empty) ? wrapNarrow(volB) : null,
    player.vocal ? guideBtn : null,
    bandBtn, scoreBtn, backBtn,
  ]);
  if (!guide) player.setVocalVolume(0);

  shell.append(el("div.play-stage", {}, [canvas, overlay]), controls);
  root.appendChild(shell);
  const clockEl = controls.querySelector("#kara-clock");
  const countinEl = stageEl.querySelector("#kara-countin");
  const prevEl = stageEl.querySelector(".kara-prev");
  const curEl = stageEl.querySelector(".kara-cur");
  const nextEl = stageEl.querySelector(".kara-next");
  const next2El = stageEl.querySelector(".kara-next2");

  // ----- canvas -----
  const c = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  // pitch range for the ribbon
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

  async function ensureMic() {
    if (!scoring) return true;
    if (Audio.micLive()) return true;
    try { await Audio.startMic(s.inputDeviceId); return true; }
    catch (e) { toast("Mic off — singing won't be scored. " + e.message, "bad"); return false; }
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
  function loop(ts) {
    if (!playing) return;
    const dt = Math.min(0.05, (ts - lastTs) / 1000); lastTs = ts;
    if (player.hasAudio() && clock >= 0 && player.backing && !player.backing.paused) {
      clock = player.backing.currentTime;
    } else {
      clock += dt;
      if (clock >= 0 && player.hasAudio() && player.backing?.paused) player.play(clock);
    }
    if (bandOn) band.schedule(clock);
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

  // ----- vocal grading (octave-agnostic, via shared Grader) -----
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
  function render(t) {
    drawBackground(c, W, H, song.background, Math.max(0, t), duration);
    c.fillStyle = "rgba(0,0,0,0.42)"; c.fillRect(0, 0, W, H);
    if (scoring) drawRibbon(t);
    if (t < 0) {
      const n = Math.ceil(-t);
      c.fillStyle = getVar("--text"); c.font = "bold 120px var(--font)"; c.textAlign = "center";
      c.globalAlpha = (1 - (Math.abs(t) % 1)) * 0.9 + 0.1;
      c.fillText(String(n), W / 2, H / 2); c.globalAlpha = 1; c.textAlign = "start";
    }
    updateLyrics(t);
  }

  // compact pitch ribbon along the bottom of the canvas
  function drawRibbon(t) {
    const top = H - 120, h = 96;
    const hitX = W * 0.18, pps = 150;
    const yFor = (m) => top + h - ((m - loM) / (hiM - loM)) * h;
    c.globalAlpha = 0.25; c.fillStyle = getVar("--panel"); c.fillRect(0, top, W, h); c.globalAlpha = 1;
    c.strokeStyle = getVar("--accent"); c.lineWidth = 2; c.beginPath(); c.moveTo(hitX, top); c.lineTo(hitX, top + h); c.stroke();
    const colors = { pending: getVar("--accent"), perfect: getVar("--j-perfect"),
      good: getVar("--j-good"), off: getVar("--j-off"), miss: getVar("--j-miss") };
    for (const n of targets) {
      const x = hitX + (n.time - t) * pps, w = Math.max(10, n.dur * pps);
      if (x + w < -10 || x > W + 20) continue;
      for (const m of n.midi) {
        const y = yFor(m);
        c.globalAlpha = n.state === "miss" ? 0.3 : 0.95;
        c.fillStyle = colors[n.state] || colors.pending;
        roundRect(x, y - 5, w, 10, 5); c.fill();
      }
    }
    c.globalAlpha = 1;
    if (detectedMidi > 0) {
      const m = Math.max(loM, Math.min(hiM, detectedMidi));
      c.fillStyle = getVar("--accent-2"); c.beginPath(); c.arc(hitX, yFor(m), 6, 0, 7); c.fill();
      c.fillStyle = getVar("--muted"); c.font = "10px var(--mono)";
      c.fillText(midiToName(Math.round(detectedMidi)).full, hitX + 10, yFor(m) - 8);
    }
  }
  function roundRect(x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2); c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // ----- teleprompter -----
  function updateLyrics(t) {
    const a = activeAt(timeline, t);
    const lines = timeline.lines;
    const curIdx = a.lineIdx;
    prevEl.innerHTML = curIdx > 0 ? esc(lines[curIdx - 1].text) : "";
    curEl.innerHTML = curIdx >= 0 ? lineFillHTML(lines[curIdx], a.wordIdx, a.wordProgress) : "";
    const nIdx = curIdx >= 0 ? curIdx + 1 : 0;
    nextEl.innerHTML = lines[nIdx] ? esc(lines[nIdx].text) : "";
    next2El.innerHTML = lines[nIdx + 1] ? esc(lines[nIdx + 1].text) : "";

    // count-in: a row of dots before the next line when there's a silent gap
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
    healthWrap.firstChild.style.width = grader.health + "%";
  }

  function finish() {
    finished = true; playing = false; player.pause(); band.silence();
    playBtn.textContent = "⟲ Sing again";
    if (!scoring) { showBanner(null, 0, false, 0, false); return; }
    const acc = grader.accuracy();
    const passed = !grader.failed && acc >= 60;
    const entry = {
      ts: Date.now(), songId: song.id, songTitle: song.title, instrument: "voice",
      score: grader.score, accuracy: acc, maxStreak: grader.maxStreak, passed,
      durationSec: Math.round(duration), notes: { ...grader.counts }, mode: "karaoke",
    };
    Store.addHistory(entry);
    showBanner(gradeLetter(acc, grader.failed), acc, passed, entry.coins || 0, true);
  }
  function showBanner(grade, acc, passed, coinsEarned, scored) {
    banner.innerHTML = "";
    const stats = scored ? el("div.grid.cards", { style: { margin: "14px 0" } }, [
      miniStat(acc + "%", "Accuracy"), miniStat(grader.score, "Score"), miniStat(grader.maxStreak, "Best streak"),
      miniStat(grader.counts.perfect, "Perfect"), miniStat(grader.counts.miss, "Missed"),
    ]) : null;
    banner.appendChild(el("div.panel", {}, [
      scored ? el("div.big-grade", { text: grade, style: { color: passed ? getVar("--good") : getVar("--bad") } }) : el("div.big-grade", { text: "🎤" }),
      el("h2", { text: scored ? (passed ? "Nailed it — passed!" : (grader.failed ? "Finished (failed — healthbar emptied)" : "Finished")) : "Nice singing!" }),
      coinsEarned ? el("div", { style: { fontSize: "16px", fontWeight: "700", color: "var(--warn)", margin: "2px 0 6px" },
        html: `🪙 +${coinsEarned} coins earned · <span class="muted" style="font-weight:400">spend them in the Locker</span>` }) : null,
      stats,
      el("div.row", { style: { justifyContent: "center" } }, [
        el("button.btn.primary", { onclick: restart }, ["⟲ Sing again"]),
        el("button.btn", { onclick: () => navigate("#/karaoke") }, ["← Songs"]),
        scored ? el("button.btn", { onclick: () => navigate("#/history") }, ["📈 Progress"]) : null,
      ]),
    ]));
    banner.classList.remove("hidden");
  }

  render(-LEAD_IN); updateHud();
  return () => { playing = false; ro.disconnect(); player.stop(); band.stop(); Audio.stopMic(); };
}

// ---------- helpers ----------
function wrapNarrow(node) { node.style.minWidth = "150px"; return node; }
function miniStat(num, label) { return el("div.stat", {}, [el("div.num", { text: String(num) }), el("div.lbl", { text: label })]); }
function scoreHTML(score, health, streak, mult, acc, failed) {
  return `<div style="font-size:22px;font-weight:800">${score.toLocaleString()}</div>
    <div class="muted" style="font-size:12px">${acc}% · streak ${streak} · ×${mult}${failed ? ' · <span style="color:var(--bad)">FAILED</span>' : ""}</div>`;
}
