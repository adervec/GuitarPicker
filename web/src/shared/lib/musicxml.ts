// MusicXML import/export for the Song Editor — the industry-standard format
// for guitar tab (it's the one format that actually defines <technical>
// <string>/<fret>, per the W3C spec), added as the default alongside the
// existing .gpsong.json export and a new plain-text ASCII tab export (see
// ./ascii-tab.ts).
//
// This is a pragmatic, single-voice exporter/importer, not a fully
// spec-complete one — see the header comments on songToMusicXML and
// musicXMLToSong for exactly what's simplified and why. It reads/writes the
// Song Editor's own note model (Note.time/dur in seconds, Note.midi,
// Note.str, Note.finger), nothing else in the pilot depends on this module.
import { midiToName, KEY_SIGNATURES } from "./note-math";
import { nameToMidi, midiToFret, INSTRUMENTS, type InstrumentDef } from "@/entities/instrument/model/data";
import { newSong, type Song, type Note, type Finger } from "@/entities/song/model/song-format";

const DIVISIONS = 4; // ticks per quarter note (1 beat here) — exactly covers this app's grid (1, 1/2, 1/4 beat)
const BEATS_PER_MEASURE = 4; // this app has no time-signature field; assumed 4/4 everywhere else too

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function pitchParts(midi: number): { step: string; alter: number; octave: number } {
  const { name, octave } = midiToName(midi);
  return { step: name[0], alter: name.length > 1 ? 1 : 0, octave };
}
const TYPE_BY_DIVISIONS: Record<number, string> = { 16: "whole", 8: "half", 4: "quarter", 2: "eighth", 1: "16th" };

interface FlatEvent { time: number; dur: number; midi: number; str: number | null; finger?: Finger; }

/** Song -> MusicXML (partwise, one part). Flattens every Note (a chord's
 *  midi[] included) into per-pitch events, groups events sharing an onset
 *  time into MusicXML chords (<chord/> on every member after the first),
 *  and fills silent gaps with <rest> so the timeline stays contiguous
 *  (required by the format). Simplifications, all deliberate: assumes 4/4
 *  throughout (this app has no time-signature field anywhere); a note whose
 *  duration crosses a barline isn't split/tied, it's left overhanging (its
 *  own <duration> stays correct for playback, only the measure bookkeeping
 *  drifts slightly); only the instrument layer is exported, not the vocal
 *  melody (MusicXML's per-part model doesn't map cleanly onto "an optional
 *  second pitch line for karaoke grading," and this is meant for sharing
 *  the guitar part, not a full session export — .gpsong.json already
 *  round-trips everything for that). */
export function songToMusicXML(song: Song, tabStrings: number[]): string {
  const spb = 60 / (song.bpm || 90);
  const events: FlatEvent[] = [];
  for (const n of song.notes) {
    for (const m of n.midi) {
      const strIdx = n.str != null && n.midi.length === 1 ? n.str : (midiToFret(m, song.instrument, tabStrings)?.string ?? null);
      events.push({ time: n.time, dur: n.dur, midi: m, str: strIdx, finger: n.finger });
    }
  }
  events.sort((a, b) => a.time - b.time || a.midi - b.midi);
  const groups: FlatEvent[][] = [];
  for (const ev of events) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(last[0].time - ev.time) < 1e-4) last.push(ev);
    else groups.push([ev]);
  }

  const divPerMeasure = BEATS_PER_MEASURE * DIVISIONS;
  const measures: string[] = [];
  let measureNotes: string[] = [];
  let cursorDiv = 0;
  let measureDiv = 0;
  function closeMeasure() { measures.push(measureNotes.join("")); measureNotes = []; measureDiv = 0; }
  function flushRestTo(targetDiv: number) {
    let gap = targetDiv - cursorDiv;
    while (gap > 0) {
      const take = Math.min(gap, divPerMeasure - measureDiv);
      if (take > 0) {
        measureNotes.push(`<note><rest/><duration>${take}</duration></note>`);
        measureDiv += take; cursorDiv += take; gap -= take;
      }
      if (measureDiv >= divPerMeasure) closeMeasure();
      if (take <= 0) break; // safety: avoid an infinite loop if a measure is already full
    }
  }

  for (const group of groups) {
    const startDiv = Math.round((group[0].time / spb) * DIVISIONS);
    if (startDiv > cursorDiv) flushRestTo(startDiv);
    let advance = 0;
    group.forEach((ev, gi) => {
      const durDiv = Math.max(1, Math.round((ev.dur / spb / 0.92) * DIVISIONS));
      const { step, alter, octave } = pitchParts(ev.midi);
      const type = TYPE_BY_DIVISIONS[durDiv];
      const technical = ev.str != null
        ? `<technical><string>${tabStrings.length - ev.str}</string><fret>${ev.midi - tabStrings[ev.str]}</fret>` +
          `${ev.finger != null ? `<fingering>${esc(String(ev.finger))}</fingering>` : ""}</technical>`
        : "";
      measureNotes.push(
        `<note>${gi > 0 ? "<chord/>" : ""}<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ""}` +
        `<octave>${octave}</octave></pitch><duration>${durDiv}</duration>${type ? `<type>${type}</type>` : ""}` +
        `${technical ? `<notations>${technical}</notations>` : ""}</note>`,
      );
      if (gi === 0) advance = durDiv;
    });
    measureDiv += advance; cursorDiv += advance;
    if (measureDiv >= divPerMeasure) closeMeasure();
  }
  if (measureNotes.length) closeMeasure();
  if (!measures.length) measures.push("");

  const inst = (INSTRUMENTS as Record<string, InstrumentDef>)[song.instrument];
  const clefBlock = tabStrings.length
    ? `<clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>${tabStrings.length}</staff-lines>` +
      tabStrings.slice().reverse().map((openMidi, i) => {
        const { step, alter, octave } = pitchParts(openMidi);
        return `<staff-tuning line="${i + 1}"><tuning-step>${step}</tuning-step>` +
          `${alter ? `<tuning-alter>${alter}</tuning-alter>` : ""}<tuning-octave>${octave}</tuning-octave></staff-tuning>`;
      }).join("") + `</staff-details>`
    : `<clef><sign>G</sign><line>2</line></clef>`;
  const fifths = KEY_SIGNATURES[song.key] ?? 0;

  const measuresXml = measures.map((notesXml, i) => {
    const attrs = i === 0
      ? `<attributes><divisions>${DIVISIONS}</divisions><key><fifths>${fifths}</fifths></key>` +
        `<time><beats>${BEATS_PER_MEASURE}</beats><beat-type>4</beat-type></time>${clefBlock}</attributes>` +
        `<sound tempo="${Math.round(song.bpm || 90)}"/>`
      : "";
    return `<measure number="${i + 1}">${attrs}${notesXml}</measure>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n` +
    `<score-partwise version="4.0">` +
    `<work><work-title>${esc(song.title)}</work-title></work>` +
    `<identification><creator type="composer">${esc(song.artist)}</creator><encoding><software>GuitarPicker</software></encoding></identification>` +
    `<part-list><score-part id="P1"><part-name>${esc(inst?.name || song.instrument)}</part-name></score-part></part-list>` +
    `<part id="P1">${measuresXml}</part></score-partwise>`;
}

/** MusicXML -> Song. Reconstructs title/artist/tempo/key and pitch+rhythm
 *  faithfully (including chords via <chord/>, gaps via <rest>/<forward>/
 *  <backup>, normalizing each measure's own <divisions> to quarter-note
 *  units so a divisions change mid-file can't desync the timeline) and
 *  <notations><technical><fingering> if present. Deliberately does NOT
 *  read back <technical><string>/<fret> — trusting a file's own tuning
 *  could put notes on a string that doesn't exist on whatever instrument is
 *  currently selected in the editor if they don't match; string/fret are
 *  instead recomputed live against the current instrument the same way an
 *  ordinary notation- or piano-roll-created note already is (see
 *  PianoRoll/TabRoll's own str-or-midiToFret fallback), which is simpler
 *  and can't go stale. `base` supplies whatever the caller wants preserved
 *  from the song being replaced (its id, its instrument selection). */
export function musicXMLToSong(xml: string, base: Partial<Song> = {}): Song {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("That file isn't valid XML");
  const partNode = doc.querySelector("part");
  if (!partNode) throw new Error("No <part> found in this MusicXML file");

  const title = doc.querySelector("work > work-title")?.textContent?.trim()
    || doc.querySelector("movement-title")?.textContent?.trim() || undefined;
  const composer = doc.querySelector('identification creator[type="composer"]')?.textContent?.trim() || undefined;
  const tempoAttr = doc.querySelector("sound[tempo]")?.getAttribute("tempo");
  const bpm = tempoAttr && +tempoAttr > 0 ? Math.round(+tempoAttr) : undefined;
  const fifthsText = doc.querySelector("attributes > key > fifths")?.textContent;
  let key: string | undefined;
  if (fifthsText != null) {
    const fifths = +fifthsText;
    key = Object.entries(KEY_SIGNATURES).find(([, v]) => v === fifths)?.[0];
  }

  const notes: Note[] = [];
  let divisions = DIVISIONS;
  let beatsPerMeasure = BEATS_PER_MEASURE;
  let measureStartQ = 0; // quarter notes from song start
  const spb = 60 / (bpm || base.bpm || 90);

  for (const measure of Array.from(partNode.querySelectorAll("measure"))) {
    const divEl = measure.querySelector(":scope > attributes > divisions");
    if (divEl?.textContent) divisions = +divEl.textContent || divisions;
    const beatsEl = measure.querySelector(":scope > attributes > time > beats");
    if (beatsEl?.textContent) beatsPerMeasure = +beatsEl.textContent || beatsPerMeasure;

    let posQ = 0, lastOnsetQ = 0;
    for (const el of Array.from(measure.children)) {
      if (el.tagName === "note") {
        const isChord = !!el.querySelector(":scope > chord");
        const isRest = !!el.querySelector(":scope > rest");
        const durText = el.querySelector(":scope > duration")?.textContent;
        const durQ = (durText ? +durText : divisions) / divisions;
        const onsetQ = isChord ? lastOnsetQ : posQ;
        if (!isRest) {
          const step = el.querySelector(":scope > pitch > step")?.textContent;
          const octaveText = el.querySelector(":scope > pitch > octave")?.textContent;
          if (step && octaveText) {
            const alterText = el.querySelector(":scope > pitch > alter")?.textContent;
            const alter = alterText ? +alterText : 0;
            const acc = alter > 0 ? "#" : alter < 0 ? "b" : "";
            const midi = nameToMidi(`${step}${acc}${octaveText}`);
            if (midi != null) {
              const fingeringText = el.querySelector(":scope > notations > technical > fingering")?.textContent?.trim();
              let finger: Finger | undefined;
              if (fingeringText) {
                if (/^[1-4]$/.test(fingeringText)) finger = +fingeringText as Finger;
                else if (/^t(humb)?$/i.test(fingeringText)) finger = "T";
              }
              notes.push({
                time: +((measureStartQ + onsetQ) * spb).toFixed(4),
                dur: Math.max(0.02, +(durQ * spb * 0.92).toFixed(4)),
                midi: [midi],
                ...(finger !== undefined ? { finger } : {}),
              });
            }
          }
        }
        if (!isChord) { lastOnsetQ = posQ; posQ += durQ; }
      } else if (el.tagName === "backup") {
        const durText = el.querySelector(":scope > duration")?.textContent;
        posQ -= (durText ? +durText : 0) / divisions;
      } else if (el.tagName === "forward") {
        const durText = el.querySelector(":scope > duration")?.textContent;
        posQ += (durText ? +durText : 0) / divisions;
      }
    }
    measureStartQ += beatsPerMeasure;
  }

  return newSong({
    ...base,
    title: title || base.title || "Imported song",
    artist: composer || base.artist,
    bpm: bpm || base.bpm || 90,
    key: key || base.key || "C",
    notes,
  });
}
