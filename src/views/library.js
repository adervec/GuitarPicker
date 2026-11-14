import { el, pageHead, tag, toast, download, pickFile, fmtTime, clear } from "../ui/components.js";
import { Store } from "../state.js";
import { allSongs, isBuiltin } from "../music/catalog.js";
import { parse, newSong, songDuration, serialize, uid } from "../music/song-format.js";
import { parseMusicXML } from "../music/musicxml.js";
import { INSTRUMENTS, midiToName } from "../music/notes.js";
import { suggestCapo, transposeSong, keyName } from "../music/theory.js";
import { Synth } from "../audio/synth.js";
import { t } from "../i18n.js";

export default function library(ctx) {
  const { el: root, navigate } = ctx;
  let filter = { q: "", instrument: "all", difficulty: "all", genre: "all", karaoke: false };

  const actions = [
    el("button.btn", { onclick: importSong, title: t("A GuitarPicker song (.json) or a MusicXML score (.musicxml / .xml — MuseScore, TuxGuitar and Guitar Pro all export it)") }, ["⬇ " + t("Import")]),
    el("button.btn.primary", { onclick: () => navigate("#/editor") }, ["+ " + t("New song")]),
  ];
  root.appendChild(pageHead(t("Songs"), t("Public-domain library plus your own creations. Import, export, transpose, and play."), actions));

  // filter bar
  const search = el("input.input", { type: "search", placeholder: t("Search title or artist…"),
    oninput: (e) => { filter.q = e.target.value.toLowerCase(); renderGrid(); } });
  const instSel = el("select.input", { onchange: (e) => { filter.instrument = e.target.value; renderGrid(); } },
    [el("option", { value: "all", text: t("All instruments") }),
     ...Object.entries(INSTRUMENTS).map(([id, i]) => el("option", { value: id, text: i.name }))]);
  const genreSel = el("select.input", { onchange: (e) => { filter.genre = e.target.value; renderGrid(); } },
    [el("option", { value: "all", text: t("All genres") }),
     ...[...new Set(allSongs().map((s) => s.genre).filter(Boolean))].sort().map((g) => el("option", { value: g, text: g }))]);
  // i18n-keys: all | beginner | intermediate | advanced
  const DIFFS = ["all", "beginner", "intermediate", "advanced"];
  const diffPills = el("div.pill-row", {}, DIFFS.map((d) =>
    el(`span.pill${d === "all" ? ".active" : ""}`, { text: t(d), onclick: (e) => {
      filter.difficulty = d; [...diffPills.children].forEach((p, i) => p.classList.toggle("active", DIFFS[i] === d)); renderGrid();
    } })));
  const karaokePill = el("span.pill", { text: "🎤 " + t("Karaoke"), title: t("Only songs with lyrics"), onclick: () => {
    filter.karaoke = !filter.karaoke; karaokePill.classList.toggle("active", filter.karaoke); renderGrid();
  } });
  root.appendChild(el("div.panel.tight", { style: { marginBottom: "16px" } }, [
    el("div.row", { style: { alignItems: "center" } }, [
      el("div", { style: { flex: "1", minWidth: "200px" } }, [search]), instSel, genreSel, diffPills,
      el("div.pill-row", {}, [karaokePill]),
    ]),
  ]));

  const grid = el("div.grid.cards");
  root.appendChild(grid);

  // storage / file-location info
  root.appendChild(el("div.panel", { style: { marginTop: "18px" } }, [
    el("h3", { text: t("Where are my song files?") }),
    el("p.muted", { html: t("Your songs live in this browser's local storage under the key <code>guitarpicker.v1</code>. Use <b>Export</b> on any song to save a portable <code>.json</code> file (lands in your Downloads folder), and <b>Import</b> to load one back. Built-in public-domain songs are bundled with the app and can be duplicated to edit.") }),
  ]));

  const modalHost = el("div");
  root.appendChild(modalHost);

  renderGrid();
  const off = Store.on((e) => { if (e.type === "songs") renderGrid(); });

  function list() {
    return allSongs().filter((s) => {
      if (s.source === "drill") return false; // drills live in Training
      if (filter.instrument !== "all" && s.instrument !== filter.instrument) return false;
      if (filter.difficulty !== "all" && s.difficulty !== filter.difficulty) return false;
      if (filter.genre !== "all" && s.genre !== filter.genre) return false;
      if (filter.karaoke && !(s.lyrics || []).length) return false;
      if (filter.q && !(`${s.title} ${s.artist}`.toLowerCase().includes(filter.q))) return false;
      return true;
    });
  }

  function renderGrid() {
    clear(grid);
    const songs = list();
    if (!songs.length) { grid.appendChild(el("p.muted", { text: t("No songs match your filters.") })); return; }
    for (const s of songs) {
      const card = el("div.card", { onclick: () => openDetail(s) }, [
        el("div.spread", {}, [
          el("div.title", { text: s.title }),
          // i18n-keys: custom | import | manual
          isBuiltin(s.id) ? tag(t("public domain")) : tag(t(s.source || "custom")),
        ]),
        el("div.sub", { text: `${s.artist} · ${INSTRUMENTS[s.instrument]?.name || s.instrument}` }),
        el("div.row", { style: { gap: "6px", flexWrap: "wrap" } }, [
          tag(t(s.difficulty), s.difficulty),
          s.genre ? tag(s.genre) : null,
          tag(t("key {key}", { key: s.key })),
          s.capo ? tag(t("capo {n}", { n: s.capo })) : null,
          (s.lyrics || []).length ? tag("🎤 " + t("karaoke")) : null,
        ]),
        el("div.row", { style: { marginTop: "auto", gap: "6px" } }, [
          el("button.btn.primary", { style: { flex: "1" }, onclick: (ev) => { ev.stopPropagation(); navigate(`#/play/${s.id}`); } }, ["▶ " + t("Play")]),
          (s.lyrics || []).length ? el("button.btn", { title: t("Karaoke"), onclick: (ev) => { ev.stopPropagation(); navigate(`#/karaoke/${s.id}`); } }, ["🎤"]) : null,
        ]),
      ]);
      grid.appendChild(card);
    }
  }

  function openDetail(song) {
    const dur = songDuration(song);
    const capo = song.capo || suggestCapo((song.notes[0]?.midi[0] ?? 60) % 12).capo;
    let working = song;

    const keyLine = el("div.muted", {});
    function refreshKeyLine() {
      keyLine.textContent = t("Key {key} · {bpm} BPM · capo {capo} · {notes} · {time}", { key: working.key, bpm: working.bpm, capo: working.capo || capo, notes: t.n("{n} note", "{n} notes", working.notes.length), time: fmtTime(songDuration(working)) });
    }
    refreshKeyLine();

    const body = el("div.panel", { style: { maxWidth: "560px", width: "92%" }, onclick: (e) => e.stopPropagation() }, [
      el("div.spread", {}, [el("h2", { text: song.title }), el("button.btn.ghost", { onclick: close }, ["✕"])]),
      el("div.muted", { text: `${song.artist} · ${INSTRUMENTS[song.instrument]?.name || song.instrument}` }),
      keyLine,
      el("div.row", { style: { margin: "10px 0" } }, [
        tag(t(song.difficulty), song.difficulty),
        song.audio?.backing ? tag(t("has backing")) : tag("🎺 " + t("synth band")),
        song.audio?.vocal ? tag(t("has vocal")) : null,
        song.lyrics?.length ? tag("🎤 " + t("karaoke")) : null,
        ...(song.parts || []).map((p) => tag("+ " + (INSTRUMENTS[p.instrument]?.name || p.instrument))),
      ]),
      el("div.panel.tight", { style: { background: "var(--panel-2)" } }, [
        el("div.spread", {}, [
          el("span.muted", { text: t("Transpose (creates a copy in a new key):") }),
          el("div.row", { style: { gap: "6px" } }, [
            el("button.btn", { onclick: () => doTranspose(-1) }, ["♭ −1"]),
            el("button.btn", { onclick: () => doTranspose(1) }, ["♯ +1"]),
            el("button.btn", { onclick: () => Synth.playMidi((song.notes[0]?.midi[0]) || 60, { instrument: song.instrument }) }, ["🔊 " + t("Preview")]),
          ]),
        ]),
      ]),
      el("div.row", { style: { marginTop: "14px" } }, [
        el("button.btn.primary", { onclick: () => navigate(`#/play/${working.id}`) }, ["▶ " + t("Play")]),
        song.lyrics?.length ? el("button.btn", { onclick: () => navigate(`#/karaoke/${working.id}`) }, ["🎤 " + t("Karaoke")]) : null,
        el("button.btn", { onclick: () => navigate(`#/editor/${working.id}`) },
          ["✏ " + (isBuiltin(working.id) ? t("Edit a copy") : t("Edit"))]),
        el("button.btn", { onclick: () => exportSong(working) }, ["⬆ " + t("Export")]),
        el("button.btn", { onclick: duplicate }, ["⧉ " + t("Duplicate")]),
        !isBuiltin(song.id) ? el("button.btn.danger", { onclick: del }, ["🗑 " + t("Delete")]) : null,
      ]),
    ]);

    const modal = el("div.banner", { style: { background: "rgba(0,0,0,.5)", zIndex: "40" }, onclick: close }, [body]);
    clear(modalHost).appendChild(modal);

    function close() { clear(modalHost); }
    function doTranspose(semi) {
      const copy = newSong({ ...working, id: uid(), source: "manual",
        title: working.title.replace(/ \([+-]\d+\)$/, "") + ` (${semi > 0 ? "+" : ""}${semi})`,
        notes: transposeSong(working.notes, semi),
        // the whole arrangement moves, not just the part on screen
        parts: (working.parts || []).map((p) => ({ ...p, notes: transposeSong(p.notes, semi) })),
        voice: working.voice?.notes?.length ? { ...working.voice, notes: transposeSong(working.voice.notes, semi) } : working.voice,
        key: keyName(((noteToPc(working.key) + semi) % 12 + 12) % 12, /m$/.test(working.key)),
      });
      Store.saveSong(copy); working = copy; refreshKeyLine();
      toast(t("Saved transposed copy: {title}", { title: copy.title }), "good");
    }
    function duplicate() {
      const copy = newSong({ ...working, id: uid(), source: "manual", title: working.title + " (copy)" });
      Store.saveSong(copy); toast(t("Duplicated to your songs"), "good"); renderGrid();
    }
    function del() {
      if (!confirm(t('Delete "{title}"?', { title: song.title }))) return;
      Store.deleteSong(song.id); close(); toast(t("Deleted"));
    }
  }

  function exportSong(song) {
    const safe = song.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "song";
    download(`${safe}.gpsong.json`, serialize(song));
    toast(t("Exported to your Downloads folder"), "good");
  }

  async function importSong() {
    const picked = await pickFile(".json,.gpsong.json,application/json,.musicxml,.xml");
    if (!picked) return;
    try {
      const song = /\.(musicxml|xml)$/i.test(picked.name) ? parseMusicXML(picked.text) : parse(picked.text);
      song.id = uid(); song.source = "import";
      Store.saveSong(song);
      toast(t('Imported "{title}" (from {file})', { title: song.title, file: picked.name }), "good");
    } catch (e) { toast(t("Import failed: {error}", { error: e.message }), "bad"); }
  }

  return () => off();
}

function noteToPc(key) {
  const m = String(key).match(/^([A-Ga-g])([#b]?)/);
  if (!m) return 0;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase()];
  return (base + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
}
