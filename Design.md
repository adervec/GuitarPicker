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
- `docker build -t guitarpicker . && docker run --rm -p 8080:8080 guitarpicker` — build +
  verification suite + server all run inside the container, isolated from the host Node/npm
  install. See [docs/DOCKER.md](docs/DOCKER.md).

Then open `http://localhost:8080` (the Node/PowerShell/Docker servers print/serve on that URL).

### Verification harness (Node)
Run `npm test` (or the scripts individually). These run without a browser:
- `check-imports.cjs` — every `import` resolves to a real export
- `test-core.mjs` — music/theory math, song library, drills, and the pitch
  detector (validated against synthesized sine tones 110–440 Hz)
- `dom-smoke.mjs` — mounts every view against a minimal DOM shim and asserts it
  renders + tears down without throwing
The real audio/mic/canvas behaviour still requires a browser.

## Architecture

> `web/` is a separate, standalone Next.js project — a scoped FSD/Next.js/TanStack Query pilot
> (Tuner only, see the Changelog's "FSD/Next/RQ pilot" entry and `web/README.md`), not part of
> this tree and not currently deployed. Everything below is the deployed vanilla app.

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
  learn/              Learn-mode engine (UI-agnostic, state-agnostic — see ui/timeline.js for
                      its visual half)
    learn-mode.js     createLearnMode(): segment slicing + the per-segment speed ramp
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
    timeline.js       createTimeline(): drag-to-select/click-to-seek canvas scrubber, with an
                      optional fixed-segment overlay (used by Play's practice segment + Learn mode)
  cloud/
    config.js         Sync config (built-in OAuth client id + origin allowlist)
    merge.js          Pure merge of two sync payloads (union content, LWW coins) — tested
    sync.js           Google Drive appData sync (GIS token + Drive REST via fetch; no SDK)
serve.mjs             Zero-dependency Node static server
serve.ps1             Zero-dependency PowerShell static server (Windows)
Dockerfile            Isolated build (runs the verification suite) + serve
docker-compose.yml    `docker compose up` convenience wrapper
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
- [x] Locker: layered SVG player avatars, customisable guitar avatars, and 26 app skins
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
- [x] Practice-speed control (Play + Karaoke): slow down or speed up a song (25%–125%) without
      changing pitch — scales backing/vocal audio, the synth band, note/lyric timing and grading
      windows together
- [x] Strict "repeat till right" practice mode (Play): a missed/off note freezes the transport
      exactly on it — nothing already played gets replayed — and waits until it's hit correctly,
      then eases back up to speed; no score/health penalty while waiting
- [x] Fretboard string labels (Play + Tuner): note names or player-facing numbers (1–6, high to
      low), picked in Settings
- [x] Fretboard/holes display size (Play): a ⚙ button next to 🎸 Frets cycles Small/Medium/Large
- [x] Vegas-style practice timeline (Play): drag to select a segment, click to seek, playhead
      moves live — replaces manual start/end marking
- [x] Learn mode (Play): a separate component (`src/learn/learn-mode.js`) that auto-slices the
      song into 4-bar segments shown on the timeline, starts each at 50% speed and loops it,
      bumping speed +10% on every clean (≥85%) pass up to full speed; ◀/▶ moves between segments
- [x] Isolated Docker build + run (`Dockerfile`, `docker-compose.yml`) — see docs/DOCKER.md

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
- **Six more app skins** (26 total): Parchment and Sakura (the first light themes besides
  Daylight), Espresso, Aurora Borealis, Coral Reef and Peacock. test-cosmetics now checks that
  every skin has a `[data-theme]` block, that every block belongs to a skin, that all themes
  define the same variable set as the default, and that each `swatch` matches the theme's own
  `--bg`/`--accent`/`--accent-2` — a skin listed without CSS renders unstyled and throws nothing.
- **Isolated Docker build + run:** added a `Dockerfile` (copies the repo into `node:22-alpine`,
  runs the full verification suite as the image build — a red suite fails the build the same way
  the CI workflow does — then serves via `serve.mjs` as the non-root `node` user) and a
  `docker-compose.yml` convenience wrapper. No dependencies are installed from the network beyond
  the base image; the container is served on `localhost`, so mic access still works from the
  browser. Documented in `docs/DOCKER.md` (build/run/compose/test-only/dev-mount) and linked from
  the README quick start and this doc's "Running it" section. Verified locally: image builds
  clean (all checks green inside the build), and a running container serves `index.html` and
  `src/app.js` with HTTP 200.
- **Practice-speed control (tempo trainer):** added a `playbackSpeed` setting (default 100%) and
  a "Speed" slider (25%–125%, widened from an initial 50%–125% floor for very slow practice) in
  the Play and Karaoke control bars. `TrackPlayer.setSpeed()` sets
  `playbackRate` (+ `preservesPitch`/vendor-prefixed variants) on the backing/vocal `<audio>`
  elements, so a slowed-down song keeps its original key. `Band.schedule(clock, rate)` now
  converts song-time deltas to real seconds via `/rate` (and scales its look-ahead horizon by
  `rate`) so the synthesized band stays sample-accurate at any speed; the default `rate = 1`
  reproduces the exact prior scheduling math, so it's a backward-compatible signature change.
  Each view's game loop advances its transport clock by `dt * rate` when not synced to backing
  audio (the audio-synced branch already reflects the rate via the element's own `currentTime`).
  Because grading windows, the note highway, and the metronome are all driven by the same
  transport clock, slowing the song down widens the real-time hit window and slows the highway
  scroll, count-in and metronome together — no separate scaling needed. Distinct from the
  pre-existing `noteSpeed` setting, which only scales the highway's visual scroll density and
  never touches timing. test-core's Band scheduler checks (148 total) verified unaffected by the
  signature change; a standalone rate-math check confirmed a half-speed note is queued exactly
  twice as far out in real time and stays outside the look-ahead window until the (rate-scaled)
  horizon reaches it.
- **Strict "repeat till right" practice mode:** added a `strictMode` setting and a "☑ Repeat till
  right" toggle button to the Play control bar (same on/off convention as 🎺 Band / 🔊 Notes / 🎸
  Frets — highlighted when active). In `finalize(n)`, a note that would grade "off" or "miss"
  is, under strict mode, not finalized at all: `retry(n)` resets the note back to `pending`,
  rewinds the transport clock to `RETRY_LEAD` (0.5s) before the note — capped at the previous
  note's end, so closely-spaced notes only back up "one step" rather than through several already-
  played notes — and seeks the backing/vocal audio and the synth band to match, so everything —
  highway, audio, and accompaniment — visibly rewinds together. `soundIdx` is rewound to the
  note's own index so its preview sound re-fires, and `lastMetroBeat` is re-synced so the
  metronome doesn't double-click on the jump back. Failed attempts under strict mode skip
  `applyJudgment` entirely (no health/score/killfeed change) — only a clean "good"/"perfect" pass
  finalizes and counts. A toast nudges the player on each rewind. Off by default; persists via
  `Store.setSetting` like the other Play toggles. Karaoke's vocal grading (a continuous
  lyric-line stream via the shared `Grader`, not discrete gated notes) doesn't have an equivalent
  yet. *(Tuned down from an initial 1.2s lead after it was reported as rewinding too far.)*
- **String label style, fretboard size, practice segments, and Learn mode:** four Play/Tuner
  additions in one pass. (1) `stringLabel(instrument, strings, index, style)` (`music/notes.js`)
  returns either the existing `STRING_LABELS` note name or a player-facing string number — by
  guitar/bass convention, 1 is the highest-pitched string, counting up to the lowest, i.e. the
  reverse of the low-to-high `strings` array — driven by a new `stringLabels` setting ("notes" /
  "numbers", a Settings dropdown); wired into Play's `drawFretboard` and the Tuner's string chips.
  (2) A `fretboardSize` setting (S/M/L) and a "⚙ M" button next to 🎸 Frets cycle the fretboard/
  holes strip's size — `drawFretboard`/`drawHoles` now scale every size-bearing constant (panel,
  cell, dot radius, fonts) by a `FRET_SCALE` factor instead of using fixed pixel values.
  (3) A practice-segment picker: `⏺ Start` / `⏹ End` mark `[segStart, segEnd)` at the current
  playhead, `🔁 Loop` repeats it, `✕` clears back to the full song; a shared `rewindTo(target)`
  (seeks audio, band, note states, `soundIdx` and the metronome beat together) now backs both
  this and strict-mode's `retry()`. (4) Learn mode (`🎓`): `buildLearnSegments()` slices the song
  into fixed 4-bar (16-beat) segments; entering one seeks to it, forces the loop on, and drops
  `rate` to 50%. Each time a looped pass reaches the segment end, `evaluateSegmentPass()` scores
  that pass from a segment-local `segCounts` tally (tracked in `applyJudgment` alongside the
  existing global `counts`, only while `learnMode` is on) — a clean pass (≥85%) bumps `rate` by
  +10% (capped at 100%) and updates the speed slider via `setValue`; at full speed it just tells
  you to move on. `◀`/`▶` step between segments, each restarting at 50%. Second `.play-controls`
  row added to the Play view for these; `restart()` now rewinds to the segment start instead of
  the song start whenever a loop is active. None of this touches Karaoke or persists to History —
  segment/Learn drilling never reaches `finish()`, so it can't corrupt a saved run.
  *(Superseded by the next entry: the button-based start/end marking became a draggable
  timeline, and Learn mode moved into its own module.)*
- **Vegas-style practice timeline, Learn mode as a real component, and a retry slowdown:** three
  follow-ups to the segment/Learn-mode work above. (1) `ui/timeline.js` (`createTimeline`): a
  canvas scrubber — click to seek, click-drag to select a range, playhead drawn live, with an
  optional fixed-segment overlay (ticks + an active-segment highlight) for Learn mode. Replaces
  the `⏺ Start`/`⏹ End` buttons in Play; `applySegment`/`rewindTo` now also push to
  `timeline.setSelection`/`setPlayhead`, and the timeline goes read-only (`setInteractive(false)`)
  while Learn mode owns segment selection. (2) Learn mode moved out of `play.js` entirely into
  `src/learn/learn-mode.js` (`createLearnMode`) — a UI- and state-agnostic controller (mirroring
  how `karaoke/grader.js`/`timeline.js` sit behind the Karaoke view) that owns segment slicing,
  the current index, its own pass-accuracy tally, and the speed ramp, driven purely through a
  `host` callback object (`applySegment`, `rewindTo`, `getRate`/`setRate`, `setLoop`, `toast`) —
  no closures over Play's internals. `play.js` now just instantiates it and forwards
  `learn.record(quality, noteTime)` from `applyJudgment` and `learn.evaluatePass()` from the
  segment-loop check. (3) Strict mode's `retry()` now calls `startRetrySlowdown()`: rather than
  snapping straight back to full speed, a new `effRate` (the rate that actually drives the clock
  and `band.schedule`, vs. `rate`, the player's chosen speed) dips to ~55% of `rate` for 1.1s then
  eases back to `rate` over 0.6s, each frame in `loop()` — giving a beat to actually see which
  note was missed before the retry starts for real; because grading windows are defined in
  song-time, the dip also makes that first retry attempt's hit window proportionally more
  forgiving in real time, for free. `applyRate(v)` (slider input, and Learn's `setRate` callback)
  cancels any in-progress dip and sets both `rate` and `effRate` together. Fixed a
  `ResizeObserver`-triggered TDZ crash in `timeline.js` (the observer fired `draw()`, which read
  `tToX`, before that `const` was initialized — surfaced by dom-smoke, which invokes
  `ResizeObserver` callbacks synchronously) by reordering the helper declarations. test suite
  unchanged at 148/48/23 (Play's own grading loop isn't unit-tested — dom-smoke only mounts it).
  *(Superseded by the next entry: the slow-motion rewind-and-replay became a hard freeze.)*
- **Strict mode reworked: freeze-and-wait instead of rewind-and-replay.** The dip-then-ease
  slowdown above still replayed a stretch of already-correct material on every retry (rewound to
  `RETRY_LEAD` before the note, then resumed forward playback through it, just slower) — reported
  as rewinding too far in a different way: it re-plays music you already got right. `retry(n)`
  now calls `rewindTo(n.time)` — no lead-in — then explicitly `player.pause()` + `band.silence()`
  and sets `waitingFor = n`; nothing plays while frozen. `loop()` gains an early branch: while
  `waitingFor` is set, the transport clock doesn't advance and the normal grading/scheduling body
  is skipped entirely, but a new `readPitch()` (extracted from the loop body so both branches
  share it) and `checkWaitingPitch()` keep listening every frame. Any in-tune match resolves it
  (octave-agnostic cents check, reusing `finalize()`'s thresholds: ≤`PERFECT_CENTS` is "perfect",
  else "good"; for percussion, any onset counts, mirroring `grade()`'s existing "any drum voice
  counts" rule) via `resolveWait(n, q)`, which finalizes the note through the normal
  `applyJudgment` path, resumes the player, and calls `beginTempoRamp()` (renamed from
  `startRetrySlowdown`, and simplified — the "hold at the dipped rate" phase is gone since the
  freeze itself already gave unlimited look time; it now eases from ~55% up to `rate` over 0.6s
  immediately) so the resume isn't a jump cut. `RETRY_LEAD` and the hold-duration constant are
  gone. test suite unaffected (148/48/23) — this is all inside Play's un-unit-tested grading loop.
- **FSD/Next/RQ pilot (`web/`), scoped to the Tuner only.** Asked to refactor the whole app onto
  Feature-Sliced Design + Next.js (React) + TanStack Query — that's a fundamental reversal of this
  project's own stated architecture (`Tech stack & rationale` above: vanilla, zero-build, zero
  dependencies), so rather than rewrite in place, agreed a scoped plan first: pilot one feature end
  to end, keep the vanilla app as the deployed one, and use TanStack Query only where the app has
  genuine server state. Picked the **Tuner** (smallest self-contained feature — no song data model,
  no canvas game loop) and built it in a new `web/` directory: `create-next-app` (App Router, JS,
  `src/`) + `@tanstack/react-query`. Ported framework-agnostic logic as-is into `web/src/shared/lib`
  (autocorrelation pitch detection, note/frequency math, the mic `AudioContext` singleton, the
  reference-tone oscillator) and `web/src/entities/instrument` (tuning data); rebuilt the
  interactive half as a `features/tune-string` hook (`useTunerEngine`: mic lifecycle + a
  `requestAnimationFrame` pitch loop + target-lock/reference-tone) and small
  `features`/`widgets`/`views` pieces composed into `views/tuner/ui/TunerPage.jsx`. **Note the FSD
  layer is named `views/` here, not `pages/`** — Next.js reserves a top-level `pages/` directory for
  its legacy Pages Router and refuses to build ("App Router and Pages Router both match path") if an
  FSD `pages/` layer collides with it; this is a known FSD+Next.js clash, and `views/` (matching the
  vanilla app's own `src/views/` naming) was the least-confusing rename. TanStack Query wraps exactly
  one thing — Google sign-in (`entities/cloud-account`, identity-only, no `drive.appdata` scope,
  since this pilot doesn't port file sync) — because everything else in the vanilla app is
  synchronous `localStorage`, not server state RQ is meant to manage; a `useQuery` silently restores
  an existing session, `useMutation`s for sign-in/out write straight into its cache via
  `setQueryData`, surfaced through a `widgets/cloud-account-badge`. Installed Next 16.3.6, which
  ships its own `AGENTS.md`/bundled `dist/docs/` warning that it may differ from training data —
  read `01-app/02-guides/client-side-data-fetching/tanstack-query.md` there before wiring the
  provider; the recommended per-render-vs-browser `QueryClient` split matched what was already
  planned. Fixed a real hydration-mismatch bug this pattern invites: the account badge's origin
  check reads `location`, undefined during SSR but present on the client's first (hydration) render,
  so a naive `useState`+`useEffect` gate got flagged by a newer `react-hooks/set-state-in-effect`
  lint rule anyway — replaced with `useSyncExternalStore` (server snapshot `false`, client snapshot
  the real check), React's sanctioned tool for exactly this case. `npm run lint` and `npm run build`
  both clean; verified the built page serves the expected markup via `curl` (no browser extension
  connection available this session to click through it live). Root project untouched.
- **Dockerized the pilot, on its own port.** `web/Dockerfile`: multi-stage (`deps` → `builder` →
  `runner`), `next.config.mjs` sets `output: "standalone"` so the final image ships only the traced
  production files (no `node_modules`, no source) as the non-root `node` user, same posture as the
  root `Dockerfile`; the build stage runs `npm run lint && npm run build` so a broken pilot build
  or a lint regression can't ship either. Listens on `:3000` (`PORT`/`HOSTNAME` env, per Next's
  standalone-output docs) — deliberately different from the vanilla app's `:8080`, since these are
  two separate, independently-versioned deployments, not one app. Added as a second service
  (`guitarpicker-web`) in the root `docker-compose.yml` so `docker compose up` brings both up
  together, or `docker compose up guitarpicker-web` just this one; root `.dockerignore` gained a
  `web` exclusion so the vanilla app's image build doesn't pick up this whole project as build
  context. Verified: both containers running simultaneously, `:8080` and `:3000` both serving
  correctly (`curl`), pilot's container logs clean.
- **Play ported into the FSD/Next/RQ pilot.** The Tuner slice proved the pattern; asked to bring
  over "Play — where I play music" next (example: `/play/bi-twinkle`), the biggest, most complex
  feature in the app (~830 lines in `views/play.js` alone, plus everything it pulls in — grading,
  the synth backing band, strict-mode freeze-and-wait, the practice timeline, Learn mode, fretboard
  rendering). Strategy: rather than rewrite this as JSX (high risk of subtly breaking
  already-tuned, already-debugged gameplay/audio-timing logic for no real benefit), ported it as a
  **near-verbatim imperative engine** — `features/play-song/model/createPlayEngine.js` builds its
  own DOM subtree and runs its own `requestAnimationFrame` loop, exactly like embedding a Three.js
  scene or a Phaser game in a React app: React (`views/play/ui/PlayPage.jsx`) owns only the mount
  point (a ref) and the lifecycle (`useEffect` mounts on `songId` change, calls the returned
  cleanup on unmount) — a direct match for the vanilla view's own "mount(root, ctx) → returns
  cleanup()" shape. Ported ~17 supporting files close to verbatim, organized by FSD layer:
  `shared/lib/` (framework-agnostic, no changes beyond import paths) gained `pitch`-adjacent audio
  infra — `voices.js`, `synth.js`, `band.js` (its rate-aware scheduling from the strict-mode/
  practice-speed work came along unchanged), `track-player.js` (one real change: `load()` takes
  volumes as params instead of reading a global `Store`), `theory.js`, `accompany.js`,
  `backgrounds.js`, `karaoke-timeline.js`, `karaoke-render.js`, `practice-timeline.js` (the
  Vegas-style scrubber), and `dom.js` (`el`/`slider`/`toast`/`fmtTime`/`getVar`, the imperative
  builder the engine is written with). `features/learn-mode/` got `createLearnMode` verbatim — it
  was already state- and DOM-agnostic. `entities/instrument` grew from the Tuner's 10-instrument
  subset to include `kind`/`frets`/`midiToFret`/`midiToHole`/`nameToMidi` and the handful of
  additional instruments the song library needs (harmonica, recorder, e-drums, drum-kit). New
  `entities/song`: `song-format.js` (schema/duration/pickPart/parseMelody/metadata, trimmed — no
  editor-only serialize/validate), `songs-data.js` (25 of the vanilla library's songs — its other
  25, in `songs-extra.js`, weren't ported, to avoid doubling pure-data effort for a pilot), and
  `catalog.js` (find/list, no user songs since there's no Editor here). A new
  `shared/lib/player-settings.js` replaces `Store` with a trimmed localStorage settings + history
  store (no coin economy/cosmetics — Play's banner already treats `coins` as optional, so it just
  doesn't show that line). `views/play/ui/PlayPage.jsx` resolves the song via `entities/song`'s
  catalog and shows its own "Song not found" for a bad id, matching the vanilla view. Added a
  minimal `views/library/ui/LibraryPage.jsx` (just a card grid linking to `/play/[id]`) purely so
  Play's "← Songs" has somewhere real to land — not a Library port. Deliberately dropped: the
  player-avatar HUD badge (`renderAvatar`, cosmetics/Locker) and navigation to Progress/Locker
  (routes that don't exist here). Fixed the known unescaped-`song.title` self-XSS from this
  session's very first review (`el("div", { html: `<b>${song.title}</b>` })`) while porting it —
  now goes through `esc()` like the killfeed label. Global (non-Module) CSS added in
  `app/play-engine.css` for the engine's literal class-name DOM (`.play-shell`, `.hud-box`,
  `.killfeed`, `.timeline-*`, `.btn`, `.stat`, `.toast`, etc. — CSS Modules' hashed names don't
  apply to strings the imperative builder assembles itself) plus the "midnight" theme's CSS custom
  properties, ported from `styles/main.css`/`themes.css`; `app/layout.js` gained a `#toast-host`
  div for `toast()` to append into. `npm run lint` and `npm run build` both clean (new dynamic
  route `/play/[id]` alongside the existing static ones); verified via `curl` that `/library` lists
  the ported songs, `/play/bi-twinkle` and `/play/<bad-id>` both serve correctly (the latter its
  "Song not found" state) — the engine itself mounts client-side in a `useEffect` after hydration,
  so SSR output for a valid id is (correctly) just an empty mount `<div>`; no browser extension
  connection available this session to click through the actual gameplay (mic grading, canvas
  animation, timeline drag) live. Rebuilt and verified the `web` Docker container serves the new
  routes. Root vanilla app untouched.
- **Pilot: Google sign-in disabled for now, by request.** Removed `<CloudAccountBadge />` (and its
  now-unused import) from `TunerPage` — it's the only place it was rendered — so the widget shows
  nowhere in the pilot right now. Left `entities/cloud-account` and `widgets/cloud-account-badge`
  in place rather than deleting them (the ask was "not for now," not "rip it out"), and left
  `QueryClientProvider` wired in `app/providers.js` since it's harmless, inert plumbing with
  nothing currently calling into it. TanStack Query's pilot has no active call site until this is
  re-enabled — re-adding `<CloudAccountBadge />` wherever it's wanted brings it back with no other
  changes needed. `npm run lint`/`npm run build` clean; `web/README.md` updated to flag both the
  widget and the entity as built-but-disabled.
- **Karaoke ported into the FSD/Next/RQ pilot.** Next feature after Play, picked over Settings/
  History/Song Editor because it reuses almost everything Play's port already brought over — audio
  engine, band scheduler, pitch detection, track player, the karaoke lyric-timeline/render helpers
  — so the marginal port was small: `shared/lib/karaoke-grader.js` (the shared `Grader` class +
  `gradeLetter`/`vocalTargets`, ported verbatim — Play's engine already carries its own inline copy
  of the same grading math, predating this shared module existing here) and one added export,
  `timelineDuration`, that `shared/lib/karaoke-timeline.js` was missing (Play doesn't need it,
  Karaoke does, for its total-duration calc). The stage itself —
  `features/karaoke-song/model/createKaraokeEngine.js` — is a near-verbatim port of
  `views/karaoke.js`'s `stage()`, same imperative-engine reasoning as `createPlayEngine.js` (own
  DOM subtree, own `requestAnimationFrame` loop; React only owns the mount point). Unlike Play, the
  vanilla picker (`views/karaoke.js`'s `picker()`) is plain markup with no canvas/audio/game-loop,
  so it was ported straight to JSX instead (`views/karaoke/ui/KaraokePicker.jsx`) rather than kept
  imperative. `views/karaoke/ui/KaraokePage.jsx` mirrors `PlayPage.jsx`'s mount/cleanup pattern, plus
  one wrinkle Play doesn't have: the engine factory returns `null` for a song with no lyrics
  (matching the vanilla view's own guard), so the wrapper checks for that and renders its own "No
  lyrics to sing" state. Added `.kara-*` global CSS (teleprompter lines, count-in dots, canvas) to
  `app/play-engine.css`, broadening its header comment since it's no longer Play-only. New routes
  `/karaoke` (picker) and `/karaoke/[id]` (stage). Also added `widgets/pilot-nav` — a tiny
  Tuner/Songs/Karaoke link row — since the pilot has no app shell/sidebar and three destinations
  finally made "how do I get from one to another" a real question; shown on Tuner/Library/the
  Karaoke picker, not on Play/Karaoke's fullscreen stages (matching the vanilla app hiding its own
  sidebar during those, `#view.no-pad`). Library's song cards gained a secondary 🎤 link into
  Karaoke for songs with lyrics — restructured the card from a single `<Link>` to a `<div>` wrapping
  two, since nesting an `<a>` inside another `<a>` is invalid HTML/a hydration hazard.
  `npm run lint`/`npm run build` clean (two new routes registered); verified via `curl` that
  `/karaoke` lists songs with lyrics, `/karaoke/bi-twinkle` (word-timed), `/karaoke/bi-ode` (no
  lyrics) and `/karaoke/<bad-id>` all serve 200 with clean dev-server logs, and that the
  restructured Library card emits no nested `<a>` tags. No browser extension connection this
  session to click through actual singing/scoring live. Rebuilt and verified the `web` Docker
  container serves the new routes. Root vanilla app untouched.
- **History ported into the FSD/Next/RQ pilot.** Picked over Settings/Song Editor: it closes the
  loop on Play/Karaoke, whose ported `finish()` has been writing to `player-settings.js`'s history
  store since those ports landed, with nowhere to view it until now. Unlike Play/Karaoke, ported as
  plain JSX (`views/history/ui/HistoryPage.jsx`) — filtering/rendering a table and two charts from
  React state has no canvas-game-loop reason to stay imperative, the charts' `<canvas>` elements
  are just refs the ported `lineChart()` draws into from a `useEffect`. `shared/lib/dom.js` gained
  `download()` and `lineChart()` (ported verbatim from `ui/components.js`) alongside the existing
  `el`/`slider`/`toast`/`fmtTime`/`getVar` — its header comment now says explicitly that these last
  two are plain utilities usable from ordinary React, not imperative-DOM-only like `el`.
  `views/history/model/buildProgressReport.js` ports the "🤖 Export for Claude" Markdown report
  generator, dropping only the daily-practice-streak summary line (Home's streak tracking isn't
  ported). **Dropped entirely:** the cosmetics/coin "Collection" panel and any coins column/stat —
  Locker isn't part of this pilot, and Play/Karaoke's ported `finish()` already never sets
  `entry.coins`, so there was nothing to display anyway. Hit the same hydration hazard as the
  Google-auth widget: `getHistory()` reads `localStorage`, undefined during SSR; fixed the same way
  — `useSyncExternalStore`, server snapshot a stable empty-array constant — but this one needed an
  extra piece the auth case didn't: `useSyncExternalStore` requires its `getSnapshot` to return a
  *stable reference* when nothing changed, or React sees "changed" on every render and loops
  forever, and `getHistory()` previously re-read + re-parsed `localStorage` fresh every call. Gave
  `player-settings.js` a `historyCache` that `addHistory()` (the only writer) invalidates — reads
  are now free after the first, and stable until an actual write. `npm run lint`/`npm run build`
  clean (new static `/history` route); verified via `curl` that it renders the correct SSR "No
  sessions yet" state (matching an empty `getServerSnapshot`) and that the other five routes still
  serve correctly alongside it (regression check after widening `widgets/pilot-nav`, which gained
  a 📈 Progress link). Couldn't seed real session data or click through the "has sessions" branch
  (charts, table, report download) without a live browser — no extension connection this session.
  Rebuilt and verified the `web` Docker container serves `/history`. Root vanilla app untouched.
- **Settings ported into the FSD/Next/RQ pilot.** Not asked which feature was next this time —
  picked it directly (both prior "which next" questions had been answered with the recommended
  option anyway), reasoning that Settings was overdue: every persisted value it edits had, until
  now, only ever been changeable by hand in `localStorage`. Ported `views/settings.js` as plain
  JSX (`views/settings/ui/SettingsPage.jsx`) — form controls, no canvas-game-loop reason to go
  imperative. Dropped entirely: theming (dark-only pilot, no `data-theme` switcher), the Locker
  link, and the whole "Account & Sync (cloud)" section — Google sign-in is disabled for now (previous
  entry), so there's nothing there to configure. Kept: device pick (input *and*, newly, output —
  see below) with a mic test toggle, backing/vocal volume, mic noise gate, A4 calibration, note-
  highway speed, default instrument, string-label style, and a trimmed "export all data"/"reset
  everything" pair scoped to this pilot's own two localStorage keys (not the vanilla app's, a
  different key — `resetAll()` says so explicitly in a comment, since a future reader could easily
  assume they're the same thing). Extended `shared/lib/audio-engine.js`: `listInputDevices()`
  (added for the pilot, never actually called by anything) became `listDevices()` returning both
  `{inputs, outputs}`, matching the vanilla engine.js; `applySink(mediaEl, deviceId)` — always a
  no-op before, since nothing ever passed a `deviceId` — became `setOutputDevice(id)` + a
  no-arg `applySink(mediaEl)` that reads an internal module-level `outputDeviceId`, exactly
  mirroring how the vanilla engine.js reads its chosen output device from its own settings
  singleton internally rather than threading it through every call site. Because that
  module-singleton doesn't survive a full page load the way `localStorage` does, Play's and
  Karaoke's engines each gained one line — `if (s.outputDeviceId) Audio.setOutputDevice(...)`
  before creating their `TrackPlayer` — to re-apply the persisted choice on mount.
  `player-settings.js` gained `outputDeviceId` to `DEFAULTS`, `exportAll()`/`resetAll()`, and a
  `subscribeSettings()` pub-sub so `setSetting` notifies listeners — needed because, unlike
  History's read-only display, Settings' own controls must re-render live when its own handlers
  call `setSetting` (a no-op `useSyncExternalStore` subscribe, as used for the Google-auth
  origin check and for History, wouldn't pick that up). Hit two lint issues fresh: the by-now
  familiar hydration hazard (`getSettings()` reads `localStorage`; fixed with
  `useSyncExternalStore`, `getServerSnapshot` returning the `DEFAULTS` constant itself — value-
  identical to what the server's own unhydrated `getSettings()` produces) — and a new one,
  `react-hooks/set-state-in-effect` flagging a plain `useEffect(() => { refreshDevices() }, [])`
  fetch-on-mount for device enumeration, *despite* the actual `setState` calls happening after an
  `await` (the rule's static analysis doesn't appear to track through the async boundary — or
  isn't willing to rely on it). Rather than fight the rule, reached for TanStack Query — a
  legitimate fit this time, since `enumerateDevices()` is genuinely async browser data, not a
  localStorage read masquerading as one — with `queryClient.invalidateQueries()` refetching after
  the mic-permission grant reveals real device labels. This is RQ's second active call site in the
  pilot (the first, Google sign-in, is currently disabled), so the "Why TanStack Query" section in
  `web/README.md` was reframed from "scoped to sign-in only" to "scoped to genuinely async things"
  to still describe the app accurately. Also wired `getSettings().inputDeviceId` into Tuner's
  mic-start button — read at click time (inside the handler, never during render), so it carries
  no hydration risk despite Tuner never having been touched for this otherwise — and added Settings
  to `widgets/pilot-nav`. `npm run lint`/`npm run build` clean (new static `/settings` route, nine
  total now); verified via `curl` that it renders all five panels and that the other six routes
  still serve correctly alongside it. Couldn't click through live device selection/mic-permission
  UI without a live browser — no extension connection this session. Rebuilt and verified the `web`
  Docker container serves `/settings`. Root vanilla app untouched.

- **Instruments ported into the FSD/Next/RQ pilot.** All previously agreed-scope features (Tuner,
  Play, Karaoke, Library, History, Settings) were now ported, so before taking another "Дальше" the
  user was asked which feature to add next — the vanilla app's remaining views (Song Editor, Listen
  & Make, Training, Glossary, Theory minigames, Locker) are all things `web/README.md` already lists
  as out of scope, so continuing required either picking one of those (expanding scope) or something
  not discussed yet (Home, Instruments). Picked Instruments: `entities/instrument/model/guide.js`
  ports the vanilla app's `music/instrument-guide.js` — the prose+facts reference data behind both
  the in-app Instruments view and `docs/INSTRUMENTS.md` — trimmed from the vanilla source's 59
  instruments down to the 16 this pilot's `entities/instrument/model/data.js` already models (same
  trimming rationale that file already documents: this pilot only carries data for instruments the
  Tuner/Play actually use). `instrumentFacts()`, `harmonicaChart()`, and a scoped
  `buildInstrumentsMarkdown()` were ported near-verbatim, re-pointed at this pilot's
  `INSTRUMENTS`/`ALT_TUNINGS`/note-math/`builtinSongs()`. `views/instruments/ui/InstrumentsPage.jsx`
  renders it as plain JSX (a `<details>`/`<summary>` disclosure list — no canvas-game-loop reason to
  go imperative, same call as Settings/History), grouped by instrument family, with playable
  reference pitches through `Synth.playMidi` and a "download as Markdown" export via the existing
  `shared/lib/dom.js` `download()` helper. Added `/instruments` to `PilotNav`. `npm run
  lint`/`npm run build` clean (new static `/instruments` route, ten total); verified via `curl` and
  by grepping the SSR HTML for expected content (instrument names, "Hole chart"). Rebuilt and
  verified the `web` Docker container serves `/instruments` alongside the other nine routes. Root
  vanilla app untouched.

- **Pilot converted to TypeScript.** Mid-Instruments-port, the user asked for the pilot (`web/`) to
  move to TypeScript — asked to confirm scope first, since the vanilla root app is explicitly
  zero-build/zero-dependency (converting it would need a compile step, contradicting that documented
  stance — see the Tech stack table), while `web/` already has a Next.js build step, so TS is a
  natural fit there. User picked: `web/` only, full conversion now (not an incremental
  `allowJs`-and-convert-later approach). All 47 `.js`/`.jsx` files under `web/src/` renamed to
  `.ts`/`.tsx` (component/JSX files — `app/**/page.js`, `layout.js`, `providers.js`, every
  `views/*/ui/*.jsx`, `features/*/ui/*.jsx`, `widgets/*/ui/*.jsx` — to `.tsx`; logic-only files —
  every `shared/lib/*.js`, `entities/*/model/*.js`, `features/*/model/*.js`, `views/history/model/*.js`
  — to `.ts`), `next.config.mjs` → `next.config.ts`, `jsconfig.json` replaced by a `tsconfig.json`
  (`strict: true`, the `@/*` path alias carried over), added `typescript`/`@types/react`/
  `@types/react-dom`/`@types/node` as devDependencies. Added real types throughout rather than
  suppressing errors — new shared type definitions worth knowing about: `entities/song/model/
  song-format.ts` (`Song`, `Note`, `SongPart`, `LyricLine`, etc. — the schema every feature/engine
  now imports instead of duck-typing), `shared/lib/player-settings.ts` (`PlayerSettings`,
  `HistoryEntry`, and a new `EngineHost` interface — the Play/Karaoke engines' host contract, used by
  both `createPlayEngine.ts` and `createKaraokeEngine.ts`), `shared/lib/karaoke-grader.ts` (`Grade`,
  `GradeTarget`). Two real behavior-relevant findings surfaced by typing, both fixed: `Note.midi` had
  been documented as `number | number[]` from a hasty guess during the Instruments port, but every
  actual call site (parseMelody, chordSeq, the grader, both engines) always uses `number[]` — fixed
  to match reality; and a `karaokeScoring` setting was read/written by Karaoke via `s.karaokeScoring
  ?? true` but was missing from `PlayerSettings`/`DEFAULTS` entirely — added as an optional field
  (matching its actual runtime default-via-`??` behavior, not a `DEFAULTS` entry, since Settings has
  no UI control for it). The two imperative canvas engines were typed pragmatically rather than
  fighting the DOM's genuine dynamism: `shared/lib/dom.ts`'s `el()` keeps a loose `Record<string,
  unknown>` props bag (a hyperscript builder is inherently dynamic), and `querySelector`/`firstChild`
  results are cast to the element type the caller already knows it built (e.g.
  `stageEl.querySelector(".kara-cur") as HTMLElement`) rather than re-deriving it structurally —
  everything else (song/settings/history data, the grader, the whole audio layer, every React
  component's props) is fully and precisely typed, no blanket `any`. `npx tsc --noEmit` clean (0
  errors) across all 47+ files; `npm run lint` clean; `npm run build` clean (its own `tsc` pass
  during `next build` is a second, independent confirmation); verified via `curl` that the dev server
  serves all nine routes; rebuilt and verified the `web` Docker container (its build stage runs `npm
  ci` then `npm run lint && npm run build`, so the type-check happens inside the isolated build same
  as everywhere else). Every earlier "ported into the FSD/Next/RQ pilot" changelog entry above still
  refers to the pilot's own files by their `.js`/`.jsx` names as they were at the time of that
  port — read those as `.ts`/`.tsx` now; not rewritten retroactively, since the extension is the only
  thing that changed for files ported before this entry. Root vanilla app untouched throughout.

- **Home added to the FSD/Next/RQ pilot.** With every previously agreed-scope feature ported and the
  pilot converted to TypeScript, the user was asked what to take next; offered Home dashboard, Song
  Editor, or Glossary/Theory games as options (the latter two explicitly still out of scope per
  `web/README.md`, so picking either would expand scope) plus the option to stop — picked Home
  dashboard. Ported `views/home.js` trimmed to `views/home/ui/HomePage.tsx`: a hero (continue the
  most recent history entry's song, or a Browse-songs/Tune-up-or-Instrument-guide nudge depending on
  whether the current default instrument has open strings to tune), a session-stats row (reusing the
  same accuracy/time/streak math History already has), and a "Jump back in" song grid (the current
  instrument's songs first, topped up with the rest, capped at 6 — same selection logic as the
  vanilla source). Dropped: XP/leveling (`Math.sqrt` level curve), the coin economy, the avatar +
  guitar "Your setup" panel (Locker/cosmetics aren't part of this pilot, so there's nothing to
  compose), and the whole gamified "Today's Practice" daily-checklist panel with its streak tracking
  and coin rewards (`dailyActivities`/`streakStatus` aren't ported either) — the same
  out-of-scope items `web/README.md` already lists. Home now owns the `/` route, replacing the
  earlier `redirect("/library")` placeholder from the very first Tuner-pilot commit; added a
  `🏠 Home` entry to `PilotNav` (now shown on every non-fullscreen page, including Home itself).
  Reads live settings (current instrument) via the same `useSyncExternalStore`/`subscribeSettings`
  pattern as Settings, and history via the same pattern History already uses for
  `getHistory()`/`EMPTY_HISTORY`. `npx tsc --noEmit`, `npm run lint`, and `npm run build` all clean
  (route count unchanged — `/` already existed as the redirect, now static-prerendered as Home
  instead); verified via `curl` on the dev server and the rebuilt Docker container that `/` renders "Welcome back", "Jump
  back in", and "Browse songs", and that all other eight routes still serve correctly alongside it.
  Root vanilla app untouched.

- **Glossary added to the FSD/Next/RQ pilot.** Asked again what to take next; offered Glossary,
  Theory minigames, or Song Editor (the latter two still out of scope, so either would expand it)
  plus the option to stop — picked Glossary. Ported `views/glossary.js` in full (nothing dropped —
  it was already just forms/filtering, no cosmetics/coins/canvas) to `views/glossary/ui/
  GlossaryPage.tsx`: a chord explorer (root + type selects, `chordMidis`/`chordName` from
  `shared/lib/theory.ts`, played via `Synth.playMidi`), a scale explorer (new `SCALES`/`scaleNotes`
  in `shared/lib/note-math.ts`, ported from `notes.js`), an interval table (`INTERVALS`, newly added
  to `theory.ts`) with a play button per row, a circle-of-fifths display (`CIRCLE_OF_FIFTHS`, also
  now in `note-math.ts`), and a searchable/category-filterable term dictionary
  (`shared/lib/glossary-data.ts`, `GLOSSARY`/`CATEGORIES` ported verbatim from
  `music/glossary-data.js`). Added `/glossary` to `PilotNav`. `npx tsc --noEmit`, `npm run lint`, and
  `npm run build` all clean (new static `/glossary` route, ten total); verified via `curl` and by
  grepping the SSR HTML for expected content ("Chord explorer", "Circle of fifths", "Enharmonic").
  Rebuilt and verified the `web` Docker container serves `/glossary` alongside the other nine routes.
  Root vanilla app untouched.

- **Theory Games added to the FSD/Next/RQ pilot.** Asked again what to take next; offered Theory
  Games, Song Editor, or Training, plus the option to stop — picked Theory Games. Ported
  `views/minigames.js` in two pieces: `views/theory-games/ui/TheoryGamesPicker.tsx` (the menu — one
  card per quiz with a live high score) and `TheoryGamePage.tsx` (the quiz runner), same
  picker/stage route split as Karaoke (`/theory-games` and `/theory-games/[id]`). The five quiz
  generators (interval ear training, chord quality by ear, interval spelling, key signatures, scale
  degrees) moved to `shared/lib/theory-games.ts` verbatim — pure logic + `Synth.playMidi`, no DOM, so
  it's a shared/lib module rather than living in the view, same reasoning as `accompany.ts`. Added
  `INTERVALS` to `shared/lib/theory.ts` and `KEY_SIGNATURES` to `shared/lib/note-math.ts` (both
  ported from the vanilla source files those already came from). The per-drill high score is a
  deliberately trimmed slice of the vanilla `Store.progressFor("theory").drills`: a new
  `shared/lib/theory-progress.ts` with its own localStorage key, `getDrillScores()`/
  `recordDrillScore()`, same stable-reference-until-write caching as `player-settings.ts`'s
  `getHistory()` (required for `useSyncExternalStore` in the picker's high-score display) — verified
  the vanilla `recordDrill()` doesn't touch XP (only `addHistory()` does, when a song is *played*,
  never from a drill), so this stays honestly scoped as "best score", no gamification smuggled back
  in despite XP/coins/Training being out of scope. Hit one real bug during this port: the quiz
  runner's very first draft called each question's `audio()` callback (which reaches into Web Audio)
  directly inside a lazy `useState` initializer, reasoning that avoiding a mount `useEffect` would
  dodge the `react-hooks/set-state-in-effect` rule the way earlier phases' `useSyncExternalStore`
  fixes did — but `useState` initializers run during SSR too, unlike effects, and `window`/
  `AudioContext` don't exist there, so `/theory-games/interval_ear` and `/theory-games/chord_ear`
  (the two quizzes with audio) 500'd on first request. Fixed by keeping question *generation* in the
  lazy initializer (pure, SSR-safe) but moving the audio *playback* into a real `useEffect` keyed on
  the question object — legitimate use of an effect (an external-system side effect, not a setState),
  so no lint conflict, and effects never run during SSR so the crash is gone. The route wrapper now
  passes `key={id}` to `TheoryGamePage` so switching quizzes remounts it fresh, which is what makes
  the lazy-initializer-based state reset (no mount effect for that part) correct in the first place —
  React's own documented pattern for "reset state when a prop changes." `npx tsc --noEmit`, `npm run
  lint`, and `npm run build` all clean (two new routes, `/theory-games` static and
  `/theory-games/[id]` dynamic, twelve total); verified via `curl` on the dev server that all five
  quiz ids return 200 (confirming the SSR fix, since the build step alone doesn't render dynamic
  routes with real params) and content matches, then rebuilt and re-verified all twelve routes on the
  Docker container. Root vanilla app untouched.

- **Song Editor added to the FSD/Next/RQ pilot.** Asked again what to take next; offered Song
  Editor, Training, or Listen & Make (flagged as the heaviest — audio/screen capture + analysis,
  suggested it be scoped separately rather than ported like the others) plus the option to stop —
  picked Song Editor. `views/editor.js` is a large view (metadata form, a paintable piano-roll
  canvas, backing/vocal audio-file attachment, a background picker, a separate vocal-melody layer
  with hum-to-capture transcription via the shared pitch tracker, and a full Lyrics & Karaoke panel
  with LRC import/export and tap-to-time word timing) — ported only the metadata form and the
  text-notation note entry (`parseMelody`'s `PITCH:beats` syntax, already used throughout the
  built-in library's own data), matching the scope the user picked from the offered preview.
  Everything past that — the canvas, audio attach, background, vocal layer/humming, lyrics/LRC — was
  dropped; a song made here plays and grades in Play exactly like a built-in one, it just has no
  backing audio, custom background, or singable lyrics, same as plenty of the built-in library
  already. New `entities/song/model/user-songs.ts`: a localStorage-backed CRUD store
  (`getUserSongs`/`getUserSong`/`saveUserSong`/`deleteUserSong`/`subscribeUserSongs`) with the same
  stable-reference-until-write caching as `player-settings.ts`'s `getHistory()`, deliberately kept
  separate from `catalog.ts` so every existing caller of `allSongs()`/`findSong()` (Home's "jump back
  in", Library's built-in grid) stays exactly as pure/SSR-safe as before — nothing about porting the
  Editor should make already-shipped pages need a hydration-safety pass. `entities/song/model/
  song-format.ts` gained `uid()` (`crypto.randomUUID()` — available in Node on the server too, so
  `newSong({id: uid()})` is safe to call from a Server Component, see below) and `GENRES`, both
  ported verbatim from `song-format.js`. `views/editor/ui/EditorPage.tsx` is the form (fully
  controlled, one `Song` object in state); `EditSongLoader.tsx` resolves an existing user song for
  `/editor/[id]` via `useSyncExternalStore` (same hydration-safety reasoning as Play/Karaoke's own
  song lookup, extended below) before handing off to `EditorPage`; `/editor` (new song) needs no such
  resolution since `newSong()` is pure. Library gained a "Your songs" section above the built-in
  grid (Edit/Delete on each card) and a "✎ New song" header link; `PlayPage`/`KaraokePage` now
  resolve `findSong(id) || useSyncExternalStore(subscribeUserSongs, () => getUserSong(id), () =>
  null)` instead of only the built-in catalog, so a saved user song actually opens in Play/Karaoke.
  Hit one real bug from the RSC/client-component boundary rather than hooks this time: an early draft
  exported a `blankSong()` helper from `EditorPage.tsx` (a `"use client"` file) and called it directly
  from the `app/editor/page.tsx` Server Component — Next.js refuses this at build time ("Attempted to
  call blankSong() from the server but blankSong is on the client"), since every export of a client
  module is part of the client boundary, not callable as a plain function from server code, only
  usable as a component or passed through props. Fixed by deleting that helper and having the Server
  Component call `newSong({id: uid()})` directly from `song-format.ts` (a plain, boundary-free
  module) instead, passing the resulting `Song` in as `EditorPage`'s `initial` prop — which also
  turned out better than the original plan, since the id is now generated once server-side per
  request and flows to the client through the already-serialized prop, rather than each generating
  its own random id. Added `/editor` to `PilotNav`. `npx tsc --noEmit`, `npm run lint`, and `npm run
  build` all clean (two new routes, `/editor` static and `/editor/[id]` dynamic, fourteen total);
  verified via `curl` that `/editor` and `/library` render expected content and that `/editor/<bogus
  id>` shows the "Song not found" fallback cleanly (200, not an error) rather than crashing — the
  full create → save → play → edit → delete flow needs real localStorage writes and client
  navigation that `curl` can't exercise and the browser extension still isn't connected this session,
  so that path is code-reviewed but not click-tested live, same disclosed gap as every other phase.
  Rebuilt and re-verified all fourteen routes on the Docker container. Root vanilla app untouched.

- **Training added to the FSD/Next/RQ pilot.** Asked again what to take next; offered Training or
  Listen & Make (flagged as the heaviest remaining item, suggested scoping it separately rather than
  porting it like the others) plus the option to stop — picked Training. Ported `views/training.js`
  and its data source `music/drills.js` (now `shared/lib/drills.ts` — `DRILLS`, `COURSES`,
  `buildDrillSong`, `getDrill`, ported verbatim: pure song-building logic reusing the same
  `newSong`/`scaleNotes`/`chordMidis` every other song does, so it lives in shared/lib rather than
  the view, same reasoning as `theory-games.ts` and `accompany.ts`). Checked every course step's
  `ref` against this pilot's 25-song built-in catalog before porting — all of them (`bi-twinkle`,
  `bi-3chord`, `bi-saints`, `bi-popprog`, `bi-auld`, `bi-amazing`, `bi-ode`, `bi-12bar`, `bi-rising`,
  plus the six drill ids) already exist there, so no course needed trimming for a missing song.
  `views/training/ui/TrainingPage.tsx` renders three course panels (progress bar, locked/done/
  available step list) and a drill grid (per-drill tempo slider, best score from history, "Start
  drill" building the song via `buildDrillSong` and saving it through the *same* `saveUserSong()`
  the Song Editor uses — Training and the Editor now share one user-song store, matching how the
  vanilla app's `Store.saveSong()` was always a single mechanism for both drill-generated and
  hand-authored songs — then routing to `/play/[id]`, which already resolves user songs via the
  `PlayPage` fallback the Editor phase added). The one thing genuinely dropped is the header's
  Level/XP stat pair — but confirmed first, by reading `views/training.js` closely, that step-lock/
  pass state itself (`bestFor(st.ref)?.passed`) was *never* computed from the vanilla app's
  `Store.progressFor()` XP object in the first place — it's derived straight from session history,
  the same way History and Home already read it in this pilot — so Training's actual gating logic
  needed no trimming at all, only its header stat row did (swapped for steps-passed/drills-tried/
  passes, all from history too). This also meant no new progress-tracking store was needed — unlike
  Theory Games' `theory-progress.ts`, Training doesn't touch localStorage for anything beyond the
  history and user-song stores that already existed. Added `/training` to `PilotNav`. `npx tsc
  --noEmit`, `npm run lint`, and `npm run build` all clean (one new static route, fifteen total);
  verified via `curl` that `/training` renders expected content (course titles, drill titles,
  "Steps passed") and that all other routes still serve correctly. Rebuilt and re-verified all
  fifteen routes on the Docker container. Root vanilla app untouched.

- **Listen & Make added to the FSD/Next/RQ pilot.** With Training done, only two vanilla views were
  left unaddressed: Listen & Make and Locker. Locker (cosmetics/coin economy) has been excluded on
  principle since the very first FSD/Next/RQ scoping conversation; asked once more whether to take
  Listen & Make (flagged up front as needing a scoped-down redesign, not a straight port, since its
  screen-capture half is a second unrelated feature) or stop — picked Listen & Make. Ported the
  microphone path of `views/listen.js` only: record with the mic (tempo slider + tap-tempo, borrowed
  straight from the vanilla source's own tap-tempo math), see a live note + level meter while
  recording, stop, and get a transcribed note count. `shared/lib/transcribe.ts`
  (`framesToNotes`/`quantizeNotes`) is `music/transcribe.js` ported verbatim — the same transcriber
  the vanilla Editor's hum-to-capture already uses internally there, though that specific Editor
  feature isn't ported in this pilot. Dropped: the `getDisplayMedia`-based screen-capture slideshow
  (a second, unrelated capture pipeline — periodic snapshots composited into a background), and the
  in-page difficulty-level (beginner/intermediate/advanced `simplify()`) and background pickers with
  their own Play/Save buttons. Redesigned the handoff deliberately instead of porting that in-page
  save UI: on stop, `/listen` builds the draft `Song` via `newSong()`/`uid()`, calls the *same*
  `saveUserSong()` the Editor and Training already use, and routes to `/editor/[id]` — reusing
  `EditSongLoader`'s existing client-only resolution instead of inventing any new state-handoff
  mechanism. This was a deliberate design choice made while reasoning about a hydration hazard
  spotted (but not fixed, see below) in Theory Games: the naive approach — stash a pending draft
  object somewhere and have `/editor`'s blank-song state check for it via a lazy `useState`
  initializer — would read non-deterministic client state during what is still an SSR-then-hydrate
  render for a hard page load, the exact shape of bug already living in `TheoryGamePage.tsx` (its
  first question is generated via `Math.random()` inside a lazy initializer, which runs during SSR
  too — server and client compute different questions, a hydration-mismatch warning + a one-time
  content flash on a hard refresh; not a crash like the earlier Web-Audio-in-an-initializer bug
  since no crash is thrown for merely-different text, but a real latent issue, left alone since it's
  a known, low-severity, industry-common "randomized content vs. SSR" tradeoff not worth
  scope-creeping into unrequested rework of a finished feature, and disclosed here rather than
  silently ignored). Listen & Make's handoff avoids the whole class of hazard instead: `saveUserSong`
  runs inside a click handler (never during any render, SSR or otherwise) and the subsequent
  navigation to `/editor/[id]` is a client-side transition with no SSR pass to mismatch against.
  `features/listen-record/model/useListenRecorder.ts` mirrors `useTunerEngine.ts`'s structure closely
  (mic lifecycle + a per-frame pitch-detect `requestAnimationFrame` loop updating live state) since
  it is, structurally, the same job. Added `/listen` to `PilotNav`. `npx tsc --noEmit`, `npm run
  lint`, and `npm run build` all clean (one new static route, sixteen total); verified via `curl`
  that `/listen` renders expected content ("Tap tempo", "Record") and that all other routes still
  serve correctly. Rebuilt and re-verified all sixteen routes on the Docker container. Root vanilla
  app untouched.

- **Sidebar app shell added to the FSD/Next/RQ pilot.** With every vanilla top-level view but Locker
  now ported, the user asked "дальше" once more; offered re-scoping Locker, fixing a previously
  disclosed hydration bug in Theory Games, calling the pilot done, or something else — picked
  "something else" with no detail, so asked directly what was in mind. User pointed out the vanilla
  app has a left sidebar and asked to analyze and fix the pilot's visual side. Read `index.html` and
  `styles/main.css`: the vanilla app's `#app` is a CSS grid (`248px 1fr`) — an `#sidebar` (brand mark,
  a grouped nav with `Play`/`Create`/`Grow`/`You`/`System` sections, an IO indicator footer) beside
  `#main` (a `#topbar` breadcrumb + coin chip + theme picker, then `#view`). This pilot had none of
  that structure — every page rendered its own small pill-style nav (`widgets/pilot-nav`) inline at
  its own top, added back in the very first Tuner-pilot phase and never revisited since. Built
  `widgets/app-shell/ui/AppShell.tsx`: a client component (needs `usePathname()`) mounted once in
  `app/layout.tsx` around `{children}`, rendering the same sidebar-grid structure — grouped nav
  (`Play`: Home/Songs/Karaoke/Tuner; `Create`: Song Editor/Listen & Make; `Grow`: Training/Theory
  Games/Glossary/Instruments/Progress; `System`: Settings), a brand block using the vanilla app's own
  logo (copied to `public/logo.svg`), and a topbar with a breadcrumb-style title derived from the
  route. Deliberately dropped from the port: the `You` nav group (its only entry is Locker, out of
  scope), the coin chip (same reason), and the live IO indicator (the vanilla footer shows real-time
  mic-live status; replicating that in a shell mounted on *every* page would mean either a
  global mic-permission-triggering query on pages that have nothing to do with audio, or faking it —
  neither felt right for what was asked, so it's left out; noted as a possible follow-up, not silently
  dropped). Play's and Karaoke's fullscreen stage (already full-bleed canvas UIs, per their own header
  comments) needed to keep the whole viewport exactly like the vanilla app's `#view.no-pad` +
  `#app:has(#view.no-pad)` CSS — done here as a route check instead of a CSS `:has()` trick (this
  tree doesn't have the same sibling relationship): `AppShell` renders bare `{children}` for
  `/play/*` and for `/karaoke/*` other than the picker route itself, skipping the sidebar/topbar
  grid entirely. Added the vanilla midnight theme's own color tokens (`--bg`/`--panel`/`--line`/
  `--text`/`--muted`/`--accent`/etc., from `styles/themes.css`) to `app/globals.css` for `AppShell`
  to use precisely — deliberately did *not* migrate every existing page's already-close hardcoded hex
  colors to these tokens in the same pass, since that's a separate, larger consistency refactor, not
  what was asked. Removed `<PilotNav active="..." />` and its import from all 14 view files that had
  it (mechanical, verified via `grep` before and after) and deleted `widgets/pilot-nav` entirely.
  Copied `icons/logo.svg` (819 bytes, already small) from the vanilla app root into `web/public/
  logo.svg` for the sidebar brand mark, reusing the exact same mark rather than drawing a new one.
  Hit one CSS syntax bug: an early draft of the new `globals.css` comment block contained a literal
  `*/` inside its prose ("the `--bg*/--panel*/--line`... tokens"), which Turbopack's CSS parser reads
  as closing the comment early regardless of context, breaking the build with a `Parsing CSS source
  code failed` error pointing mid-sentence; fixed by rewording the comment to avoid the sequence
  entirely (spelled out the token names with commas instead of `*/`-separated). `npx tsc --noEmit`,
  `npm run lint`, and `npm run build` all clean; verified via `curl` that every non-fullscreen route
  still returns 200 and that the sidebar (`GuitarPicker`, `learn · play · grow`, all 12 nav hrefs) and
  active-link highlighting (the `active` CSS-module class landing on exactly the current route's link)
  appear in the SSR HTML, and — the actual point of this change — that `/play/[id]` and
  `/karaoke/[id]`'s SSR HTML does *not* contain the sidebar tagline while `/karaoke` (the picker)
  does, confirming the fullscreen bypass matches the vanilla app's behavior. Rebuilt and re-verified
  all sixteen routes on the Docker container, including the sidebar's presence on `/library`. Root
  vanilla app untouched.

- **Sidebar IO indicator + Settings "Preview mix" added, both by explicit request.** Two follow-up
  asks landed close together: while the sidebar's IO indicator was mid-investigation, the user also
  asked, mid-turn, for a way to hear the combined effect of Settings' Sound & detection sliders while
  adjusting them. Handled both.
  IO indicator: read `src/audio/engine.js`'s `currentDevices()`/`onChange()`/`notify()` — input shows
  the live mic's track label when capturing, else empty (rendered as "no mic"); output shows the
  selected device's cached label, or "Selected output" if not yet cached, or "System default" if none
  chosen; a green glow on the input dot when the mic is actually live. Ported this shape into
  `shared/lib/audio-engine.ts`: added a `changeListeners` set + `notify()` (fired from `startMic`,
  `stopMic`, `setOutputDevice`, and `listDevices` once it refreshes the device-label cache), a
  `currentDevices()` returning a cached, stable-reference snapshot object (same
  stable-reference-until-write reasoning as `player-settings.ts`'s `historyCache` — required for
  `useSyncExternalStore`, which this is built for, not to loop), and `onChange()` to subscribe.
  `widgets/app-shell/ui/AppShell.tsx` reads it via `useSyncExternalStore(audioEngine.onChange,
  audioEngine.currentDevices, () => DEFAULT_CURRENT_DEVICES)` and renders the same two-row
  in/out + dot markup as the vanilla sidebar-foot, in the same footer slot. Importantly, this reads
  *existing* device/mic state only — mounting the shell never itself calls `enumerateDevices()` or
  requests mic permission; those only happen where they already did (Settings, Tuner, Play, Karaoke,
  Listen).
  Preview mix: `views/settings/ui/SettingsPage.tsx`'s Sound & detection panel gained a "▶ Preview
  mix" button — not present in the vanilla source, a genuinely new idea in response to "let me listen
  after combining all the other sliders, to actually adjust them." Rather than faking a full
  backing+vocal audio mix this pilot has no real audio for (songs here are synthesized, and the
  trimmed Song Editor doesn't support attaching audio files), it plays a sustained chord via
  `Synth.playMidi` at `gain: 0.85 * s.backingVolume` (standing in for "backing") plus a short
  three-note melodic phrase layered on top at `gain: 0.9 * s.vocalVolume` ("vocal"), both passed the
  current `s.a4` so the calibration slider is genuinely reflected too — drag a slider, click preview
  again, hear the difference. Note highway speed and the mic noise gate aren't audio-output settings
  (one's a visual/timing setting, the other gates mic *input*), so they have nothing to preview;
  said so directly in the panel's hint text rather than overclaiming the button reflects "all" the
  sliders.
  `npx tsc --noEmit`, `npm run lint`, and `npm run build` all clean; verified via `curl` that
  `/library`'s SSR HTML contains the sidebar's default "no mic"/"System default" text and that
  `/settings` contains "Preview mix" and the hint's "aren't audio-output settings" wording, and that
  every other route still serves correctly. Rebuilt and re-verified all sixteen routes, including
  both new pieces, on the Docker container. Root vanilla app untouched.

- **Full pilot audit, requested directly ("проанализируем все ли перенесли и все ли ок").** Went
  through the pilot systematically rather than just re-running the usual checks: diffed
  `src/views/*.js` against `web/src/views/*` (14 vanilla views vs. 13 pilot ones, the only gap
  Locker — confirmed, not a surprise); diffed `src/music/`, `src/audio/`, `src/karaoke/`,
  `src/learn/` against `shared/lib`/`entities` (every dependency any ported feature actually needs
  has a pilot counterpart — `daily.js`, `lrc.js`, `songs-extra.js`, all of `cosmetics/`, all of
  `cloud/merge.js`+`sync.js` confirmed correctly unported, matching what `web/README.md` already
  scopes out); grepped for stray `console.log`/`debugger`/`TODO`/`FIXME` in `web/src` (none); ran
  `npx tsc --noEmit`, `npm run lint`, `npm run build` fresh (all clean); confirmed `AppShell`'s nav
  list covers every non-dynamic route with none missing or extra; confirmed `widgets/
  cloud-account-badge` is genuinely unused (no imports outside its own folder), matching its
  documented status.
  Found and fixed the Theory Games hydration-mismatch bug that had been disclosed twice (during
  Listen & Make, and again while scoping the sidebar) but never fixed: `TheoryGamePage.tsx` generated
  its first question with `game.gen()` (uses `Math.random()`) inside a lazy `useState` initializer,
  which runs during SSR too, so server and client computed different questions. Fixed properly this
  time instead of just re-disclosing it: `question` now starts `null` (deterministic, identical on
  server and the client's first render) and is generated inside a `useEffect` instead — effects never
  run during SSR, so there's nothing left for the client to mismatch against. This effect does call
  `setQuestion()` directly, which `react-hooks/set-state-in-effect` flags by default (confirmed
  empirically — tried it once with no override and lint failed exactly as expected from the earlier
  encounters with this rule); overrode it with a single targeted `// eslint-disable-next-line
  react-hooks/set-state-in-effect` immediately above the `setQuestion()` call (not multiple lines
  above it — a first attempt at the disable comment placed it above a multi-line explanatory comment
  block instead of directly above the flagged line, which does nothing, since `eslint-disable-next-line`
  only covers the *one* line immediately following it; caught by re-running lint, not assumed to work)
  with a comment explaining why this specific case is the correct exception to the rule's own
  reasoning: `Math.random()` output isn't something render can reproduce deterministically across
  SSR and the client, which is exactly the class of case an effect (vs. a lazy initializer) is for.
  `npx tsc --noEmit`, `npm run lint`, and `npm run build` all clean; verified via `curl` that all five
  quiz routes still return 200 and that (after stripping React's hydration-boundary HTML comments,
  which had first made a naive `grep` miss it) the score row's "Question 1 / 8" still renders in the
  initial SSR HTML — only the question prompt itself now waits for the client effect, which is the
  intended tradeoff. Root vanilla app untouched; this whole entry, plus the two doc/comment fixes
  below, only touched `web/`, `docker-compose.yml`, `docs/DOCKER.md`, and the root `README.md`.
  Also fixed while auditing, unrelated to the bug: `docker-compose.yml`'s and `docs/DOCKER.md`'s
  comments both still called the pilot the "Tuner pilot," a name that stuck from the very first
  phase when Tuner was the only thing ported — updated both to just name the stack. And the root
  `README.md` never mentioned the pilot exists at all despite how much of it there now is — added a
  one-paragraph pointer to `web/README.md` under the existing "## Architecture" section, framed
  clearly as experimental and not the deployed app.
  One finding surfaced but deliberately **not** acted on: `git status` shows the entire `web/`
  directory as untracked (`?? web/`) — every phase of this pilot, across the whole conversation, has
  been sitting uncommitted. This is a real risk (a `git clean`, a disk issue, or any destructive
  operation could lose all of it) worth the user's attention, but committing is not something to do
  unilaterally — flagged to the user directly rather than acted on here.

- **Song Editor fully ported (no more trimming).** Asked directly, no scoping question this time:
  "Перенеси SongEditor полностью." Everything the first pass at this view had dropped — see that
  entry — is here now: the background picker, backing/vocal audio-file attachment, the click-to-
  paint piano roll, the vocal-melody layer (copy/octave-shift/hum-to-capture), and the full Lyrics
  & Karaoke panel (add/import/paste/export `.lrc`, tap-to-time). Three small pure-logic ports:
  `shared/lib/lrc.ts` (`parseLRC`/`parseLRCTime`/`toLRC`, from `music/lrc.js`, verbatim);
  `shared/lib/backgrounds.ts` gained `ANIMATED_BACKGROUNDS`/`SOLID_SWATCHES` (from
  `ui/backgrounds.js`); `shared/lib/dom.ts` gained `pickFile()` (from `ui/components.js`, an
  invisible `<input type=file>` that resolves the chosen file's text or `null`); `entities/song/
  model/song-format.ts` gained `serialize()` (`JSON.stringify(song, null, 2)`, for the Editor's
  own `⬆ Export`).
  `views/editor/ui/PianoRoll.tsx` is a new component — the vanilla piano roll's canvas code (grid
  of MIDI rows × beat columns, click an empty cell to add+preview a note via `Synth.playMidi`,
  click an existing one to delete it, dimmed non-active-layer notes drawn underneath the active
  layer's bright ones) ported as a plain React component that redraws in a `useEffect` whenever the
  song's notes/layer/bpm change, rather than a mounted imperative engine — unlike Play/Karaoke,
  there's no continuous game loop here, just "redraw when the data changes," which is exactly what
  an effect is for.
  Hum-to-capture reuses `features/listen-record/model/useListenRecorder.ts` as-is — a second
  instance of the same hook Listen & Make already uses, since "record mic audio, track pitch every
  frame, hand back the frame stream on stop" is identical to what hum-to-capture needs; the only
  new code is what happens with the frames afterward (`framesToNotes` → `song.voice.notes`, same as
  Listen & Make does for a whole song).
  Tap-to-time is new: `features/tap-lyrics/model/useTapToTime.ts`. The one design decision worth
  recording — its word queue, draft lyrics-with-words-being-built, and current position all live in
  refs, not `useState`, and only get mirrored into state for what's actually rendered (position
  number, elapsed clock, current/next word). The keydown (Space) handler calls `stamp()`, which
  reads and mutates those refs directly; if position/queue lived in state instead, `stamp` would
  need to be a fresh closure recreated every render to avoid stamping against a stale snapshot, which
  either means resubscribing the keydown listener on every keystroke-adjacent render (`stamp` in the
  effect's dep array) or accepting the stale-closure bug outright. Refs sidestep the whole problem:
  they're always current, exactly like `useTunerEngine.ts`'s `bufRef`/`trackerRef` already do for
  the same reason (a per-frame loop that must read fresh state without re-subscribing every render).
  `EditorPage.tsx` itself grew from ~160 lines to a full form: Details/Background/Audio
  tracks/Notes/Piano roll/Vocal melody/Lyrics & Karaoke, each section matching the vanilla view's
  own panel order. `editLayer` (Instrument vs. Vocal) is lifted to the page level, shared between
  `PianoRoll`'s own layer toggle and the Notation panel's "⇣ From roll"/"Apply notation" buttons —
  both need to know which layer is currently being edited, same as in the vanilla source.
  `npx tsc --noEmit` and `npm run lint` both passed clean on the very first attempt for every new
  file (no back-and-forth this phase, unlike the RSC/hydration bugs hit in earlier phases) — worth
  noting precisely because it's the exception, not because clean-on-first-try is itself notable.
  `npm run build` clean; verified via `curl` that `/editor`'s SSR HTML contains every new panel's
  heading ("Background", "Audio tracks", "Piano roll", "Vocal melody", "Lyrics & Karaoke") and that
  every other route, including `/editor/[id]` with a bogus id, still serves correctly. Rebuilt and
  re-verified all sixteen routes, confirming the new panel headings render there too, on the Docker
  container. Root vanilla app untouched — this entry only touched files under `web/`.
- **Song Editor split into tabs, requested directly.** The now-full Editor page (previous entry)
  had grown into one long stacked scroll of seven panels; asked by name to move "Vocal melody
  (Karaoke scoring)" and "Lyrics & Karaoke (optional)" into their own tabs. Added a `tab` state
  (`"song" | "vocal" | "lyrics"`) to `EditorPage.tsx` and a three-pill selector above the panels,
  reusing the same `.pillRow`/`.pill`/`.active` classes the Background type picker and
  `PianoRoll`'s own layer toggle already use elsewhere in this file, rather than inventing new tab
  CSS. Details/Background/Audio tracks/Notes/Piano roll stay together under the default "Song" tab
  — the user only named the other two sections, and those five belong together (Notes and Piano
  roll both edit the instrument/vocal note layers the other tab's "Copy from notes" reads from).
  No state moved — `song`, `notation`, `editLayer`, `hum`, `tap` are all still page-level, so
  switching tabs never loses in-progress edits on a hidden panel, it just stops rendering it.
  `npx tsc --noEmit` and `npm run lint` both clean. Verified via `curl` against a dev server that
  the default "Song" tab's SSR HTML contains "Piano roll" but not "Karaoke scoring)" or "Karaoke
  (optional)" (i.e. the other two tabs' panels genuinely don't render until selected, they're not
  just hidden with CSS) — then rebuilt the Docker container and re-confirmed the same on all
  sixteen routes there. Root vanilla app untouched — this entry only touched
  `web/src/views/editor/ui/EditorPage.tsx`.
- **Details/Background/Audio tracks collapsed by default in the Song Editor.** Asked directly to
  make those three panels (within the Song tab, previous entry) start collapsed. Switched them
  from `<section>` to native `<details>`/`<summary>` — the same disclosure element the Instruments
  page already uses for its per-instrument panels — rather than hand-rolling open/closed state:
  no JS needed, keyboard/screen-reader toggling comes free, and it matches an existing pattern
  instead of adding a second one. Left as plain `<section>`: Notes and Piano roll, since editing
  notes is the page's actual job and shouldn't need an extra click to reach. `EditorPage.module.css`
  gained a `.panel summary` rule (same 18px size as `.panel h2`, plus a ▸/▾ caret via `::before` that
  flips on `[open]`, and `::-webkit-details-marker { display: none }` to drop the native marker so
  only the custom caret shows). `npx tsc --noEmit`/`npm run lint`/`npm run build` all clean.
  Verified via `curl` against a dev server that the three `<details>` tags render with no `open`
  attribute (collapsed) while Notes/Piano roll's `<h2>` headings are unaffected: rebuilt the Docker
  container and reconfirmed the same, plus all sixteen routes still 200. Root vanilla app
  untouched — this entry only touched `web/src/views/editor/ui/EditorPage.tsx` and its CSS module.
- **Guitar tab input mode added to the Piano roll, requested directly with a Yousician screenshot
  as reference.** `PianoRoll.tsx` now has two views over the same `song.notes`/`song.voice.notes`
  data, toggled by a "View: Piano roll / Guitar tab" pill row (hidden entirely for non-fretted
  instruments — piano/voice/wind/bowed/percussion all carry `strings: []`): Guitar tab draws one
  horizontal lane per string (high string on top, low on bottom, matching printed tab, unlike the
  piano roll's pitch rows) with the fret number drawn on the note itself instead of encoded by
  vertical position. Click an empty lane to add an open-string note (fret 0) and hear it, click a
  placed note to remove it — same click-to-toggle interaction the piano roll already uses, so it
  didn't need new explanation — and (new, since tab needs a third editable dimension the piano
  roll doesn't) scroll the mouse wheel over a placed note to walk its fret up/down, clamped to the
  instrument's fret count.
  The one real design problem: a pitch alone doesn't uniquely determine a string — most notes are
  playable in more than one place on the neck (e.g. open D3 vs. the A string's 5th fret), and
  `entities/instrument`'s existing `midiToFret()` (built for Play's read-only fretboard display)
  always resolves that ambiguity the same way, lowest-fret-wins. Left as pitch-only, a tab note
  edited with the scroll wheel could silently jump to a different string the moment its fret
  crossed into another string's open pitch — wrong and disorienting for something the user placed
  by hand. Fixed by giving `Note` an optional `str?: number` (web/src/entities/song/model/
  song-format.ts) — set only by notes placed in Guitar tab mode, read only by this view's own
  draw/hit-test code (`tabStringFor()`, falling back to `midiToFret()` when absent, e.g. for notes
  that came from notation or the piano roll). Nothing else in the pilot — grading, playback,
  notation parsing, export — reads it, so it's a purely additive, backward-compatible field, the
  same pattern `chord`/`gain` already established on that interface.
  `npx tsc --noEmit` clean; `npm run lint` first flagged a real `react-hooks/exhaustive-deps`
  warning (the draw effect's `tabStringFor` closure and `inst?.frets` weren't in its dep array) —
  fixed by wrapping `tabStringFor` in `useCallback` and adding both to the array, rather than
  suppressing the warning, since both really do need to be current for a correct redraw. `npm run
  build` clean. Verified via `curl` against a dev server that `/editor`'s default song (acoustic
  guitar, fretted) renders the "Guitar tab" pill in the SSR HTML — deterministic from the initial
  `Song` object, no hydration risk, same reasoning as every other server-rendered pill in this
  pilot. Rebuilt the Docker container and reconfirmed the same, plus all sixteen routes still 200.
  Root vanilla app untouched — this entry only touched `web/src/views/editor/ui/PianoRoll.tsx`,
  `PianoRoll.module.css`, and `web/src/entities/song/model/song-format.ts`.
- **Guitar tab editor rewritten as its own component, from a 24-section brief modeled on
  Yousician.** The previous entry's tab mode (click to add/remove, wheel to re-fret, drawn inline
  in `PianoRoll.tsx`'s draw effect) was a first cut; asked directly for the real thing — a
  sequence-driven tab editor with per-note finger/color, drag, keyboard-first entry, undo/redo, and
  playback, with a full written spec (time → string → fret → duration → finger, a data model, a
  24-section UX walkthrough, an MVP list). Pulled that into a new `views/editor/ui/TabRoll.tsx` +
  `TabRoll.module.css` (PianoRoll.tsx now just toggles between its own roll canvas and `<TabRoll>`)
  since string+fret+finger with a stable per-note id is a different editing model from pitch rows,
  not another branch of the same draw routine.
  What's in, against the brief's own MVP list: the string-lane timeline with a bar ruler; note
  creation/selection via click; string+fret+time+duration, all editable through a right-hand
  Inspector panel (time/duration shown and edited in beats, matching the brief's examples); finger
  assignment with per-note color (a "Finger" pill row arms the color for newly created notes, the
  Inspector changes an existing note's); drag (time via X, string via Y — the brief's own rule that
  fret rides along unchanged on a string move, not recomputed from Y); Delete/Duplicate; local
  undo/redo (Ctrl/Cmd+Z, one stack per edited layer so switching Instrument/Vocal can't pop the
  wrong array); grid snapping (shared with the piano roll's own Snap control); **Sequential input**
  — the brief's headline workflow — toggle it on and typing digits 0-9 drops a fret on the armed
  string and auto-advances the cursor, so a line goes down without touching the mouse; a
  Play/Pause/Stop preview with a moving playhead; saving to JSON needed no new code, since `⬆
  Export`/autosave already just `JSON.stringify` the whole `Song`.
  Two real design problems, resolved rather than shipped as ambiguity:
  1. *A pitch alone doesn't determine a string* (same problem `Note.str` was added to solve last
     entry, now load-bearing for real) — dragging or wheel-adjusting a note by pitch alone could
     silently reassign it to a different string the moment its fret crossed into another string's
     open pitch. Every edit path here (drag, wheel, digit re-fret, Inspector) reads/writes through
     `Note.str` explicitly instead of re-deriving it from pitch each time.
  2. *The brief's own keyboard shortcuts conflict with each other* — §14 lists digits 1-4 as global
     "assign finger" hotkeys, while §16's sequential-entry workflow needs digits 0-9 to mean "place
     this fret," and §5 wants a selected note's fret quickly re-typable, all on the same keys. Since
     the brief itself doesn't resolve this, picked one deliberate priority order and documented it
     in the in-app hint text: a selected note re-frets on digit press (fastest path when inspecting
     one note); with nothing selected, Sequential input owns digits when it's on; otherwise digits
     1-4 (and T) arm a finger for notes created next. Also added `Note.id` (assigned lazily — only
     when a note is created or first clicked in this view, so notation/piano-roll notes don't carry
     it until touched here) since selection/drag/undo all need a stable identity beyond array index,
     and `Note.finger` (`1 | 2 | 3 | 4 | "T" | null`) for the color; both purely additive like `str`
     — nothing outside this file reads either.
  Explicitly trimmed, named in both this repo's docs and the in-app hint text so the gap is
  disclosed rather than silent: multi-select (shift/ctrl-click, marquee) and bulk edit; velocity;
  playing techniques (hammer-on/pull-off/slide/bend/vibrato/mute — the brief's own `technique`
  field idea); two-digit keyboard fret entry for frets 10+ (reachable via the Inspector, the wheel,
  or arrow-key nudging instead); a separate minimalist "Play mode" screen (folded into this same
  view's own Play/Pause/Stop instead); copy/paste beyond a single selected note (no clipboard
  across multiple notes). Playback here is a preview, not Play/Karaoke's sample-accurate
  AudioContext scheduler — `setTimeout`-scheduled one-shot `Synth.playMidi` calls against a
  `requestAnimationFrame` clock, which is the right amount of machinery for scrubbing through an
  edit, not a duplicate of the real engines.
  This project's lint config turned out to enforce React Compiler-era purity/ref rules stricter
  than the plain React docs: reading `ref.current` during render is a hard error here (not just
  inside effects), which broke both the "previous prop value in a ref" pattern used for the
  Instrument/Vocal layer-switch reset (fixed by moving it to `useState`, matching what the React
  docs actually recommend for that exact case) and reading the undo/redo stacks' `.length` for the
  toolbar buttons' `disabled=` (fixed by mirroring stack-non-emptiness into `undoAvailable`/
  `redoAvailable` state, updated from the event handlers that mutate the stacks). Also flagged
  `performance.now()` calls inside `play()`/`pause()` as impure — those two really are only ever
  invoked from a click or the Space-key shortcut, never render, so fixed with two narrowly-scoped
  `eslint-disable-next-line react-hooks/purity` comments (with a rationale comment above), the same
  precise-placement convention already established in this file's history for `set-state-in-effect`.
  `npx tsc --noEmit` clean. `npm run lint` caught all of the above for real on the first pass — genuine
  bugs, not noise, every one fixed rather than suppressed except the two performance.now() calls,
  which are suppressed with a stated reason. `npm run build` clean. Verified via `curl` against a
  dev server and the rebuilt Docker container that `/editor` and all sixteen routes still serve
  correctly (a stray dev server left running from the previous phase had to be killed off port 3100
  first — confirmed via a fresh `next dev` start with a clean log before trusting the result).
  Interactive behavior itself (drag feel, keyboard shortcuts, the playhead) is unverified beyond
  code review — no live browser is available in this session (claude-in-chrome not connected), so
  this entry leans more than most on careful reading of the pointer/keyboard event logic rather than
  hands-on testing; disclosed here as it has been every other time this limitation applied. Root
  vanilla app untouched — this entry touched `web/src/views/editor/ui/PianoRoll.tsx` (trimmed back
  down), `web/src/views/editor/ui/TabRoll.tsx` and `TabRoll.module.css` (new), and
  `web/src/entities/song/model/song-format.ts` (`Note.id`/`Note.finger`).
- **MusicXML import/export added, plus an ASCII Tab export and a Quick entry text notation —
  keeping .gpsong.json as-is, per request.** Asked directly to add formats on top of the existing
  JSON export, with a specific brief citing MusicXML as "the industry standard" (it's the one open
  format that actually defines `<technical><string>/<fret>` for tab — confirmed against the W3C
  spec) and naming MusicXML as the default, ASCII Tab for quick text sharing, and a compact
  `string:fret:beats` quick-entry notation the brief itself sketched an example of.
  New files: `shared/lib/musicxml.ts` (`songToMusicXML`/`musicXMLToSong`), `shared/lib/ascii-tab.ts`
  (`songToAsciiTab`, export-only — the brief's own MusicXML/ASCII comparison says why: ASCII can't
  represent rhythm/chords precisely enough to round-trip reliably), and `shared/lib/tab-entry.ts`
  (`parseTabEntry`/`tabEntryFromNotes`, string numbers 1-indexed from the highest string, matching
  both the brief's own example and `stringLabel()`'s existing "numbers" convention). `TabRoll.tsx`
  gained a Quick entry row (mirrors `EditorPage`'s own Notes notation panel: Apply replaces the
  whole layer, "⇣ From tab" reads it back as text). `EditorPage`'s header gained an Import button
  and a format `<select>` (MusicXML default, GuitarPicker JSON, ASCII Tab — the last one hidden for
  non-fretted instruments, same `tabAvailable` gating TabRoll already uses); Export now branches on
  the selected format instead of always writing `.gpsong.json`.
  The MusicXML exporter is a pragmatic single-voice one, not a fully spec-complete engine — its own
  header comment lists the simplifications, all deliberate: assumes 4/4 throughout (this app has no
  time-signature field anywhere else), flattens every Note (a chord's `midi[]` included) into
  per-pitch events and regroups same-onset events into MusicXML chords via `<chord/>`, fills silent
  gaps with `<rest>` (required — MusicXML's timeline must stay contiguous), and doesn't tie a note
  across a barline if its duration overruns one (the note's own `<duration>` stays correct for
  playback; only the measure-numbering bookkeeping drifts slightly, a plain-XML detail most readers
  tolerate). Only the instrument layer exports — not the vocal melody, which doesn't map cleanly
  onto MusicXML's per-part model and isn't really what "share the guitar part" implies.
  The importer deliberately does NOT read a file's own `<technical><string>/<fret>` back — only
  `<pitch>` (reconstructed via the existing `nameToMidi()` from a `step`+`alter`+`octave` triple,
  same idea as `midiToName()`'s reverse), `<duration>`/`<chord>`/`<rest>`/`<forward>`/`<backup>`
  (normalized to quarter-note units per-measure using that measure's own `<divisions>`, so a
  divisions change mid-file can't desync the timeline), and `<fingering>`. Trusting a file's own
  tuning for string/fret could put a note on a string that doesn't exist on whatever instrument is
  *currently* selected in the editor if the two don't match; recomputing string/fret live against
  the current instrument (the same `str`-or-`midiToFret()` fallback every other note source already
  uses) sidesteps the whole mismatch class instead of trying to reconcile it.
  Verified beyond the usual tsc/lint/build/curl chain, since this is genuinely new parsing/
  generation logic with no UI to click through in this no-browser session: wrote a standalone
  round-trip test (`tsx`, with a transient `npm install --no-save jsdom` for a `DOMParser`
  polyfill — removed afterward, `package.json`/`package-lock.json` untouched throughout) exporting
  a hand-built song (single notes, a 3-note chord, a timing gap, both numeric and thumb fingers) to
  MusicXML and reimporting it: pitch sets, onset times, tempo, key, and `Note.finger` all round-trip
  correctly; caught and fixed one real test bug along the way (comparing chord members by array
  index instead of as an unordered pitch set — the export legitimately re-sorts a chord's pitches
  ascending, which isn't a bug). Also verified ASCII Tab's line format and Quick entry's parse/
  round-trip/error-on-bad-string-number behavior in the same script. `npx tsc --noEmit`, `npm run
  lint`, and `npm run build` all clean. Rebuilt the Docker container and reconfirmed all sixteen
  routes still 200, plus that `/editor`'s SSR HTML lists all three export formats. Root vanilla app
  untouched — this entry touched `web/src/shared/lib/musicxml.ts`, `ascii-tab.ts`, `tab-entry.ts`
  (new), `web/src/views/editor/ui/EditorPage.tsx`/`.module.css`, and `TabRoll.tsx`/`.module.css`.
- **TabRoll playback preview gained a Speed control; ASCII Tab gained a second, paste-dialog import
  path — two follow-up requests, the second arriving mid-turn on the first.** "Добавь на
  проигрывателе скорость" landed right after the MusicXML/ASCII/Quick-entry entry above, with no
  view named — read as TabRoll's own Play/Pause/Stop preview (the newest, most contextually-recent
  "player"), since Play's and Karaoke's engines already both have their own independent Speed
  sliders (`createPlayEngine.ts`/`createKaraokeEngine.ts`, ~0.25-1.25x, ported early in this pilot —
  see the "FSD/Next/RQ pilot" entries near the top of this changelog) and weren't what had just been
  discussed. Added a 0.5x-2x range slider (wider than Play/Karaoke's, since this is a scrub/preview
  tool rather than a practice-pacing one, and the request explicitly wanted both directions —
  "ускорить или замедлить"): `play()`'s scheduled-note delays and each `Synth.playMidi` call's own
  `dur` both divide by the rate, and the rAF playhead clock multiplies elapsed real time by it.
  Dragging the slider mid-playback restarts the scheduled timers from the current position at the
  new rate (`currentBeat()` reads the running session's own stored rate, not the latest state, so a
  live rate change can't retroactively warp an already-elapsed span) rather than requiring Stop
  first — small enough to include since `play()` already took an explicit rate parameter for this.
  While mid-edit, a second message arrived: "Еще добавь второй вид импорта с диалоговым окном"
  with the exact `e|--5--0--5--0--5--4--4--|`-style block pasted as the target format — a second
  ASCII Tab import path, via a dialog, distinct from the header's file-based Import (which already
  covers MusicXML/JSON). Un-did the previous entry's "export only" call for ASCII Tab: added
  `asciiTabToNotes()` to `shared/lib/ascii-tab.ts` and a "📋 Paste ASCII tab" button in TabRoll next
  to Quick entry, using the same `window.prompt()` dialog pattern `EditorPage`'s own "Paste LRC"
  button already established (so no new modal component needed). Parser design: trusts each line's
  *position* (top = highest string, same as this app's own exporter and universal real-world
  convention) rather than trying to robustly parse the label text on the left of each line, which
  varies a lot across real-world pasted tabs; a digit run's column becomes its beat position (this
  app's own 1/16-beat-per-column convention), and duration is inferred as "rings until the next
  fret number on any string" since ASCII tab genuinely doesn't encode rhythm (the previous entry's
  own MusicXML-vs-ASCII research already said so) — quantifiably confirmed while testing: the
  user's own pasted example spaces its digits 3 columns apart, not this app's own exporter's 4, so
  reading position literally (not assuming a fixed beat grid) is the only fallback that's ever
  going to work on tabs typed by hand.
  `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Wrote a second standalone `tsx`
  script (no jsdom needed this time — pure string parsing, no DOMParser) verifying `asciiTabToNotes`
  against the user's own exact pasted example (line-order → string index, fret sequence, consistent
  inter-note spacing) plus a self round-trip through `songToAsciiTab` and two error paths (wrong
  string-line count, no fret numbers found); caught one real test-assumption bug of its own along
  the way (assumed the pasted example used this app's 4-columns-per-beat convention — it doesn't,
  3 columns — not a code bug, just confirmation that literal column-reading was the right call).
  Speed control itself has no equivalent automated check — it's real-time scheduling behavior
  (setTimeout/rAF/Web Audio), so verified by reading the delay/duration math rather than running it;
  disclosed same as every other no-browser-available limitation this session. Rebuilt the Docker
  container and reconfirmed all sixteen routes still 200. Root vanilla app untouched — this entry
  touched `web/src/shared/lib/ascii-tab.ts` and `web/src/views/editor/ui/TabRoll.tsx`/`.module.css`.
- **Finger-color legend added to the topbar, from a reference glove image and an explicit color
  list.** Asked for a hand icon "справа на панели навигации" (on the right of the nav panel) that
  opens a modal explaining what's what when clicked, with a screenshot of Yousician's own colored
  note pills and a second image — a glove with four colored fingers plus a plain-white thumb — as
  the reference, and the exact mapping spelled out: thumb white/no color, index yellow/mustard,
  middle purple, ring light blue ("голубой", not "синий"), pinky orange-red/terracotta.
  "Right of the nav panel" read as the topbar's already-empty right side — `AppShell.module.css`'s
  `.topbar` was already `justify-content: space-between` with only the crumb on the left, clearly
  left room for exactly this. New `widgets/app-shell/ui/FingerLegend.tsx`: a small hand-icon button
  there opens a centered modal (this pilot's first — no prior modal pattern existed to match, so it
  got a plain dark backdrop + panel in the existing `--panel`/`--line`/`--text` token language,
  closed by the ✕ button, clicking the backdrop, or Escape) listing each finger's name next to a
  color swatch.
  Didn't use the reference glove image itself as the icon: it came back as a flat JPEG (viewed via
  the Read tool to confirm) with a "transparent background" checkerboard baked into its actual
  pixels — JPEG has no real alpha channel, so whatever generated it flattened the transparency
  indicator onto the image — which would render as a broken-looking checkered square at icon size,
  not a clean hand. Built a small inline SVG instead: a palm plus five capsule-shaped fingers (reusing
  the same rounded-rect/stadium shape this app's canvas code already draws notes with), positioned
  and colored to match the reference's layout and exact colors, crisp at any size, no image asset
  or `public/` file needed.
  The four numbered fingers' colors also changed for real, not just in a new legend: TabRoll's own
  `FINGER_COLOR` (arbitrary placeholder colors from when Finger support was first added — see the
  "Guitar tab editor rewritten..." entry) is retired in favor of a new shared/lib/finger-colors.ts
  exporting `FINGER_DEFS` (id + name + the actual requested color) and a `fingerColor()` helper —
  one source of truth both `TabRoll.tsx` (coloring notes) and `FingerLegend.tsx` (the modal's swatch
  list and the hand icon itself) read from, so they can't drift apart the way two hand-copied color
  maps eventually would.
  `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Verified via `curl` against a dev
  server that every non-fullscreen route's SSR HTML includes the new button (`aria-label="Finger
  color legend"`) and that `/play/[id]` (fullscreen, bypasses AppShell entirely) correctly doesn't;
  the modal itself (open/close, click-outside, Escape) is unverified interactively — no browser
  available this session, same disclosed limitation as this pilot's other interactive UI this
  session (TabRoll's drag/keyboard shortcuts, the Speed slider). Rebuilt the Docker container and
  reconfirmed all sixteen routes still 200 with the button present. Root vanilla app untouched —
  this entry touched `web/src/shared/lib/finger-colors.ts` (new), `web/src/widgets/app-shell/ui/
  FingerLegend.tsx`/`.module.css` (new), `AppShell.tsx` (topbar), and `TabRoll.tsx` (now imports
  `fingerColor()` instead of defining its own).
- **FingerLegend also added inside the Guitar tab editor itself.** "Его добавляем в гитар таб" —
  the topbar's hand icon (previous entry) is global, but finger colors only actually mean anything
  while using TabRoll, so it's also rendered right in TabRoll's own toolbar, next to the Finger pill
  row it's a legend for. No new component needed — `FingerLegend` was already self-contained
  (owns its own `open` state), so `TabRoll.tsx` just imports it from `widgets/app-shell/ui/
  FingerLegend.tsx` and renders a second instance; `views` importing from `widgets` is the normal
  FSD dependency direction (widgets sit below views), so no layering violation. Two independent
  instances on one page work fine — each has its own `open` state, nothing shared/singleton about it.
- **Guitar tab's scroll-to-change-fret was leaking the wheel event to the page's own scroll —
  fixed.** "Если навожусь на ноту и кручу колесико работает основной скрол" — scrolling over a note
  to bump its fret also scrolled the whole page underneath the editor. Root cause: the wheel handler
  was wired through React's `onWheel` prop, and React attaches that listener at the root as
  *passive* for scroll performance — a passive listener's `preventDefault()` is silently ignored by
  the browser (no error, it just doesn't work), so the page scrolled regardless of the `if (idx < 0)
  return` early-out ever being hit. Fixed by attaching a real native `wheel` listener straight to
  the canvas DOM node via `canvas.addEventListener("wheel", handler, { passive: false })` inside a
  `useEffect` instead — the only way `preventDefault()` actually sticks for wheel events. Went a
  bit further than a literal note-only fix, matching the broader ask ("чтоб основной скрол не
  прокручивался когда я внутри редактирвоания гитар нот"): any predominantly-*vertical* wheel
  motion over the canvas is now captured and blocked from reaching the page regardless of whether
  it lands on a note (mouse wheels only produce vertical delta, so this covers "scrolling around
  inside the editor" generally, not just the exact pixel of a note) — a predominantly-*horizontal*
  gesture (trackpad swipe, shift+wheel) is deliberately left alone so it can still pan the
  timeline via the scroller's own `overflow-x`, comparing `Math.abs(deltaX)` vs `Math.abs(deltaY)`
  per event to tell the two apart.
  Moving the handler out of JSX meant it needed real dependencies in an array for the first time;
  `commit`/`pushUndoPoint`/`posFromEvent` (previously plain functions redefined every render, fine
  when only called directly from other handlers) were converted to `useCallback` so the effect's
  dependency array could name them without either lying (omitting real dependencies) or
  re-subscribing on every render. Incidental fallout, confirmed by re-running lint rather than
  assumed: this also made the React Compiler's purity checker stop flagging two `performance.now()`
  calls in `play()`/`pause()` as impure (added back in the Speed-control entry, with `eslint-disable
  -next-line` comments at the time) — both disables are now reported as unused and were removed
  rather than left stale.
  `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Verified via `curl` against a dev
  server and the rebuilt Docker container that all sixteen routes still 200 — the fix itself is
  event-handler timing/scroll behavior with no automatable check available and no browser in this
  session to click-test by hand, so it's verified by re-reading the passive-listener mechanics
  rather than by observing it work; disclosed same as every other interactive-behavior limitation
  this session. Root vanilla app untouched — this entry only touched
  `web/src/views/editor/ui/TabRoll.tsx`.
- **Second Play engine added — Performance Mode, a guitar-tab note highway synced to audio
  playback, selectable in Settings.** "Теперь сделай по аналогии — второй вариант плеер в
  проигрывателе," with a 26-section Yousician-modeled brief (top bar, a note highway scrolling
  right-to-left past a fixed playhead, string lanes + fret + finger colors, chord grouping, audio-
  position-driven sync, speed/loop/seek/fullscreen, a `NotePerformanceResult` interface reserved
  for future mic/MIDI grading, an MVP list and an explicit stage-2 list) — and, same turn: "в
  настройках выбираем какой редактор открывать старый или новый - по умолчанию поставь новый, но
  старый копируем и пока не удаляем" (a Settings toggle for old/new, new by default, old kept
  around rather than deleted).
  New `features/play-song/model/createPerformanceEngine.ts` (~400 lines) alongside the untouched
  `createPlayEngine.ts` ("classic," not renamed or moved) — same imperative-engine shape as both
  existing engines (own DOM/canvas/rAF loop; React just owns the mount point), for the same reason
  stated consistently across this pilot: a continuous real-time loop belongs in a mounted engine,
  not a plain-React canvas like TabRoll's. `shared/lib/player-settings.ts` gained `playerVersion:
  "new" | "classic"` (default `"new"`); `views/play/ui/PlayPage.tsx` picks the factory function
  based on it, and always falls back to classic for non-fretted instruments regardless of the
  setting (Performance Mode's whole model is string+fret, same `tabAvailable`-style gating the
  Song Editor's own Piano roll/Guitar tab toggle already uses) — checked via `pickPart()` +
  `INSTRUMENTS[...].strings.length`, the same lookup TabRoll/PianoRoll do. Settings gained a "Song
  player" `<select>` next to Default instrument.
  Leaned hard on reuse rather than building from scratch, which is most of why this came in at
  ~400 lines instead of matching the classic engine's ~780:
  - `shared/lib/track-player.ts`'s `TrackPlayer` (already built, already handles backing/vocal
    audio playback with `preservesPitch` speed control) — its own audio element's `currentTime` is
    used directly as the position clock when a song has real audio, satisfying the brief's "audio
    position is the source of truth" requirement for free; a small `AudioContext.currentTime`-based
    clock is the fallback for the (common) case of a pure-synth song with no attached audio file —
    most of the built-in catalog.
  - `shared/lib/practice-timeline.ts`'s `createTimeline()` (click-to-seek, drag-to-select-a-range)
    is reused verbatim for both seeking and the loop region — no new seek-bar code at all; its
    `onSelect(a,b)` callback *is* "define a loop," `onSeek(t)` *is* "jump here."
    Section 19's "Return to Live" doesn't apply to this design — the highway's motion is driven
    entirely by playback position, there's no independent manual-scroll state to reconcile, so it
    was dropped as inapplicable rather than trimmed.
  - `shared/lib/finger-colors.ts`'s `fingerColor()` — the exact same colors TabRoll paints notes
    with, so a song's fingering (however much of it exists — most current content has none, having
    been authored via notation or the piano roll rather than the Guitar tab view) shows identically
    in both places.
  - `Synth.click()` (already existed, unused until now) for the metronome, instead of faking a
    click out of a note voice.
  Explicitly scoped to the brief's own MVP list (§26): audio playback, synced timeline, string
  lanes, moving notes, playhead, fret + finger colors, active-note highlight, chord grouping
  (same-onset notes get a shared translucent background band instead of reading as unrelated),
  duration, play/pause, seek, current time, fullscreen (the Fullscreen API, on top of `/play/*`
  already bypassing AppShell), speed, loop. The brief's own stage-2 list (mic/MIDI input, hit/
  miss, score, streak) is NOT implemented, exactly as the brief itself scopes it two stages —
  only the `NotePerformanceResult` interface it explicitly asks for exists, typed and unused.
  Also cut: song sections (Intro/Verse/Chorus — no data model or authoring UI for this exists
  anywhere in the pilot; adding it would be a separate-sized task, not a subsection of this one)
  and the strum-direction arrows (§11). Deliberately does NOT call `addHistory()` — the classic
  engine does, but this engine has no real performance data to report, and a fabricated "100%
  accuracy" entry for a song the user only watched play would corrupt History's and Training's
  real derived progress state, which both depend on genuine pass/fail.
  Caught two real bugs in self-review before calling this done (no browser available to click-test
  interactively, so this file leaned more than most on careful re-reading): the Space-key play/
  pause guard originally checked `document.activeElement === document.body`, which silently breaks
  the shortcut after the very first button click (focus moves to whatever was clicked) — replaced
  with the classic engine's own already-proven `e.code === "Space" && !target?.closest("input,
  select,textarea,button")` pattern instead of inventing a new one; and the highway's lane height
  was capped at a fixed 46px regardless of available space (`Math.min(46, H/rows)`), leaving a dead
  gap on typical widescreen windows where height comfortably exceeds `rows*46` — changed to
  `Math.max(36, Math.min(90, H/rows))` so it fills the available height within sane bounds instead.
  `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean — notably with zero purity/ref
  friction this time, since this file (like the classic engine) is a plain TypeScript module, not
  a `"use client"` React component, so the React Compiler lint rules that repeatedly needed
  targeted fixes in TabRoll/PianoRoll simply don't apply here. Verified the actual note-highway
  logic against real data with a standalone `tsx` script (no jsdom needed, no DOM involved) that
  ran the exact same flatten-notes-to-string/fret/finger logic as the engine against the built-in
  "Twinkle, Twinkle, Little Star" song (`bi-twinkle`, resolved via the real `findSong`/`pickPart`):
  confirmed every flattened note's time falls within the song's duration, every resolved string
  index and fret is in range for the instrument, and the visible-window culling logic returns
  notes near the start/end of playback and nothing far outside it. Verified via `curl` against a
  dev server and the rebuilt Docker container that `/play/bi-twinkle` (a real fretted song, so the
  new engine actually mounts under the default setting) and all other fifteen routes serve
  correctly, and that Settings' SSR HTML lists the new "Song player" control. The engine's own
  interactive behavior — the canvas animation, audio scheduling/sync, drag-to-loop, fullscreen —
  is unverified beyond code review and the logic script above; no live browser this session, same
  disclosed limitation as this pilot's other real-time interactive features (TabRoll's drag/
  keyboard shortcuts, its Speed slider, the wheel-scroll fix). Root vanilla app untouched — this
  entry touched `web/src/features/play-song/model/createPerformanceEngine.ts` (new),
  `web/src/shared/lib/player-settings.ts` (`playerVersion`), `web/src/views/play/ui/PlayPage.tsx`
  (engine selection), `web/src/views/settings/ui/SettingsPage.tsx` (the new control), and
  `web/src/app/play-engine.css` (`.perf-canvas`).
- **Performance Mode's string lanes were pinned to the top of the canvas, under the HUD overlay —
  centered instead.** "Сделай чтоб сами струны на этом были по центру. А то сейчас прижаты к верху
  и перекрываются другими штуками." Root cause: `draw()` (previous entry) laid the lane block out
  starting at `y = 0`, so on any canvas taller than `rows * laneH` the lanes stayed jammed against
  the top — right under `.play-hud`, the absolutely-positioned overlay (`top: 14px`) carrying the
  Back button, song title, time, and Fullscreen button, so the first string or two rendered
  partially behind it.
  Added `TOP_HUD_RESERVE = 76` (roughly the HUD's own height) and a `yOffset` that reserves that
  band at the top, then centers the lane block in whatever's left (`avail = H - TOP_HUD_RESERVE`;
  `yOffset = TOP_HUD_RESERVE + max(0, (avail - laneBlockH) / 2)`) — every lane line, note, chord-tie
  band, and string label now draws at `yOffset + row * laneH` instead of `row * laneH`; the playhead
  line is drawn only across the lane block's own span (`yOffset` to `yOffset + laneBlockH`) rather
  than the full canvas height, so it doesn't uselessly poke up into the reserved HUD band either.
  The gutter's background column still fills the full canvas height (just a solid color, no content
  to misplace there). Checked the arithmetic by hand across a few plausible canvas heights (a
  typical ~900px-tall window centers the lane block with real top/bottom breathing room; a short
  ~400px one uses the space edge-to-edge with no room to spare, which is correct — nothing to
  center when there's no slack) rather than by rendering it, same disclosed limitation as this
  engine's other layout work. `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean.
  Verified via `curl` against a dev server and the rebuilt Docker container that all thirteen
  routes including `/play/bi-twinkle` still serve correctly. The visual result itself — whether the
  lanes now actually clear the HUD on a real screen — is unverified beyond this arithmetic check;
  no live browser this session. Root vanilla app untouched — this entry only touched
  `web/src/features/play-song/model/createPerformanceEngine.ts`.
- **Performance Mode's string lanes now look like real guitar strings — thickness and color, not
  flat UI rules.** With a Yousician screenshot as reference: "толщину струн сделай и цвета как
  реальные струны... нижняя толстая и 3 нижние струны ближе к желтому обычно или медному цвету,
  верхние чуть тоньше и белого/серого цвета... тоесть будто реальная гитара." Added `stringColor()`/
  `stringThickness()` — a single gradient across string index (0 = lowest/thickest/wound) rather
  than a hard split at "the bottom 3," so the same code generalizes correctly to any string count
  (checked against a 4-string bass, not just 6-string guitar): copper `rgb(192,138,78)` at the low
  end fading to near-white silver `rgb(226,230,238)` at the high end, line width 5px down to 1.8px.
  Each lane draws twice — the full-width colored line at its real thickness, then a thin
  `rgba(255,255,255,0.35)` line on top at ~35% of that thickness — a cheap "metal sheen" pass so a
  flat solid color doesn't read as a UI divider; `lineCap: "round"` on both so the ends look like
  actual string, not a ruled line.
  Deliberately scoped to the lane lines themselves — the note pills stay colored by finger (that's
  the existing, separate, already-requested color system; conflating the two would make it unclear
  which color means what). `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Verified
  the gradient math with a standalone Node script (plain arithmetic, no imports, no DOM needed):
  confirmed the low string is the thickest (5px) and warmest (lowest blue channel), the high string
  is the thinnest (1.8px) and near-neutral, thickness strictly decreases string-by-string, and the
  same endpoints hold for a 4-string instrument — the actual visual result (does it look like a
  guitar on screen) is unverified beyond that, no live browser this session. Rebuilt the Docker
  container and reconfirmed all thirteen routes still 200. Root vanilla app untouched — this entry
  only touched `web/src/features/play-song/model/createPerformanceEngine.ts`.
- **"Edit" button added to Performance Mode — opens the song as an independent draft.** "Возможность
  перейти в трек и отредактировать, но отредактированный тогда хранится как черновик отдельно
  (например если я хочу взять и чуть поменять или обозначить и поменять пальцы)." The wrinkle this
  raises that the earlier player entries hadn't touched: most songs playable here are built-in
  catalog data — pure, static, SSR-safe, with no save path at all (`saveUserSong` only ever writes
  to the localStorage user-song store) — so "edit this" can't mean "edit it in place" the way it
  does for an already-user-made song.
  New `cloneSongAsDraft()` in `entities/song/model/user-songs.ts`: given any song (built-in or
  user), returns a copy with a fresh `id` (so saving changes can never touch the original) and a
  "(draft)" suffix on the title (so it's obviously a copy in Library/History, not the original
  track) — guards against stacking "(draft) (draft)" if a draft is ever re-cloned. Pure; doesn't
  save anything itself. `EngineHost` (shared/lib/player-settings.ts) gained an optional `onEdit`;
  `PlayPage.tsx` supplies it, branching on whether the resolved song came from `findSong()`
  (built-in) or `getUserSong()` (already a user song): built-in → clone, `saveUserSong()` the
  clone, navigate to `/editor/<newId>`; already a user song → navigate straight to
  `/editor/<sameId>`, ordinary edit-in-place, nothing new needed there. Only
  `createPerformanceEngine.ts` renders the button (a "✏️ Edit" ghost button in the HUD, next to
  Fullscreen) — `onEdit` is optional specifically so the classic engine, deliberately untouched,
  doesn't need to know this exists.
  `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Verified `cloneSongAsDraft()` with
  a standalone script against the real built-in catalog (`findSong("bi-twinkle")`): the draft gets
  a distinct id and a correctly-suffixed title, all song data carries over, the original catalog
  entry is provably untouched by the clone (re-fetched and re-checked after cloning), re-cloning an
  already-suffixed draft doesn't stack a second "(draft)", and the same holds for a plain
  `newSong()`-built user song. Rebuilt the Docker container and reconfirmed all thirteen routes
  still 200. The button itself — does clicking it actually land you in the Editor with the right
  data — is unverified beyond that logic check and reading the navigation code; no live browser
  this session. Root vanilla app untouched — this entry touched
  `web/src/entities/song/model/user-songs.ts` (`cloneSongAsDraft`),
  `web/src/shared/lib/player-settings.ts` (`EngineHost.onEdit`), `web/src/views/play/ui/
  PlayPage.tsx` (wiring), and `web/src/features/play-song/model/createPerformanceEngine.ts` (the
  button).
- **`cloneSongAsDraft()` switched from a shallow copy to a real deep clone, after the user hit
  "This page couldn't load" opening a freshly-cloned draft.** Couldn't reproduce the exact failure
  (no live browser this session, and the reported URL — `/editor/<uuid>` — served 200 with correct
  content when re-fetched, so it wasn't a route-level crash; "page couldn't load, reload to try
  again" also matches, plausibly, an ordinary stale-chunk hiccup from this server having been
  rebuilt several times in quick succession right around when the button would have been clicked —
  a reload/fresh load should already clear that on its own). Audited the previous entry's
  `cloneSongAsDraft()` anyway and found a real, independent bug worth fixing regardless: it did
  `{ ...song, id, title }`, a *shallow* copy — `notes`, `lyrics`, `background`, `audio`, `voice`
  all stayed the *same* array/object references as whatever `song` was passed in. For a built-in,
  that source object ultimately traces back to the module-level `SONGS` constant — a singleton
  shared by every request this server process ever handles — so if anything, anywhere, ever
  mutated one of those nested values in place instead of replacing it, editing a draft could have
  corrupted the built-in catalog itself for every other user/session until the process restarted.
  (`allSongs()`/`findSong()` do their own `{...s}` shallow copy already, which limits the blast
  radius to nested fields, but doesn't close it — same class of bug either layer.) Switched to
  `JSON.parse(JSON.stringify(song))` before setting the new id/title — the same round-trip
  `serialize()` already treats a `Song` as (plain JSON data throughout this pilot), so no new
  assumption introduced.
  Verified two things with a standalone script against the real catalog: (1) `cloneSongAsDraft()`
  run against all 25 built-in songs produces a structurally complete Song every time (instrument/
  bpm/capo/key/difficulty/genre/tags/background/audio/voice/lyrics/notes/parts all present and
  correctly typed, `songDuration()` doesn't throw, every note has valid midi/time/dur) — so a
  missing-field crash in EditorPage wasn't the cause either, since `songs-data.ts` already wraps
  every built-in in `newSong()`, which backfills all of that regardless of which clone strategy is
  used; (2) mutating a cloned draft's `notes` array no longer touches the original song's array —
  confirming the deep clone actually closed the shared-reference gap the shallow one left open.
  `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Rebuilt the Docker container (so
  the exact reported URL is served fresh rather than from whatever was live mid-rebuild) and
  reconfirmed all fourteen routes — including the literal reported `/editor/<uuid>` — still 200.
  Told the user this fix is real but not confirmed as *the* cause, and asked them to retry/reload
  and report back if it still fails, since there's no way to be certain without either reproducing
  it live or getting the actual browser console error. Root vanilla app untouched — this entry
  only touched `web/src/entities/song/model/user-songs.ts`.
- **Found and fixed the real cause of the previous entry's crash: `getUserSong()` broke
  `useSyncExternalStore`'s stability contract, throwing React error #185.** The user came back
  with the actual console error: `Uncaught Error: Minified React error #185` — "Maximum update
  depth exceeded," React's canonical crash for a `useSyncExternalStore` (or similar) hook whose
  `getSnapshot` returns a new value on every call even when nothing changed: React compares the
  post-render snapshot against the one used during render, sees a mismatch every single time, and
  re-renders forever.
  `getUserSong(id)` was exactly that: `getUserSongs().find(...)` returns the same cached song
  object reference call after call (stable, correct), but the function then did `ensureMetadata({
  ...s })` — a fresh `{...s}` shallow copy *unconditionally*, so the function's return value was a
  brand-new object identity on every single call regardless of whether the underlying data had
  changed. Both `EditSongLoader.tsx` (this session's new "Edit as draft" entry point) and
  `PlayPage.tsx` (already existed, for playing a Training/Listen & Make-made song) read it through
  exactly this hook — meaning this was a real, pre-existing bug in the pilot, not something this
  session's own changes introduced; it's simply the first time in this whole engagement that a
  real browser has clicked through either of those paths, since no live browser has been available
  this session until the user did it themselves just now.
  Fixed with a single-slot memo — `getUserSong` now returns the exact same object for the same
  `id` as long as the underlying `songs` array reference hasn't changed (i.e., no real write
  happened via `saveUserSong`/`deleteUserSong` in between) — the same "stable reference until
  write" discipline this file's own `cache` (and `player-settings.ts`'s `historyCache`) already
  follow, just extended to the single-song lookup this file hadn't applied it to.
  The user asked to connect via "Playwright MCP" and check directly — no Playwright MCP server is
  configured in this environment, and the `claude-in-chrome` extension (the equivalent tool that
  is available) reported not connected when tried, so live verification is still not possible this
  session; said so plainly rather than fabricating a result. `npx tsc --noEmit`, `npm run lint`,
  `npm run build` all clean; rebuilt the Docker container and reconfirmed all thirteen routes still
  200. Asked the user to retry now that the actual root cause (not just a plausible-sounding
  guess) is fixed and deployed. Root vanilla app untouched — this entry only touched
  `web/src/entities/song/model/user-songs.ts`.
- **Live-verified the React #185 fix for real — first actual browser testing this whole
  engagement, via Playwright MCP the user connected.** "Подключись через Playwright MCP проверь
  сам." No Playwright MCP was configured a message earlier (and `claude-in-chrome` reported not
  connected either), so said so plainly rather than guessing; once the user added it, its tools
  showed up as newly-available deferred tools and actually worked. Navigated to `/play/bi-twinkle`,
  screenshotted the live Performance Mode highway for the first time ever (string lanes correctly
  centered below the HUD, the copper-to-silver thickness/color gradient rendering as intended,
  controls all present), clicked the real "✏️ Edit" button, and confirmed via
  `browser_console_messages` that the previous entry's React error #185 is genuinely gone — 0
  errors, only the pre-existing harmless "unused preload" warnings (the same ones visible in the
  user's own original paste, confirming those were always benign noise, never part of the bug).
  Confirmed via `browser_evaluate` reading `localStorage` directly, and via the rendered Title
  field, that the draft's "(draft)" title suffix and full note data both carry over correctly.
  One red herring along the way: an early click on the Details disclosure, resolved by Playwright
  through a text-based locator rather than the exact element reference, appeared to trigger
  phantom navigation to `/play/<id>` and then `/library` with zero console errors and zero
  application code involved — re-tested with careful ref-only clicks and it didn't recur, so
  treated as a one-off ref-resolution quirk in the automation layer, not an app bug; not chased
  further since it never repeated.
  Root vanilla app untouched — this entry made no code changes, verification only.
- **Finger-color legend moved out of the global topbar into Performance Mode's own bottom-right
  corner, by request, discovered mid-verification of the above.** "FingerLegend-module__At3QFa__
  trigger — убери с главной старнице и добавь вправый нижний угол страницы (проигрывания) новой
  версии которую сделали." Removed `<FingerLegend />` from `AppShell.tsx`'s topbar entirely (it
  was cluttering every single page — Home, Library, Settings, all of it — for a reference that
  only means anything on two specific screens). `FingerLegend.tsx` itself wasn't deleted — TabRoll
  still renders its own instance, unaffected by this change.
  For Performance Mode: since `createPerformanceEngine.ts` is a plain imperative TS module (no
  React, see its own header comment for why), it can't mount the React `FingerLegend` component
  directly. Built a vanilla-DOM equivalent instead — `handIconSVG()` (the identical hand
  illustration as a template-string SVG, colored from the same `shared/lib/finger-colors.ts`
  source so the two implementations can't visually drift apart) plus a trigger button and modal
  built with the engine's own `el()` hyperscript helper, toggled via a `.hidden` class (reusing
  `app/play-engine.css`'s existing global utility rather than a new one) and closed by its own ✕
  button, clicking the backdrop, or Escape (a `keydown` listener added alongside the existing
  Space-bar one, both cleaned up together on unmount). New CSS block in `play-engine.css`
  (`.perf-legend-*`), with the trigger `position: fixed; right/bottom: 18px` so it stays anchored
  to the page's bottom-right corner regardless of the highway's own internal scroll/layout.
  Verified live in the same Playwright session used for the fix above (not just curl/build this
  time): confirmed the hand icon is gone from Home's topbar, confirmed it now renders bottom-right
  on `/play/bi-twinkle`, clicked it and confirmed the modal opens with the correct colors/labels
  (Index/Middle/Ring/Pinky/Thumb) and closes on Escape, and confirmed TabRoll's separate copy
  still renders correctly after switching to the Guitar tab view — all with 0 console errors.
  `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean; rebuilt the Docker container and
  reconfirmed all thirteen routes still 200. Root vanilla app untouched — this entry touched
  `web/src/widgets/app-shell/ui/AppShell.tsx` (removed the import/usage, not the file),
  `web/src/features/play-song/model/createPerformanceEngine.ts` (the new vanilla widget), and
  `web/src/app/play-engine.css` (`.perf-legend-*`).
- **Speed slider's floor lowered from 0.5x to 0.1x, in both TabRoll and Performance Mode.**
  "Скорость до Speed - 0.1 а сейчас до 0.5." Both preview/playback Speed sliders share the same
  0.5x-2x range by original design (see the "Second Play engine added" entry: matched to TabRoll's
  on purpose, "for consistency across the app") — changed both together rather than just the one
  most recently in view, to keep that consistency intact rather than letting them drift apart.
  `TabRoll.tsx`'s range `<input>` and `createPerformanceEngine.ts`'s `slider()` call both now read
  `min: 0.1` (step stays 0.05, max stays 2). No clamping or validation anywhere assumed 0.5 as a
  floor — both engines' rate math is a straight multiply/divide, and `TrackPlayer.setSpeed()` just
  assigns `audioElement.playbackRate` directly, which modern browsers accept well below 0.1 — so
  this was a one-line-each change with no follow-on logic to adjust.
  Verified live in the same Playwright session: read both native range inputs' `min`/`max`/`step`
  directly via `browser_evaluate` (Performance Mode's on `/play/bi-twinkle`, TabRoll's after
  clicking into the Guitar tab view in the Editor) — both report `min: "0.1"` — with 0 console
  errors on either page. `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Rebuilt the
  Docker container and reconfirmed all thirteen routes still 200. Root vanilla app untouched — this
  entry touched `web/src/views/editor/ui/TabRoll.tsx` and
  `web/src/features/play-song/model/createPerformanceEngine.ts`.
- **Performance Mode's control bar filled out with the rest of Classic's buttons.** "Еще всякие
  кнопки управления добавь," followed by the classic engine's own control-bar labels pasted
  verbatim (🎤 Karaoke, 🎺 Band, 🔊 Notes, 🎸 Frets, ⚙ L, ☑ Repeat till right, 🥁 Metronome,
  ← Songs, Full song, 🔁 Loop, ✕, 🎓 Learn) — i.e. "port the rest of Classic's controls onto
  Performance Mode too." Diffed the list against what Performance Mode already had (Metronome,
  segment label, Loop, Clear already existed; "← Back" existed but read "← Back" not "← Songs" —
  relabeled to match) and ported the rest by reusing Classic's own underlying modules rather than
  reimplementing them, same standing principle as every other port this engagement: **🎺 Band**
  (`shared/lib/band.ts`'s `Band` class, seeded from the song's own backing parts plus
  `shared/lib/accompany.ts`'s `autoAccompaniment()` when a song defines none — `pickPart()` now
  also returns `parts`/`index` so the lead part can be excluded from the band's own part list;
  `.schedule()` polled every `tick()` frame same as Classic), **🎤 Karaoke** (a live word-fill lyric
  overlay via `shared/lib/karaoke-timeline.ts`'s `buildLyricTimeline`/`activeAt` +
  `karaoke-render.ts`'s `lineFillHTML` — the exact helpers Karaoke's own stage uses, rendered into
  a new `.lyric-line` div reusing the existing global CSS class), **🔊 Notes** (mutes just the lead
  synth voice, independent of Band), **🎸 Frets** + **⚙ S/M/L** (fret-label visibility and
  fretboard size, the latter reusing Classic's own `FRET_SCALE` S/M/L factors — scales the
  highway's lane-height clamp bounds instead of a separate fretboard overlay, since Performance
  Mode already draws frets inline on the highway), and **🎓 Learn**
  (`features/learn-mode/model/createLearnMode.ts`, verbatim — 16-beat segments, Prev/Next
  navigation, half-speed + rewind on entry). Controls laid out in two rows now (`controls`/
  `controls2`) rather than one, to fit. The pre-existing bare `"🎸"`/`"🎤"` backing/vocal mute
  buttons were relabeled `"🎸 Mute"`/`"🎤 Mute"` proactively, to avoid a same-icon collision with
  the new Frets/Karaoke buttons. **☑ Repeat till right (strict mode) was deliberately left
  non-functional** — rendered disabled with an explanatory tooltip ("Needs live performance
  detection (mic/MIDI input) to know when a note was played correctly — not implemented yet")
  rather than faked or silently omitted, since strict mode's whole premise is grading a note as
  right/wrong, which needs the stage-2 mic/MIDI input this pilot has never had. Learn mode is a
  partial exception to that same gap: its segment/loop/slow-start machinery is genuinely
  grading-independent (never touches hit/miss data) and was ported for real, but its
  auto-speed-up-on-clean-pass half (`record()`/`evaluatePass()`) is simply never called, since
  nothing produces a grade to feed it.
  Found and fixed one real bug during self-review, before any live testing: `createLearnMode`'s
  own `toggle(false)` (exiting Learn mode) calls `host.setLoop(false)` immediately followed by
  `host.applySegment(0, duration)` to reset the range — but the first draft of `applySegment` also
  unconditionally turned the loop back on, which would have instantly undone the `setLoop(false)`
  that just ran. Fixed by moving the "turn the loop on" side effect out of `applySegment` (which
  now only sets the range/label) and into the one caller that actually wants it — the timeline's
  manual drag-to-select handler, right after its own `applySegment` call — so Learn mode's exit
  path can't be undermined by it. Also tightened `updateSegLabel()`'s "Full song" condition (a
  segment spanning the entire duration, which is exactly what Learn mode's own exit leaves behind,
  now reads "Full song" instead of a redundant timestamp) and added an explicit
  `loopStart = loopEnd = null` reset in the Learn button's exit handler (leaving them at
  `(0, duration)` instead of true `null` would have made a *subsequent* manual Loop click re-loop
  the whole song, since `tick()`'s loop-boundary check runs before the song-end check).
  Verified live via Playwright on `/play/bi-twinkle`, end to end, not just a load-and-screenshot
  pass: played the full song through with Band + Karaoke + Notes all on (0 console messages);
  toggled Band, Karaoke, Notes, and Frets individually and confirmed each visual/audio state
  change; cycled ⚙ M → L and confirmed the label updates; confirmed the disabled strict-mode
  button truly blocks even a JS-dispatched click (native `disabled`, not just styling) and its
  tooltip text; entered Learn mode and confirmed it rewinds to 0:00, drops Speed to 0.50x, shows
  "Segment 1/3 · 0:00–0:10", and sets Loop's `primary` class; used Next/Prev and confirmed it
  advances to "Segment 2/3 · 0:10–0:19" and back; exited Learn mode and confirmed the label resets
  to "Full song" with both Loop and Learn back to their plain (non-`primary`) class; simulated a
  manual drag-select on the timeline canvas (synthetic `mousedown`/`mousemove`/`mouseup` matching
  `shared/lib/practice-timeline.ts`'s own listener targets — `mousedown` on the canvas,
  `mousemove`/`mouseup` on `window`) and confirmed it sets a segment label, turns Loop on, and that
  ✕ Clear correctly resets both. Zero console errors or warnings across the entire sequence.
  `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Rebuilt the Docker container and
  swept all sixteen routes (200 each). Root vanilla app untouched — this entry touched only
  `web/src/features/play-song/model/createPerformanceEngine.ts`.
- **Practice timeline gets a minimal note-preview strip.** "На таймлайне рисуем как миним вариант
  того что у нас на большом, чтобы можно было примрено понять по таймалайну что там будет играть"
  — draw at least a minimal version of what's on the big [highway] on the timeline, so you can
  roughly tell what's coming just by looking at it. Not in the vanilla app's own
  `src/ui/timeline.js` either (checked — its `draw()` only ever handles segments/selection/
  playhead), so this is new design work rather than a port, added directly to the one shared
  module both engines already build their scrubber from —
  `web/src/shared/lib/practice-timeline.ts`'s `createTimeline()` — rather than duplicating it into
  each engine. New optional `notes?: TimelineNote[]` param (`{time, dur, midi}` — deliberately the
  leanest shape that satisfies both `PlayNote` and Performance Mode's flattened `FlatNote`, so
  neither caller needs to build a new object, just pass its existing note array through, wrapping
  a lone `midi: number` as `[m]` for the latter). Drawn as small ticks — x = time, y = pitch
  height normalized across the song's own range, same padded-min/max shape (±3 semitones,
  minimum 12-semitone span) as the classic engine's own `yFor` highway math, just computed inside
  the timeline module itself from the `notes` it's given rather than threaded in from outside —
  deliberately generic (pitch height, not string/fret index), so it works for both: Classic's own
  highway is already pitch-height, so it gets a near-exact silhouette; Performance Mode's highway
  is string-lane-based instead, but string index tracks pitch closely enough that the contour still
  reads as "this melody goes up, down, this part is denser" — enough to satisfy "roughly tell what
  will play" without the shared timeline module needing to know anything about strings, frets, or
  a specific instrument. Drawn right after the background fill, before segments/selection/
  playhead, so the existing translucent overlays still tint over it and the white playhead stays
  crisp on top — no z-order change needed for either. Wired into both call sites: Classic's
  `createTimeline({ duration, notes, ... })` (`notes` was already sitting right there — the
  `PlayNote[]` built at the top of the file, well before the timeline's own construction, no
  reordering needed) and Performance Mode's `createTimeline({ duration, notes: flat.map(n => ({
  time: n.time, dur: n.dur, midi: [n.midi] })), ... })` (`flat`, the already-flattened per-pitch
  note list built for the string-lane highway, same file).
  Verified live via Playwright on both engines (switched Settings' "Song player" to Classic and
  back to confirm both, not just the default): screenshotted the timeline strip on
  `/play/bi-twinkle` for each and visually confirmed a tick pattern renders; then, since a
  screenshot alone can't prove the y-axis genuinely varies by pitch rather than being a flat bar,
  read the canvas's own pixel data back via `getImageData` (per-column brightest-pixel scan against
  the background color) on both — Performance Mode and Classic both showed the same y range
  (10–28 px of a 40px-tall canvas) tracking "Twinkle, Twinkle, Little Star"'s actual up-down
  melodic shape, confirming the contour is real, not a placeholder bar. 0 console errors on either
  engine (one `getImageData`/`willReadFrequently` warning was from the verification script's own
  repeated reads, not the app). `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean.
  Rebuilt the Docker container and swept all sixteen routes (200 each). Root vanilla app untouched
  — this entry touched `web/src/shared/lib/practice-timeline.ts`,
  `web/src/features/play-song/model/createPlayEngine.ts`, and
  `web/src/features/play-song/model/createPerformanceEngine.ts`.
- **Performance Mode's segment/loop row and timeline merged into one panel.** Pasted the segment
  row's own rendered text ("0:08 – 0:16 / 🔁 Loop / ✕ / 🎓 Learn") followed by "сделай в панельку
  общую а не отдельную" — make it one common panel, not separate. Before this, the segment
  label/🔁 Loop/✕ Clear/Learn row (`controls2`) was its own `.play-controls` box with
  `marginTop: 6px` pushing it away from the transport-controls panel above, and the timeline strip
  below it was a third, separately backed/bordered box (`.timeline-wrap` has its own
  `background`/`border-top`) — three visually distinct stacked bars, with the segment row
  sandwiched as an odd, floating middle one. Fixed by wrapping `controls2` and `timeline.el`
  together in one new container (`el("div.timeline-panel", {}, [controls2, timeline.el])`) and
  giving that single wrapper the shared `background`/`border-top` instead — `controls2` switched
  from the `.play-controls` class to a new `.segment-bar` (same flex-row layout, no background/
  border of its own) and a new CSS rule (`.timeline-panel .timeline-wrap { background: transparent;
  border-top: none; }`) turns off `.timeline-wrap`'s own background/border only when nested inside
  the new panel, so the segment row and the canvas now read as one continuous surface with a
  single divider between it and the transport-controls panel above. `.timeline-wrap` on its own
  (unnested) keeps its original styling, since Classic's own layout puts its timeline in a
  different position (directly under the canvas, before its own `controls`/`controls2`, per its
  established — and until now untouched — DOM order) and wasn't part of this request; Classic still
  has the same `marginTop`-gap "floating box" look for its own segment row, left as is rather than
  guessed at, since merging it there would mean moving its timeline's position in the layout, a
  bigger change than what was asked. Chose to merge the segment row downward with the timeline
  (not upward into the transport-controls panel) since the row's whole content — the segment
  label, Loop, Clear, Learn/Prev/Next — describes and acts on what's selected on that timeline
  right below it; grouping them together is the more legible pairing.
  Verified live via Playwright on `/play/bi-twinkle`: screenshotted before and after (confirmed the
  three-box/gap layout beforehand, confirmed one continuous panel afterward), entered Learn mode
  and confirmed the active-segment highlight on the timeline still renders correctly directly under
  the now-merged segment-label/Loop/Prev/Learn/Next row, exited cleanly. 0 console errors/warnings
  throughout. `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Rebuilt the Docker
  container and swept all sixteen routes (200 each). Root vanilla app untouched — this entry
  touched `web/src/app/play-engine.css` and
  `web/src/features/play-song/model/createPerformanceEngine.ts`.
- **Performance Mode's segment/loop controls folded into the main control bar.** Pasted the
  transport-controls row's own text ("Speed / 0.50x / 🎤 Karaoke / 🎺 Band / 🔊 Notes / 🎸 Frets /
  ⚙ S / ☑ Repeat till right / 🥁 Metronome") followed by "И эту строку нужно в ту же строку где все
  остальное" — this [segment/loop] row needs to go in the same row as everything else. The previous
  entry had already merged the segment row and the timeline into one shared-background panel (two
  rows inside one box), but that wasn't what was being asked for this time: the segment controls
  needed to be genuinely *in* the transport row, not just visually paneled with the timeline below
  it. Folded `segLabel`, `loopBtn`, `clearLoopBtn`, `prevSegBtn`, `learnBtn`, `nextSegBtn` directly
  into `controls`'s own children array (after the existing buttons), so they're just more items in
  the same `.play-controls` flex-wrap row — on a normal-width screen they spill onto controls'
  second wrapped line alongside Repeat till right/Metronome, same as any other button that doesn't
  fit the first line, rather than forming a row of their own. Dropped the `flex:1` spacer that used
  to sit between Clear and Prev/Learn/Next (it existed to push Learn/Prev/Next to the *far right of
  that row specifically* — with everything now sharing one wrapped multi-line row, a mid-row spacer
  would land on whichever line it happens to wrap to and shove only what follows within that line,
  which reads as arbitrary rather than intentional, so removed it in favor of normal left-to-right
  button flow like the rest of the bar). This made the previous entry's `controls2`/`timeline-panel`
  wrapper pointless — `controls2` no longer exists (its items moved into `controls`), so removed the
  wrapper too and just append `controls` then `timeline.el` directly; both already share the exact
  same `background: var(--bg-2)`, so they still read as one continuous surface with a single
  hairline divider (`timeline.el`'s own `border-top`) between them — no new CSS needed for that part.
  Deleted the now-dead `.timeline-panel`/`.segment-bar` rules `play-engine.css` had picked up in the
  previous entry, rather than leave unused CSS behind.
  Verified live via Playwright on `/play/bi-twinkle`: screenshotted the merged row (segment controls
  now visibly share the same box/line-wrapping as Karaoke/Band/Notes/Frets/etc.), entered Learn
  mode and confirmed Prev/Learn/Next and the segment label still appear correctly inline in that
  same row, with the timeline's active-segment highlight still rendering right below, exited
  cleanly. 0 console errors/warnings throughout. `npx tsc --noEmit`, `npm run lint`, `npm run build`
  all clean. Rebuilt the Docker container and swept all sixteen routes (200 each). Root vanilla app
  untouched — this entry touched `web/src/app/play-engine.css` and
  `web/src/features/play-song/model/createPerformanceEngine.ts`. Classic still untouched, same
  reasoning as before — its timeline sits in a different spot in the layout, so the same merge
  there isn't a drop-in change.
- **Fret numbers missing and no sound on `/play/bi-twinkle` — traced to leftover test-session
  state, not a code regression.** "Проверь, Сейчас пропали цифры из акордов
  http://localhost:3000/play/bi-twinkle и звук не влспроизводится" — the fret-number digits had
  disappeared from the note blocks and audio wasn't playing. Read `guitarpicker-web.play-settings.v1`
  out of the browser's own `localStorage` and found `band:false, noteSounds:false,
  showFingering:false, karaokeLyrics:false, playbackSpeed:0.5` — every one of those exactly matches
  a toggle this session's own Playwright verification passes had clicked once (to confirm each
  button's on/off visual state) without ever clicking back, plus `playbackSpeed` permanently
  overwritten by Learn mode's automatic slow-start (`setRate()` calls `setSetting("playbackSpeed",
  v)` unconditionally, including when Learn mode itself drops the rate to 0.5 on entering a
  segment — so every Learn-mode test this session silently saved 0.5x as the standing preference).
  With `noteSounds` and `band` both off there was nothing left to make sound at all (this song has
  no attached audio file, so muting both synthesized sources is total silence), and
  `showFingering:false` is exactly the flag `if (showFrets)` gates the fret-number draw call on —
  so both symptoms trace to the exact same root cause. Not a bug in the code added this session;
  confirmed by reading the source (`showFrets`/`noteSounds`/`band` all still correctly default to
  `true` when unset — `?? true`) and by simply re-toggling each button back on, which immediately
  restored both fret numbers and sound with no code changes needed.
  Fixed by clicking Karaoke/Band/Notes/Frets back on and resetting Speed to 1.0x directly on the
  live page (the same corrective action the user themselves could take from the UI — no source
  changes for this part). Verified via three methods, since a screenshot alone can't confirm audio
  is real: (1) re-read `localStorage` to confirm all four booleans are back to `true` and
  `playbackSpeed` back to `1`; (2) screenshotted the highway and confirmed fret-number digits
  render again; (3) monkey-patched `window.AudioContext` via a `Proxy` before clicking Play, then
  read `ctx.state` after — `"running"`, not `"suspended"`, confirming the browser's autoplay gate
  was actually cleared and sound is genuinely produced, not just silently scheduled into a
  suspended context; separately patched `AudioContext.prototype.createOscillator` and watched the
  call count climb (180 oscillators in 3 seconds) during playback, confirming `Synth.playMidi`
  actively schedules notes rather than erroring out silently. 0 console errors throughout.
  No files touched for this part — pure state, not code. Worth noting for future sessions: this
  session's own testing convention (click a toggle once to confirm it works, verified via
  `browser_evaluate`/screenshots) leaves the *last* state of each toggle in the real browser's
  `localStorage`, which is shared with whatever the user opens next in that same browser — future
  verification passes should end by restoring every toggled setting to its pre-test value, the way
  this entry just had to do after the fact.
- **Fret-number text size increased 2.5x, still scaled by the ⚙ S/M/L fretboard-size control.**
  "Размер текста в табах сделать больше в 2.5 раза и подстариваться под размер струн" — make the
  tab text 2.5x bigger and have it track the string size. The font was already computed as
  `laneH * 0.4` (`laneH` being the per-string lane height, itself clamped between `36 * sizeScale`
  and `90 * sizeScale` where `sizeScale` comes straight from the ⚙ S/M/L button's `FRET_SCALE`
  lookup) — so it already tracked string/lane size, just at a small multiplier. Changed the
  multiplier to `1.0` (`0.4 * 2.5`), keeping it `laneH`-relative rather than switching to a fixed
  pixel size, specifically so "adapt to string size" keeps holding at every fretboard-size setting
  rather than only working by coincidence at whichever size it was tuned against.
  Verified live via Playwright on `/play/bi-twinkle`: screenshotted at L size (digits now fill most
  of each note block, clearly larger, no overflow past the block's rounded corners) and at S size
  (smaller lane height, digits scale down with it and still fit — same proportional relationship,
  not a fixed size that would look oversized at S or tiny at L), then cycled back to M and L to
  restore the pre-test fretboard-size preference. 0 console errors/warnings throughout.
  `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Rebuilt the Docker container and
  swept all sixteen routes (200 each). Root vanilla app untouched — this entry touched only
  `web/src/features/play-song/model/createPerformanceEngine.ts`. Scoped to Performance Mode only —
  the request's "adapt to string size" points specifically at Performance Mode's ⚙ S/M/L control
  (which Classic and the Song Editor's Guitar tab view don't have; TabRoll's own fret-number font
  is a fixed-ratio `ROW_H * 0.42` with no adjustable "string size" to track), and this was the page
  the report and the follow-up request were both about.
- **The "fret numbers missing / no sound" report recurred — turned out to be a different browser,
  not a different bug.** "Проверь, Сейчас пропали цифры из акордов ... и звук не воспроизводится"
  again, right after the previous entry's fix. Re-checked `/play/bi-twinkle` in the same Playwright
  session used throughout this engagement: fret numbers rendered, 0 console errors — looked fine.
  The user then clarified: "в плейврайте все окей а в моем браузере даже с жестким перезагрузом не
  показывает цифры и звук не идет" — in Playwright it's fine, but in *my own browser*, even after a
  hard reload, no numbers and no sound. That's the actual explanation: Playwright automation drives
  its own separate browser instance/profile, entirely distinct from the person's own Chrome —
  fixing a toggle in Playwright's `localStorage` (the previous entry's fix) never touched the
  person's real browser's `localStorage` at all. A hard reload doesn't clear `localStorage` either
  (by design — that's exactly what makes settings persist across sessions; it only bypasses the
  HTTP cache for JS/CSS/HTML), so whatever muted state their own browser already had from their own
  earlier clicking around stayed in place no matter how hard they reloaded. Not a code bug in either
  entry; the underlying fix (re-toggle Band/Notes/Frets, or Settings → "Reset everything") is
  something only the person can do in their own browser, since this session's tools can't reach
  their `localStorage`. Surfaced this to the person directly rather than re-"fixing" a browser that
  was never broken to begin with. No files touched.
- **Performance Mode gets Classic's fretboard-diagram overlay, ported and re-wired onto 🎸 Frets.**
  "Freets - это настройка модального окошка с гитарным рифом. и рядом с ним сделать настройку
  размера этого окошка. Но при этом оставить регулирование размеров струн основного проигрывателя" —
  🎸 Frets is [supposed to be] a setting for a modal window with a guitar riff, add a size control
  next to it for that window specifically, but keep the main player's own string-size control as
  is. Clarified via a follow-up ("Новая фича для текущего плеера, можно взять из старого
  проигрывателя, которое показывает гитарный риф и куда нажимать") that this meant porting Classic's
  own `drawFretboard` — a "Now:/Next: [chord]" panel with a mini fretboard diagram showing exactly
  where to put your fingers, which Classic already has and Performance Mode never got (this file's
  own header comment previously said as much: "since this highway doesn't have one to scale," from
  the entry that first ported Classic's remaining control-bar buttons). Confirmed via
  `AskUserQuestion` which of two readings was meant — repurpose the existing 🎸 Frets button to
  toggle the new diagram (matching Classic's own semantics for that button exactly) vs. add a
  brand-new button and leave 🎸 Frets as the inline-digit toggle it had become in this pilot — the
  person picked the former.
  Ported `drawFretboard` from `createPlayEngine.ts` essentially verbatim into a new `drawDiagram(t)`
  in `createPerformanceEngine.ts`, dropping only the capo term (Performance Mode doesn't model capo
  anywhere else — the inline fret numbers already drawn on the highway don't offset for one either,
  so leaving capo out keeps the diagram's fret numbers consistent with what the highway itself
  already shows, rather than introducing a mismatch between the two). Needed a new grouped-note
  array (`diagramNotes`) alongside the existing flattened `flat` — `flat` is one entry per *pitch*
  (built for the string-lane highway, which draws one block per pitch), but the diagram needs one
  entry per *note/chord* carrying every pitch's fret position together, so it can plot an entire
  chord's finger positions in one panel the way Classic's version does; `diagramNotes` builds that
  straight from `lead.notes` with `midiToFret()` per pitch, same shape as Classic's own `notes[].frets`.
  🎸 Frets now toggles `showDiagram` (still persisted as `showFingering`, matching Classic's own
  setting key for the same button, so the on/off preference is shared between the two engines
  rather than needing a second key) — no longer toggles the inline fret-number digits on the
  highway, which are unconditional now (always drawn, as Performance Mode's own always-on note
  labeling; this was the "everything else" the digits had already become after the 2.5x-size
  entry above, so nothing user-facing was lost by dropping their toggle, only the toggle itself).
  Added a new **🖐 S/M/L** button, right next to 🎸 Frets, cycling a new `fretDiagramSize` setting —
  deliberately a separate persisted key from the existing `fretboardSize` (⚙ S/M/L, unchanged,
  still the main highway's own lane-height control) so the two sizes are genuinely independent, per
  the explicit "but keep the main player's string-size control as is." Both buttons reuse the same
  `FRET_SCALE` lookup (`{S:0.78, M:1, L:1.3}`) already defined for the highway, just against two
  different state variables — same scale factors, no new constant needed. Gave the new button a 🖐
  icon rather than a second ⚙, since two adjacent gear icons (🎸 Frets, 🖐/⚙ pair, ⚙ S/M/L) would
  have been genuinely ambiguous about which gear resized what; 🖐 also ties thematically to "where
  to put your fingers," the diagram's own subject.
  Verified live via Playwright on `/play/bi-twinkle`: confirmed the diagram renders bottom-left
  ("Now: C4" + fretboard grid with a dot at the right string/fret, matching the highlighted note on
  the highway), toggled 🎸 Frets off and confirmed the diagram disappears while the highway's inline
  numbers stay (unaffected, as intended), cycled 🖐 to L while ⚙ stayed at S and confirmed the two
  sizes are genuinely independent (diagram grew, highway didn't), played the song for several
  seconds and confirmed the diagram updates live as the playhead advances ("Now: F4" with the dot
  moving to the next string/fret). 0 console errors/warnings throughout every step. `npx tsc
  --noEmit`, `npm run lint`, `npm run build` all clean. Rebuilt the Docker container and swept all
  sixteen routes (200 each). Root vanilla app untouched — this entry touched
  `web/src/features/play-song/model/createPerformanceEngine.ts` and
  `web/src/shared/lib/player-settings.ts` (new `fretDiagramSize` field + default).
- **🎸 Frets and its 🖐 S/M/L joined into one seamless control.** "Кнопку Freets и ее размер
  содени чтоб выглядело как одна кнопку ( без отступа)" — merge the Frets button and its size
  button so it reads as one button, no gap. Added a generic `.btn-group` rule to
  `app/play-engine.css` (`display:flex`, children's `border-radius` zeroed except the outer
  corners of the first/last child, and the last child gets `margin-left:-1px` so its border
  overlaps the first child's instead of doubling up into a visible seam) — wrapped `fretBtn` and
  `diagramSizeBtn` in `el("div.btn-group", {}, [fretBtn, diagramSizeBtn])` (`fretGroup`) and put
  that wrapper into `controls`'s children array in place of the two separate buttons, so the
  `.play-controls` row's own `gap: 14px` no longer applies between them specifically — the group is
  one flex item as far as that row is concerned, with zero internal gap of its own. `⚙ S/M/L`
  (the main highway's own size control) stays a fully separate button, untouched, per the earlier
  entry's "keep the main player's string-size control as is."
  Verified live via Playwright on `/play/bi-twinkle`: screenshotted the joined pair (visually one
  pill-shaped control, "🎸 Frets" | "🖐 M", no gap, no double border), read both buttons' own
  `getBoundingClientRect()` and confirmed the second button's left edge sits exactly 1px inside the
  first's right edge (the intended border-overlap, not a rendering accident), then clicked the
  second (overlapping) button directly by its accessibility-tree ref and confirmed it still
  registers correctly on its own (cycled 🖐 M → L → S → M independently of 🎸 Frets, which never
  toggled), confirming the visual merge didn't cost either button's separate click target. 0
  console errors/warnings throughout. `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean.
  Rebuilt the Docker container and swept all sixteen routes (200 each). Root vanilla app untouched
  — this entry touched `web/src/app/play-engine.css` and
  `web/src/features/play-song/model/createPerformanceEngine.ts`.
- **Highway fret numbers sized to fill their own note block, not a fixed fraction of `laneH`.**
  "Цифорки побольше сделать можно на струнах которые, при этом размер зависит от размера струн
  увеличиваем делаем максимально большими (по размеру квадратика). А то сейчас маленькие" — make
  the numbers on the strings bigger, still tied to string size, maximally big by the size of the
  little block. The previous pass (`laneH * 1.0`) was a fixed multiple of the *lane* height, which
  is somewhat bigger than the note block actually drawn inside that lane (`laneH - pad*2`, `pad`
  being 2px active / 4px otherwise) — so there was always a bit of unclaimed space between the
  digit and the block's own edges. Replaced the fixed multiple with a fit-to-block computation: a
  starting size of `blockH * 1.3` (bold monospace digits run roughly 0.72em cap-height, so 1.3em of
  font-size lands the actual ink at ~95% of `blockH`), then `c.measureText()` against that note's
  own rectangle width (`w - 6`) and, only if it would overflow, a proportional shrink — so a normal
  note's digit fills its block edge-to-edge, while an unusually narrow note (a short chord member,
  for instance) still gets a digit that fits its own width instead of spilling past it. Still
  entirely `laneH`-relative via `blockH`, so ⚙ S/M/L continues to resize the numbers right along
  with the lanes, per the standing requirement.
  Verified live via Playwright on `/play/bi-twinkle` at all three fretboard sizes (S/M/L, cycled via
  ⚙): screenshotted each and confirmed the digits visibly fill nearly the whole block at every size
  — a clear, obvious jump from the previous pass, not just a marginal bump — with no overflow past
  a block's own rounded corners at any size. 0 console errors across the whole pass (one
  `getImageData`/`willReadFrequently` warning was from this session's own pixel-measurement script,
  not the app). `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Rebuilt the Docker
  container and swept all sixteen routes (200 each). Root vanilla app untouched — this entry
  touched only `web/src/features/play-song/model/createPerformanceEngine.ts`.
- **Performance Mode's highway split into canvas "components."** "Давай элементы канваса поделим
  тоже на компоненты чтоб ими лучше управлять. И сами 'ноты это отдельный компоненты которые имеют
  разные статусы, содержимое и размер текста'" — split the canvas elements into components too, for
  easier management, and notes specifically should be separate components carrying their own
  status/content/text-size. Asked via `AskUserQuestion` whether "component" meant internal JS
  objects/classes (still Canvas2D-rendered) or actual React/DOM elements replacing canvas — the
  latter would have meant reversing this whole engine's own standing architecture decision (real-
  time/continuous-loop features stay imperative-canvas, not React, exactly as this file's own
  header comment and `createPlayEngine.ts`'s explain) for a 60fps scrolling view with potentially
  many simultaneous notes. The person confirmed the former — internal objects, still canvas.
  Added a new file, `web/src/features/play-song/model/highway-elements.ts`, exporting a factory per
  visual element type in the highway, each returning a plain object with its own draw-relevant
  state and a `draw(ctx)` method: `createNoteBlockElement` (the one the request called out by name —
  carries `status: "pending"|"active"|"past"`, `content` (the fret-number label), `color`, and a
  `fontSize` computed once at construction via the exact fit-to-block sizing from the previous
  entry, now living in one place instead of inline in the draw loop), `createChordTieElement`,
  `createStringLineElement`, `createGutterElement`, `createPlayheadElement`, plus a shared
  `roundRectPath(ctx, x, y, w, h, r)` helper (previously a local closure duplicated conceptually
  between the main draw loop and `drawDiagram`'s own panel background — now one function used by
  both). Deliberately factory functions returning plain objects, not `class`-with-`this` — matches
  this codebase's existing functional style (the `el()` hyperscript builder, `slider()`, etc.)
  better than introducing the one OOP pattern this file didn't already have (`Band` is the
  codebase's only other class, and it's a stateful audio engine with real lifecycle methods, a
  different kind of thing than a per-frame draw object). Fresh objects each frame rather than a
  persistent pool — cheap at this note count (tens, not thousands) and far simpler to reason about.
  Rewired `draw(pos)` to build these elements from the same per-frame values it already computed
  (`laneH`, `yOffset`, `playheadX`, etc.) and call `.draw(c)` on each, instead of the previous
  monolithic loop of raw `c.fillStyle =`/`roundRect(...)`/`c.fillText(...)` calls; removed the file's
  own local `roundRect` closure entirely (was used by both the note loop and `drawDiagram`) in favor
  of the shared `roundRectPath`, updating `drawDiagram`'s one remaining call site to match. `draw()`
  itself now reads as: background → string lines → chord ties → note blocks → gutter → playhead →
  (optional) diagram — each step one line building and drawing a component, with the underlying
  per-note math (position, status, content) unchanged from before this entry, so the visual output
  is identical, only the code organization changed.
  Verified live via Playwright on `/play/bi-twinkle`: screenshotted before/after and confirmed
  pixel-identical rendering (strings, note blocks with the previous entry's large fret numbers,
  gutter labels, playhead, diagram panel, all unchanged), then played the song for several seconds
  and confirmed all three note states render correctly through the new `NoteBlockElement` — a past
  note fades (35% alpha), the active note gets its white outline, upcoming notes render normal —
  exactly matching pre-refactor behavior. 0 console errors/warnings throughout. `npx tsc --noEmit`,
  `npm run lint`, `npm run build` all clean. Rebuilt the Docker container and swept all sixteen
  routes (200 each). Root vanilla app untouched — this entry added
  `web/src/features/play-song/model/highway-elements.ts` and touched
  `web/src/features/play-song/model/createPerformanceEngine.ts`.
- **Found and fixed the real bug behind "text size doesn't change / stays small": `ctx.font` never
  resolves CSS custom properties, so `var(--mono)`/`var(--font)` had been silently failing across
  the whole app.** "Размер текста не меняется как был маленький так и остается не смотря на то что
  я меняю S/M/L — при этом даже на S — текст слишком маленький" — text size doesn't change no matter
  what S/M/L is set to, and even at S it's too small. Re-checked in the same Playwright session that
  had just verified the previous "fit to block" entry (which had genuinely looked correct there) —
  and it still looked fine there too, at first. Dug in with a `CanvasRenderingContext2D.prototype`
  `font`-setter patch that logs both the attempted string and the value that actually stuck, and the
  evidence was unambiguous: every `ctx.font = "...px var(--mono)"` assignment silently failed —
  `ctx.font` read back as the canvas's own built-in default ("10px sans-serif"), not the intended
  size or family, regardless of what was attempted. Confirmed the root cause two ways: (1)
  `getComputedStyle(canvas).getPropertyValue("--mono")` came back empty — `--mono`/`--font` had never
  actually been defined anywhere in `web/src` (`grep`'d every `.css` file to be sure) — so `var
  (--mono)` was referencing a custom property that plain doesn't exist; (2) even after manually
  defining `--mono` to a valid value and retrying, `ctx.font = "...px var(--mono)"` *still* failed —
  Canvas2D's `font` IDL property is not a regular CSS property and does not go through the same
  `var()`-substitution pipeline a DOM element's style does, so embedding `var(...)` inside a font
  string is invalid there regardless of whether the variable itself is defined. `getVar()`
  (`shared/lib/dom.ts`) already existed and is used correctly everywhere colors are read this way
  (`getVar("--accent")` etc.) — the bug was font strings using the *literal* CSS token `var(--mono)`
  instead of calling `getVar("--mono")` and embedding the *resolved* value. Every earlier "bigger
  numbers" pass in this session (the 2.5x pass, the fit-to-block pass, the whole component refactor)
  had been visually verified against whatever the browser's silently-substituted fallback font
  happened to render as — the relative *changes* between passes were real (each pass did make the
  fallback-font text bigger than the last), but none of them were ever rendering the intended
  monospace font at all, which is exactly why S/M/L stopped producing any visible difference once the
  fit-to-block width-shrink (itself now measuring against the wrong font's metrics) started
  dominating: dividing by a `measuredW` proportional to the *broken* font's metrics cancels the
  height term out of the shrink formula entirely, making the final size a function of note width
  only, invariant to `laneH` — invariant to S/M/L. That's the literal mechanism behind "stays the
  same no matter what I set."
  This is not a Performance-Mode-only bug — `grep`'d the whole `web/src` tree for the same pattern
  and found it in eight places total: `createPerformanceEngine.ts`, the brand new
  `highway-elements.ts`, `createPlayEngine.ts` (Classic — `drawFretboard`/`drawHoles`, the same
  panel Performance Mode's diagram was ported from, plus the countdown-number overlay), `createKaraokeEngine.ts`
  (the countdown number and the mic-pitch label), `shared/lib/dom.ts`'s `lineChart` (History's
  trend charts), and the Song Editor's `TabRoll.tsx`/`PianoRoll.tsx` (bar numbers, string/note
  labels, and TabRoll's own fret-number digits — the same "digit in a note block" pattern Performance
  Mode has, independently broken this whole time). Fixed all of them in one pass rather than leaving
  seven files silently broken after fixing only the one reported: defined real values for `--mono`
  and `--font` in `globals.css`'s `:root` (`--font` matching the app's existing `body` font stack,
  `--mono` a standard system-monospace stack — neither existed before this entry), then replaced
  every `"...px var(--mono))"`/`"...px var(--font)"` template literal with `` `...px
  ${getVar("--mono")}` ``/`` `...px ${getVar("--font")}` `` — the same call already used for every
  color in these files, just applied to font-family too.
  Once the real font was actually rendering, the *fit-to-block* sizing itself needed a second look —
  it had been tuned (unknowingly) against the tiny fallback font's metrics, so with the real,
  visibly-larger monospace font now applying, the old `blockH * 1.3`-then-shrink-by-width formula
  overshot badly (first look was alarming: digits bleeding across neighboring note blocks).
  Replaced the fixed-ratio guess with a self-calibrating one in `highway-elements.ts`'s
  `createNoteBlockElement`: measure the digit's *actual* ink box (`TextMetrics.
  actualBoundingBoxAscent`/`actualBoundingBoxDescent` + `.width`) at a fixed 100px probe size, then
  scale to whichever of "85% of the block's height" or "the block's own width minus a small margin"
  is more restrictive — correct for whatever font ends up actually active, not just the one this was
  eyeballed against. Cropped a small region of the live canvas onto a scratch `<canvas>` (drawn 2x
  scaled via `drawImage`) and screenshotted just that to check at real pixel resolution, since a
  full-page screenshot was too small to tell "fills the block" from "overflows it" at a glance — the
  crop confirmed each digit genuinely stays within its own rounded block's edges, just filling it
  edge-to-edge, which is the "maximally big" this and the previous entry were both asked for; the
  apparent "overflow" at full-page scale was adjacent, tightly-packed blocks reading as one shape at
  reduced zoom, not actual spillover.
  Also separately confirmed (same viewport-geometry read used earlier): M and L currently render
  identically in a viewport this tall because `laneH`'s own `Math.min(90 * sizeScale, avail / rows)`
  clamp saturates at `avail / rows` for both — a pre-existing, unrelated ceiling on lane height that
  has nothing to do with this bug (S is genuinely smaller, both before and after this fix, since
  its lower cap sits below that ceiling) — left alone since it wasn't what was reported and changing
  it would be a different, separate design call.
  Verified live via Playwright: read `ctx.font` back immediately on a fresh, untouched page load and
  confirmed it now resolves to the real monospace stack (previously always "10px sans-serif"
  regardless of any code path); screenshotted S/M/L again post-fix and confirmed S is visibly, really
  smaller (not just theoretically); played the song and confirmed live status transitions (past/
  active/pending) still render correctly through the real font; switched Settings' Song player to
  Classic and forced a render via the Frets toggle (no need to get playback past the mic-permission
  gate) and read `ctx.font` back there too, confirming the same fix holds in the sibling engine. 0
  console errors/warnings throughout every check. `npx tsc --noEmit`, `npm run lint`, `npm run build`
  all clean. Rebuilt the Docker container and swept all sixteen routes (200 each). Root vanilla app
  untouched — this entry touched `web/src/app/globals.css`,
  `web/src/features/play-song/model/highway-elements.ts`,
  `web/src/features/play-song/model/createPerformanceEngine.ts`,
  `web/src/features/play-song/model/createPlayEngine.ts`,
  `web/src/features/karaoke-song/model/createKaraokeEngine.ts`, `web/src/shared/lib/dom.ts`,
  `web/src/views/editor/ui/TabRoll.tsx`, and `web/src/views/editor/ui/PianoRoll.tsx`.
- **The fretboard-diagram's fret-position numbers, enlarged then dialed back down.** "уВЕЛИЧИТЬ
  РАЗМЕР ЦИФРЫ НА ЭТОМ В 3 РАЗА" — increase the number's size 3x, with no page/element named (no
  image attached either). Asked via `AskUserQuestion` which "digit" — the highway's own fret
  numbers (already maximally sized, two entries back), TabRoll's matching editor digits, or
  something else — confirmed it meant the small fret-position number drawn *inside* each dot on
  Performance Mode's fretboard-diagram panel (`drawDiagram()`, the "Now:/Next: [chord]" overlay),
  which had stayed at its original `9 * sc` this whole time since only the highway's own digits got
  touched in the earlier passes. Tripled it (`Math.round(27 * sc)`) and, since the dot itself was a
  fixed `6.5 * sc` radius with no relation to the label's size, resized the dot to match — measuring
  the label's real ink box (`TextMetrics.actualBoundingBox*`) the same self-calibrating way the
  highway's own note digits are sized now, rather than leaving the enlarged number to spill past a
  circle three times too small for it. Rewrote the label's positioning from the original manual
  `x - lbl.length * 2.5` offset hack to proper `textAlign="center"`/`textBaseline="middle"`, since
  the old offset was tuned for one-digit-wide labels at the old, much smaller font size and would
  have drifted once the size (and therefore the exact per-character width) changed.
  Immediately followed by "поменьше на чуть меньше половины, а то гиганский получились" — smaller,
  by a bit less than half, it came out gigantic. Confirmed by cropping a small region of the live
  canvas onto a scratch `<canvas>` at 3x magnification (a full-page screenshot is too small to
  judge "gigantic" vs. "readable" at this element's actual size) — the 3x pass genuinely was
  oversized relative to the fretboard grid's own cell spacing. Dialed the multiplier down from 3x to
  ~1.8x the original (`Math.round(16 * sc)`, down from `27`) — the dot-sizing logic didn't need any
  change, since it already derives the dot's radius from the label's measured ink box at whatever
  font size is passed in.
  Verified live via Playwright on `/play/bi-twinkle`: the same cropped/magnified-canvas technique
  used earlier in this session (plain screenshots are too small at this element's scale to judge
  fit), confirming the digit now reads clearly and sits comfortably inside its dot — noticeably
  bigger than the original, nowhere near the "gigantic" 3x pass. Played the song briefly to confirm
  the diagram updates correctly across different fret positions during live playback. 0 console
  errors/warnings throughout. `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Rebuilt
  the Docker container twice (once per size change) and swept all sixteen routes (200 each) after
  the final pass. Root vanilla app untouched — this entry touched only
  `web/src/features/play-song/model/createPerformanceEngine.ts`.
- **Confirmed the fretboard-diagram's fret-number size (`base = 16`) as a deliberate choice, not
  just wherever the previous entry happened to land.** "так в чем сейчас измеряется шрифт - давай
  ты мне даш 3 варианта я выбиеру и мы заздадим при том это будет под разные размеры s/m/l - по 3
  варианат на каждый" — asked what unit the font is currently sized in, then for three concrete
  S/M/L options to choose from. Explained the current formula (`Math.round(base * sc)`, `sc` the
  same `FRET_SCALE` factor as the 🖐 S/M/L button — S=0.78/M=1/L=1.3 — so `base=16` was already
  S=12px/M=16px/L=21px), then rendered a live 3×3 comparison grid directly on the running page (a
  scratch `<canvas>` drawn via `browser_evaluate`, reusing the exact same ink-box-measurement/dot-
  sizing code as `drawDiagram()` itself, labeled with a two-digit "12" to stress-test the worst-case
  width) rather than describing sizes in the abstract — no rebuild needed, since this was pure
  in-page JS against the already-deployed build. Three presets: A "Compact" (`base=12`:
  S9/M12/L16px), B "Current" (`base=16`: S12/M16/L21px — the value already live from the previous
  entry), C "Bold" (`base=20`: S16/M20/L26px, visibly crowding adjacent fret positions on the
  neck). The person picked B — confirming the previous entry's landing value directly rather than
  changing it, so no code changed this entry; this exists to record that the number was a
  considered choice among visible alternatives, not just wherever the last edit happened to leave
  it. No files touched.
- **"Поменьше" / "0.7 от текущего" turned out to be about the highway's own digits, not the
  diagram — misapplied twice, then corrected.** Right after confirming B ("Current," `base=16`)
  in the previous entry's live comparison, the person said "Поменьше," then immediately "если
  сейчас 1, то я хочу 0.7 от текущего размера." Read both as continuing the same diagram-dot
  thread that comparison was about, and applied them there: stepped to Option A (`base=12`) for
  "Поменьше," then `base = 12 * 0.7 = 8.4` for the precise follow-up — each verified live via the
  same cropped/magnified-canvas technique as the comparison itself.
  The person then clarified directly: "я про размерм шрифта ладолв у perf-canvas" — this was about
  the fret-*number* size on the main highway (`perf-canvas`, i.e. `createNoteBlockElement`'s
  digits), not the diagram panel at all. In hindsight this tracks: the diagram's dots had just been
  through a deliberate, considered three-way comparison the person had picked from directly — two
  bare "smaller" follow-ups within seconds of confirming a choice reads more naturally as a change
  of mind about something else entirely than as immediately re-opening a decision just finished.
  Reverted the diagram back to the confirmed `base=16` (undoing both misapplied steps — no net
  change there beyond what the previous entry already established) and applied "0.7 of current" to
  where it was actually meant: `highway-elements.ts`'s `createNoteBlockElement`, whose fill target
  was a flat `h * 0.85`. Changed to `h * 0.85 * 0.7` (kept unmultiplied in the source rather than
  written as `0.595`, so the relationship to the original ratio — and to what was asked — stays
  legible) — the width-based safety margin (`w - 6`, for unusually narrow notes) was untouched,
  since the request was specifically about font size, not that separate overflow guard.
  Verified live via Playwright on `/play/bi-twinkle`: screenshotted the highway and confirmed the
  digits are visibly smaller than the previous "fills the block" look, with noticeably more
  breathing room around each one now; cropped/magnified the diagram panel again and confirmed it's
  back to the same size as the earlier confirmed comparison, unaffected by the detour. 0 console
  errors/warnings throughout every step of this whole back-and-forth. `npx tsc --noEmit`, `npm run
  lint`, `npm run build` all clean after the final change. Rebuilt the Docker container and swept
  all sixteen routes (200 each). Root vanilla app untouched — net changes from this entire
  exchange: `web/src/features/play-song/model/createPerformanceEngine.ts` (diagram reverted to
  `base=16`, its net state unchanged from the previous entry) and
  `web/src/features/play-song/model/highway-elements.ts` (`targetH` now `h * 0.85 * 0.7`).
- **Timeline note-preview: draw by string, not by pitch.** "На таймлайне рисуем относительно того
  на какой струне это находится а не по ноте и её тону" — draw it relative to which string it's on,
  not the note/its pitch. The note-preview strip on the practice timeline (added a few entries back
  as "a minimal version of what's on the big [highway]") had been deliberately generic — it computed
  a pitch-height row itself, from `midi`, reasoning that a shared module serving both a continuous-
  pitch highway (Classic) and a string-lane highway (Performance Mode) shouldn't need to know about
  strings/frets at all, and that pitch tracked string closely enough to "roughly" work for both. This
  request says that reasoning was wrong for Performance Mode specifically: two notes on the same
  string but different frets have different pitches, so the old pitch-based row would spread them
  across different heights even though the highway itself draws them on the exact same row (same
  string lane) — the timeline was showing something the highway doesn't.
  Restructured `shared/lib/practice-timeline.ts`'s `TimelineNote` from `{time, dur, midi}` (row
  computed internally from pitch, min-max-with-padding same shape as Classic's `yFor`) to `{time,
  dur, row}`, where `row` is now a pre-normalized 0 (bottom) to 1 (top) position the *caller*
  supplies — the shared module no longer computes anything from pitch itself, doesn't know what a
  string or a semitone is, just places a tick at whatever `row` it's given. This shifts the "what
  does vertical position mean" decision to each engine, where it belongs, since Classic and
  Performance Mode's highways don't agree on what it means. Performance Mode's call site
  (`createPerformanceEngine.ts`) now computes `row` from `strIdx / (rows - 1)` per `flat` entry (0 =
  lowest string, matching the highway's own row layout exactly) instead of `midi`. Classic's call
  site (`createPlayEngine.ts`) keeps pitch-based rows — its own highway *is* continuous pitch height,
  not string-lanes, so pitch is still the right "what's on the big" mapping there; had to move the
  `allMidi`/`loM`/`hiM` computation (previously defined only for the highway's own `yFor`, after the
  timeline's construction) up to right after `notes` is built, so the timeline call site — which now
  needs `loM`/`hiM` itself to compute `row` per note — has them in scope; removed the now-duplicate
  later definition rather than compute it twice.
  Verified live via Playwright on `/play/bi-twinkle`: read the timeline canvas's own pixel data back
  (per-column brightest-pixel scan, same technique used when this feature first shipped) and found
  exactly 2 distinct tick heights across the whole song — matching the 2 strings ("e" and "B") this
  song's melody actually uses — confirming the row is now genuinely discretized by string, not
  continuously varying by pitch the way it would if two different frets on the same string still
  produced two different heights. Switched Settings' Song player to Classic and reconfirmed the
  opposite there: 6 distinct heights, matching the melody's actual pitch variety (not collapsed to
  string count, since Classic's highway was never string-based to begin with) — unaffected by the
  refactor, exactly as intended. 0 console errors/warnings on either engine. `npx tsc --noEmit`,
  `npm run lint`, `npm run build` all clean. Rebuilt the Docker container and swept all sixteen
  routes (200 each). Root vanilla app untouched — this entry touched
  `web/src/shared/lib/practice-timeline.ts`,
  `web/src/features/play-song/model/createPerformanceEngine.ts`, and
  `web/src/features/play-song/model/createPlayEngine.ts`.
- **Performance Mode gets live grading — mic pitch detection, strict mode ("Repeat till right"),
  health/score/streak/killfeed, all of it.** "Теперь добавляем режим считывания нот как и в обычном
  приложении - Repeat till right" — add note-reading like the regular app has, Repeat till right.
  This reverses a scope boundary this whole pilot had held to from Performance Mode's very first
  entry onward — stage-2 grading (mic/MIDI input, hit/miss, score) explicitly out, only the unused
  `NotePerformanceResult` interface standing in for it, `addHistory()` deliberately never called
  since "there's no real performance data to log." Given the size of reversing that, asked via
  `AskUserQuestion` whether this meant wiring up just the strict-mode retry mechanic on its own, or
  the full system Classic already has (health/score/streak/killfeed included) — the person picked
  "Полная система как в Classic," the full system.
  Read Classic's own grading pipeline in full first (`createPlayEngine.ts`'s `readPitch`/`grade`/
  `finalize`/`retry`/`checkWaitingPitch`/`resolveWait`/`applyJudgment`/`pushKill`, `shared/lib/
  pitch.ts`'s `detectPitch`/`PitchTracker`) before writing anything — the grading math itself
  (cents-based, octave-agnostic pitch matching against a note's own `midi` array) turns out to be
  completely instrument/string-agnostic, so it ports to Performance Mode's string-lane highway
  without needing to know anything about strings or frets at all; only the *data model* and *clock*
  needed real adaptation:
  - **Grading data model.** Classic grades one `PlayNote` per note/chord event; Performance Mode's
    own `flat` is already flattened one entry per *pitch* (built for the string-lane highway, which
    draws one block per string). Added a parallel `gradeNotes: GradeNote[]` — one entry per note/
    chord, each carrying mutable `state`/`best`/`frames` the same way Classic's own `PlayNote` does
    — keyed by the same `groupId` `flat` already carries, so the highway's per-pitch draw loop can
    look up "what did this pitch's parent note get graded as" via a `gradeByGroup` map and color the
    block accordingly (`judgmentColor[grade.state]`, the same `--j-perfect`/`--j-good`/`--j-off`/
    `--j-miss` CSS vars Classic's own note/killfeed coloring uses) without grading needing to touch
    the highway's own per-pitch rendering data at all.
  - **The clock.** Classic accumulates its own `clock` a frame at a time (`clock += dt * effRate`),
    so "freeze the clock" is just "stop adding to it" — the retry-wait branch of its loop returns
    before reaching that line. Performance Mode's `now()` is a *computed* function anchored to
    `AudioContext.currentTime` (or a media element's own `currentTime`), so it can't be frozen that
    way — introduced the same `rate`/`effRate` split Classic has (`rate` persists, is what the Speed
    slider shows; `effRate` is what's actually driving playback, temporarily different during a
    retry's tempo ramp) and reused the engine's own existing `pause()`/`seekTo()` machinery to
    freeze it: `retry(n)` stops the transport, then calls `seekTo(n.time)` — which now also resets
    grading state for that note and everything after it, needed on every seek regardless of source
    (timeline drag, Loop, Learn segment entry, or a retry), not just this one. A dedicated `waitTick`
    rAF loop (distinct from the normal `tick()`) polls the mic while frozen, since there's nothing
    for the normal per-frame advance/finish/loop logic to do while the position genuinely isn't
    moving. `tick()` itself bails out immediately after `grade()` if grading just triggered a retry
    (`if (waitingFor) return;`) — missing this the first time through would have let the old tick
    loop's tail overwrite `retry()`'s own freeze on the very next line, a bug caught in self-review
    before it ever got tested live.
  - **The Play/Pause button during a wait.** Classic never flips its own `playing` flag for a retry
    (only the underlying player/band get silenced), so its Pause button just keeps working normally.
    Performance Mode's retry *needs* `playing=false` for `now()` to freeze — so `updatePlayBtn()`
    shows "⏸" whenever `playing || waitingFor`, keeping the same "the transport reads as running"
    feel, and clicking it while waiting cancels the wait (freezes there for good) rather than trying
    to distinguish a meaningful pause from the freeze already in effect.
  - **Restart.** Classic has separate always-visible Start/Restart buttons; Performance Mode has one
    ▶/⏸ toggle. Adapted rather than adding a second button: `play()` calls `restart()` first when
    `finished` is true, so the same button that started the song restarts it once it's over — same
    as Classic's own `togglePlay()`'s `if (finished) { restart(); return; }`, just folded into one
    control instead of two.
  Added the missing HUD pieces Performance Mode never had — `scoreBox`/`healthWrap`/`killfeed`/
  `banner`, same markup and CSS classes as Classic's own (`scoreHTML()`, `.healthbar-big`, `.kill*`,
  `.banner`/`.big-grade`/`.grid.cards`/`.stat`, all already in the shared `play-engine.css`, so no
  new CSS needed) — as a third `topHud` row rather than squeezed into the existing two, since
  `scoreBox`'s two-line content made that row taller than the old `TOP_HUD_RESERVE` (76px) could
  absorb without overlapping the highway; grew it to 140px. `🎸 Frets`/`⚙ S/M/L` etc. from earlier
  entries were untouched by any of this — grading is fully additive, the highway/diagram/karaoke/
  band machinery from every prior entry keeps working exactly as before, whether or not strict mode
  or the mic is involved. `finish()` now calls `host.addHistory()` (the exclusion this pass reverses
  from the file's own original header comment) with an `entry.mode: "performance"` tag — the field
  already existed on `HistoryEntry` as optional, unused until now, so entries from the two engines
  are distinguishable without touching History's own rendering, which reads the shared fields
  generically and was confirmed (via `grep`) to never reference `.mode` at all, so this couldn't
  have broken it either way.
  **Found and fixed a real, pre-existing bug along the way, not introduced by this port**: live
  testing hit `play()` hanging forever — traced to `ensureMic()`'s bare `await
  navigator.mediaDevices.getUserMedia(...)` (ported verbatim from Classic's own identical helper),
  whose promise is only guaranteed to settle once the browser actually renders a permission decision
  for the person to make; in this Docker/headless environment (and plausibly in a real browser with
  prompts blocked by policy, or one that's dismissed without an answer) it neither resolves nor
  rejects, so the `await` blocks forever. Confirmed live that Classic's own "▶ Start" hangs the
  identical way, proving this predates this entry entirely — not something the port caused. Since
  Performance Mode's Play button had never depended on the mic before this entry, leaving this
  unguarded would have made ordinary, no-grading-intended playback newly fragile in a way it never
  was. Fixed only on Performance Mode's own copy (Classic's is untouched — a separate, deliberate
  scope call, since fixing it there wasn't asked for and this pilot's standing rule is "Classic stays
  exactly as it was"): `ensureMic()` now races `Audio.startMic()` against an 8-second timeout,
  falling into the same graceful "no mic, play anyway" path the `catch` already handles for an
  explicit denial, rather than leaving the button silently dead.
  Also fixed a stale line in Settings' own "Song player" description (`SettingsPage.tsx`), which
  still said the new player has "no scoring yet" — true when it was written, not anymore.
  Verified live via Playwright on `/play/bi-twinkle`, end to end, in this exact order: confirmed the
  new HUD row doesn't overlap the highway; clicked Play and confirmed it no longer hangs (resolves
  via the 8s timeout, toasts "Mic off," proceeds); let it play through with no real mic available
  (this environment's confirmed-hanging `getUserMedia`, from the bug above) and watched every note
  finalize as a miss — killfeed showed "Miss [note]" entries in the right red, past note blocks on
  the highway switched from their finger color to `--j-miss` red, health drained to 0, score box
  showed "FAILED"; let the song reach the end and confirmed the pass/fail banner appeared with grade
  "F," correct stats (42/42 missed, matching this song's actual note count), and that `addHistory()`
  genuinely wrote an entry (read `guitarpicker-web.play-history.v1` back out of `localStorage`
  directly) tagged `mode: "performance"`; turned on strict mode, restarted, and confirmed it froze
  exactly at the first note (time genuinely stopped advancing, Play button showed "⏸") rather than
  continuing past a miss; clicked the Play/Pause button while frozen and confirmed it cleanly
  canceled the wait (button dropped to "▶", no stray loop left running); turned strict mode back off
  and confirmed normal playback resumed and completed cleanly a second time. 0 console errors across
  the entire sequence (only the pre-existing, unrelated Next.js sidebar-prefetch warnings from
  earlier `/settings` navigations in the same session). Cleared the test `localStorage` history
  entries afterward so this session's fake (mic-less, all-miss) run doesn't pollute the person's own
  History page. `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. Rebuilt the Docker
  container and swept all sixteen routes (200 each). Root vanilla app untouched — this entry touched
  `web/src/features/play-song/model/createPerformanceEngine.ts` and
  `web/src/views/settings/ui/SettingsPage.tsx`.
- **Free mode — practice at your own pace (Performance Mode only):** by request ("Тренировка в своём
  темпе. (Свободные режим) где идет ожидание след ноты. Последовательно без автовоспроизведения" —
  practice at your own pace, free mode, waiting for the next note, sequentially, with no
  auto-playback), a new **🎯 Free mode** toggle in Performance Mode's control bar. Scoped by three
  follow-up answers: Performance Mode only (not Classic — "Только в New"), mic pitch detection only
  with no manual "skip" fallback ("Только по микрофону"), and the same health/score/killfeed
  accounting Repeat till right's own wait already uses ("Считаем как в Repeat till right"). Built
  entirely on strict mode's existing freeze-and-wait primitives (`waitTick()`/`checkWaitingPitch()`/
  `resolveWait()`) rather than a parallel mechanism: strict mode's own retry already freezes the
  clock and polls the mic for one note before resuming timed playback; Free mode just chains that
  same freeze through every note from the start, with `resolveWait()` now branching on a `freeMode`
  flag — normally it ramps back up to speed and resumes playback, but in Free mode it calls a new
  `pickNextFree()` instead, which finds the next not-yet-graded note (`firstPendingFrom()`, time-
  sorted) and freezes there, with no clock-driven playback in between at all: no backing/vocal audio,
  no note-sound/metronome scheduling, no band — Play routes to a new `playFree()` entirely instead of
  the normal clock path. A genuinely new entry point had to reuse `waitTick()`'s own trailing
  reschedule rather than scheduling its own animation frame from inside `pickNextFree()` — since
  `resolveWait()` calls it from *within* `waitTick()`'s own call stack (via `checkWaitingPitch()`),
  a second `requestAnimationFrame(waitTick)` there would have doubled, then quadrupled, the number of
  scheduled frames every note; `playFree()` (the actual entry point, not already inside that stack)
  schedules the first frame itself. Because Repeat till right's wait only ever resolves a note as
  perfect/good — a wrong pitch just keeps waiting rather than getting graded off/miss — Free mode's
  killfeed reads the same way: no penalties, just a quiet, ungraded-by-time practice pass, matching
  what was asked. Mutually exclusive with Learn mode (each disables the other's button, and turning
  Free mode on while Learn is active exits Learn first) since Learn's segment/loop bounds are
  enforced inside the normal clock-driven `tick()`, which Free mode never runs; also disables Repeat
  till right's own toggle, since it has nothing left to do once every note already waits. Persisted
  as `s.freeMode` (`shared/lib/player-settings.ts`). Also fixed two small pre-existing rough edges hit
  while building this: the Play/Pause button could get stuck showing "⏸" after a timeline seek
  interrupted a strict-mode (or now Free mode) wait, since `seekTo()` never re-synced it once
  `playing`/`waitingFor` both went false — added a trailing `updatePlayBtn()` call there; and the
  Learn button's own tooltip still said the auto-speed-up-on-clean-pass half "won't fire yet," true
  before the grading port two entries up, not since.
  Verified live via Playwright on `/play/bi-twinkle`: toggling Free mode on correctly disabled both
  Repeat till right and Learn's buttons; pressing Play with the mic denied correctly toasted "Mic
  off" and left everything exactly where it was (no freeze, button back to "▶") rather than getting
  stuck on an unresolvable wait, confirming the no-manual-fallback design actually holds. Since this
  sandboxed browser has no real microphone, mocked `navigator.mediaDevices.getUserMedia` to return a
  `MediaStreamDestination` fed by an `OscillatorNode` — a real, synthesized tone flowing through the
  app's own actual `detectPitch()`/`PitchTracker` pipeline, not a stubbed result. Set it to 261.63 Hz
  (C4, this song's first two notes): score went to 200 with streak 2 and the transport froze exactly
  at the third note's time — it did *not* drift past a note the tone didn't match. Retuned the
  oscillator live to 391.995 Hz (G4, notes 3–4) without pausing: score climbed to 360, streak to 4,
  confirming the wait chain resumed and correctly discriminated pitch note-by-note rather than just
  advancing on any sound. Clicked Pause mid-wait and confirmed it cleanly canceled (button dropped to
  "▶", no stray loop). 0 console errors across the sequence. `npx tsc --noEmit`, `npm run lint`,
  `npm run build` all clean; rebuilt the Docker container, swept `/play/bi-twinkle` (200). Also
  updated Settings' "Song player" description to mention Free mode. Root vanilla app untouched (this
  is a genuinely new mode, not a port — nothing in Classic or the brief has a counterpart) — this
  entry touched `web/src/features/play-song/model/createPerformanceEngine.ts`,
  `web/src/shared/lib/player-settings.ts`, and `web/src/views/settings/ui/SettingsPage.tsx`.
- **Finger colors on the 🎸 Frets diagram:** by request ("+ на Freets - вставляем цвета пальцев" —
  insert finger colors on Frets too), Performance Mode's fretboard-diagram overlay (`drawDiagram()`)
  now colors each dot by finger, the same `shared/lib/finger-colors.ts` palette the highway and its
  own legend already use, instead of the flat accent-when-active/translucent-white-when-next it drew
  before. `diagramNotes` didn't carry a `finger` field at all — added it (`finger: n.finger`,
  straight off `Note`, same as `flat`'s own copy for the highway); `drawDiagram()`'s dot-drawing loop
  now looks up `fingerColor(cur.finger)` once per chord and uses it for both the fretted-dot fill and
  the open-string ring stroke, rather than the old single `col` accent/white toggle. A chord's
  `finger` is one value for the whole note, not per-string — same simplification the highway's own
  per-`groupId` coloring already makes, so this isn't a new limitation, just the diagram catching up
  to how the highway already handles chords. Losing the old accent-vs-white "Now:" vs "Next:"
  contrast was the one real tradeoff of switching to a single color family — kept that distinction by
  driving `c.globalAlpha` off the existing `active` boolean instead (full opacity when active, 0.55
  when previewing next) rather than adding a second competing color scheme.
  Verified live via Playwright on `/play/bi-twinkle`: before this change the diagram's dot for this
  song's B-string note (which has no assigned finger, i.e. the "Unassigned" default) rendered in the
  old accent/white colors while the highway's own block for the same note already rendered in
  finger-colors.ts's "Unassigned" gray-blue (`#8fa0c7`) — the two visibly disagreed. After this
  change, a screenshot confirms the diagram dot now renders in that same gray-blue, matching the
  highway exactly. Attempted to also confirm visible color *variety* by assigning a non-default
  finger to a note through the Guitar tab editor (opened this song's auto-cloned draft, switched to
  Guitar tab view) and replaying it, but none of the built-in songs carry finger data (only
  user-authored drafts ever get it) and driving the tab editor's canvas via synthetic
  `MouseEvent`/`dispatchEvent` calls didn't register a selection (its hit-testing likely needs real
  pointer events) — didn't chase this further since the default-case comparison above already
  exercises the exact same `fingerColor()` call this entry added, with the only variable being which
  value gets passed in; no draft was saved, so nothing was left behind. 0 console errors throughout.
  `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean; rebuilt the Docker container, swept
  all sixteen routes (200 each). Root vanilla app untouched (Performance Mode has no Classic
  counterpart for this diagram) — this entry touched only
  `web/src/features/play-song/model/createPerformanceEngine.ts`.
- **Bugfix — the Frets diagram's neck was a flat 12 frets:** "Баг что на Freets не хватает размера
  грифа сейчас всего 12 - а нужно расширить." `drawDiagram()`'s `const FRETS = 12;` was a hardcoded
  constant regardless of which chord the panel was actually showing — any note whose minimal fret
  position (from `midiToFret()`) landed past the 12th (routine on instruments that reach 15-22 frets,
  e.g. `INSTRUMENTS["electric-guitar"].frets === 22`) had its dot positioned by `nutX + (pos.fret -
  0.5) * cell` with `cell` computed for only 12 frets — past fret 12, that's past the edge of the
  fretboard grid entirely, off the panel. The `cell`/`fbW` math itself was never wrong; the neck was
  just never widened to match what could actually be drawn on it.
  Fixed by computing `FRETS` per draw call from the *currently shown* chord's own fret positions
  (`Math.max(12, ...cur.frets.filter(Boolean).map(fret))`), floored at 12 (so an ordinary low-fret
  song keeps the familiar compact view unchanged) and capped at the instrument's own `frets` count
  (no point drawing frets that don't exist on this instrument). `fbW` now scales with `FRETS / 12` —
  each fret stays roughly the same physical width as the neck widens, rather than cramming more of
  them into the old fixed-width panel — still bounded by `W * 0.42` so a genuinely wide span (a
  22-fret electric guitar chord near the top of the neck) compresses gracefully instead of
  overflowing the highway. The position-marker row was hardcoded to `[3, 5, 7, 9, 12]`; extended to
  `[3, 5, 7, 9, 12, 15, 17, 19, 21, 24]` (filtered to `<= FRETS`) so a chord up around fret 15-17
  still gets landmarks past the 12th, not a bare unmarked stretch of neck.
  Verified live via Playwright: this song's own melody only reaches fret 1, so reproducing the bug
  needed a note that actually lands past fret 12 — temporarily edited a song draft's Notes field to
  `C4:1 G5:2 C4:1` (G5 = midi 79, fret 15 on an acoustic guitar's high E string, the minimal position
  `midiToFret()` finds) via the Song Editor's quick-entry textarea (`browser_fill_form`, not raw DOM
  `.value` assignment — tried that first, and confirmed it silently didn't register with the editor's
  own React state, since Apply notation kept using the stale original melody until switched to a real
  fill). Also hit, and left alone as out of scope, an unrelated pre-existing quirk: a hard
  (`page.goto()`) navigation straight to a user-drafted song's `/play/[id]` rendered a fully blank
  mount (`<div class="...mount"></div>`, empty, 0 console messages) while the exact same URL reached
  via an in-app link click rendered correctly every time — client-side (SPA) navigation worked
  reliably throughout, so all verification here used that instead. Confirmed on the resulting page: a
  screenshot mid-playback shows the diagram panel reading "Now: G5" with fret "15" plotted cleanly on
  a widened neck (position marker "15" visible at the panel's own right edge), where before this fix
  the same dot would have rendered past the edge of a 12-fret-wide panel. Cleaned up afterward —
  removed the test draft from `localStorage`'s `guitarpicker-web.user-songs.v1` and its `play-
  history.v1` entries directly (not through the UI's own Delete button, which raises a blocking
  `confirm()` this session avoids triggering). 0 console errors throughout. `npx tsc --noEmit`, `npm
  run lint`, `npm run build` all clean; rebuilt the Docker container, swept `/play/bi-twinkle` (200).
  Root vanilla app untouched (same as the entry above, no Classic counterpart for this diagram) — this
  entry touched only `web/src/features/play-song/model/createPerformanceEngine.ts`.
- **Bugfix — turning Free mode off mid-wait silently started unwanted auto-playback:** by request
  ("Проверить Frets/Performance Mode ещё раз на другие баги" — check Frets/Performance Mode once more
  for other bugs), a from-scratch read-through of `createPerformanceEngine.ts` looking specifically
  for issues in the same family as the two just fixed. Found in `freeModeBtn`'s own `onclick`: the
  "stop whatever's running" cleanup (`waitingFor = null` + cancel the wait, or `pause()`) was wrapped
  in `if (freeMode) { ... }` — so it only ran when the button was turning Free mode *on*. Turning it
  *off* while a Free-mode wait was in progress left `waitingFor` set and `rafId`'s `waitTick()` loop
  running; if the person then actually played the note, `checkWaitingPitch()` → `resolveWait()` fired
  as normal, but `resolveWait()` re-checks the (now `false`) `freeMode` flag and falls into its
  *other* branch — `beginTempoRamp(); play();` — silently kicking off a strict-mode-style tempo ramp
  and full timed auto-playback (backing/note-sounds/metronome, the works) immediately after the
  person had just turned auto-playback *off*.
  Fixed by moving the stop-logic out from under the `if (freeMode)` guard so it always runs on either
  toggle direction, leaving a clean stopped state either way; only the Learn-mode auto-exit
  (`if (learn.isActive) learnBtn.click();`) stays specific to turning Free mode *on*, since turning it
  off never needs to touch Learn (it was already inactive/disabled the whole time Free mode was on).
  Also traced, and ruled out as unreachable, a related-looking suspicion: that same `learnBtn.click()`
  line runs while `learnBtn.disabled` was just set `true` two lines above, and a disabled button's
  `.click()` doesn't dispatch its listener in real browsers — looked like a second bug. It isn't one
  in practice: `learnBtn.disabled` mirrors `freeMode` (set both at init and on every Free-mode toggle),
  and `freeModeBtn` itself only ever becomes clickable when `learn.isActive` is `false` (learnBtn's own
  `onclick` disables `freeModeBtn` the instant Learn turns on) — so by the time `freeModeBtn`'s handler
  could ever run with `learn.isActive === true`, `freeModeBtn` would already be disabled and unable to
  have been clicked in the first place. Dead defensive code, not a live bug; left as-is rather than
  touched speculatively.
  Verified live via Playwright on `/play/bi-twinkle`, reproducing the exact sequence: mocked
  `navigator.mediaDevices.getUserMedia` with a real `OscillatorNode` tuned off-pitch (300 Hz, song's
  first note is C4/261.63 Hz) so the engine would enter and stay in a Free-mode wait; confirmed the
  transport button read "⏸" (waiting); toggled Free mode off and — before the fix — the button
  incorrectly kept reading "⏸" (Learn/Repeat till right correctly re-enabled, but the wait itself
  untouched); retuned the oscillator to the correct pitch and confirmed the pre-fix bug fired exactly
  as diagnosed: score jumped to 60 (a "good" grade) and normal timed playback silently started. Reran
  after the fix with the identical sequence: toggling Free mode off mid-wait now correctly snaps the
  button back to "▶" immediately, and feeding the correct pitch afterward does nothing at all (score
  stays 0, position stays 0:00, button stays "▶") — the stale wait no longer resolves into anything.
  0 console errors across both runs. `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean;
  rebuilt the Docker container, swept all sixteen routes (200 each). Root vanilla app untouched
  (Free mode has no Classic counterpart) — this entry touched only
  `web/src/features/play-song/model/createPerformanceEngine.ts`.
- **Same Frets-neck-size bugfix, ported to the root vanilla app:** the user repeated the exact same
  report ("Баг что на Freets не хватает размера грифа сейчас всего 12") verbatim after the pilot's own
  fix (two entries up) had already shipped — the likely explanation, confirmed by checking
  `docker-compose.yml`, is that the person's actual day-to-day testing surface is the root app on
  `:8080` (`guitarpicker` service, `build: .`), not the pilot on `:3000` (`guitarpicker-web`, its own
  README calls it "a separate app on a separate port, not the deployed one") — so the original bug
  report was never actually about the pilot at all, and the pilot fix simply couldn't have addressed
  what they were seeing. Checked `src/views/play.js`'s own `drawFretboard()` (Classic's fingering-dot
  panel, the thing the pilot's `drawDiagram()` was itself ported from) and found the identical bug:
  the same flat `const FRETS = 12;`, the same fixed `[3, 5, 7, 9, 12]` marker row, the same
  `nutX + (pos.fret - 0.5) * cell` positioning that runs off the panel's edge once `pos.fret` exceeds
  12 — routine on instruments reaching 15-24 frets (`guitar-7` goes to 24, several others to 19-22).
  Applied the identical fix here: `FRETS` computed per draw call from the current chord's own
  `cur.frets` (floored at 12, capped at `inst.frets`), `fbW` scaling with `FRETS / 12`, and the marker
  row extended to `[3, 5, 7, 9, 12, 15, 17, 19, 21, 24]`. One difference from the pilot's version worth
  noting: this file's fret *labels* (both the marker row and each dot) already add `+ capo` for
  display, but the *positioning* math (here and in the sizing calc) uses the raw, capo-relative
  `pos.fret` throughout (`capoStrings = inst.strings.map(v => v + capo)` already folds the capo in
  before `midiToFret()` ever runs) — so the fix's `neededFret`/`FRETS` math needed no separate capo
  handling, it's already working in the same capo-relative space every other number in this function
  uses. Did **not** port the earlier finger-colors change (pilot-only feature, never requested here)
  or anything else from that entry — scoped strictly to the neck-size bug this report is actually
  about.
  Verified with real (not fabricated) song data this time: scripted a quick Node check against
  `src/music/songs.js`'s `builtinSongs()` and `src/music/notes.js`'s `midiToFret()` to find any
  built-in song whose highway already needs a fret past 12 — `bi-canon` (Canon in D) does, up to fret
  14, right at its very first note, so no editor round-trip was needed to reproduce this live (unlike
  the pilot's own verification, which had to fabricate a high note by hand since none of *its* fixture
  data reached that far). Ran the root app's own verification harness first —
  `node check-imports.cjs && node test-core.mjs && node dom-smoke.mjs` — all clean (148 + 23-view
  checks passing, matching `package.json`'s own `npm test`). Then live via Playwright on
  `localhost:8080/#/play/bi-canon`: toggled 🎸 Frets on (had to retry once — the very first click,
  fired immediately after navigation, didn't stick; a second click confirmed via
  `localStorage`'s `guitarpicker.v1.settings.showFingering` before/after, likely just this session's
  own timing rather than anything the fix touched) and confirmed the panel now reads "Next: F#5 · capo
  2" with the neck visibly extended out to a "14" marker at its own right edge and the dot sitting
  cleanly on it, rather than past where a 12-fret-wide panel would have ended. 0 console errors.
  Rebuilt the Docker container (`docker compose up -d --build guitarpicker`, which reruns the same
  test suite as part of its own build step) and reconfirmed `:8080` serves 200. This entry touched
  only `src/views/play.js` — the pilot's own `createPerformanceEngine.ts` (already fixed) was not
  touched again.
- **Real fretboard inlay markers on the Frets diagram, both apps:** the person pasted a generic
  reference explainer (from another chat, not their own words) on standard guitar fretboard-marker
  conventions — inlay dots at frets 3/5/7/9/12/15/17/19/21, with the 12th doubled — after the two
  neck-size bugfixes above. Asked via AskUserQuestion whether that meant fixing the diagram's numeric
  label row to match those standard positions, adding actual inlay-dot graphics on the neck itself
  (separate from the numeric labels and from the colored "which finger" dots at played positions), or
  both — picked both.
  The numeric label row in both `drawDiagram()` (pilot) and `drawFretboard()` (root) had grown to
  `[3, 5, 7, 9, 12, 15, 17, 19, 21, 24]` across the two neck-size fixes above — 24 isn't a standard
  marker position (real necks mark up to 21; a double dot at 24 shows up only on some extended-range
  instruments, not as the default convention), so trimmed it back to the standard nine positions and
  factored the list into a shared `FRET_MARKERS` constant (was inlined at each of the two call sites
  before) so the label row and the new inlay dots can't drift out of sync with each other.
  Added the inlay dots themselves as a new, separate drawing pass: small translucent circles centered
  vertically between the extreme strings (`(sy(0) + sy(nStr - 1)) / 2`) at each `FRET_MARKERS` position
  up to `FRETS`, with the 12th drawn as two dots (above and below center) rather than one — same
  spacing convention a real fretboard uses. Deliberately faint (`rgba(255,255,255,0.28)`) and drawn
  before the finger-color note dots, so a played note at (or near) a marker fret still reads clearly
  on top rather than the two competing for the same pixels. In the root app, the inlay dots use the
  same raw, capo-relative `pos.fret` positioning the rest of that function already does (`capoStrings`
  folds capo in before `midiToFret()` ever runs) — only the *numeric labels* add `+ capo` for display,
  matching the existing convention there; the pilot has no capo concept at all, so its own version
  needed no such split.
  Verified live via Playwright on both apps: pilot on `/play/bi-twinkle` (`localhost:3000`) — inlay
  dots visible at 3/5/7/9 and a double dot at 12, label row correctly stops at "12" (this song's own
  highest fret) rather than ever reaching a stray "24"; root app on `#/play/bi-canon` (`localhost:8080`,
  capo 2) — label row reads "5, 7, 9, 11, 14" (raw 3/5/7/9/12 shifted by the song's own capo, exactly
  as expected) with faint inlay dots at each of those screen positions, confirming the capo-relative
  positioning and the capo-adjusted display labels both still agree with each other after the marker
  list was swapped out. Also hit, and ruled out as pre-existing/unrelated to this change, a scare
  during root-app verification: a fresh `#/play/...` load (via either a hard `page.goto()` or an
  in-app link click) renders a fully blank canvas with zero console output until *something* forces a
  `render(clock)` call (clicking 🎸 Frets, or Start) — this app's `render()` was never wired to fire
  once automatically on mount, independent of anything touched in this session; confirmed by
  reproducing the identical blank-then-clickFrets-then-it-appears sequence on a different, untouched
  song (`bi-rising`) with `window.onerror`/`unhandledrejection` listeners installed the whole time and
  catching nothing. 0 console errors throughout the actual verification. `npx tsc --noEmit`,
  `npm run lint`, `npm run build` all clean on the pilot; `check-imports.cjs` + `test-core.mjs` +
  `dom-smoke.mjs` all clean on the root app (148 + 23-view checks). Rebuilt both Docker containers
  together (`docker compose up -d --build guitarpicker guitarpicker-web`), reconfirmed `:8080` and all
  sixteen `:3000` routes serve 200. This entry touched
  `web/src/features/play-song/model/createPerformanceEngine.ts` and `src/views/play.js`.
- **Third instance of the same Frets-neck-size bug, the pilot's own Classic engine:** "Таб увеличь до
  размеров гитарного а то сейчас всего 12" (make the tab as big as a real guitar's, it's only 12 right
  now) — the last of the three places this exact bug could still be hiding. A quick grep for
  `FRETS = 12`/`FRETS\s*=\s*12` across both apps turned up exactly one remaining hit:
  `web/src/features/play-song/model/createPlayEngine.ts`'s own `drawFretboard()` — the pilot's Classic
  engine (kept "exactly as it was" through every Performance-Mode-focused entry above, but this is a
  direct bug report about Classic itself, not a side effect of porting something else, so it gets the
  same direct fix the other two copies already got). Checked `views/editor/ui/TabRoll.tsx` (the
  Guitar-tab editor, the other thing "Таб" could plausibly mean) for the same pattern first — it has
  no fixed fret-count cap at all (it's a scrollable grid, not a small fixed-size diagram panel), so
  ruled that out as the wrong file before touching anything.
  Applied the identical fix a third time: `FRETS` computed per draw call from the current chord's own
  frets (`Math.max(12, ...)`, floored at 12, capped at `inst.frets`), `fbW` scaling with `FRETS / 12`,
  and the same `FRET_MARKERS` constant (standard `[3, 5, 7, 9, 12, 15, 17, 19, 21]`, no 24) plus the
  same inlay-dot pass (translucent circles on the neck, doubled at 12) added to *this* file too — this
  copy hadn't received the finger-color or inlay-dot treatment yet either, since it's Classic and
  those were pilot-Performance-Mode-only up to this point; adding the inlay dots here was folded into
  this same entry rather than deferred, since it's the exact same code shape as the two already-fixed
  copies. Same capo split as the root app's copy: the label text adds `+ capo` for display, but the
  inlay-dot/position math stays in the raw, capo-relative `pos.fret` space `capoStrings` already
  produces before `midiToFret()` runs.
  Verified live via Playwright: switched Settings → "Song player" to Classic, opened `/play/bi-canon`
  (same fret-14, capo-2 song used to verify the root app's copy) — after a first `render()`-forcing
  click on 🎸 Frets (same cold-mount-needs-one-interaction quirk noted two entries up, this time on the
  pilot rather than the root app), the panel read "Next: F#5 · capo 2" with markers "5, 7, 9, 11, 14"
  and the dot sitting correctly on the widened neck, exactly matching the root app's own verification
  of the identical song. 0 console errors. `npx tsc --noEmit`, `npm run lint`, `npm run build` all
  clean; rebuilt the pilot's Docker container, all sixteen routes still 200. This entry touched only
  `web/src/features/play-song/model/createPlayEngine.ts` — the root app (already fixed) and the
  pilot's Performance Mode (already fixed) were not touched again.
- **Frets diagram — always show the full instrument neck, not just what the current chord needs:**
  "Все равно вижу когда нажимаю Freets вижу только 12 а хочу полностью видеть" — reported against
  `/play/832c2773-5626-4e97-9d1b-55264be3d49e`, one of this session's own leftover test drafts (an
  unedited clone of "Twinkle, Twinkle, Little Star," whose melody never leaves frets 0–5). That
  explains the "only 12": the three neck-size fixes above deliberately sized the diagram to whatever
  the *current* chord needed (floored at 12, never more), so a song that never plays anything past
  fret 5 was always going to show a 12-fret neck — working exactly as designed, just not what was
  actually wanted. "Хочу полностью видеть" (I want to see it in full) makes the actual ask clear: the
  neck should always show the instrument's *entire* fret range, regardless of which chord happens to
  be on screen at the moment, not a range that only grows when a chord happens to need it.
  Simplified all three copies (the two already carrying the dynamic "grow to fit the current chord"
  logic — `createPerformanceEngine.ts` and `createPlayEngine.ts` in the pilot — plus `src/views/play.js`
  in the root app, fixed in the same session) from `Math.max(12, ...chord's own frets)` down to a flat
  `inst.frets || 12` (`inst?.frets` in the Performance Mode copy, matching its existing optional-chaining
  style) — always the instrument's own full fret count (15–24 depending on the instrument), falling
  back to 12 only for the handful of `frets: 0` non-fretted instruments this diagram is never actually
  shown for anyway. `fbW`'s own `FRETS / 12` scaling, the `FRET_MARKERS` label/inlay-dot list, and the
  capo-relative positioning from the three prior entries all needed no changes — they were already
  written against "whatever `FRETS` turns out to be," not against the old chord-driven formula
  specifically.
  Verified live via Playwright on the exact draft URL from the report (in-app navigation via
  `/library`, not a direct `page.goto()` — a hard reload to a user-drafted song's `/play/[id]` renders
  a blank mount div, a separate pre-existing quirk unrelated to this fix, already noted two entries
  up): after the usual one-click render-forcing toggle on 🎸 Frets (this app's `render()` never fires
  automatically on mount — same quirk, not this fix's doing), the panel now shows markers all the way
  out to "19" (continuing off-panel to the acoustic guitar's own 20), even though this specific song's
  own notes never ask for anything past fret 1 — confirming the neck no longer tracks the current
  chord at all. 0 console errors (only the pre-existing, unrelated Next.js CSS-preload warnings already
  noted earlier in this doc). `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean on the
  pilot; `check-imports.cjs` + `test-core.mjs` + `dom-smoke.mjs` all clean on the root app (148 +
  23-view checks). Rebuilt both Docker containers together, reconfirmed `:8080` and all sixteen
  `:3000` routes serve 200. This entry touched all three of
  `web/src/features/play-song/model/createPerformanceEngine.ts`,
  `web/src/features/play-song/model/createPlayEngine.ts`, and `src/views/play.js`.
