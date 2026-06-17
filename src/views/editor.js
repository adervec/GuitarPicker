import { el, pageHead, select, toast, download, getVar, pickFile, fmtTime } from "../ui/components.js";
import { Store } from "../state.js";
import { findSong, isBuiltin } from "../music/catalog.js";
import { newSong, parseMelody, serialize, songDuration, uid, GENRES } from "../music/song-format.js";
import { INSTRUMENTS, midiToName, nameToMidi, freqToMidi } from "../music/notes.js";
import { ANIMATED_BACKGROUNDS, SOLID_SWATCHES } from "../ui/backgrounds.js";
import { Synth } from "../audio/synth.js";
import { Audio } from "../audio/engine.js";
import { detectPitch, PitchTracker } from "../audio/pitch.js";
import { parseLRC, toLRC } from "../music/lrc.js";
import { framesToNotes } from "../music/transcribe.js";
import { TrackPlayer } from "../audio/player.js";

const CIRCLE_KEYS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F", "Am", "Em", "Dm"];

export default function editor(ctx) {
  const { el: root, params, navigate } = ctx;
  let song;
  if (params[0]) {
    const existing = findSong(params[0]);
    song = existing ? newSong({ ...existing }) : newSong();
    if (existing && isBuiltin(existing.id)) { song.id = uid(); song.source = "manual"; song.title = existing.title + " (my version)"; }
  } else song = newSong();

  root.appendChild(pageHead(params[0] ? "Edit song" : "New song", "Set details, paint notes on the roll or type them in, attach audio, and save.", [
    el("button.btn", { onclick: play }, ["▶ Test play"]),
    el("button.btn", { onclick: exportSong }, ["⬆ Export"]),
    el("button.btn.primary", { onclick: save }, ["💾 Save"]),
  ]));

  // ---------- metadata ----------
  const f = {};
  function field(label, key, type = "text", opts) {
    if (type === "select") {
      const sel = select({ label, value: song[key], options: opts, onchange: (v) => { song[key] = key === "bpm" ? +v : v; if (key === "bpm") redraw(); } });
      f[key] = sel.selectEl; return sel;
    }
    const input = el("input.input", { type, value: song[key], oninput: (e) => {
      song[key] = type === "number" ? +e.target.value : e.target.value; if (key === "bpm") redraw();
    } });
    f[key] = input;
    return el("label.field", {}, [el("span", { text: label }), input]);
  }

  const meta = el("div.panel", {}, [
    el("h2", { text: "Details" }),
    el("div.grid", { style: { gridTemplateColumns: "2fr 2fr 1fr 1fr" } }, [
      field("Title", "title"),
      field("Artist", "artist"),
      field("BPM", "bpm", "number"),
      field("Capo", "capo", "number"),
    ]),
    el("div.grid", { style: { gridTemplateColumns: "1fr 1fr 1fr 1fr" } }, [
      field("Instrument", "instrument", "select", Object.entries(INSTRUMENTS).map(([id, i]) => ({ value: id, label: i.name }))),
      field("Key", "key", "select", CIRCLE_KEYS.map((k) => ({ value: k, label: k }))),
      field("Difficulty", "difficulty", "select", ["beginner", "intermediate", "advanced"].map((d) => ({ value: d, label: d }))),
      field("Genre", "genre", "select", GENRES.map((g) => ({ value: g, label: g }))),
    ]),
  ]);
  root.appendChild(meta);

  // ---------- background ----------
  const bgPanel = el("div.panel", {}, [el("h2", { text: "Background" })]);
  root.appendChild(bgPanel);
  const bgTypeSel = select({ label: "Type", value: song.background?.type || "solid",
    options: [{ value: "solid", label: "Solid colour" }, { value: "animated", label: "Animated" }, { value: "slideshow", label: "Slideshow (images)" }],
    onchange: (v) => { song.background = { type: v, value: v === "slideshow" ? [] : (v === "animated" ? "aurora" : "") }; renderBgValue(); } });
  const bgValueWrap = el("div");
  bgPanel.append(el("div.grid", { style: { gridTemplateColumns: "1fr 2fr" } }, [bgTypeSel, bgValueWrap]));
  renderBgValue();
  function renderBgValue() {
    bgValueWrap.innerHTML = "";
    const t = song.background?.type;
    if (t === "animated") {
      bgValueWrap.appendChild(el("div.pill-row", {}, ANIMATED_BACKGROUNDS.map((b) =>
        el(`span.pill${song.background.value === b ? ".active" : ""}`, { text: b, onclick: () => {
          song.background.value = b; renderBgValue(); } }))));
    } else if (t === "solid") {
      bgValueWrap.appendChild(el("div.pill-row", {}, SOLID_SWATCHES.map((sw) =>
        el("span.pill", { text: sw || "theme default", style: sw ? { background: sw, color: "#fff" } : {},
          onclick: () => { song.background.value = sw; } }))));
    } else {
      bgValueWrap.appendChild(el("label.field", {}, [
        el("span", { text: "Add images (used as a slideshow behind the notes)" }),
        el("input", { type: "file", accept: "image/*", multiple: true, onchange: (e) => loadImages(e.target.files) }),
      ]));
      bgValueWrap.appendChild(el("div.muted", { id: "slide-count", text: `${(song.background.value || []).length} image(s)` }));
    }
  }
  function loadImages(files) {
    const arr = song.background.value = song.background.value || [];
    [...files].forEach((file) => { const r = new FileReader(); r.onload = () => { arr.push(r.result);
      bgValueWrap.querySelector("#slide-count").textContent = `${arr.length} image(s)`; }; r.readAsDataURL(file); });
  }

  // ---------- audio ----------
  const audioPanel = el("div.panel", {}, [el("h2", { text: "Audio tracks (optional)" }),
    el("p.muted", { text: "Attach a backing track and/or a vocal track. They're stored inside the song file." })]);
  root.appendChild(audioPanel);
  function audioRow(kind, label) {
    const status = el("span.muted", { text: song.audio?.[kind] ? "attached ✓" : "none" });
    return el("div.row", { style: { alignItems: "center", marginTop: "8px" } }, [
      el("label.field", { style: { flex: "1" } }, [el("span", { text: label }),
        el("input", { type: "file", accept: "audio/*", onchange: (e) => {
          const file = e.target.files[0]; if (!file) return;
          const r = new FileReader(); r.onload = () => { (song.audio ||= {})[kind] = r.result; status.textContent = "attached ✓"; }; r.readAsDataURL(file);
        } })]),
      status,
      el("button.btn.ghost", { onclick: () => { if (song.audio) song.audio[kind] = null; status.textContent = "none"; } }, ["Clear"]),
    ]);
  }
  audioPanel.append(audioRow("backing", "Backing track"), audioRow("vocal", "Vocal track"));

  // ---------- quick notation ----------
  const notation = el("textarea.input", { rows: 3, style: { width: "100%", fontFamily: "var(--mono)" },
    placeholder: "Quick entry, e.g.  C4:1 E4:1 G4:2 C4+E4+G4:2 r:1   (PITCH:beats, chords with +, rest = r)" });
  root.appendChild(el("div.panel", {}, [
    el("h2", { text: "Notes" }),
    el("div.spread", {}, [
      el("span.muted", { text: "Type a melody, or paint on the roll below. The Instrument/Vocal toggle on the roll selects which layer this edits. Click a note to delete it." }),
      el("div.row", {}, [
        el("button.btn", { onclick: () => { notation.value = notesToNotation(activeNotes(), song.bpm); } }, ["⇣ From roll"]),
        el("button.btn.primary", { onclick: applyNotation }, ["Apply notation"]),
      ]),
    ]),
    notation,
  ]));

  // ---------- piano roll ----------
  const ROW_H = 16, OCTAVES = 4, LOW = 36; // C2..C6
  const ROWS = OCTAVES * 12;
  let snap = 0.5; // beats
  let noteLen = 1; // beats
  let editLayer = "notes"; // which layer the roll/notation edits: "notes" (instrument) or "voice"
  const layerPills = el("div.pill-row", {}, [
    el("span.pill.active", { text: "Instrument", title: "Edit the instrument melody", onclick: () => setLayer("notes") }),
    el("span.pill", { text: "Vocal", title: "Edit the karaoke vocal melody", onclick: () => setLayer("voice") }),
  ]);
  function setLayer(which) {
    editLayer = which === "voice" ? "voice" : "notes";
    [...layerPills.children].forEach((p) => p.classList.toggle("active",
      p.textContent === (editLayer === "voice" ? "Vocal" : "Instrument")));
    refreshVoice();
  }
  function activeNotes() {
    return editLayer === "voice" ? ((song.voice ||= { notes: [] }).notes) : song.notes;
  }
  const rollControls = el("div.row", { style: { alignItems: "center", marginBottom: "8px" } }, [
    el("span.muted", { style: { fontSize: "12px" }, text: "Editing:" }), layerPills,
    select({ label: "Snap", value: String(snap), options: [["1", "1 beat"], ["0.5", "½"], ["0.25", "¼"]].map(([v, l]) => ({ value: v, label: l })),
      onchange: (v) => snap = +v }),
    select({ label: "New note length", value: String(noteLen), options: [["2", "2 beats"], ["1", "1 beat"], ["0.5", "½"], ["0.25", "¼"]].map(([v, l]) => ({ value: v, label: l })),
      onchange: (v) => noteLen = +v }),
    el("div", { style: { flex: 1 } }),
    el("button.btn.ghost", { onclick: () => { if (editLayer === "voice") (song.voice ||= { notes: [] }).notes = []; else song.notes = []; refreshVoice(); } }, ["Clear layer"]),
  ]);
  const scroller = el("div", { style: { overflowX: "auto", overflowY: "hidden" } });
  const canvas = el("canvas#roll-canvas", { height: ROWS * ROW_H });
  scroller.appendChild(canvas);
  root.appendChild(el("div.panel", {}, [rollControls, el("div.roll-wrap", {}, [scroller])]));

  const c = canvas.getContext("2d");
  const spb = () => 60 / (song.bpm || 90);
  const pxPerBeat = 46;
  function midiAtY(y) { return LOW + ROWS - 1 - Math.floor(y / ROW_H); }
  function yAtMidi(m) { return (LOW + ROWS - 1 - m) * ROW_H; }

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const midi = midiAtY(y);
    const beat = x / pxPerBeat;
    const arr = activeNotes();
    // delete if clicking an existing note in the active layer
    const hitIdx = arr.findIndex((n) => n.midi.includes(midi) &&
      beat >= n.time / spb() && beat <= (n.time + n.dur) / spb());
    if (hitIdx >= 0) { arr.splice(hitIdx, 1); refreshVoice(); return; }
    const snapped = Math.floor(beat / snap) * snap;
    arr.push({ time: +(snapped * spb()).toFixed(4), dur: +(noteLen * spb() * 0.92).toFixed(4), midi: [midi] });
    Synth.playMidi(midi, { dur: 0.3 });
    refreshVoice();
  });

  function redraw() {
    const voiceEnd = (song.voice?.notes || []).reduce((m, n) => Math.max(m, n.time + (n.dur || 0)), 0);
    const beats = Math.max(16, Math.ceil((Math.max(songDuration(song), voiceEnd) / spb()) + 4));
    const w = beats * pxPerBeat;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = w + "px"; canvas.width = w * dpr; canvas.height = ROWS * ROW_H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = getVar("--highway"); c.fillRect(0, 0, w, ROWS * ROW_H);
    // rows (highlight naturals / C lines)
    for (let r = 0; r < ROWS; r++) {
      const midi = LOW + ROWS - 1 - r; const pc = ((midi % 12) + 12) % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(pc);
      c.fillStyle = isBlack ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)";
      c.fillRect(0, r * ROW_H, w, ROW_H);
      if (pc === 0) { c.strokeStyle = getVar("--line"); c.beginPath(); c.moveTo(0, r * ROW_H); c.lineTo(w, r * ROW_H); c.stroke();
        c.fillStyle = getVar("--muted"); c.font = "9px var(--mono)"; c.fillText(midiToName(midi).full, 2, r * ROW_H + 11); }
    }
    // beat gridlines
    for (let b = 0; b <= beats; b++) {
      c.strokeStyle = b % 4 === 0 ? getVar("--line") : "rgba(255,255,255,0.04)";
      c.beginPath(); c.moveTo(b * pxPerBeat, 0); c.lineTo(b * pxPerBeat, ROWS * ROW_H); c.stroke();
    }
    // notes — the inactive layer dim & thin, the active layer bright blocks on top
    const drawNotes = (notes, color, active) => {
      for (const n of (notes || [])) {
        const x = (n.time / spb()) * pxPerBeat, wRect = Math.max(8, (n.dur / spb()) * pxPerBeat);
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
    drawNotes(voiceActive ? song.notes : song.voice?.notes, voiceActive ? "--accent" : "--accent-2", false);
    drawNotes(voiceActive ? song.voice?.notes : song.notes, voiceActive ? "--accent-2" : "--accent", true);
  }
  function roundRect(x, y, w, h, r) { r = Math.min(r, h / 2, w / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  // ---------- vocal melody (karaoke scoring target) ----------
  const cloneNotes = (ns) => (ns || []).map((n) => ({ time: n.time, dur: n.dur, midi: [...n.midi] }));
  const voiceStatus = el("span.muted");
  const humPanel = el("div.panel.tight.hidden", { style: { background: "var(--panel-2)", margin: "8px 0" } });
  function refreshVoice() {
    const n = song.voice?.notes?.length || 0;
    voiceStatus.textContent = n
      ? `${n} vocal note(s) — graded when singing in Karaoke`
      : "none — Karaoke scoring falls back to the instrument melody";
    redraw();
  }
  function shiftVoice(semi) {
    const ns = song.voice?.notes || [];
    if (!ns.length) { toast("Copy from the instrument notes first", "bad"); return; }
    song.voice.notes = ns.map((n) => ({ ...n, midi: n.midi.map((m) => m + semi) }));
    refreshVoice();
  }
  root.appendChild(el("div.panel", {}, [
    el("div.spread", {}, [
      el("h2", { text: "Vocal melody (Karaoke scoring)" }),
      el("div.row", { style: { gap: "6px", flexWrap: "wrap" } }, [
        el("button.btn", { onclick: () => { (song.voice ||= { notes: [] }).notes = cloneNotes(song.notes); setLayer("voice"); toast("Copied the melody to the vocal line — now editing the Vocal layer", "good"); } }, ["⎘ Copy from notes"]),
        el("button.btn", { onclick: startHum }, ["🎙️ Hum to capture"]),
        el("button.btn", { title: "Singers often sit an octave above the guitar", onclick: () => shiftVoice(12) }, ["8va ▲"]),
        el("button.btn", { title: "Shift the vocal line down an octave", onclick: () => shiftVoice(-12) }, ["8vb ▼"]),
        el("button.btn.ghost", { onclick: () => { song.voice = { notes: [] }; refreshVoice(); } }, ["Clear"]),
      ]),
    ]),
    el("p.muted", { style: { fontSize: "12px" }, text: "The pitch line graded when singing in Karaoke (shown dimmed on the roll above). Leave empty to score against the instrument melody." }),
    humPanel,
    voiceStatus,
  ]));
  refreshVoice();

  // hum-to-capture: sing the vocal line, transcribe it into voice.notes (shared transcriber)
  const humBuf = new Float32Array(2048);
  let humActive = false, humRaf = 0, humFrames = [], humStart = 0, humTracker = null;
  async function startHum() {
    if (humActive) return;
    try { await Audio.startMic(Store.settings().inputDeviceId); }
    catch (e) { toast("Mic failed: " + e.message, "bad"); return; }
    humActive = true; humFrames = []; humStart = performance.now(); humTracker = new PitchTracker();
    renderHum("0:00", "—"); humTick();
  }
  function humTick() {
    if (!humActive) return;
    if (Audio.readTimeDomain(humBuf)) {
      const set = Store.settings();
      const { freq } = detectPitch(humBuf, Audio.ctx().sampleRate, set.micGate);
      const t = (performance.now() - humStart) / 1000;
      const f = humTracker.push(freq, set.a4);
      humFrames.push({ t, freq: f });
      renderHum(fmtTime(t), f > 0 ? midiToName(freqToMidi(f, set.a4)).full : "—");
    }
    humRaf = requestAnimationFrame(humTick);
  }
  function stopHum(silent) {
    if (!humActive) { humPanel.classList.add("hidden"); return; }
    humActive = false; if (humRaf) cancelAnimationFrame(humRaf); humRaf = 0;
    Audio.stopMic(); humPanel.classList.add("hidden");
    if (silent) return;
    if (humFrames.length < 5) { toast("Didn't hear enough — try again, a bit louder.", "bad"); return; }
    const notes = framesToNotes(humFrames, song.bpm, Store.settings().a4);
    if (!notes.length) { toast("Couldn't find clear notes — try a clear, single-note melody.", "bad"); return; }
    (song.voice ||= { notes: [] }).notes = notes;
    setLayer("voice");
    toast(`Captured ${notes.length} vocal note(s)`, "good");
  }
  function renderHum(time, note) {
    humPanel.classList.remove("hidden");
    humPanel.innerHTML = "";
    humPanel.append(
      el("div.spread", {}, [
        el("div", { html: `<b>🎙️ Hum to capture</b> · <span class="muted">${time}</span>` }),
        el("button.btn.primary", { onclick: () => stopHum() }, ["■ Stop & transcribe"]),
      ]),
      el("div", { style: { fontSize: "28px", margin: "6px 0", minHeight: "30px" }, html: `<b>${escHTML(note)}</b>` }),
      el("p.muted", { style: { fontSize: "12px" }, text: "Sing or hum the vocal line; it transcribes to the vocal melody at the song's tempo when you stop." }),
    );
  }

  // ---------- lyrics & karaoke ----------
  const lyricList = el("div.col", { style: { gap: "8px" } });
  const tapPanel = el("div.panel.tight.hidden", { style: { background: "var(--panel-2)", margin: "8px 0" } });
  root.appendChild(el("div.panel", {}, [
    el("div.spread", {}, [
      el("h2", { text: "Lyrics & Karaoke (optional)" }),
      el("div.row", { style: { gap: "6px", flexWrap: "wrap" } }, [
        el("button.btn", { onclick: addLine }, ["+ Line"]),
        el("button.btn", { onclick: importLRC }, ["⬆ Import .lrc"]),
        el("button.btn", { onclick: pasteLRC }, ["📋 Paste LRC"]),
        el("button.btn", { onclick: exportLRC }, ["⬇ Export .lrc"]),
        el("button.btn", { onclick: startTap }, ["🎤 Tap to time"]),
      ]),
    ]),
    el("p.muted", { style: { fontSize: "12px" }, html:
      "Times are seconds from the song start. Word-level karaoke timing is auto-distributed across each line " +
      "unless you tap it in or import enhanced LRC (<code>&lt;mm:ss.xx&gt;</code> word tags)." }),
    tapPanel,
    lyricList,
  ]));

  function addLine() { (song.lyrics ||= []).push({ time: 0, text: "" }); renderLyrics(); }
  function renderLyrics() {
    lyricList.innerHTML = "";
    const ls = song.lyrics || [];
    if (!ls.length) { lyricList.appendChild(el("div.muted", { text: "No lyrics yet — add a line, import an .lrc, or tap to time." })); return; }
    ls.forEach((l, i) => {
      const timed = Array.isArray(l.words) && l.words.length;
      lyricList.appendChild(el("div.row", { style: { alignItems: "center" } }, [
        el("input.input", { type: "number", step: "0.1", value: l.time, style: { width: "84px" },
          oninput: (e) => l.time = +e.target.value }),
        el("input.input", { value: l.text, style: { flex: 1 }, placeholder: "lyric text",
          oninput: (e) => { l.text = e.target.value; if (l.words) delete l.words; } }),
        timed ? el("span.tag.beginner", { title: "word-level timing captured", text: `${l.words.length}w` }) : el("span.tag", { text: "auto" }),
        timed ? el("button.btn.ghost", { title: "Clear word timing (revert to auto)", onclick: () => { delete l.words; renderLyrics(); } }, ["↺"]) : null,
        el("button.btn.ghost", { onclick: () => { song.lyrics.splice(i, 1); renderLyrics(); } }, ["✕"]),
      ]));
    });
  }

  // ----- LRC import / export -----
  async function importLRC() {
    const picked = await pickFile(".lrc,.txt,text/plain");
    if (picked) applyLRC(picked.text, picked.name);
  }
  function pasteLRC() {
    const text = window.prompt("Paste LRC lyrics — supports [mm:ss.xx] lines and enhanced <mm:ss.xx> word tags:");
    if (text != null) applyLRC(text, "pasted text");
  }
  function applyLRC(text, srcName) {
    try {
      const parsed = parseLRC(text);
      if (!parsed.length) { toast("No timed lyric lines found in that LRC", "bad"); return; }
      song.lyrics = parsed; renderLyrics();
      toast(`Imported ${parsed.length} line(s) from ${srcName}`, "good");
    } catch (e) { toast("Couldn't parse LRC: " + e.message, "bad"); }
  }
  function exportLRC() {
    if (!(song.lyrics || []).length) { toast("No lyrics to export", "bad"); return; }
    const safe = (song.title || "song").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "song";
    download(`${safe}.lrc`, toLRC(song.lyrics), "text/plain");
    toast("Exported .lrc to your Downloads folder", "good");
  }

  // ----- tap-to-time: play along and tap each word to capture karaoke timing -----
  let tapFlat = [], tapPos = 0, tapActive = false, tapRAF = 0, tapStartMs = 0, tapPlayer = null, tapKey = null;
  function startTap() {
    const ls = song.lyrics || [];
    if (!ls.length) { toast("Add lyric lines (text) first, then tap their timing", "bad"); return; }
    tapFlat = [];
    ls.forEach((line) => String(line.text || "").trim().split(/\s+/).filter(Boolean)
      .forEach((tok, w) => tapFlat.push({ line, text: tok, first: w === 0 })));
    if (!tapFlat.length) { toast("Your lyric lines have no text to time", "bad"); return; }
    ls.forEach((l) => { l.words = []; });
    tapPos = 0; tapActive = true; tapStartMs = performance.now();
    try { if (song.audio?.backing) { tapPlayer = new TrackPlayer(); tapPlayer.load(song); tapPlayer.play(0); } } catch (e) { /* audio optional */ }
    tapKey = (e) => { if (e.code === "Space") { e.preventDefault(); stamp(); } };
    window.addEventListener("keydown", tapKey);
    renderTap(); tickTap();
  }
  function tapNow() {
    if (tapPlayer?.backing && !tapPlayer.backing.paused) return tapPlayer.backing.currentTime;
    return (performance.now() - tapStartMs) / 1000;
  }
  function tickTap() {
    if (!tapActive) return;
    const clk = tapPanel.querySelector("#tap-clock"); if (clk) clk.textContent = tapNow().toFixed(2) + "s";
    tapRAF = requestAnimationFrame(tickTap);
  }
  function stamp() {
    if (!tapActive) return;
    const item = tapFlat[tapPos];
    if (item) { const t = +tapNow().toFixed(3); item.line.words.push({ t, text: item.text }); if (item.first) item.line.time = t; }
    tapPos++;
    if (tapPos >= tapFlat.length) { stopTap(); return; }
    renderTap();
  }
  function stopTap(silent) {
    tapActive = false;
    if (tapRAF) { cancelAnimationFrame(tapRAF); tapRAF = 0; }
    if (tapKey) { window.removeEventListener("keydown", tapKey); tapKey = null; }
    if (tapPlayer) { try { tapPlayer.stop(); } catch (e) {} tapPlayer = null; }
    tapPanel.classList.add("hidden");
    if (!silent) { renderLyrics(); toast("Word timing captured", "good"); }
  }
  function renderTap() {
    tapPanel.classList.remove("hidden");
    const cur = tapFlat[tapPos], nxt = tapFlat[tapPos + 1];
    tapPanel.innerHTML = "";
    tapPanel.append(
      el("div.spread", {}, [
        el("div", { html: `<b>🎤 Tap to time</b> · <span class="muted">word ${Math.min(tapPos + 1, tapFlat.length)}/${tapFlat.length} · <span id="tap-clock">0.00s</span></span>` }),
        el("button.btn.ghost", { onclick: () => stopTap() }, ["■ Stop"]),
      ]),
      el("div", { style: { fontSize: "22px", margin: "8px 0", minHeight: "28px" },
        html: cur ? `▶ <b>${escHTML(cur.text)}</b>${nxt ? ` <span class="muted">→ ${escHTML(nxt.text)}</span>` : ""}` : "Done — press Stop" }),
      el("button.btn.primary", { style: { width: "100%" }, onclick: stamp }, ["TAP — or press Space"]),
      el("p.muted", { style: { fontSize: "12px", marginTop: "6px" }, text: "Play along and tap on each word as you sing it. The backing track (if attached) plays automatically." }),
    );
  }

  renderLyrics();
  redraw();

  // ---------- actions ----------
  function applyNotation() {
    const txt = notation.value.trim();
    if (!txt) return;
    try {
      const parsed = parseMelody(song.bpm, txt);
      if (editLayer === "voice") (song.voice ||= { notes: [] }).notes = parsed; else song.notes = parsed;
      refreshVoice(); toast(`${editLayer === "voice" ? "Vocal" : "Instrument"} notes updated from notation`, "good");
    } catch (e) { toast("Couldn't parse notation: " + e.message, "bad"); }
  }
  function save() {
    if (!song.title.trim()) { toast("Give your song a title first", "bad"); return; }
    if (!song.notes.length) { toast("Add some notes first", "bad"); return; }
    Store.saveSong(song);
    toast(`Saved "${song.title}"`, "good");
    navigate("#/library");
  }
  function play() {
    if (!song.notes.length) { toast("Add notes before testing", "bad"); return; }
    Store.saveSong(song); navigate(`#/play/${song.id}`);
  }
  function exportSong() {
    const safe = (song.title || "song").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "song";
    download(`${safe}.gpsong.json`, serialize(song)); toast("Exported", "good");
  }

  // stop tap-to-time and hum-capture (timers/listeners/mic) when leaving the view
  return () => { stopTap(true); stopHum(true); };
}

function escHTML(s) { return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

function notesToNotation(notes, bpm) {
  const spb = 60 / bpm;
  return notes.slice().sort((a, b) => a.time - b.time).map((n) => {
    const beats = Math.round((n.dur / spb / 0.92) * 4) / 4 || 1;
    const pitches = n.midi.map((m) => midiToName(m).full).join("+");
    return `${pitches}:${beats}`;
  }).join(" ");
}
