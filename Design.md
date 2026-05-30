# GuitarPicker — Design

A Yousician-style music-learning application. Web app (no build step) that runs in any
modern browser. Real-time microphone pitch detection, a scrolling note highway with
per-note grading, a tuner, a song editor, training plans, theory minigames, a music
glossary, and progress trending.

> Spec source of truth: `specs.txt`. **This document must be updated after every change.**

## Tech stack & rationale

| Concern | Choice | Why |
|---|---|---|
| Platform | Vanilla web app, ES modules, no bundler | Zero build; runs from a static server on any OS. The spec needs mic input, game graphics, and audio playback — all first-class on the web. |
| Audio in | Web Audio API + `getUserMedia` | Microphone capture, device enumeration/selection. |
| Pitch detection | Autocorrelation (MPM/normalized) in `audio/pitch.js` | Robust monophonic detection for tuner, melody play, and transcription. |
| Graphics | Canvas 2D for the highway/visualizers; CSS for UI | Crisp, fast, theme-able. |
| Audio out | `<audio>` + Web Audio gain nodes | Independent backing-track and vocal volume. |
| Persistence | `localStorage` (settings, songs, history) | No backend required; import/export to files. |
| Theming | CSS custom properties, swappable theme classes | Multiple selectable themes. |

### Running it
Browsers block ES-module loading over `file://`, so serve the folder. Any of:
- `node serve.mjs` (zero-dep Node server) — or `npm run serve`
- `powershell -ExecutionPolicy Bypass -File .\serve.ps1` (zero-dep PowerShell server)
- `python -m http.server 8080`
- `npx serve`

Then open `http://localhost:8080` (the Node/PowerShell servers print their URL).

### Verification harness (Node)
Run `npm test` (or the scripts individually). These run without a browser:
- `check-imports.cjs` — every `import` resolves to a real export
- `test-core.mjs` — music/theory math, song library, drills, and the pitch
  detector (validated against synthesized sine tones 110–440 Hz)
- `dom-smoke.mjs` — mounts every view against a minimal DOM shim and asserts it
  renders + tears down without throwing
The real audio/mic/canvas behaviour still requires a browser.

## Architecture

```
index.html            App shell, nav, view container
styles/
  main.css            Layout + components
  themes.css          Theme variable sets
src/
  app.js              Bootstrap, hash router, nav, view lifecycle
  state.js            Global store + localStorage persistence + events
  audio/
    engine.js         AudioContext, device enumeration/selection, mic stream
    pitch.js          Autocorrelation pitch detection + note matching
    player.js         Backing/vocal track playback w/ independent gains
    synth.js          Simple oscillator for note preview / metronome
  music/
    notes.js          MIDI<->freq<->name, scales, key signatures, instrument tunings, fretboard
    theory.js         Chords, intervals, capo math, transposition
    song-format.js    Song JSON schema, validate, serialize, parse, compact notation
    songs.js          Built-in public-domain song library
    catalog.js        Unified accessor over built-in + user songs
    drills.js         Drill generators + course definitions
    glossary-data.js  Dictionary terms
  views/
    home.js           Dashboard
    play.js           Note highway gameplay (grading, healthbar, killfeed)
    library.js        Song browser, import/export, file location, transpose/capo
    tuner.js          Instrument tuner + out-of-tune detection
    editor.js         Manual song creation
    listen.js         Record -> transcribe -> song w/ complexity levels + backgrounds
    training.js       Course progression + drills per instrument
    glossary.js       Music lore / dictionary / reference
    minigames.js      Theory quiz minigames
    history.js        Session history + improvement trending charts
    settings.js       I/O devices, theme selection, instrument defaults
  ui/
    components.js     Small shared render helpers (el builder, sliders, charts, toasts)
    backgrounds.js    Canvas song backgrounds (solid / animated / slideshow)
serve.mjs             Zero-dependency Node static server
serve.ps1             Zero-dependency PowerShell static server (Windows)
package.json          Scripts: `serve`, `test`
check-imports.cjs     Verification: import graph
test-core.mjs         Verification: music/audio core + pitch detector
dom-smoke.mjs         Verification: all views render against a DOM shim
```

## Data model

**Song** (`song-format.js`):
```jsonc
{
  "id": "uuid", "title": "...", "artist": "...",
  "instrument": "acoustic-guitar", "key": "C", "bpm": 90, "capo": 0,
  "difficulty": "beginner|intermediate|advanced",
  "background": { "type": "solid|animated|slideshow", "value": "#101..." | "aurora" | [dataURLs] },
  "audio": { "backing": null|dataURL, "vocal": null|dataURL },
  "lyrics": [ { "time": 0.0, "text": "..." } ],
  "notes": [ { "time": 0.0, "dur": 0.5, "midi": [60] , "string": 2, "fret": 1 } ],
  "source": "builtin|manual|listen|import"
}
```
A note's `midi` is an array so chords are first-class. `string`/`fret` optional (guitar overlay).

**History event**: `{ ts, songId, instrument, score, accuracy, maxStreak, passed, durationSec, notes:{perfect,good,off,miss} }`
**Progress**: per-instrument xp/level + per-course/drill completion, derived + cached.

## Grading model (gameplay)
For each note window the detected pitch is compared to the expected MIDI(s):
- cents error < 25 and on-time → **Perfect** (+health, +score, +streak)
- cents error < 50 → **Good**
- detected but wrong/late → **Off** (-health)
- nothing detected in window → **Miss** (-health)
Chords pass if any required chord tone is matched within the window (monophonic detector
limitation — documented). Health 0..100; crossing 0 sets `passed=false` for the run but
play continues. Killfeed shows the last several note judgments with note name + quality.

## Feature status
- [x] App shell, hash router, theming, persistence, settings
- [x] Audio engine: device enumeration + selection, mic stream, clear I/O display
- [x] Pitch detection (autocorrelation) + tuner with out-of-tune detection
- [x] Music core: notes/freq/names, scales, keys, fretboard, chords, capo, transpose
- [x] Built-in public-domain song library (multiple songs/variations)
- [x] Note-highway gameplay: streaming notes, grading, killfeed, healthbar
- [x] Backing-track + vocal volume options; lyrics; backgrounds (solid/animated/slideshow)
- [x] Song library: import/export, file-location view, capo/key indication
- [x] Manual song editor
- [x] Listen -> transcribe -> generate song at multiple complexity levels
- [x] Training plans / course progression / drills
- [x] Glossary / music dictionary
- [x] Theory minigames
- [x] History views + improvement trending charts
- [ ] Polyphonic chord transcription (approximation only — documented limitation)
- [ ] Bundled audio assets for backing tracks (user-imported only by default)

## Known limitations
- Pitch detection is monophonic; chord *playing* is graded by chord-tone matching and
  chord *transcription* is approximated from the dominant pitch.
- "Listen & transcribe" produces a melody line and quantizes to a tempo grid; it is an aid,
  not a studio transcription.
- Backing/vocal audio must be user-provided (import) — no copyrighted assets are bundled.

## Changelog
- Initial scaffold: design, shell, theming, audio + music core, and all primary views.
- Implemented all 11 views (home, library, play, tuner, editor, listen, training,
  minigames, glossary, history, settings) plus audio engine, pitch detection,
  song format/catalog, drills/courses, glossary data, and canvas backgrounds.
- Added Node + PowerShell zero-dep static servers and `package.json`.
- Added verification harness (`check-imports.cjs`, `test-core.mjs`, `dom-smoke.mjs`):
  25 core checks pass (incl. pitch detector vs. synthesized tones), import graph clean,
  all 12 view mounts render + tear down without error. Both servers verified to serve
  ES modules with correct MIME types.
