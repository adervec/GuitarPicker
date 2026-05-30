import { el, pageHead, select, toast, download, getVar } from "../ui/components.js";
import { Store } from "../state.js";
import { findSong, isBuiltin } from "../music/catalog.js";
import { newSong, parseMelody, serialize, songDuration, uid } from "../music/song-format.js";
import { INSTRUMENTS, midiToName, nameToMidi } from "../music/notes.js";
import { ANIMATED_BACKGROUNDS, SOLID_SWATCHES } from "../ui/backgrounds.js";
import { Synth } from "../audio/synth.js";

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
    el("div.grid", { style: { gridTemplateColumns: "1fr 1fr 1fr" } }, [
      field("Instrument", "instrument", "select", Object.entries(INSTRUMENTS).map(([id, i]) => ({ value: id, label: i.name }))),
      field("Key", "key", "select", CIRCLE_KEYS.map((k) => ({ value: k, label: k }))),
      field("Difficulty", "difficulty", "select", ["beginner", "intermediate", "advanced"].map((d) => ({ value: d, label: d }))),
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
      el("span.muted", { text: "Type a melody, or paint on the roll below. Click a note to delete it." }),
      el("div.row", {}, [
        el("button.btn", { onclick: () => { notation.value = notesToNotation(song.notes, song.bpm); } }, ["⇣ From roll"]),
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
  const rollControls = el("div.row", { style: { alignItems: "center", marginBottom: "8px" } }, [
    select({ label: "Snap", value: String(snap), options: [["1", "1 beat"], ["0.5", "½"], ["0.25", "¼"]].map(([v, l]) => ({ value: v, label: l })),
      onchange: (v) => snap = +v }),
    select({ label: "New note length", value: String(noteLen), options: [["2", "2 beats"], ["1", "1 beat"], ["0.5", "½"], ["0.25", "¼"]].map(([v, l]) => ({ value: v, label: l })),
      onchange: (v) => noteLen = +v }),
    el("div", { style: { flex: 1 } }),
    el("button.btn.ghost", { onclick: () => { song.notes = []; redraw(); } }, ["Clear notes"]),
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
    // delete if clicking an existing note
    const hitIdx = song.notes.findIndex((n) => n.midi.includes(midi) &&
      beat >= n.time / spb() && beat <= (n.time + n.dur) / spb());
    if (hitIdx >= 0) { song.notes.splice(hitIdx, 1); redraw(); return; }
    const snapped = Math.floor(beat / snap) * snap;
    song.notes.push({ time: +(snapped * spb()).toFixed(4), dur: +(noteLen * spb() * 0.92).toFixed(4), midi: [midi] });
    Synth.playMidi(midi, { dur: 0.3 });
    redraw();
  });

  function redraw() {
    const beats = Math.max(16, Math.ceil((songDuration(song) / spb()) + 4));
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
    // notes
    for (const n of song.notes) {
      const x = (n.time / spb()) * pxPerBeat, wRect = Math.max(8, (n.dur / spb()) * pxPerBeat);
      for (const m of n.midi) {
        if (m < LOW || m >= LOW + ROWS) continue;
        const y = yAtMidi(m);
        c.fillStyle = getVar("--accent"); c.strokeStyle = getVar("--accent-2");
        roundRect(x + 1, y + 2, wRect - 2, ROW_H - 4, 4); c.fill();
      }
    }
  }
  function roundRect(x, y, w, h, r) { r = Math.min(r, h / 2, w / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  // ---------- lyrics ----------
  const lyricList = el("div.col", { style: { gap: "8px" } });
  root.appendChild(el("div.panel", {}, [
    el("div.spread", {}, [el("h2", { text: "Lyrics (optional)" }),
      el("button.btn", { onclick: () => { (song.lyrics ||= []).push({ time: 0, text: "" }); renderLyrics(); } }, ["+ Line"])]),
    lyricList,
  ]));
  function renderLyrics() {
    lyricList.innerHTML = "";
    (song.lyrics || []).forEach((l, i) => {
      lyricList.appendChild(el("div.row", { style: { alignItems: "center" } }, [
        el("input.input", { type: "number", step: "0.1", value: l.time, style: { width: "90px" },
          oninput: (e) => l.time = +e.target.value }),
        el("input.input", { value: l.text, style: { flex: 1 }, placeholder: "lyric text",
          oninput: (e) => l.text = e.target.value }),
        el("button.btn.ghost", { onclick: () => { song.lyrics.splice(i, 1); renderLyrics(); } }, ["✕"]),
      ]));
    });
  }
  renderLyrics();
  redraw();

  // ---------- actions ----------
  function applyNotation() {
    const txt = notation.value.trim();
    if (!txt) return;
    try { song.notes = parseMelody(song.bpm, txt); redraw(); toast("Notes updated from notation", "good"); }
    catch (e) { toast("Couldn't parse notation: " + e.message, "bad"); }
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
}

function notesToNotation(notes, bpm) {
  const spb = 60 / bpm;
  return notes.slice().sort((a, b) => a.time - b.time).map((n) => {
    const beats = Math.round((n.dur / spb / 0.92) * 4) / 4 || 1;
    const pitches = n.midi.map((m) => midiToName(m).full).join("+");
    return `${pitches}:${beats}`;
  }).join(" ");
}
