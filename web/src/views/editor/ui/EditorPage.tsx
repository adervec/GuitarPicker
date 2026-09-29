"use client";

// The full Song Editor: metadata, a background picker, optional backing/
// vocal audio-file attachment, a text-notation note entry, a click-to-paint
// piano roll, a vocal-melody layer (copy from notes / hum-to-capture /
// octave shift), and a Lyrics & Karaoke panel (add lines / import-paste-
// export .lrc / tap-to-time word timing). Ported in full from the vanilla
// app's views/editor.js — a first pass at this view (see this file's git
// history / Design.md) shipped a heavily trimmed version dropping
// everything past metadata + notation; this is the complete port, done by
// request. Saves to the same localStorage user-song store
// (entities/song/model/user-songs.ts) Training's drills also write to.
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  parseMelody, songDuration, serialize, newSong, GENRES,
  type Song, type Note, type LyricLine,
} from "@/entities/song/model/song-format";
import { saveUserSong } from "@/entities/song/model/user-songs";
import { instrumentOptions, INSTRUMENTS, type InstrumentDef } from "@/entities/instrument/model/data";
import { midiToName } from "@/shared/lib/note-math";
import { toast, download, pickFile, fmtTime } from "@/shared/lib/dom";
import { ANIMATED_BACKGROUNDS, SOLID_SWATCHES } from "@/shared/lib/backgrounds";
import { parseLRC, toLRC } from "@/shared/lib/lrc";
import { framesToNotes } from "@/shared/lib/transcribe";
import { getSettings } from "@/shared/lib/player-settings";
import { songToMusicXML, musicXMLToSong } from "@/shared/lib/musicxml";
import { songToAsciiTab } from "@/shared/lib/ascii-tab";
import { useListenRecorder } from "@/features/listen-record/model/useListenRecorder";
import { useTapToTime } from "@/features/tap-lyrics/model/useTapToTime";
import { PianoRoll, type EditLayer } from "./PianoRoll";
import styles from "./EditorPage.module.css";

const KEYS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F", "Am", "Em", "Dm"];
const DIFFICULTIES = ["beginner", "intermediate", "advanced"];
type ExportFormat = "musicxml" | "json" | "ascii";
const EXPORT_FORMATS: { id: ExportFormat; label: string }[] = [
  { id: "musicxml", label: "MusicXML" },
  { id: "json", label: "GuitarPicker JSON" },
  { id: "ascii", label: "ASCII Tab (.txt)" },
];

type EditorTab = "song" | "vocal" | "lyrics";
const TABS: { id: EditorTab; label: string }[] = [
  { id: "song", label: "Song" },
  { id: "vocal", label: "Vocal melody" },
  { id: "lyrics", label: "Lyrics & Karaoke" },
];

export function EditorPage({ initial, isEditing = false }: { initial: Song; isEditing?: boolean }) {
  const router = useRouter();
  const [song, setSong] = useState<Song>(initial);
  const [notation, setNotation] = useState(() => notesToNotation(initial.notes, initial.bpm));
  const [editLayer, setEditLayer] = useState<EditLayer>("notes");
  const [tab, setTab] = useState<EditorTab>("song");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("musicxml");
  const hum = useListenRecorder();
  const tap = useTapToTime();

  const inst = (INSTRUMENTS as Record<string, InstrumentDef>)[song.instrument];
  const tabStrings = inst?.strings ?? [];

  function set<K extends keyof Song>(key: K, value: Song[K]) {
    setSong((s) => ({ ...s, [key]: value }));
  }

  // ---------- notation ----------
  function applyNotation() {
    const txt = notation.trim();
    if (!txt) return;
    try {
      const notes = parseMelody(song.bpm, txt);
      setSong((s) => (editLayer === "voice" ? { ...s, voice: { notes } } : { ...s, notes }));
      toast(`${editLayer === "voice" ? "Vocal" : "Instrument"} notes updated from notation`, "good");
    } catch (e) {
      toast("Couldn't parse notation: " + (e instanceof Error ? e.message : String(e)), "bad");
    }
  }
  function fromRoll() {
    const notes = editLayer === "voice" ? song.voice.notes : song.notes;
    setNotation(notesToNotation(notes, song.bpm));
  }

  // ---------- piano roll ----------
  function handleRollNotesChange(layer: EditLayer, notes: Note[]) {
    setSong((s) => (layer === "voice" ? { ...s, voice: { notes } } : { ...s, notes }));
  }

  // ---------- background ----------
  function changeBgType(type: string) {
    setSong((s) => ({ ...s, background: { type, value: type === "slideshow" ? [] : (type === "animated" ? "aurora" : "") } }));
  }
  function setBgValue(value: string) {
    setSong((s) => ({ ...s, background: { ...s.background, value } }));
  }
  function loadImages(files: FileList) {
    Array.from(files).forEach((file) => {
      const r = new FileReader();
      r.onload = () => {
        setSong((s) => {
          const cur = Array.isArray(s.background.value) ? s.background.value : [];
          return { ...s, background: { ...s.background, value: [...cur, String(r.result)] } };
        });
      };
      r.readAsDataURL(file);
    });
  }

  // ---------- audio tracks ----------
  function loadAudio(kind: "backing" | "vocal", file: File) {
    const r = new FileReader();
    r.onload = () => setSong((s) => ({ ...s, audio: { ...s.audio, [kind]: String(r.result) } }));
    r.readAsDataURL(file);
  }
  function clearAudio(kind: "backing" | "vocal") {
    setSong((s) => ({ ...s, audio: { ...s.audio, [kind]: null } }));
  }

  // ---------- vocal melody ----------
  function copyFromNotes() {
    const notes = song.notes.map((n) => ({ time: n.time, dur: n.dur, midi: [...n.midi] }));
    setSong((s) => ({ ...s, voice: { notes } }));
    setEditLayer("voice");
    toast("Copied the melody to the vocal line — now editing the Vocal layer", "good");
  }
  function shiftVoice(semi: number) {
    if (!song.voice.notes.length) { toast("Copy from the instrument notes first", "bad"); return; }
    setSong((s) => ({ ...s, voice: { notes: s.voice.notes.map((n) => ({ ...n, midi: n.midi.map((m) => m + semi) })) } }));
  }
  function clearVoice() {
    setSong((s) => ({ ...s, voice: { notes: [] } }));
  }
  async function toggleHum() {
    if (hum.recording) {
      const frames = hum.stop();
      if (frames.length < 5) { toast("Didn't hear enough — try again, a bit louder.", "bad"); return; }
      const notes = framesToNotes(frames, song.bpm, getSettings().a4);
      if (!notes.length) { toast("Couldn't find clear notes — try a clear, single-note melody.", "bad"); return; }
      setSong((s) => ({ ...s, voice: { notes } }));
      setEditLayer("voice");
      toast(`Captured ${notes.length} vocal note(s)`, "good");
      return;
    }
    const ok = await hum.start();
    if (!ok) toast("Mic failed: " + (hum.error || "unknown error"), "bad");
  }

  // ---------- lyrics & karaoke ----------
  function addLine() {
    setSong((s) => ({ ...s, lyrics: [...s.lyrics, { time: 0, text: "" }] }));
  }
  function updateLineTime(i: number, time: number) {
    setSong((s) => ({ ...s, lyrics: s.lyrics.map((l, idx) => (idx === i ? { ...l, time } : l)) }));
  }
  function updateLineText(i: number, text: string) {
    setSong((s) => ({ ...s, lyrics: s.lyrics.map((l, idx) => {
      if (idx !== i) return l;
      const { words: _words, ...rest } = l;
      return { ...rest, text };
    }) }));
  }
  function clearLineWords(i: number) {
    setSong((s) => ({ ...s, lyrics: s.lyrics.map((l, idx) => {
      if (idx !== i) return l;
      const { words: _words, ...rest } = l;
      return rest;
    }) }));
  }
  function removeLine(i: number) {
    setSong((s) => ({ ...s, lyrics: s.lyrics.filter((_, idx) => idx !== i) }));
  }
  async function importLRC() {
    const picked = await pickFile(".lrc,.txt,text/plain");
    if (picked) applyLRC(picked.text, picked.name);
  }
  function pasteLRC() {
    const text = window.prompt("Paste LRC lyrics — supports [mm:ss.xx] lines and enhanced <mm:ss.xx> word tags:");
    if (text != null) applyLRC(text, "pasted text");
  }
  function applyLRC(text: string, srcName: string) {
    try {
      const parsed = parseLRC(text);
      if (!parsed.length) { toast("No timed lyric lines found in that LRC", "bad"); return; }
      setSong((s) => ({ ...s, lyrics: parsed }));
      toast(`Imported ${parsed.length} line(s) from ${srcName}`, "good");
    } catch (e) {
      toast("Couldn't parse LRC: " + (e instanceof Error ? e.message : String(e)), "bad");
    }
  }
  function exportLRCFile() {
    if (!song.lyrics.length) { toast("No lyrics to export", "bad"); return; }
    download(`${safeName(song.title)}.lrc`, toLRC(song.lyrics), "text/plain");
    toast("Exported .lrc", "good");
  }
  function startTap() {
    if (!song.lyrics.length) { toast("Add lyric lines (text) first, then tap their timing", "bad"); return; }
    const ok = tap.start(song, (lyrics: LyricLine[]) => {
      setSong((s) => ({ ...s, lyrics }));
      toast("Word timing captured", "good");
    });
    if (!ok) toast("Your lyric lines have no text to time", "bad");
  }

  // ---------- actions ----------
  function save(): Song | null {
    if (!song.title.trim()) { toast("Give your song a title first", "bad"); return null; }
    if (!song.notes.length) { toast("Add some notes first — type notation and click Apply, or paint on the roll", "bad"); return null; }
    saveUserSong(song);
    return song;
  }
  function handleSave() {
    const saved = save();
    if (!saved) return;
    toast(`Saved "${saved.title}"`, "good");
    router.push("/library");
  }
  function handleTestPlay() {
    const saved = save();
    if (!saved) return;
    router.push(`/play/${saved.id}`);
  }
  const effectiveFormat: ExportFormat = exportFormat === "ascii" && !tabStrings.length ? "musicxml" : exportFormat;
  function exportSong() {
    const name = safeName(song.title);
    try {
      if (effectiveFormat === "musicxml") {
        download(`${name}.musicxml`, songToMusicXML(song, tabStrings), "application/vnd.recordare.musicxml+xml");
      } else if (effectiveFormat === "ascii") {
        download(`${name}.tab.txt`, songToAsciiTab(song, tabStrings), "text/plain");
      } else {
        download(`${name}.gpsong.json`, serialize(song));
      }
      toast(`Exported as ${EXPORT_FORMATS.find((f) => f.id === effectiveFormat)?.label}`, "good");
    } catch (e) {
      toast("Couldn't export: " + (e instanceof Error ? e.message : String(e)), "bad");
    }
  }
  async function importSong() {
    const picked = await pickFile(".musicxml,.xml,.gpsong.json,.json,application/json,text/xml,application/xml");
    if (!picked) return;
    try {
      const text = picked.text.trim();
      let imported: Song;
      if (text.startsWith("<")) {
        imported = musicXMLToSong(text, { id: song.id, instrument: song.instrument });
      } else {
        const parsed = JSON.parse(text) as Partial<Song>;
        imported = newSong({ ...parsed, id: song.id, instrument: parsed.instrument || song.instrument });
      }
      setSong(imported);
      setNotation(notesToNotation(imported.notes, imported.bpm));
      toast(`Imported "${imported.title}" from ${picked.name}`, "good");
    } catch (e) {
      toast("Couldn't import: " + (e instanceof Error ? e.message : String(e)), "bad");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{isEditing ? "Edit song" : "New song"}</h1>
          <p className={styles.subtitle}>Set details, paint notes on the roll or type them in, attach audio, and save.</p>
        </div>
        <div className={styles.row}>
          <button className="btn" onClick={handleTestPlay}>▶ Test play</button>
          <button className="btn ghost" onClick={importSong} title="Import a .musicxml/.xml or .gpsong.json file — replaces this song">⬆ Import</button>
          <select className={styles.selectPlain} value={effectiveFormat}
            onChange={(e) => setExportFormat(e.target.value as ExportFormat)} title="Export format">
            {EXPORT_FORMATS.filter((f) => f.id !== "ascii" || tabStrings.length).map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <button className="btn" onClick={exportSong}>⬇ Export</button>
          <button className="btn primary" onClick={handleSave}>💾 Save</button>
        </div>
      </div>

      <div className={styles.pillRow} style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <span key={t.id} className={`${styles.pill} ${tab === t.id ? styles.active : ""}`}
            onClick={() => setTab(t.id)}>{t.label}</span>
        ))}
      </div>

      {tab === "song" && (
      <>
      <details className={styles.panel}>
        <summary>Details</summary>
        <div className={styles.grid4}>
          <Field label="Title">
            <input value={song.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Artist">
            <input value={song.artist} onChange={(e) => set("artist", e.target.value)} />
          </Field>
          <Field label="BPM">
            <input type="number" value={song.bpm} onChange={(e) => set("bpm", +e.target.value || 0)} />
          </Field>
          <Field label="Capo">
            <input type="number" value={song.capo} onChange={(e) => set("capo", +e.target.value || 0)} />
          </Field>
        </div>
        <div className={styles.grid4}>
          <Field label="Instrument">
            <select value={song.instrument} onChange={(e) => set("instrument", e.target.value)}>
              {instrumentOptions().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Key">
            <select value={song.key} onChange={(e) => set("key", e.target.value)}>
              {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Difficulty">
            <select value={song.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Genre">
            <select value={song.genre} onChange={(e) => set("genre", e.target.value)}>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
        </div>
      </details>

      <details className={styles.panel}>
        <summary>Background</summary>
        <div className={styles.grid2}>
          <Field label="Type">
            <select value={song.background.type} onChange={(e) => changeBgType(e.target.value)}>
              <option value="solid">Solid colour</option>
              <option value="animated">Animated</option>
              <option value="slideshow">Slideshow (images)</option>
            </select>
          </Field>
          <div>
            {song.background.type === "animated" && (
              <div className={styles.pillRow}>
                {ANIMATED_BACKGROUNDS.map((b) => (
                  <span key={b} className={`${styles.pill} ${song.background.value === b ? styles.active : ""}`}
                    onClick={() => setBgValue(b)}>{b}</span>
                ))}
              </div>
            )}
            {song.background.type === "solid" && (
              <div className={styles.pillRow}>
                {SOLID_SWATCHES.map((sw) => (
                  <span key={sw || "default"} className={styles.pill}
                    style={sw ? { background: sw, color: "#fff" } : undefined}
                    onClick={() => setBgValue(sw)}>{sw || "theme default"}</span>
                ))}
              </div>
            )}
            {song.background.type === "slideshow" && (
              <>
                <label className={styles.field}>
                  <span>Add images (used as a slideshow behind the notes)</span>
                  <input type="file" accept="image/*" multiple onChange={(e) => e.target.files && loadImages(e.target.files)} />
                </label>
                <div className={styles.muted}>{Array.isArray(song.background.value) ? song.background.value.length : 0} image(s)</div>
              </>
            )}
          </div>
        </div>
      </details>

      <details className={styles.panel}>
        <summary>Audio tracks (optional)</summary>
        <p className={styles.hint}>Attach a backing track and/or a vocal track. They&apos;re stored inside the song file.</p>
        <AudioRow label="Backing track" attached={!!song.audio.backing}
          onChange={(f) => loadAudio("backing", f)} onClear={() => clearAudio("backing")} />
        <AudioRow label="Vocal track" attached={!!song.audio.vocal}
          onChange={(f) => loadAudio("vocal", f)} onClear={() => clearAudio("vocal")} />
      </details>

      <section className={styles.panel}>
        <h2>Notes</h2>
        <p className={styles.hint}>
          Type a melody, or paint on the roll below. The Instrument/Vocal toggle on the roll selects which layer this edits.
          Quick entry notation: <code>PITCH:beats</code>, space-separated — chords with <code>+</code>, rests with <code>r</code>.
        </p>
        <textarea
          className={styles.notation}
          rows={3}
          value={notation}
          onChange={(e) => setNotation(e.target.value)}
          placeholder="C4:1 E4:1 G4:2 C4+E4+G4:2 r:1"
        />
        <div className={styles.row}>
          <button className="btn" onClick={fromRoll}>⇣ From roll</button>
          <button className="btn primary" onClick={applyNotation}>Apply notation</button>
          <span className={styles.muted}>
            {song.notes.length} note{song.notes.length === 1 ? "" : "s"} · {fmtTime(songDuration(song))}
          </span>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>Piano roll</h2>
        <PianoRoll song={song} editLayer={editLayer} onLayerChange={setEditLayer} onNotesChange={handleRollNotesChange} />
      </section>
      </>
      )}

      {tab === "vocal" && (
      <section className={styles.panel}>
        <div className={styles.spread}>
          <h2>Vocal melody (Karaoke scoring)</h2>
          <div className={styles.row}>
            <button className="btn" onClick={copyFromNotes}>⎘ Copy from notes</button>
            <button className="btn" onClick={toggleHum}>{hum.recording ? "■ Stop & transcribe" : "🎙️ Hum to capture"}</button>
            <button className="btn" title="Singers often sit an octave above the guitar" onClick={() => shiftVoice(12)}>8va ▲</button>
            <button className="btn" title="Shift the vocal line down an octave" onClick={() => shiftVoice(-12)}>8vb ▼</button>
            <button className="btn ghost" onClick={clearVoice}>Clear</button>
          </div>
        </div>
        <p className={styles.hint}>
          The pitch line graded when singing in Karaoke (shown dimmed on the roll above). Leave empty to score against the instrument melody.
        </p>
        {hum.recording && (
          <div className={styles.subPanel}>
            <div className={styles.spread}>
              <div><b>🎙️ Hum to capture</b> · <span className={styles.muted}>{fmtTime(hum.elapsed)}</span></div>
            </div>
            <div className={styles.liveNote}>{hum.liveNote ? `${hum.liveNote.name}${hum.liveNote.octave}` : "—"}</div>
            <p className={styles.hint}>Sing or hum the vocal line; it transcribes to the vocal melody at the song&apos;s tempo when you stop.</p>
          </div>
        )}
        <div className={styles.muted}>
          {song.voice.notes.length
            ? `${song.voice.notes.length} vocal note(s) — graded when singing in Karaoke`
            : "none — Karaoke scoring falls back to the instrument melody"}
        </div>
      </section>
      )}

      {tab === "lyrics" && (
      <section className={styles.panel}>
        <div className={styles.spread}>
          <h2>Lyrics &amp; Karaoke (optional)</h2>
          <div className={styles.row}>
            <button className="btn" onClick={addLine}>+ Line</button>
            <button className="btn" onClick={importLRC}>⬆ Import .lrc</button>
            <button className="btn" onClick={pasteLRC}>📋 Paste LRC</button>
            <button className="btn" onClick={exportLRCFile}>⬇ Export .lrc</button>
            <button className="btn" onClick={startTap}>🎤 Tap to time</button>
          </div>
        </div>
        <p className={styles.hint}>
          Times are seconds from the song start. Word-level karaoke timing is auto-distributed across each line
          unless you tap it in or import enhanced LRC (<code>&lt;mm:ss.xx&gt;</code> word tags).
        </p>
        {tap.active && (
          <div className={styles.subPanel}>
            <div className={styles.spread}>
              <div><b>🎤 Tap to time</b> · <span className={styles.muted}>word {Math.min(tap.pos + 1, tap.total)}/{tap.total} · {tap.elapsed.toFixed(2)}s</span></div>
              <button className="btn ghost" onClick={tap.stop}>■ Stop</button>
            </div>
            <div className={styles.tapWord}>
              {tap.current
                ? <>▶ <b>{tap.current.text}</b>{tap.next ? <span className={styles.muted}> → {tap.next.text}</span> : null}</>
                : "Done — press Stop"}
            </div>
            <button className="btn primary" style={{ width: "100%" }} onClick={tap.stamp}>TAP — or press Space</button>
            <p className={styles.hint}>Play along and tap on each word as you sing it. The backing track (if attached) plays automatically.</p>
          </div>
        )}
        {!song.lyrics.length && <div className={styles.muted}>No lyrics yet — add a line, import an .lrc, or tap to time.</div>}
        <div className={styles.lyricList}>
          {song.lyrics.map((l, i) => {
            const timed = Array.isArray(l.words) && l.words.length > 0;
            return (
              <div key={i} className={styles.lyricRow}>
                <input type="number" step={0.1} value={l.time} className={styles.lyricTime}
                  onChange={(e) => updateLineTime(i, +e.target.value)} />
                <input value={l.text} className={styles.lyricText} placeholder="lyric text"
                  onChange={(e) => updateLineText(i, e.target.value)} />
                <span className={styles.tag}>{timed ? `${l.words!.length}w` : "auto"}</span>
                {timed && <button className={styles.ghost} title="Clear word timing (revert to auto)" onClick={() => clearLineWords(i)}>↺</button>}
                <button className={styles.ghost} onClick={() => removeLine(i)}>✕</button>
              </div>
            );
          })}
        </div>
      </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function AudioRow({ label, attached, onChange, onClear }: {
  label: string; attached: boolean; onChange: (f: File) => void; onClear: () => void;
}) {
  return (
    <div className={styles.audioRow}>
      <label className={styles.field} style={{ flex: 1 }}>
        <span>{label}</span>
        <input type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
      </label>
      <span className={styles.muted}>{attached ? "attached ✓" : "none"}</span>
      <button className="btn ghost" onClick={onClear}>Clear</button>
    </div>
  );
}

function safeName(title: string): string {
  return (title || "song").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "song";
}

function notesToNotation(notes: Note[], bpm: number): string {
  const spb = 60 / bpm;
  return notes.slice().sort((a, b) => a.time - b.time).map((n) => {
    const beats = Math.round((n.dur / spb / 0.92) * 4) / 4 || 1;
    const pitches = n.midi.map((m) => midiToName(m).full).join("+");
    return `${pitches}:${beats}`;
  }).join(" ");
}
