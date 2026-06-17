import { el, slider, toast, fmtTime, getVar } from "../ui/components.js";
import { Store } from "../state.js";
import { Audio } from "../audio/engine.js";
import { detectPitch, PitchTracker } from "../audio/pitch.js";
import { Synth } from "../audio/synth.js";
import { TrackPlayer } from "../audio/player.js";
import { findSong } from "../music/catalog.js";
import { songDuration } from "../music/song-format.js";
import { freqToMidiFloat, midiToName, INSTRUMENTS } from "../music/notes.js";
import { suggestCapo, describeMidiSet } from "../music/theory.js";
import { drawBackground } from "../ui/backgrounds.js";
import { renderAvatar } from "../cosmetics/index.js";
import { buildLyricTimeline, activeAt } from "../karaoke/timeline.js";
import { lineFillHTML } from "../karaoke/render.js";

const LEAD_IN = 3.0;          // count-in seconds before notes start
const HIT_PAD = 0.16;         // detection window pad around a note
const PERFECT_CENTS = 28;
const GOOD_CENTS = 60;

export default async function play(ctx) {
  const { el: root, params, navigate } = ctx;
  const song = findSong(params[0]);
  if (!song) {
    root.appendChild(el("div.panel", { style: { margin: "22px" } }, [
      el("h2", { text: "Song not found" }),
      el("button.btn", { onclick: () => navigate("#/library") }, ["Back to songs"]),
    ]));
    return;
  }
  const s = Store.settings();
  const a4 = s.a4;
  const speed = s.noteSpeed;
  const duration = songDuration(song);
  const capo = song.capo || suggestCapo(((song.notes[0]?.midi[0] ?? 60) % 12)).capo;

  // ----- lyrics / karaoke overlay -----
  const lyrics = (song.lyrics || []).slice().sort((a, b) => a.time - b.time);
  const lyricTimeline = lyrics.length ? buildLyricTimeline(song) : null;
  let karaokeLyrics = lyricTimeline ? (s.karaokeLyrics ?? true) : false;

  // ----- per-note runtime state -----
  const notes = song.notes.map((n) => ({
    time: n.time, dur: n.dur || 0.4, midi: n.midi, chord: n.chord || n.midi.length > 1,
    state: "pending", best: 999, frames: 0,
  }));
  notes.sort((a, b) => a.time - b.time);

  // ----- DOM -----
  const shell = el("div.play-shell");
  const canvas = el("canvas#highway-canvas");
  const overlay = el("div.play-overlay");
  const scoreBox = el("div.hud-box", { html: scoreHTML(0, 100, 0, 1) });
  const songBox = el("div.hud-box", {}, [
    el("div", { html: `<b>${song.title}</b>` }),
    el("div.muted", { style: { fontSize: "12px" }, html:
      `${song.artist} · key ${song.key} · ${song.bpm} BPM` + (capo ? ` · <span class="capo-note" style="padding:2px 8px">🔼 Capo ${capo}</span>` : "") }),
    (song.lyrics && song.lyrics.length)
      ? el("div.muted", { style: { fontSize: "12px", marginTop: "2px" }, text: `🎤 Singalong${song.genre ? " · " + song.genre : ""}` })
      : (song.genre ? el("div.muted", { style: { fontSize: "12px", marginTop: "2px" }, text: song.genre }) : null),
  ]);
  const healthWrap = el("div.healthbar-big", {}, [el("i", { style: { width: "100%" } })]);
  const killfeed = el("div.killfeed");
  const lyric = el("div.lyric-line");
  const banner = el("div.banner.hidden");

  const avatarBadge = el("div.play-avatar", { html: renderAvatar() });
  const hud = el("div.play-hud", {}, [
    el("div.row", { style: { gap: "10px", alignItems: "flex-start" } }, [avatarBadge, songBox]),
    el("div.col", { style: { alignItems: "flex-end", gap: "8px" } }, [scoreBox, healthWrap]),
  ]);
  overlay.append(hud, killfeed, lyric, el("div.play-bottom-fade"), banner);

  // controls
  const playBtn = el("button.btn.primary", { onclick: togglePlay }, ["▶ Start"]);
  const restartBtn = el("button.btn", { onclick: restart }, ["⟲ Restart"]);
  const backBtn = el("button.btn.ghost", { onclick: () => navigate("#/library") }, ["← Songs"]);
  const player = new TrackPlayer();
  player.load(song);
  const volB = slider({ label: "Backing", value: s.backingVolume, fmt: (v) => Math.round(v * 100) + "%",
    oninput: (v) => { Store.setSetting("backingVolume", v); player.setBackingVolume(v); } });
  const volV = slider({ label: "Vocal", value: s.vocalVolume, fmt: (v) => Math.round(v * 100) + "%",
    oninput: (v) => { Store.setSetting("vocalVolume", v); player.setVocalVolume(v); } });
  const metroBtn = el("button.btn", { onclick: () => { metro = !metro; metroBtn.classList.toggle("primary", metro); } }, ["🥁 Metronome"]);
  let metro = false;
  const karaokeBtn = lyrics.length ? el("button.btn", { class: karaokeLyrics ? "primary" : "", title: "Word-by-word singalong highlight", onclick: () => {
    karaokeLyrics = !karaokeLyrics; Store.setSetting("karaokeLyrics", karaokeLyrics);
    karaokeBtn.classList.toggle("primary", karaokeLyrics);
    updateLyric(clock);
  } }, ["🎤 Karaoke"]) : null;

  const controls = el("div.play-controls", {}, [
    playBtn, restartBtn,
    el("div.muted", { style: { minWidth: "70px" }, id: "play-clock", text: "0:00" }),
    el("div", { style: { flex: "1" } }),
    !player.hasAudio() ? el("span.muted", { style: { fontSize: "12px" }, text: "No backing audio — import one in the Song Editor." }) : null,
    player.backing ? wrapNarrow(volB) : null,
    player.vocal ? wrapNarrow(volV) : null,
    karaokeBtn, metroBtn, backBtn,
  ]);

  shell.append(canvas, overlay, controls);
  root.appendChild(shell);
  const clockEl = controls.querySelector("#play-clock");

  // ----- canvas sizing -----
  const c = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  resize();

  // pitch range for vertical mapping
  const allMidi = notes.flatMap((n) => n.midi);
  let loM = Math.min(...allMidi) - 3, hiM = Math.max(...allMidi) + 3;
  if (!isFinite(loM)) { loM = 48; hiM = 72; }
  if (hiM - loM < 12) { const mid = (hiM + loM) / 2; loM = mid - 6; hiM = mid + 6; }

  // ----- game state -----
  let playing = false, started = false, finished = false;
  let clock = -LEAD_IN;             // seconds; negative during count-in
  let lastTs = 0;
  let health = 100, failed = false;
  let score = 0, streak = 0, maxStreak = 0, mult = 1;
  const counts = { perfect: 0, good: 0, off: 0, miss: 0 };
  let lastMetroBeat = -1;
  const beatLen = 60 / song.bpm;

  // pitch detection
  const tracker = new PitchTracker();
  const buf = new Float32Array(2048);
  let detectedMidi = -1;

  const PPS = () => 240 * speed;    // pixels per second on the highway
  const HIT_X = () => W * 0.16;     // x position of the "now" line
  const yFor = (midi) => {
    const pad = 46;
    return H - pad - ((midi - loM) / (hiM - loM)) * (H - pad * 2);
  };

  async function ensureMic() {
    if (Audio.micLive()) return true;
    try { await Audio.startMic(s.inputDeviceId); return true; }
    catch (e) { toast("Mic off — notes won't be graded. " + e.message, "bad"); return false; }
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
    player.pause();
  }
  function restart() {
    pause();
    finished = false; banner.classList.add("hidden");
    clock = -LEAD_IN; health = 100; failed = false; score = 0; streak = 0; maxStreak = 0; mult = 1;
    counts.perfect = counts.good = counts.off = counts.miss = 0;
    notes.forEach((n) => { n.state = "pending"; n.best = 999; n.frames = 0; });
    killfeed.innerHTML = "";
    player.seek(0);
    playBtn.textContent = "▶ Start";
    render(0); updateHud();
  }

  // ----- main loop -----
  function loop(ts) {
    if (!playing) return;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    // advance clock; sync to audio when available and past lead-in
    if (player.hasAudio() && clock >= 0 && player.backing && !player.backing.paused) {
      clock = player.backing.currentTime;
    } else {
      clock += dt;
      if (clock >= 0 && player.hasAudio() && (player.backing?.paused)) player.play(clock);
    }

    // metronome
    if (metro) {
      const beat = Math.floor(clock / beatLen);
      if (beat !== lastMetroBeat && clock >= -LEAD_IN) { Synth.click({ accent: beat % 4 === 0 }); lastMetroBeat = beat; }
    }

    // read pitch
    if (Audio.readTimeDomain(buf)) {
      const { freq } = detectPitch(buf, Audio.ctx().sampleRate, s.micGate);
      const f = tracker.push(freq, a4);
      detectedMidi = f > 0 ? freqToMidiFloat(f, a4) : -1;
    }

    grade();
    render(clock);
    updateHud();

    clockEl.textContent = fmtTime(Math.max(0, clock)) + " / " + fmtTime(duration);

    if (clock > duration + 1.2) { finish(); return; }
    requestAnimationFrame(loop);
  }

  // ----- grading -----
  function grade() {
    for (const n of notes) {
      if (n.state !== "pending") continue;
      const winStart = n.time - HIT_PAD;
      const winEnd = n.time + n.dur + HIT_PAD;
      if (clock < winStart) break;            // notes sorted; none active yet
      if (clock > winEnd) { finalize(n); continue; }
      // active: try to match detected pitch to any chord tone (octave-agnostic)
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
  function finalize(n) {
    let q;
    if (n.frames >= 2 && n.best <= PERFECT_CENTS) q = "perfect";
    else if (n.frames >= 1 && n.best <= GOOD_CENTS) q = "good";
    else if (n.frames >= 1) q = "off";
    else q = "miss";
    n.state = q;
    applyJudgment(q, n);
  }
  function applyJudgment(q, n) {
    counts[q]++;
    if (q === "perfect") { health = Math.min(100, health + 6); streak++; score += Math.round(100 * mult); }
    else if (q === "good") { health = Math.min(100, health + 3); streak++; score += Math.round(60 * mult); }
    else if (q === "off") { health = Math.max(0, health - 7); streak = 0; score += 10; }
    else { health = Math.max(0, health - 10); streak = 0; }
    maxStreak = Math.max(maxStreak, streak);
    mult = 1 + Math.min(3, Math.floor(streak / 8)) * 0.5;
    if (health <= 0 && !failed) { failed = true; toast("Healthbar empty — keep going, but this run won't count as a pass.", "bad"); }
    pushKill(q, n);
  }
  function pushKill(q, n) {
    const label = describeMidiSet(n.midi);
    const k = el(`div.kill.${q}`, { html: `${q[0].toUpperCase() + q.slice(1)} <span class="muted">${label}</span>` });
    killfeed.appendChild(k);
    while (killfeed.children.length > 6) killfeed.firstChild.remove();
    setTimeout(() => { k.style.opacity = "0"; k.style.transition = "opacity 500ms"; }, 1400);
    setTimeout(() => k.remove(), 2000);
  }

  // ----- rendering -----
  function render(t) {
    drawBackground(c, W, H, song.background, Math.max(0, t), duration);
    // dim overlay for contrast
    c.fillStyle = "rgba(0,0,0,0.28)"; c.fillRect(0, 0, W, H);

    const hitX = HIT_X(), pps = PPS();

    // horizontal pitch gridlines for octaves
    c.strokeStyle = getVar("--highway-line"); c.lineWidth = 1; c.font = "10px var(--mono)"; c.fillStyle = getVar("--muted");
    for (let m = Math.ceil(loM / 12) * 12; m <= hiM; m += 12) {
      const y = yFor(m); c.globalAlpha = 0.5; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
      c.globalAlpha = 1; c.fillText(midiToName(m).full, 4, y - 3);
    }

    // hit line
    c.globalAlpha = 1;
    const grd = c.createLinearGradient(hitX - 30, 0, hitX + 30, 0);
    grd.addColorStop(0, "rgba(255,255,255,0)"); grd.addColorStop(0.5, getVar("--accent")); grd.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = grd; c.fillRect(hitX - 30, 0, 60, H);
    c.strokeStyle = getVar("--accent"); c.lineWidth = 2; c.beginPath(); c.moveTo(hitX, 0); c.lineTo(hitX, H); c.stroke();

    // notes
    for (const n of notes) {
      const x = hitX + (n.time - t) * pps;
      const wRect = Math.max(16, n.dur * pps);
      if (x + wRect < -20 || x > W + 40) continue;
      for (const midi of n.midi) {
        const y = yFor(midi);
        drawNote(x, y, wRect, n.state, midi, n.chord);
      }
    }

    // live pitch marker
    if (detectedMidi > 0) {
      const y = yFor(detectedMidi);
      c.fillStyle = getVar("--accent-2");
      c.beginPath(); c.arc(hitX, y, 7, 0, 7); c.fill();
      c.globalAlpha = 0.3; c.fillRect(0, y - 1.5, hitX, 3); c.globalAlpha = 1;
    }

    // count-in
    if (t < 0) {
      const n = Math.ceil(-t);
      c.fillStyle = getVar("--text"); c.font = "bold 120px var(--font)"; c.textAlign = "center";
      c.globalAlpha = (1 - (Math.abs(t) % 1)) * 0.9 + 0.1;
      c.fillText(String(n), W / 2, H / 2 + 40); c.globalAlpha = 1; c.textAlign = "start";
    }

    // lyrics
    updateLyric(t);
  }

  function drawNote(x, y, w, state, midi, chord) {
    const h = 26;
    const colors = { pending: getVar("--accent"), perfect: getVar("--j-perfect"),
      good: getVar("--j-good"), off: getVar("--j-off"), miss: getVar("--j-miss") };
    const col = colors[state] || colors.pending;
    c.globalAlpha = state === "miss" ? 0.35 : 1;
    roundRect(x, y - h / 2, w, h, 8);
    const g = c.createLinearGradient(x, y - h / 2, x, y + h / 2);
    g.addColorStop(0, col); g.addColorStop(1, shade(col, -0.25));
    c.fillStyle = g; c.fill();
    if (state === "pending") { c.shadowColor = col; c.shadowBlur = 10; c.fill(); c.shadowBlur = 0; }
    c.globalAlpha = 1;
    c.fillStyle = "rgba(0,0,0,0.8)"; c.font = "bold 11px var(--font)";
    const lbl = chord ? "" : midiToName(midi).name;
    if (lbl && w > 22) c.fillText(lbl, x + 5, y + 4);
  }
  function roundRect(x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // lyrics — word-by-word karaoke fill when enabled, else simple current/next
  function updateLyric(t) {
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
    healthWrap.firstChild.style.width = health + "%";
    document.getElementById("health-mini")?.classList.remove("hidden");
    const mini = document.getElementById("health-mini");
    if (mini) mini.style.setProperty("--h", health + "%");
  }
  function accuracy() {
    const total = counts.perfect + counts.good + counts.off + counts.miss;
    if (!total) return 100;
    return Math.round(((counts.perfect + counts.good * 0.6) / total) * 100);
  }

  function finish() {
    finished = true; playing = false; player.pause();
    playBtn.textContent = "⟲ Play again";
    const acc = accuracy();
    const passed = !failed && acc >= 60;
    const grade = gradeLetter(acc, failed);
    const entry = {
      ts: Date.now(), songId: song.id, songTitle: song.title, instrument: song.instrument,
      score, accuracy: acc, maxStreak, passed, durationSec: Math.round(duration),
      notes: { ...counts },
    };
    Store.addHistory(entry);
    showBanner(grade, acc, passed, entry.coins || 0);
  }

  function showBanner(grade, acc, passed, coinsEarned) {
    banner.innerHTML = "";
    banner.appendChild(el("div.panel", {}, [
      el("div.big-grade", { text: grade, style: { color: passed ? getVar("--good") : getVar("--bad") } }),
      el("h2", { text: passed ? "Song complete — passed!" : (failed ? "Finished (failed — healthbar emptied)" : "Finished") }),
      coinsEarned ? el("div", { style: { fontSize: "16px", fontWeight: "700", color: "var(--warn)", margin: "2px 0 6px" },
        html: `🪙 +${coinsEarned} coins earned · <span class="muted" style="font-weight:400">spend them in the Locker</span>` }) : null,
      el("div.grid.cards", { style: { margin: "14px 0" } }, [
        miniStat(acc + "%", "Accuracy"), miniStat(score, "Score"), miniStat(maxStreak, "Best streak"),
        miniStat(counts.perfect, "Perfect"), miniStat(counts.miss, "Missed"),
      ]),
      el("div.row", { style: { justifyContent: "center" } }, [
        el("button.btn.primary", { onclick: restart }, ["⟲ Play again"]),
        el("button.btn", { onclick: () => navigate("#/library") }, ["← Songs"]),
        el("button.btn", { onclick: () => navigate("#/history") }, ["📈 Progress"]),
        coinsEarned ? el("button.btn", { onclick: () => navigate("#/locker") }, ["🎨 Locker"]) : null,
      ]),
    ]));
    banner.classList.remove("hidden");
  }

  // initial paint
  render(-LEAD_IN); updateHud();

  // cleanup
  return () => {
    playing = false; ro.disconnect(); player.stop(); Audio.stopMic();
    document.getElementById("health-mini")?.classList.add("hidden");
  };
}

// ---------- helpers ----------
function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
function wrapNarrow(node) { node.style.minWidth = "150px"; return node; }
function miniStat(num, label) {
  return el("div.stat", {}, [el("div.num", { text: String(num) }), el("div.lbl", { text: label })]);
}
function scoreHTML(score, health, streak, mult, acc = 100, failed = false) {
  return `<div style="font-size:22px;font-weight:800">${score.toLocaleString()}</div>
    <div class="muted" style="font-size:12px">${acc}% · streak ${streak} · ×${mult}${failed ? ' · <span style="color:var(--bad)">FAILED</span>' : ""}</div>`;
}
function gradeLetter(acc, failed) {
  if (failed) return "F";
  if (acc >= 97) return "S";
  if (acc >= 92) return "A";
  if (acc >= 82) return "B";
  if (acc >= 70) return "C";
  if (acc >= 60) return "D";
  return "F";
}
function shade(hex, amt) {
  hex = (hex || "#6ea8fe").trim();
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.min(255, Math.round(r * (1 + amt))));
  g = Math.max(0, Math.min(255, Math.round(g * (1 + amt))));
  b = Math.max(0, Math.min(255, Math.round(b * (1 + amt))));
  return `rgb(${r},${g},${b})`;
}
