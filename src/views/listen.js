import { el, pageHead, select, slider, toast, fmtTime, getVar } from "../ui/components.js";
import { Store } from "../state.js";
import { Audio } from "../audio/engine.js";
import { detectPitch, PitchTracker } from "../audio/pitch.js";
import { newSong, songDuration, uid } from "../music/song-format.js";
import { freqToMidiFloat, freqToMidi, midiToName, INSTRUMENTS } from "../music/notes.js";
import { framesToNotes } from "../music/transcribe.js";
import { ANIMATED_BACKGROUNDS } from "../ui/backgrounds.js";
import { t, fmt } from "../i18n.js";

export default function listen(ctx) {
  const { el: root, navigate } = ctx;
  const s = Store.settings();
  let bpm = 90;
  let recording = false;
  let frames = [];           // {t, freq}
  let startTime = 0;
  const tracker = new PitchTracker();
  const buf = new Float32Array(2048);
  let raf = 0;

  // screen capture
  let capStream = null, capTimer = 0;
  const capVideo = el("video", { muted: true, playsinline: true });
  const capCanvas = document.createElement("canvas");
  const shots = [];

  root.appendChild(pageHead(t("Listen & Make"), t("Play or sing something; GuitarPicker transcribes it into a playable song at several difficulty levels.")));

  // setup controls
  const tapBtn = el("button.btn", { onclick: tapTempo }, [t("Tap tempo")]);
  let taps = [];
  function tapTempo() {
    const now = performance.now(); taps.push(now); taps = taps.filter((t) => now - t < 3000);
    if (taps.length >= 2) {
      const intervals = []; for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      bpm = Math.round(60000 / avg); bpmSlider.setValue(bpm);
    }
  }
  const bpmSlider = slider({ label: t("Tempo (for note alignment)"), min: 50, max: 200, step: 1, value: bpm, fmt: (v) => v + " BPM", oninput: (v) => bpm = v });

  const capToggle = el("button.btn", { onclick: toggleCapture }, ["🖥️ " + t("Capture screen region")]);
  const capStatus = el("span.muted", { text: "" });

  root.appendChild(el("div.panel", {}, [
    el("h2", { text: "1 · " + t("Set up") }),
    el("div.grid", { style: { gridTemplateColumns: "2fr 1fr" } }, [bpmSlider, el("div.col", { style: { justifyContent: "flex-end" } }, [tapBtn])]),
    el("div.row", { style: { marginTop: "10px", alignItems: "center" } }, [capToggle, capStatus]),
    el("p.muted", { style: { fontSize: "12px" }, html: t("Screen capture is optional — when on, GuitarPicker snapshots the region you share into a slideshow that plays behind the notes. You choose the region in the browser's share dialog.") }),
  ]));

  // record panel
  const liveNote = el("div.tuner-note", { html: "—", style: { fontSize: "54px" } });
  const liveMeter = el("div.progress", { style: { width: "200px" } }, [el("i", { style: { width: "0%" } })]);
  const recBtn = el("button.btn.primary.lg", { onclick: toggleRecord }, ["● " + t("Record")]);
  const elapsed = el("span.muted", { text: "0:00" });
  root.appendChild(el("div.panel.center", {}, [
    el("h2", { text: "2 · " + t("Record") }),
    liveNote,
    el("div.row", { style: { justifyContent: "center", alignItems: "center", margin: "10px 0" } }, [liveMeter]),
    el("div.row", { style: { justifyContent: "center", alignItems: "center" } }, [recBtn, elapsed]),
  ]));

  const resultPanel = el("div.panel.hidden", {}, []);
  root.appendChild(resultPanel);

  async function toggleRecord() {
    if (recording) { stopRecord(); return; }
    try { await Audio.startMic(s.inputDeviceId); } catch (e) { toast(t("Mic failed: {error}", { error: e.message }), "bad"); return; }
    recording = true; frames = []; startTime = performance.now();
    recBtn.textContent = "■ " + t("Stop"); recBtn.classList.remove("primary");
    if (capStream) startSnapping();
    loop();
  }
  function stopRecord() {
    recording = false; cancelAnimationFrame(raf);
    recBtn.textContent = "● " + t("Record"); recBtn.classList.add("primary");
    stopSnapping();
    Audio.stopMic();
    if (frames.length < 5) { toast(t("Didn't hear enough — try again, a bit louder."), "bad"); return; }
    buildResults();
  }

  function loop() {
    if (!recording) return;
    if (Audio.readTimeDomain(buf)) {
      const { freq, rms } = detectPitch(buf, Audio.ctx().sampleRate, s.micGate);
      const t = (performance.now() - startTime) / 1000;
      const f = tracker.push(freq, s.a4);
      frames.push({ t, freq: f });
      liveMeter.firstChild.style.width = Math.min(100, rms * 600) + "%";
      if (f > 0) { const nm = midiToName(freqToMidi(f, s.a4)); liveNote.innerHTML = ""; liveNote.append(nm.name, Object.assign(document.createElement("small"), { textContent: String(nm.octave) })); }
    }
    elapsed.textContent = fmtTime((performance.now() - startTime) / 1000);
    raf = requestAnimationFrame(loop);
  }

  // ---------- transcription (shared with the editor's hum-to-capture) ----------
  // complexity reducers
  function simplify(notes, bpm, level) {
    if (level === "advanced") return notes;
    const beat = 60 / bpm;
    if (level === "intermediate") {
      // drop notes shorter than an eighth, re-quantize to 1/2 beat
      return notes.filter((n) => n.dur >= beat * 0.4).map((n) => ({
        ...n, time: +(Math.round(n.time / (beat / 2)) * (beat / 2)).toFixed(4),
      }));
    }
    // beginner: one (most-sustained) note per beat
    const byBeat = new Map();
    for (const n of notes) {
      const b = Math.round(n.time / beat);
      const prev = byBeat.get(b);
      if (!prev || n.dur > prev.dur) byBeat.set(b, n);
    }
    return [...byBeat.entries()].sort((a, b) => a[0] - b[0]).map(([b, n]) => ({
      time: +(b * beat).toFixed(4), dur: +(beat * 0.9).toFixed(4), midi: n.midi,
    }));
  }

  let chosenBg = { type: "animated", value: "aurora" };

  function buildResults() {
    const full = framesToNotes(frames, bpm, s.a4);
    if (!full.length) { toast(t("Couldn't find clear notes — try a melody with single notes."), "bad"); return; }

    resultPanel.classList.remove("hidden");
    resultPanel.innerHTML = "";
    resultPanel.appendChild(el("h2", { text: "3 · " + t("Your transcription") }));
    resultPanel.appendChild(el("p.muted", {
      text: t.n("Detected {n} note over {duration}. Pick a difficulty and background, then save or play.", "Detected {n} notes over {duration}. Pick a difficulty and background, then save or play.", full.length, { duration: fmtTime(full[full.length - 1].time + full[full.length - 1].dur) }),
    }));

    // background chooser
    const bgRow = el("div.pill-row", { style: { margin: "10px 0" } });
    function bgPill(label, bg) {
      const p = el(`span.pill${JSON.stringify(bg) === JSON.stringify(chosenBg) ? ".active" : ""}`, { text: label, onclick: () => {
        chosenBg = bg; [...bgRow.children].forEach((x) => x.classList.remove("active")); p.classList.add("active"); } });
      return p;
    }
    ANIMATED_BACKGROUNDS.forEach((b) => bgRow.appendChild(bgPill(b, { type: "animated", value: b })));
    bgRow.appendChild(bgPill(t("solid"), { type: "solid", value: "" }));
    if (shots.length) bgRow.appendChild(bgPill("📸 " + t("captured ({n})", { n: shots.length }), { type: "slideshow", value: shots.slice() }));
    resultPanel.append(el("div.muted", { text: t("Background:") }), bgRow);

    // i18n-keys: Beginner | Intermediate | Advanced
    // i18n-keys: One note per beat — easy to follow | Cleaned-up rhythm, ornaments removed | Full transcription as detected
    const levels = [
      { id: "beginner", label: "Beginner", desc: "One note per beat — easy to follow" },
      { id: "intermediate", label: "Intermediate", desc: "Cleaned-up rhythm, ornaments removed" },
      { id: "advanced", label: "Advanced", desc: "Full transcription as detected" },
    ];
    const grid = el("div.grid.cards");
    for (const lv of levels) {
      const notes = lv.id === "advanced" ? full : simplify(full, bpm, lv.id);
      grid.appendChild(el("div.card", {}, [
        el("div.title", { text: t(lv.label) }),
        el("div.sub", { text: t(lv.desc) }),
        el("div.muted", { text: t.n("{n} note", "{n} notes", notes.length) }),
        el("div.row", { style: { marginTop: "auto" } }, [
          el("button.btn.primary", { onclick: () => saveAndPlay(lv, notes, true) }, ["▶ " + t("Play")]),
          el("button.btn", { onclick: () => saveAndPlay(lv, notes, false) }, ["💾 " + t("Save")]),
        ]),
      ]));
    }
    resultPanel.appendChild(grid);
  }

  function saveAndPlay(lv, notes, play) {
    const song = newSong({
      id: uid(), title: t("Recording {date} ({level})", { date: fmt.dateTime(new Date()), level: t(lv.label) }),
      artist: t("You"), instrument: s.instrument, bpm, difficulty: lv.id, source: "listen",
      background: chosenBg, notes,
    });
    Store.saveSong(song);
    toast(t('Saved "{title}"', { title: song.title }), "good");
    if (play) navigate(`#/play/${song.id}`); else navigate("#/library");
  }

  // ---------- screen capture ----------
  async function toggleCapture() {
    if (capStream) { stopCapture(); return; }
    try {
      capStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 2 }, audio: false });
      capVideo.srcObject = capStream; await capVideo.play();
      capStream.getVideoTracks()[0].addEventListener("ended", stopCapture);
      capToggle.textContent = "🛑 " + t("Stop capture");
      capStatus.textContent = t("Sharing — snapshots taken while recording");
    } catch (e) { toast(t("Screen capture cancelled"), "bad"); }
  }
  function stopCapture() {
    if (capStream) capStream.getTracks().forEach((t) => t.stop());
    capStream = null; stopSnapping();
    capToggle.textContent = "🖥️ " + t("Capture screen region");
    capStatus.textContent = shots.length ? t.n("{n} snapshot captured", "{n} snapshots captured", shots.length) : "";
  }
  function startSnapping() {
    shots.length = 0;
    capTimer = setInterval(() => {
      if (!capVideo.videoWidth) return;
      const scale = 640 / capVideo.videoWidth;
      capCanvas.width = 640; capCanvas.height = Math.round(capVideo.videoHeight * scale);
      capCanvas.getContext("2d").drawImage(capVideo, 0, 0, capCanvas.width, capCanvas.height);
      try { shots.push(capCanvas.toDataURL("image/jpeg", 0.55)); } catch {}
      capStatus.textContent = t.n("{n} snapshot captured", "{n} snapshots captured", shots.length);
    }, 1500);
  }
  function stopSnapping() { if (capTimer) clearInterval(capTimer); capTimer = 0; }

  return () => { recording = false; cancelAnimationFrame(raf); stopSnapping(); if (capStream) capStream.getTracks().forEach((t) => t.stop()); Audio.stopMic(); };
}
