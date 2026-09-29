# GuitarPicker — FSD / Next.js / TanStack Query / TypeScript pilot

This is a **pilot**, not a replacement. The vanilla GuitarPicker app (the
repo root — zero dependencies, no build step) stays the deployed app. This
directory tries out a different architecture — [Feature-Sliced
Design](https://feature-sliced.design/) on Next.js (App Router) with
TanStack Query, entirely in TypeScript. The root **[Design.md](../Design.md)**
carries the full decision history as a running changelog — every entry from
"FSD/Next/RQ pilot (`web/`), scoped to the Tuner only" onward (search for
`/Next/RQ pilot`) covers one phase of this directory, in order: the
architecture decision itself, each feature ported, the TypeScript
conversion, the sidebar app shell, and the full-audit and full-Song-Editor
passes.

## What's ported

- **Home** (`/`) — the landing page: a "continue where you left off" hero
  (last-played song, or an instrument-appropriate Tuner/Instruments-guide
  nudge), session stats, and a "Jump back in" song row (your instrument's
  songs first, topped up with the rest). Trimmed port of `views/home.js` —
  dropped XP/leveling, the coin economy, the avatar/guitar "Your setup"
  panel, and the whole gamified "Today's Practice" checklist with its
  streak/coin rewards, since Locker/cosmetics/daily-activities aren't part
  of this pilot (same rationale as Settings dropping theming/Locker, and
  History dropping the coins column and daily-streak report line). Replaces
  the earlier `redirect("/library")` placeholder.
- **Tuner** (`/tuner`) — instrument/tuning pick, mic input, live pitch
  detection, a needle + string chips. The original pilot slice: smallest
  self-contained feature, no song data model, no canvas game loop.
- **Play** (`/play/[id]`, e.g. `/play/bi-twinkle`) — two selectable engines,
  chosen by Settings' "Song player" (New/Classic, default New, falls back to
  Classic automatically for non-fretted instruments):
  - **Classic** (`createPlayEngine.ts`) — the original note-highway
    gameplay: grading, healthbar, killfeed, the synthesized backing band,
    strict-mode "freeze and wait" retries, the Vegas-style practice
    timeline, Learn mode. A near-verbatim port of the vanilla app's
    `views/play.js` — same imperative canvas-game structure, same math,
    same audio engine, restructured only where it touched React/Next/the
    old `Store`. See that file's header comment for why it's built this
    way instead of as JSX. Kept exactly as it was, not replaced.
  - **New — Performance Mode** (`createPerformanceEngine.ts`), by request
    from a 26-section brief modeled on Yousician — a guitar-tab note
    highway: string lanes (same visual model as the Song Editor's Guitar
    tab, right down to sharing `shared/lib/finger-colors.ts` for the
    per-note finger color) scrolling right-to-left past a fixed playhead,
    synced to real audio playback rather than a free-running animation
    clock — `player.backing.currentTime`/`player.vocal.currentTime` when
    the song has an attached audio file, an `AudioContext.currentTime`-
    based clock otherwise (most built-in songs are pure synth data, no
    audio file, so there's no media-element clock to read). Chord notes
    (shared onset time) get a soft connecting background band instead of
    reading as unrelated events. Speed (0.1x-2x) reuses `TrackPlayer`'s
    existing `preservesPitch` support, so slowing down doesn't drop the
    pitch — free, already built for the classic engine's own speed
    control. Loop and seek reuse `shared/lib/practice-timeline.ts`'s
    existing drag-to-select timeline verbatim (the same one Classic's
    segment practice already uses) rather than a new seek bar — that shared
    module also draws a minimal note-preview strip along the timeline now
    (by request, not in the vanilla source): each note is a small tick,
    x = time, y = a `row` (0–1) each *caller* computes and hands in — the
    timeline module itself doesn't know about pitch, strings, or frets, just
    places a tick wherever it's told. Performance Mode computes `row` from
    `strIdx / (rows - 1)` (which string a note is on, matching the highway's
    own row layout exactly — by request, "draw it relative to which string
    it's on, not the note/its pitch," since two different frets on the same
    string are different pitches but the same highway row, and an earlier
    pitch-based version spread them apart when the highway itself doesn't).
    Has a
    metronome toggle (`Synth.click()`) and, if the song carries a backing/
    vocal audio file, mute toggles for each (relabeled **🎸 Mute**/**🎤 Mute**
    to stay distinct from the Frets/Karaoke buttons below). By request, the
    rest of Classic's control bar (`createPlayEngine.ts`) is ported onto this
    engine too, reusing the same underlying modules rather than reimplementing
    them, in a second row under the transport controls: **🎤 Karaoke** (a live
    word-fill lyric overlay, built from `shared/lib/karaoke-timeline.ts` +
    `karaoke-render.ts` — the same helpers Karaoke's own stage uses), **🎺
    Band** (the synthesized backing accompaniment, `shared/lib/band.ts`'s
    `Band` class, seeded from the song's own backing parts plus `shared/lib/
    accompany.ts`'s `autoAccompaniment()` for songs that don't define any —
    its `.schedule()` is polled every animation frame, same as Classic),
    **🔊 Notes** (mutes just the lead-note synth voice, independent of Band).
    The highway's inline fret-number labels are unconditional now — sized
    relative to their own note block (originally "maximally big, by the
    size of the block," then dialed back to 0.7x that by request, so it
    now targets roughly 60% of the block's height rather than ~85%):
    `highway-elements.ts`'s `createNoteBlockElement` measures the digit's
    actual ink box (`TextMetrics.actualBoundingBoxAscent`/
    `actualBoundingBoxDescent` + `.width`) at a 100px probe size, then
    scales to whichever of "`0.85 * 0.7` of the block's height" or "the
    block's own width minus a small margin" is more restrictive — self-
    calibrating to whatever font is actually active, rather than a fixed
    ratio eyeballed against one font and wrong for any other. Still
    entirely lane-height-relative, so it stays proportional at every
    fretboard size rather than a fixed pixel size that would only look
    right at one. (An earlier fixed-ratio version of this sizing had been
    calibrated against the wrong font entirely, silently — see "Canvas text
    now actually uses the font it asks for," below — which is also why
    changing ⚙ S/M/L used to stop visibly changing anything once that
    version's width-based shrink kicked in.) **🎸 Frets** is free to
    mean the same thing it does in Classic instead: a "Now:/Next: [chord]"
    fretboard-diagram panel (bottom-left over the highway) showing exactly
    where to put your fingers, ported near-verbatim from Classic's own
    `drawFretboard` as `drawDiagram()` (dropped only the capo term, since
    Performance Mode doesn't model capo anywhere else, including on the
    highway's own fret numbers — leaving it out keeps the two consistent).
    The fret-position number inside each dot is sized to its dot the same
    self-calibrating way the highway's own digits are — measured from the
    label's real ink box, not a fixed ratio — and the dot itself grows or
    shrinks to match, rather than staying a fixed radius while the number
    inside it changes size. Each dot is colored by finger ("на Frets —
    вставляем цвета пальцев"), the same `shared/lib/finger-colors.ts`
    palette the highway and its legend already use, rather than the flat
    accent/white it drew before — a chord's `finger` is one value for the
    whole note (the same simplification the highway's own per-groupId
    coloring already makes), so every dot in a chord still shares one
    color. The old accent-vs-white contrast between "Now:" and "Next:" is
    now full-vs-dimmed opacity on the finger color instead, so that
    distinction survives the switch. The neck itself was a flat 12 frets
    regardless of the chord being shown ("не хватает размера грифа сейчас
    всего 12 - а нужно расширить") — any note whose minimal fret position
    landed past the 12th (a real possibility on instruments that go up to
    15-22 frets) drew its dot off the edge of the panel entirely. The
    neck now widens to
    whatever the *currently shown* chord actually needs — never less than
    12 (so an ordinary low-fret song still gets the familiar compact view)
    and never more than the instrument's own fret count — with the panel
    growing to keep each fret roughly the same width rather than cramming
    more of them into a fixed box, and the position-marker row (previously
    a hardcoded 3/5/7/9/12) extending to 15/17/19/21/24 as needed.
    Its own size cycles independently via the **🖐 S/M/L** button joined
    right onto it — one seamless pill-shaped control with no gap between the
    two (a shared `.btn-group` CSS rule, by request), even though each half
    keeps its own click target and state (a separate `fretDiagramSize`
    setting, distinct from `fretboardSize`, by request — "keep the main
    player's own string-size control as is"), a hand icon rather than a
    second gear so it doesn't read as one more
    control for the same thing as **⚙ S/M/L** (cycles the *highway's* own
    lane/string size, the same `FRET_SCALE` factors, untouched by this
    change), and **🎓 Learn** (`features/learn-mode/model/createLearnMode.ts`,
    verbatim from Classic — splits the song into 16-beat segments with
    Prev/Next navigation, rewinds and drops to half speed on entry, restores
    full-song/no-loop state on exit). The segment/loop controls (label,
    🔁 Loop, ✕ Clear, Learn/Prev/Next) live in the same single control bar
    as everything else above, wrapping onto it like any other button rather
    than sitting in a row or panel of their own — by request, twice over
    ("make it one common panel, not separate," then "put this row in the
    same row as everything else — Speed, Karaoke, Band, ..."). **☑ Repeat
    till right** (strict mode) is now fully live, ported from Classic on
    request ("Полная система как в Classic" — the full system, not just the
    retry mechanic): live mic pitch detection (`shared/lib/pitch.ts`'s
    `detectPitch()`/`PitchTracker`, cents-based octave-agnostic matching
    against each note's `midi` array, the same `PERFECT_CENTS=28`/
    `GOOD_CENTS=60` thresholds and `HIT_PAD` grading-window padding Classic
    uses), the same health/score/streak/multiplier HUD, killfeed, and
    pass/fail banner, and the same freeze-retry-ramp state machine on a
    miss. Adapted rather than copied verbatim in two places forced by this
    engine's different shape: grading is tracked per-note in a `GradeNote[]`
    grouped by the highway's existing `groupId` (Classic already grades
    per-pitch, since its highway has no chord grouping), and the freeze
    itself works through a `rate`/`effRate` split — `effRate` is what
    actually drives `now()`/`scheduleAudio()`, temporarily diverging from
    the user's own `rate` during a retry's slow-motion ramp — since this
    engine's clock is a computed, `AudioContext`-anchored `now()` rather
    than Classic's own frame-accumulated one, and can't simply stop
    ticking to freeze. Learn mode's auto-speed-up-on-clean-pass half
    (`record()`/`evaluatePass()`) is wired up to this real grading and
    works for real now too, matching Classic's own trigger points exactly.
    `finish()` calls `host.addHistory()` same as Classic, tagged with
    `mode: "performance"` (an existing, previously-unused optional field)
    so a History entry can be told apart from a Classic one.
    **🎯 Free mode**, Performance-Mode-only (no Classic counterpart — this
    one has no brief section or vanilla-app original to port from), chains
    that same freeze-and-wait through the *whole* song rather than only
    after a miss: `resolveWait()` branches on a `freeMode` flag and, instead
    of ramping back up to speed and resuming playback, calls `pickNextFree()`
    to freeze on whichever not-yet-graded note comes next
    (`firstPendingFrom()`, time-sorted) — no clock-driven playback runs at
    any point (no backing/vocal audio, no note-sound/metronome scheduling,
    no band), and `play()` routes to a dedicated `playFree()` instead of the
    normal timed path. Mic-only by request — there's no manual "skip this
    note" fallback, so a denied or unavailable mic just can't make progress
    (the same `ensureMic()` toast is the only feedback) — and health/score/
    killfeed run through the exact same `applyJudgment()` the wait already
    used, which in practice means no penalties: that wait only ever
    resolves a note as perfect/good, a wrong pitch just keeps waiting.
    Mutually exclusive with Learn mode (each disables the other's control,
    and turning Free mode on force-exits Learn if it was active) since
    Learn's segment/loop bounds are enforced inside the normal clock-driven
    `tick()`, which Free mode never runs; also disables Repeat till right's
    own toggle, since strict mode has nothing left to do once every note
    already waits that way. Also out of
    scope for this pass: song
    sections (Intro/Verse/Chorus — no data model or authoring UI exists
    for this anywhere in the pilot) and the strum-direction overlay. The
    string lanes are colored/weighted like real strings (a gradient from
    thick, copper/bronze at the lowest string to thin, near-white silver
    at the highest, plus a faint sheen line) rather than flat highway
    rules. A **✏️ Edit** button in the HUD opens the song in the Guitar tab
    editor **as an independent draft** — `entities/song/model/
    user-songs.ts`'s `cloneSongAsDraft()` gives it a fresh id and a
    "(draft)" title suffix when the song being played is a read-only
    built-in, so tweaking a note or setting finger assignments from the
    Player can never overwrite the track itself; if it's already an
    editable user song, Edit just opens it directly, same id. Also carries
    its own **finger-color legend** button, fixed to the page's bottom-right
    corner — moved here from the global topbar (see "App shell" below) since
    finger colors only mean anything while looking at a string+fret
    highway, not on every page in the app.
- **Karaoke** (`/karaoke` picker, `/karaoke/[id]` stage) — the teleprompter
  sing-along: word-by-word lyric fill, per-line count-in, backing playback +
  optional guide vocal, optional sing-and-score (mic pitch graded against the
  vocal melody via the shared `Grader`, octave-agnostic). A near-verbatim
  port of `views/karaoke.js`'s `stage()`, same imperative-engine reasoning as
  Play — see `src/features/karaoke-song/model/createKaraokeEngine.ts`.
- **Library** (`/library`) — a minimal song picker (25 built-in songs) so
  Play's "← Songs" has somewhere real to go, plus a 🎤 link into Karaoke for
  songs with lyrics. Not the vanilla Library — no import/export, filters, or
  transpose/capo suggestions.
- **History** (`/history`) — session list, filters (instrument / today / best
  per song), accuracy + score trend charts, and a "🤖 Export for Claude"
  Markdown practice report. Ported from `views/history.js` as plain JSX (it's
  filtering/rendering, not a canvas game loop) — dropped the cosmetics/coin
  "Collection" panel and the report's daily-streak line, since Locker and the
  Home daily-activity streak aren't part of this pilot.
- **Settings** (`/settings`) — input/output device pick (+ a mic test toggle),
  backing/vocal volume, mic noise gate, A4 calibration, note-highway speed,
  default instrument, string-label style, **song player (New/Classic, see
  the Play bullet below)**, export/reset local data. Ported
  from `views/settings.js` as plain JSX — dropped theming (this pilot is
  dark-only), the Locker link, and the whole "Account & Sync (cloud)" section
  (Google sign-in is disabled for now, so there's nothing there to configure).
  The Sound & detection panel has a "▶ Preview mix" button — not in the
  vanilla source, added by request so you can actually hear Backing/Vocal
  volume and A4 calibration while dragging the sliders instead of only
  seeing numbers: it plays a sustained chord at `backingVolume` plus a short
  melodic phrase on top at `vocalVolume`, both tuned to the current `a4`,
  via `Synth.playMidi`. Note highway speed and the mic noise gate aren't
  audio-output settings, so the preview says as much rather than pretending
  to reflect them.
- **Instruments** (`/instruments`) — a specs-and-playing-guide reference for
  every instrument this pilot models: family, range, strings with playable
  reference pitches, alternate tunings, the harmonica hole chart, anatomy,
  how-to-play, techniques, tips, care, and how the pilot itself supports each
  one — plus a "download as Markdown" export. Ported from `views/instruments.js`
  and its data source `music/instrument-guide.js`, trimmed from the vanilla
  app's 59 instruments to the 16 this pilot's `entities/instrument` already
  models (same trimming rationale as that file — see its header comment).
- **Glossary** (`/glossary`) — an interactive chord/scale explorer (pick a
  root + type, hear it via `Synth.playMidi`), an interval table (click ▶ to
  hear each one), a circle-of-fifths display, and a searchable/
  category-filterable term dictionary. Ported from `views/glossary.js` as
  plain JSX — the interactive reference and the dictionary are the same two
  sections the vanilla view has; nothing was dropped, since this view was
  already just forms + filtering, no cosmetics/coins/canvas involved.
- **Theory Games** (`/theory-games` menu, `/theory-games/[id]` quiz) — five
  bite-sized quizzes (interval ear training, chord quality by ear, interval
  spelling, key signatures, scale degrees), 8 questions each, instant
  right/wrong feedback, a finish screen, and a persisted high score per
  quiz. Ported from `views/minigames.js` — the quiz generators and dictionary
  ported verbatim; the per-drill high score is a trimmed slice of the
  vanilla `Store.progressFor("theory").drills` (own localStorage key,
  `shared/lib/theory-progress.ts`) with no XP attached, since XP there is
  only ever granted by playing a song, never by a drill, and Training's
  course-step tracking on that same vanilla object isn't ported.
- **Song Editor** (`/editor` new, `/editor/[id]` edit) — the full vanilla
  `views/editor.js`, ported in full by request after an initial pass had
  trimmed it to just metadata + text notation: song metadata (title, artist,
  BPM, capo, instrument, key, difficulty, genre); a background picker
  (solid colour swatches, animated presets, or an uploaded-image slideshow);
  optional backing/vocal audio-file attachment (stored as data URLs inside
  the song); a text-notation note entry (`PITCH:beats`) alongside a
  click-to-paint **piano roll** (click an empty cell to add a note and hear
  it, click an existing one to delete it, with snap/note-length controls
  and an Instrument/Vocal layer toggle shared with the notation panel's
  "⇣ From roll"/"Apply notation" buttons); a **vocal melody** layer for
  Karaoke scoring (copy from the instrument notes, ±1 octave shift, or
  **hum-to-capture** — sing the line and it transcribes, reusing
  `features/listen-record`'s recorder hook); and a full **Lyrics &
  Karaoke** panel (add lines, import/paste/export `.lrc` — including
  enhanced inline word-timing tags — and **tap-to-time**: play along,
  tap or press Space on each word as you sing it). The page is split into
  three tabs (Song / Vocal melody / Lyrics & Karaoke, the same `.pillRow`
  control the Background type picker uses) — Details, Background, Audio
  tracks, Notes and the Piano roll stay together under "Song", while the
  Vocal melody and Lyrics & Karaoke panels each get their own tab, by
  request, so the page isn't one long stacked scroll. Within "Song",
  Details/Background/Audio tracks are collapsed by default (native
  `<details>`/`<summary>`, same disclosure pattern the Instruments page
  uses) — also by request, so opening the page for a quick note-entry
  session doesn't front-load three forms you may not need to touch; Notes
  and the Piano roll stay always-open since editing notes is the page's
  main job. The note grid itself has a second **Guitar tab** view
  (`views/editor/ui/TabRoll.tsx`), by request with a Yousician reference
  screenshot and a full brief for how it should work — one horizontal lane
  per string, high string on top like printed tab, fret numbers drawn on
  the notes, colored by fretting-hand finger (1-4/thumb/none, a "Finger"
  pill row arms the color for new notes) — a **FingerLegend** button next to
  that pill row opens the color explainer without leaving the editor (see
  "App shell" below for where this same widget also lives). Click an empty lane to add
  an open-string note and select it; click a placed note to select it (drag
  to move it — left/right retimes, up/down changes string, the fret carries
  over unchanged); scroll on a note (a real, non-passive `wheel` listener on
  the canvas — React's own `onWheel` prop is passive and can't actually
  `preventDefault()`, which used to leak the scroll to the page underneath;
  fixed, and any vertical wheel motion over the canvas is now captured
  regardless of whether it lands on a note, while a horizontal gesture still
  pans the timeline), or type a digit while it's selected, to change its
  fret. A right-hand **Inspector** panel edits the selected
  note's time/string/fret/duration/finger directly, with Duplicate/Delete.
  **Sequential input** mode is the fast path the brief was built around: turn
  it on and typing digits 0-9 places a fret on the armed string and
  auto-advances the cursor, so a whole line goes down without touching the
  mouse. Undo/redo (Ctrl/Cmd+Z, local to this editor, one stack per layer)
  and a **Play/Pause/Stop** preview with a **Speed** slider (0.1x-2x, by
  request — schedules `Synth.playMidi` against a `requestAnimationFrame`
  playhead, both scaled by the rate; dragging it mid-playback restarts the
  scheduled notes from the current position at the new rate instead of
  waiting for Stop — a lightweight scrub tool, not Play/Karaoke's
  sample-accurate scheduler, which already has its own independent Speed
  slider for actual practice pacing) round it out. Only offered for
  fretted instruments (falls back to Piano roll for piano/voice/wind/bowed/
  percussion). Deliberately trimmed from the brief: multi-select and bulk
  edit, velocity, playing techniques (hammer-on/pull-off/slide/bend/
  vibrato/mute), two-digit keyboard fret entry (10+ frets go through the
  Inspector, the wheel, or arrow nudging), and a separate minimalist "Play
  mode" screen. `TabRoll` also has its own **Quick entry** row — a compact
  `string:fret:beats` text notation (`shared/lib/tab-entry.ts`), e.g.
  `1:5:1 1:0:1 1:5:1`, mirroring the piano roll's own PITCH:beats notation
  panel but for tab; Apply replaces the whole layer, "⇣ From tab" fills the
  box from the layer's current notes — plus a **"📋 Paste ASCII tab"**
  button next to it, a second import path via a `window.prompt()` dialog
  (same pattern as EditorPage's own "Paste LRC"), for the classic
  `e|--5--0--|`-style block: one line per string, top = highest string,
  replacing the layer. Saved songs show up in
  a "Your songs" section on Library (with Edit/Delete) and play/grade in
  Play exactly like a built-in song, and sing in Karaoke if they carry
  lyrics/a vocal melody.
  **Import/export** (the header's Import button + format `<select>` +
  Export button) covers three formats, by request — keep the existing
  `.gpsong.json` plus add the industry standard for guitar tab:
  - **MusicXML** (`shared/lib/musicxml.ts`, `.musicxml`) — the default. The
    one open standard that actually defines `<technical><string>/<fret>`
    for tab, so it's both imported and exported, round-tripping title/
    artist/tempo/key/notes/chords/rests and `<fingering>` faithfully (see
    that file's header comment for the deliberate simplifications: assumes
    4/4 throughout since this app has no time-signature field anywhere
    else, doesn't tie a note across a barline, only the instrument layer
    round-trips — not the vocal melody — and import recomputes string/fret
    against whatever instrument is *currently* selected rather than
    trusting the file's own tuning, so a tuning mismatch can't put a note on
    a string that doesn't exist).
  - **GuitarPicker JSON** (`.gpsong.json`) — unchanged, still `serialize(song)`
    verbatim; the only one of the three that round-trips *everything*
    (background, audio, lyrics, the vocal layer, all of it), so it's what
    Library's own songs use internally.
  - **ASCII Tab** (`shared/lib/ascii-tab.ts`, `.tab.txt`) — export from
    EditorPage's header (fretted instruments only, hidden from the format
    list otherwise); import is separate, by request — a second import path
    via TabRoll's own "Paste ASCII tab" dialog rather than the header's
    file-based Import, matching how the format is actually shared (pasted
    into a forum post or a chat, not attached as a file). Lossier than
    MusicXML on import since rhythm isn't really encoded in the format,
    only column position — duration is *inferred* (a note rings until the
    next one on any string starts), and the pasted block's string-line
    count must match the current instrument's.
  Import replaces the song currently being edited (title/artist/tempo/key/
  notes come from the file; the song's `id` and instrument selection are
  kept from the current editing session).
- **Training** (`/training`) — three course progressions (Guitar
  Foundations, Strumming & Songcraft, Lead & Improvisation) built from
  built-in songs and generated skill drills, each step locked until the
  previous one is passed; six skill drills (chromatic warm-up, scales,
  chord changes, pentatonic, blues) with an adjustable-tempo slider,
  generated into a real song and opened in Play. Ported from
  `views/training.js` — course/drill logic and step-lock/pass state (both
  always derived from session history, never from the vanilla app's
  XP/level object) carry over unchanged; the header's Level/XP stat pair is
  the only thing dropped, since XP/leveling isn't part of this pilot (same
  exclusion as Home and Theory Games) — replaced with steps-passed/
  drills-tried/passes counts, all from history too.
- **Listen & Make** (`/listen`) — record a melody with the microphone
  (tempo slider + tap-tempo, live note + level meter while recording), then
  transcribe it into a draft song and hand it straight to the Song Editor
  (`/editor/[id]`, already saved as a user song) to name, tweak, or extend.
  Ported from `views/listen.js`, mic path only — dropped the optional
  screen-capture slideshow (`getDisplayMedia` + periodic snapshots
  composited behind the notes, a second unrelated capture pipeline) and the
  in-page difficulty-level (beginner/intermediate/advanced note
  simplification) and background pickers with their own Play/Save buttons;
  this pilot transcribes once and lets the Editor handle refining and
  saving, since it already owns that job for every other song source.
  `shared/lib/transcribe.ts` (`framesToNotes`/`quantizeNotes`) is ported
  verbatim — the same transcriber the vanilla app's Editor uses for
  hum-to-capture, though that specific Editor feature isn't ported here (see
  the Song Editor bullet above).

## App shell

Every non-fullscreen page is now wrapped in a persistent left sidebar +
topbar (`widgets/app-shell`), matching the vanilla app's own `#app` grid
(`styles/main.css`: a 248px sidebar + topbar over the active view) — added
after the user pointed out the pilot had no sidebar at all, just a small
pill nav each page rendered inline at its own top (the retired
`widgets/pilot-nav`). The sidebar groups links the same way the vanilla
nav does (Play / Create / Grow / System), minus the "You" group, since its
one entry is Locker and Locker isn't part of this pilot. The topbar shows
the current section's title, mirroring the vanilla app's `#crumb` — no coin
chip (tied to the coin economy). The sidebar footer does have a live IO
indicator (`no mic` / `System default`, going green when the mic is
actually capturing) — added right after the shell shipped, once the user
asked for it specifically; it's driven by `audioEngine.onChange()`, a new
subscribe hook fired on mic start/stop and output-device changes, read via
`useSyncExternalStore` the same way every other browser-only value in this
pilot is (see `shared/lib/audio-engine.ts`). It reads whatever device state
already exists — visiting the shell alone never requests mic permission or
enumerates devices on its own.

Play's and Karaoke's fullscreen stage keep the whole viewport, same as the
vanilla app's `#view.no-pad` — `AppShell` checks the route (`/play/*`, or
`/karaoke/*` other than the picker itself) and renders bare `{children}`
for those instead of the sidebar/topbar grid, since those two views already
build their own full-bleed canvas UI.

A **finger-color legend** (`widgets/app-shell/ui/FingerLegend.tsx`) started
here, in the topbar's right side, by request with a reference glove image
and an exact color list — index yellow/mustard, middle purple, ring light
blue, pinky orange-red/terracotta, thumb white/uncolored, drawn as an inline
SVG rather than the reference image itself (a flat JPEG with a
"transparent" checkerboard baked into its actual pixels, which would render
as a broken-looking checkered square at icon size). It's since moved out of
the topbar — by request, since it cluttered every page for something that
only means anything on two of them — and now lives bottom-right of
**Performance Mode** instead (`createPerformanceEngine.ts`'s own
`handIconSVG()`/`.perf-legend-*` — a vanilla-DOM rebuild of the same
widget, since that engine isn't React); the Song Editor's Guitar tab view
(`TabRoll.tsx`) still has its own copy too, next to its Finger pill row.
All three read their colors from the same `shared/lib/finger-colors.ts`, so
they can't drift out of sync with each other or with what the editor
actually paints.

`app/globals.css` gained the vanilla midnight theme's own color tokens
(`--bg`, `--panel`, `--line`, `--text`, `--muted`, `--accent`, etc., copied
from `styles/themes.css`) for `AppShell` to use. Every other page's CSS
module keeps its own already-close hardcoded hex values rather than being
migrated to these tokens in the same pass — that's a separate, larger
refactor this one doesn't attempt.

## Layout (Feature-Sliced Design)

```
src/
  app/            Next.js App Router — routing + the root layout/providers/
                   global CSS only.
                   (Next.js reserves a top-level `pages/` dir for its own legacy
                   Pages Router, so FSD's "pages" layer lives at src/views/ here —
                   the collision + rename is called out in app/tuner/page.tsx.)
  views/
    home/            The landing page ("/") — hero, stats, "Jump back in".
    tuner/         The Tuner screen; composes everything below it.
    play/           Thin wrapper that mounts features/play-song's engine into
                     a ref — see its header comment.
    karaoke/         The picker (plain TSX) + a thin wrapper mounting
                     features/karaoke-song's engine, same split as Play.
    library/        The song-picker screen.
    history/         Session list/filters/trend charts/report — plain TSX,
                     with a small model/ for the Markdown report builder.
    settings/        Devices, sound/detection, defaults, data export/reset —
                     plain TSX; the one page that both reads live settings
                     reactively and uses TanStack Query for real async data
                     (device enumeration) — see "Why TanStack Query" below.
    instruments/     The instrument specs/playing-guide reference — plain
                     TSX, native <details>/<summary> disclosure panels, no
                     model/ of its own (reads entities/instrument/model/guide.ts).
    glossary/        The chord/scale explorer + interval table + circle of
                     fifths + term dictionary — plain TSX, no model/ of its
                     own (reads shared/lib/glossary-data.ts and theory.ts).
    theory-games/    The quiz menu (TheoryGamesPicker) + quiz runner
                     (TheoryGamePage), same picker/stage split as Karaoke —
                     plain TSX, reads shared/lib/theory-games.ts (the
                     generators) and theory-progress.ts (high scores).
    editor/          EditorPage (the full form — meta, background, audio,
                     notation, vocal layer, lyrics/LRC/tap-to-time) +
                     PianoRoll (the click-to-paint canvas, a plain
                     redraw-on-data-change component — no continuous game
                     loop, unlike Play/Karaoke, so no reason to be a mounted
                     engine) + TabRoll (the Guitar tab view PianoRoll
                     switches to for fretted instruments — string lanes,
                     fret numbers, per-note finger color, drag, sequential
                     keyboard entry, local undo/redo, a playback preview;
                     its own file since it's a different editing model —
                     string+fret+finger with a stable per-note id — not
                     just another canvas draw routine) + EditSongLoader
                     (resolves an existing user song for /editor/[id], same
                     resolve-then-render split as Play/Karaoke's song
                     lookup).
    training/        Course progressions + skill drills — plain TSX, reads
                     shared/lib/drills.ts and session history; step-lock/
                     pass state and drill high scores both derive from
                     history, no separate progress object.
    listen/          Record + transcribe — plain TSX composing
                     features/listen-record's hook; hands off to the Song
                     Editor rather than owning its own save/difficulty/
                     background pickers.
  widgets/
    app-shell/       The persistent left sidebar + topbar (AppShell),
                     mounted once in app/layout.js around every page —
                     matches the vanilla app's own #app grid (a 248px
                     sidebar + topbar over the active view), which this
                     pilot didn't have until now (see "App shell" below).
                     Retired widgets/pilot-nav, the per-page pill nav every
                     view used to render inline at its own top. FingerLegend
                     (the finger-color hand icon + explainer modal) lives
                     here too — no longer used by AppShell itself (moved out
                     of the topbar, see "App shell" below), but still
                     imported by TabRoll, so the file stayed.
    cloud-account-badge/   Sign-in status, built on entities/cloud-account.
                   **Currently unused** — not rendered anywhere (see the
                   "Why TanStack Query" section below).
  features/
    play-song/      Two selectable Play engines (imperative — each builds
                     its own DOM/canvas/game loop, the same way a canvas-
                     game library would): the ported classic engine
                     (createPlayEngine.ts) and the new guitar-tab
                     Performance Mode engine (createPerformanceEngine.ts) —
                     see the Play bullet above for what split between them.
                     Performance Mode's own highway visuals are further
                     split into highway-elements.ts — factory functions
                     (createNoteBlockElement, createStringLineElement, etc.)
                     returning plain objects with their own state (a note's
                     status/content/font size in particular) and a
                     draw(ctx) method, still Canvas2D — not DOM/React, by
                     request; see that file's own header comment for why.
    karaoke-song/    The ported Karaoke stage engine — same imperative
                     reasoning, shares most of its infra with play-song.
    learn-mode/      createLearnMode() — segment slicing + the per-segment
                     speed ramp, ported verbatim (already framework-agnostic).
    tune-string/     Tuner's core interaction: mic lifecycle, pitch-detect
                     loop, string target lock + reference tone.
    select-instrument/   Instrument + tuning <select>s.
    listen-record/   useListenRecorder() — mic lifecycle + a per-frame
                     pitch-detect loop (live note/level meter/elapsed),
                     same structure as tune-string's hook; hands back the
                     raw pitch-frame stream on stop for shared/lib/
                     transcribe.ts to turn into notes. Reused as-is by the
                     Song Editor's hum-to-capture (a second instance of the
                     same hook).
    tap-lyrics/      useTapToTime() — the Song Editor's tap-to-time word
                     timing: a keydown (Space) + rAF loop, an optional
                     TrackPlayer if the song has backing audio, and a draft
                     lyrics array (kept in refs, not state, so the keydown
                     handler always stamps against fresh data rather than a
                     stale render's closure) handed back on stop.
  entities/
    song/            Song schema, the 25-song built-in library, the catalog
                     (find/list, built-in only — pure/SSR-safe), and
                     user-songs.ts (the Song Editor's localStorage store,
                     same useSyncExternalStore-friendly shape as
                     player-settings.ts's history — kept separate from
                     catalog.ts so anything reading only the built-in list
                     stays hydration-safety-free).
    instrument/      Tuning + fretboard data (INSTRUMENTS, ALT_TUNINGS,
                     midiToFret/midiToHole, stringLabel) — shared by Tuner and
                     Play — plus model/guide.ts, the prose+facts reference
                     data the Instruments page reads (GUIDE, instrumentFacts,
                     harmonicaChart, buildInstrumentsMarkdown).
    cloud-account/   Google sign-in — api/ (fetch calls) + model/ (TanStack Query
                     hooks). **Built but disabled for now** — the code is here,
                     just not wired into any page (see below). The only
                     genuinely async, networked resource in the app when it
                     is enabled; everything else here is synchronous browser
                     APIs or localStorage.
  shared/
    lib/            Framework-agnostic ports: pitch detection, note/frequency
                     math, the mic AudioContext singleton (device enumeration,
                     the chosen output device — see audio-engine.ts), the
                     synth voices + one-shot player + backing-band scheduler,
                     chord/capo theory (now also `INTERVALS`, for Glossary
                     and Theory Games), scale math (`SCALES`/`scaleNotes`/
                     `CIRCLE_OF_FIFTHS`/`KEY_SIGNATURES`, in note-math.ts),
                     `glossary-data.ts`'s term dictionary, `theory-games.ts`'s
                     five quiz generators and `theory-progress.ts`'s
                     high-score store, `drills.ts`'s course/drill
                     definitions and song generators (Training),
                     `transcribe.ts`'s pitch-frames-to-notes transcriber
                     (Listen & Make, and the Song Editor's hum-to-capture),
                     `lrc.ts` (`parseLRC`/`toLRC`, the Song Editor's Lyrics
                     & Karaoke panel), `musicxml.ts` (`songToMusicXML`/
                     `musicXMLToSong`, the Editor's default import/export
                     format) and `ascii-tab.ts`/`tab-entry.ts` (its ASCII Tab
                     export + paste-dialog import and Guitar tab Quick entry
                     text notation), `finger-colors.ts` (the finger -> color
                     map TabRoll, Performance Mode, and FingerLegend all
                     read from),
                     auto-accompaniment, canvas song backgrounds (now also
                     `ANIMATED_BACKGROUNDS`/`SOLID_SWATCHES` for the Editor's
                     background picker),
                     the karaoke lyric-timeline/grader/render
                     engine, the practice timeline widget, `el()`/`slider()`/
                     `toast()` (what Play's and Karaoke's engines are built
                     with) plus `download()`/`pickFile()`/`lineChart()`
                     (used from plain React — the first two by the Song
                     Editor, the chart by History), and a trimmed localStorage
                     settings/history store — both `getSettings()` and
                     `getHistory()` return a stable reference until something
                     actually writes (`setSetting`/`addHistory`), which is
                     what lets `useSyncExternalStore` (React's fix for reading
                     a browser-only value without a hydration mismatch — see
                     Design.md) use them safely; `subscribeSettings()` also
                     makes Settings' own controls re-render live. No React, no
                     Next in any of it — same code could back a different UI
                     layer entirely.
```

## Why TanStack Query is scoped to genuinely async things

The vanilla app is local-first: songs/settings/history live in
`localStorage`, read and written synchronously — there's no server-state to
cache or invalidate there, so wrapping it in RQ would fight the grain rather
than fit it (`useSyncExternalStore` is what those use instead — see
`shared/lib` above). RQ is reserved for things that are actually asynchronous:

- **Google sign-in** (identity only in this pilot — no `drive.appdata` scope,
  since it doesn't port the file-sync half). `entities/cloud-account/model/
  useCloudAccount.ts` wraps it: a `useQuery` that silently restores an
  existing Google session, and `useMutation`s for sign-in/out that write
  straight into that query's cache via `setQueryData`. **Off for now, by
  request** — `widgets/cloud-account-badge` isn't rendered anywhere (it was
  removed from `TunerPage`), so this call site is currently inactive;
  re-enabling is just re-adding `<CloudAccountBadge />` where it's wanted.
- **Audio device enumeration** (Settings): `navigator.mediaDevices.
  enumerateDevices()` is a real async browser call, not a localStorage read,
  so `views/settings/ui/SettingsPage.tsx` uses a plain `useQuery` for it —
  `queryClient.invalidateQueries()` refetches after granting mic permission,
  since device labels only appear once it's granted. (This also sidesteps a
  newer ESLint rule, `react-hooks/set-state-in-effect`, which flags a plain
  `useEffect(() => { asyncFn() }, [])` fetch-on-mount outright, regardless of
  the setState happening after an `await` — see Design.md for the story.)

`QueryClientProvider` is wired in `app/providers.tsx` regardless of whether
either call site above is currently active.

## TypeScript

The whole pilot is TypeScript (`.ts`/`.tsx`) — `strict: true` in
`tsconfig.json`, no blanket `any`. Data shapes worth knowing about:

- `entities/song/model/song-format.ts` — `Song`, `Note`, `SongPart`,
  `LyricLine`, etc. — the schema every feature/engine imports.
- `shared/lib/player-settings.ts` — `PlayerSettings`, `HistoryEntry`, and
  `EngineHost` (the Play/Karaoke engines' host contract).
- `shared/lib/karaoke-grader.ts` — `Grade`, `GradeTarget` (a graded note:
  the song `Note` plus the grader's running best-match state).

The two imperative canvas engines (`createPlayEngine.ts`,
`createKaraokeEngine.ts`) stay dynamically-shaped where the DOM genuinely is
— `el()`'s props bag, `querySelector` results cast to the element type the
caller already knows it built — rather than fighting TypeScript to model a
hyperscript builder structurally. Everything else (song/settings/history
data, the grader, the audio layer, every React component's props) is fully
typed.

## Canvas text now actually uses the font it asks for

Every canvas-drawn label in this pilot used to set `ctx.font` to a template
string like `` `bold 16px var(--mono)` `` — copying the pattern already used
correctly for *colors* (`getVar("--accent")` etc., `shared/lib/dom.ts`), but
Canvas2D's `font` property doesn't work that way: it isn't a normal CSS
property, so it never substitutes `var(...)` tokens, valid or not — the
whole assignment is silently rejected and `ctx.font` just keeps whatever it
was already set to (the canvas's own built-in default, "10px sans-serif",
if nothing had ever successfully set it). Compounding it, `--mono`/`--font`
had never actually been *defined* anywhere in this pilot's CSS either.
Neither half of that was visible at a glance — canvas text still rendered
*something*, just always the tiny fallback, at every size any code ever
asked for. Found while chasing a report that Performance Mode's fret-number
size "wasn't changing no matter what ⚙ S/M/L was set to": a fit-to-block
sizing pass measures its own text width to decide whether to shrink, and
since that measurement was *also* against the broken fallback font, the
result stopped depending on the (correctly computed, but never rendered)
target size entirely — S/M/L had genuinely stopped mattering, as reported.
Confirmed by patching `CanvasRenderingContext2D.prototype`'s `font` setter
to log attempted-vs-applied values live.

Fixed at the root: `globals.css` now defines real `--mono`/`--font` values,
and every `` `...px var(--mono))` ``/`` `...px var(--font)` `` in the
codebase became `` `...px ${getVar("--mono")}` ``/`` `...px
${getVar("--font")}` `` — resolving the custom property to a literal string
in JS first, the same way colors already were, since embedding the raw
`var(...)` token in a canvas font string was never going to work regardless
of whether the property existed. This wasn't Performance-Mode-only: the
same pattern existed in eight places — `createPerformanceEngine.ts`,
`highway-elements.ts`, `createPlayEngine.ts` (Classic's own
`drawFretboard`/`drawHoles` panel and countdown number), `createKaraokeEngine.ts`,
`shared/lib/dom.ts`'s `lineChart` (History's trend charts), and the Song
Editor's `TabRoll.tsx`/`PianoRoll.tsx` — all fixed in the same pass rather
than leaving the other seven silently wrong after fixing only the one that
got reported.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000 (Home)
npm run build   # production build (runs its own tsc pass)
npm run lint
npx tsc --noEmit   # type-check only, no build
```

Needs mic permission, same as the vanilla app. No env vars needed — Google
sign-in is disabled for now (see above), so there's nothing to configure.

### Docker

Isolated build + run, same spirit as the vanilla app's root `Dockerfile` —
multi-stage, ships only the traced `output: "standalone"` production files
(no `node_modules`, no source), runs as the non-root `node` user, lints as
part of the build so a broken build can't ship:

```bash
docker build -t guitarpicker-web .
docker run --rm -p 3000:3000 guitarpicker-web
```

Or, from the repo root, bring both apps up together — the vanilla app on
`:8080`, this pilot on `:3000`, deliberately different ports since they're
separate deployments:

```bash
docker compose up -d --build           # both
docker compose up -d --build guitarpicker-web   # just this one
```

## Deliberately out of scope for this pilot

- Locker/cosmetics/coin economy is the only vanilla top-level view not
  ported at all — every other view now has at least a trimmed pilot
  counterpart (Home, Tuner, Play, Karaoke, a minimal Library, History,
  Settings, Instruments, Glossary, Theory Games, Song Editor, Training,
  Listen & Make).
- Theory Games' high scores are ported (a plain best-count per quiz); XP and
  the rest of the vanilla app's `Store.progressFor()` object are not — see
  the Theory Games bullet above. Training's own step-lock/pass state was
  never part of that object in the vanilla source either (it's derived from
  session history there too), so nothing needed trimming there.
- Listen & Make's screen-capture slideshow and its own in-page difficulty/
  background pickers — see the Listen & Make bullet above; it transcribes
  once and hands off to the Song Editor instead.
- Instruments here covers only the 16 instruments this pilot already models
  (Tuner/Play's `entities/instrument`), not the vanilla app's full 59.
- Play's and Karaoke's player-avatar HUD badge (cosmetics/Locker aren't
  ported) — and, in History, the cosmetics/coin "Collection" panel and any
  coins column, plus the practice report's daily-streak line (Home's daily
  activity checklist isn't ported either).
- The Drive **file sync** itself (appData read/write, merge) — only sign-in,
  and that's currently disabled too (see "Why TanStack Query" above).
- The 25 more songs in the vanilla app's `songs-extra.js` — this pilot ports
  only `songs.js`'s own 25, enough for a real library without doubling the
  amount of pure data moved over.
- Theming (skins/`data-theme`) — this pilot is dark-only, so Settings has no
  theme picker and no Locker link.
