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
| Cloud sync | Google Drive `appDataFolder` via GIS + Drive REST (`fetch`) | Optional/opt-in; no server we run; data in the user's own Drive (`drive.appdata` scope). |
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
    synth.js          One-shot note preview / tuning reference / metronome
    voices.js         Per-instrument synth timbres (pure; takes an AudioContext)
    band.js           Look-ahead scheduler that plays a song's other parts
  music/
    daily.js          Date-seeded "Today's Practice" activity generator
    notes.js          MIDI<->freq<->name, scales, key signatures, instrument tunings, fretboard
    theory.js         Chords, intervals, capo math, transposition
    song-format.js    Song JSON schema, validate, serialize, parse, compact notation
    accompany.js      Chord-per-bar inference + generated bass/comp/drum parts
    songs.js          Built-in public-domain song library
    catalog.js        Unified accessor over built-in + user songs
    drills.js         Drill generators + course definitions
    glossary-data.js  Dictionary terms
    lrc.js            LRC karaoke-lyric import/export (standard + enhanced word tags)
  karaoke/            Shared karaoke engine (UI-agnostic)
    timeline.js       buildLyricTimeline / activeAt — word-level fill + auto-distribution
    grader.js         Shared octave-agnostic note grader (instrument play + vocal scoring)
  views/
    home.js           Dashboard
    play.js           Note highway gameplay (grading, healthbar, killfeed)
    karaoke.js        Karaoke stage (teleprompter + word fill + sing-and-score) & song picker
    library.js        Song browser, import/export, file location, transpose/capo
    tuner.js          Instrument tuner + out-of-tune detection
    editor.js         Manual song creation
    listen.js         Record -> transcribe -> song w/ complexity levels + backgrounds
    training.js       Course progression + drills per instrument
    glossary.js       Music lore / dictionary / reference
    minigames.js      Theory quiz minigames
    history.js        Session history + improvement trending charts
    settings.js       I/O devices, theme selection, instrument defaults
    locker.js         Avatar / guitar / app-skin customisation ("Locker")
  cosmetics/
    parts.js          Shared palettes, rarities, SVG string helpers
    avatars.js        Player avatar parts + composeAvatar()
    guitars.js        Guitar avatar parts + composeGuitar()
    skins.js          App skin (theme) catalogue — single source of truth
    economy.js        Coin prices by rarity + unlock-key helpers
    index.js          Cosmetics registry + loadout/economy helpers
  ui/
    components.js     Small shared render helpers (el builder, sliders, charts, toasts)
    backgrounds.js    Canvas song backgrounds (solid / animated / slideshow)
  cloud/
    config.js         Sync config (built-in OAuth client id + origin allowlist)
    merge.js          Pure merge of two sync payloads (union content, LWW coins) — tested
    sync.js           Google Drive appData sync (GIS token + Drive REST via fetch; no SDK)
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
  "genre": "Folk", "mood": "Mellow", "tags": [],
  "background": { "type": "solid|animated|slideshow", "value": "#101..." | "aurora" | [dataURLs] },
  "audio": { "backing": null|dataURL, "vocal": null|dataURL },
  "parts": [ { "instrument": "harmonica", "name": "Harmonica",
               "notes": [ { "time": 0.0, "dur": 0.5, "midi": [71] } ] } ],
  "lyrics": [ { "time": 0.0, "dur": 4.8, "text": "...",
               "words": [ { "t": 0.0, "d": 0.5, "text": "..." } ] } ],
  "voice": { "notes": [ { "time": 0.0, "dur": 0.5, "midi": [60] } ] },
  "notes": [ { "time": 0.0, "dur": 0.5, "midi": [60] , "string": 2, "fret": 1 } ],
  "source": "builtin|manual|listen|import"
}
```
A note's `midi` is an array so chords are first-class. `string`/`fret` optional (guitar overlay).
**`parts`** (optional) holds the rest of the arrangement. At play time `pickPart()` gives the
player the part matching *their* instrument (falling back to the song's own `notes`); every other
part is handed to `Band` and synthesized. Anything the arrangement leaves uncovered — bass, chord
comp, drums — is generated by `accompany.js`, so a song needs no audio file to have a backing
track. Notes may carry an optional `gain` (0-1) for accent.
**Karaoke fields** are all optional and back-compatible: a lyric line may carry `dur` and
per-`words` timing (for word-by-word highlight); when `words` is absent the karaoke timeline
auto-distributes them across the line. `voice.notes` is a separate vocal melody used as the
pitch target for sing-and-score (graded octave-agnostically). LRC files import/export to this
shape via `music/lrc.js`.

**History event**: `{ ts, songId, instrument, score, accuracy, maxStreak, passed, durationSec, notes:{perfect,good,off,miss} }`
**Progress**: per-instrument xp/level + per-course/drill completion, derived + cached.

**Cosmetics** (in `settings`): `avatar` and `guitar` are loadout objects (one id per
category) composed to SVG on demand by `cosmetics/`; `theme` is the app-skin id. `daily`
holds the date-stamped completion (+ coin-reward bookkeeping) of the home "Today's
Practice" checklist.

**Daily streak** (`settings.streak` = `{count,best,lastDay}`): `Store.recordPracticeDay(day)`
bumps the run when called on a new day, continuing it only if the prior day was exactly one
before (else resets to 1); `best` is preserved. Called **only** from `addHistory` — i.e.
completing a song run, pass *or* fail (a noble failed attempt still counts). Checking off a
daily activity awards coins but deliberately does **not** advance the streak, so it can't be
gamed by ticking boxes. `daily.js#streakStatus()` interprets it for display — the run counts
as alive only if `lastDay` is today or yesterday, otherwise it shows 0 with `best` kept.
Shown as a 🔥 chip on the Home "Today's Practice" panel.

**Economy** (top-level state): `coins` (number) and `unlocks` (map of unlocked cosmetic
keys). Coins are awarded in `addHistory` (accuracy/5 + 15 pass bonus, recorded on the
history entry as `coins`) and by daily activities. Items above Common rarity are priced by
`cosmetics/economy.js` (`PRICES`) and unlocked via `Store.spendCoins` + `Store.unlock`;
Common items and all colours are free. The top-bar coin chip stays in sync via store events.

**Song metadata**: every song carries `genre`, `mood` and `tags`. Songs without them are
filled by `analyzeSong()` (title / instrument / tempo heuristic) via `ensureMetadata()`,
applied in the catalog so the whole library is searchable and filterable by genre.

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
- [x] Locker: layered SVG player avatars, customisable guitar avatars, and 20 app skins
- [x] Coin economy: earn by playing + daily activities, rarity-priced cosmetic unlocks
- [x] Player avatar shown in the play HUD; coins-earned shown in the finish banner
- [x] Recommended daily activities (date-seeded) on the home dashboard, with coin rewards
- [x] Daily practice streak (🔥 consecutive days, best kept) shown on the home panel
- [x] Song metadata (genre/mood) on every song + genre filter in the library
- [x] Singalong lyrics: 11 built-in lyric tracks + karaoke current/next line in the play view
- [x] Full karaoke mode: word-level lyric model + voice melody in the song format, LRC
      import/export, a shared lyric timeline + octave-agnostic vocal grader, a `#/karaoke` view
      (teleprompter with word-by-word fill, per-line count-in, backing + guide vocal, optional
      sing-and-score with a pitch ribbon → Progress), a 🎤 Karaoke toggle in the Play view that
      reuses the same word fill, editor authoring (LRC import/paste/export + tap-to-time word
      capture), a library karaoke badge/filter/entry button, and two fully word-timed showcase
      songs (Twinkle, Frère Jacques). Songs without word timing auto-distribute words at runtime.
- [ ] Polyphonic chord transcription (approximation only — documented limitation)
- [x] Synthesized backing band (per-instrument voices, generated bass/comp/drums, multi-part
      arrangements) — no audio assets needed
- [ ] Bundled audio assets for backing tracks (user-imported only by default)

## Known limitations
- Pitch detection is monophonic; chord *playing* is graded by chord-tone matching and
  chord *transcription* is approximated from the dominant pitch.
- "Listen & transcribe" produces a melody line and quantizes to a tempo grid; it is an aid,
  not a studio transcription.
- Backing/vocal audio must be user-provided (import) — no copyrighted assets are bundled. The
  synthesized band fills the gap but is subtractive synthesis, not sampled instruments.
- Auto-accompaniment assumes 4/4 and one chord per bar, and voices chords in root position;
  songs in 3/4 or 6/8 get a groove that fits the bar length, not the metre.
- The Song Editor can play multi-part songs but cannot yet author `parts` — they are written
  in code (or in an imported song file).

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
- Added the **Locker** cosmetics system (`src/cosmetics/`: parts, avatars, guitars, skins,
  registry) and the `locker` view. Players compose from layered SVG (skin tone, expression,
  hair, facial hair, clothing, tattoos, eyewear, headwear, jewellery, frame); guitars from
  body shape, colour, finish, pickguard, hardware, inlays and decals. Added 14 app skins
  (20 total) from a single `skins.js` list used by the top-bar picker, Settings and the
  Locker. Loadouts persist in `settings.avatar` / `settings.guitar`.
- Added recommended **daily activities** (`src/music/daily.js`): a date-seeded checklist on
  Home with per-day completion tracking (`settings.daily`).
- Added **song metadata** — `genre`/`mood`/`tags` on the song format, `analyzeSong()` +
  `ensureMetadata()` so every song is tagged, a genre field in the editor, and a genre
  filter + tags in the library. Lyrics now render karaoke-style (current + next line) for
  singalong, with a 🎤 indicator and genre in the play HUD. dom-smoke now mounts 13 views.
- **Full karaoke mode — Phase 1 (engine foundations):** extended the song format with
  word-level lyric timing (`lyrics[].words` + `dur`) and a `voice.notes` vocal melody (both
  optional / back-compatible, with validation). Added `music/lrc.js` (standard + enhanced LRC
  import/export), `karaoke/timeline.js` (`buildLyricTimeline`/`activeAt`, weighted word
  auto-distribution so every lyric song highlights word-by-word), and `karaoke/grader.js` (a
  reusable octave-agnostic note grader extracted to match the play view's scoring exactly, for
  shared use by instrument play and vocal sing-and-score). test-core grew from 25 to 49 checks.
- **Full karaoke mode — Phase 2 (standalone view):** added `views/karaoke.js` + the `karaoke`
  route/nav/crumb. `#/karaoke` lists every song with lyrics; `#/karaoke/:id` is the stage — a
  centred teleprompter (previous/current/next/next-2 lines, current line filled word-by-word via
  a clip-text gradient driven by `activeAt`), a per-line count-in dot row over silent gaps, the
  3-2-1 lead-in, backing-track volume + a guide-vocal on/off toggle, and an optional
  sing-and-score pass (`karaokeScoring` setting) that grades mic pitch against `voice.notes`
  (falling back to the instrument melody) through the shared `Grader`, drawing a compact pitch
  ribbon and recording a `mode:"karaoke"`, `instrument:"voice"` history entry. dom-smoke now
  mounts 15 views (added karaoke picker + stage). New CSS: `.kara-*` + `.view-pad`.
- **Full karaoke mode — Phase 3 (Play overlay):** extracted the word-fill line rendering into
  `karaoke/render.js` (`lineFillHTML`/`escapeHTML`, shared by both views) and added a 🎤 Karaoke
  toggle to the Play view that swaps its current/next lyric line for the word-by-word fill
  (`karaokeLyrics` setting, on by default when a song has lyrics; falls back to the original
  simple display when off). test-core now 53 checks.
- **Full karaoke mode — Phase 4 (authoring + library) & docs:** the Song Editor's lyrics panel
  became "Lyrics & Karaoke" — LRC import (file) / paste / export, per-line word-timed badges
  with a revert-to-auto control, and a **tap-to-time** tool (plays the backing track and stamps
  word timing as you tap/Space; the view now returns a teardown that stops it). The Library
  gained a 🎤 Karaoke filter pill, a karaoke badge on cards/detail, and Karaoke entry buttons
  (card + detail) alongside Play. Two built-ins (Twinkle, Frère Jacques) are now fully
  word-timed to their melodies as showcases. README updated. test-core now 55 checks; the full
  suite stays green (imports clean, 55 core, 44 cosmetics, 15 view mounts).
- **Vocal-melody authoring:** the Song Editor gained a "Vocal melody (Karaoke scoring)" panel —
  copy the instrument melody to the vocal line, shift it ±8ve (singers often sit an octave from
  the guitar), or clear it; the vocal line is drawn dimmed on the piano roll. Scoring-target
  selection moved into a shared `vocalTargets(song)` (grader.js: authored `voice.notes` else the
  instrument melody) used by the Karaoke view, which now shows a "scored melody" tag in the
  picker for songs with an authored vocal line. test-core now 57 checks.
- **Per-note vocal editing:** the editor's piano roll became layer-aware — an Instrument/Vocal
  toggle picks which melody the roll, click-to-add/delete, "Clear layer", and the quick-notation
  Apply/From-roll operate on. The inactive layer is drawn dim & thin, the active layer as bright
  blocks. "Copy from notes" switches to the Vocal layer so edits are immediately visible.
- **Hum-to-capture & shared transcriber:** extracted the Listen view's frames→notes transcription
  into `music/transcribe.js` (`framesToNotes`/`quantizeNotes`); Listen now imports it (behaviour
  unchanged). The editor's vocal panel gained a 🎙️ Hum-to-capture recorder — sing the line, it
  pitch-tracks and transcribes to `voice.notes` at the song tempo, then switches to the Vocal
  layer. The editor teardown stops the recorder. test-core now 61 checks.
- **Public-domain library expansion (going-public prep):** added `music/songs-extra.js`
  (`EXTRA_SONGS`, merged into `builtinSongs()`) with 25 new built-ins — 8 guitar chord
  progressions / patterns (non-copyrightable harmonic forms or original) and 17 word-timed
  singalongs (traditional folk, spirituals, nursery rhymes, and carols). Library is now 47 songs
  (28 with lyrics, 19 word-timed). Every entry is public-domain or non-copyrightable, logged in
  CREDITS.md. Traditional melodies are hand-transcribed and tagged `verify-melody` — word-timing
  is exact (one note per word), but **pitches need an ear-check before public release**.
- **Optional Google Drive cloud sync (opt-in, local-first):** added `cloud/` — `config.js`
  (`BUILTIN_CLIENT_ID` + `OAUTH_ORIGINS`; off-origin or no id ⇒ sync unavailable), `merge.js` (pure,
  tested union-merge of two payloads: songs/history/progress/unlocks unioned, coin balance
  last-write-wins by `savedAt`), and `sync.js` (Google Identity Services token + Drive v3 REST via
  `fetch` — no bundled SDK, GIS loaded only on sign-in; reads/writes one file in the user's hidden
  `appDataFolder` with the minimal `drive.appdata` scope). `Store.exportSyncable`/`importSyncable`
  expose the portable subset (device settings stay local). A Settings "Account & Sync" panel does
  sign-in / Sync-now / sign-out (inert with a setup pointer when unconfigured). No live resources
  are provisioned — `docs/CLOUD-SYNC-SETUP.md` covers creating the OAuth client ID + deploying.
  README/CREDITS privacy + "no network" claims updated to reflect the opt-in. test-core now 69
  checks; Settings mounts at 7 root nodes. **Not live-tested** (needs a real OAuth client ID + a
  browser Google sign-in) — the merge logic is unit-tested, the network path is not.
- **Synthesized backing tracks + multi-instrument arrangements:** added `audio/voices.js` (15
  instrument timbres — plucked/nylon/banjo/bass/bowed/piano/e-piano/organ/reed/flute/brass/tine/
  voice/lead/drums — built from additive partials, an envelope-swept lowpass, vibrato, detune
  beating and breath noise; `voiceFor(instrument)` maps all 59 instruments, and every note
  preview in the app now uses its instrument's voice), `audio/band.js` (look-ahead scheduler
  that places notes on the AudioContext clock rather than firing them from rAF), and
  `music/accompany.js` (infers one chord per bar from the melody — or reads the harmony straight
  out of a chord-based song — then writes bass, chord comp and, where the genre/tempo suit it, a
  drum groove; roles an existing part already covers are skipped). Songs gained an optional
  `parts[]`: whichever part matches *your* instrument becomes the highway, the rest are
  synthesized, so "When the Saints" can be played on guitar with the harmonica answering, or on
  harmonica with the guitar backing you. Play and Karaoke gained a 🎺 Band toggle (backing-track
  volume drives it); an imported backing track still wins by default. test-core is now 148 checks,
  including a stub AudioContext that enforces Web Audio's automation-ordering and no-exponential-
  ramp-to-zero rules. Verified end-to-end by rendering every voice and the full band through an
  OfflineAudioContext in headless Chrome (no NaN, no clipping, peak ~0.6).
