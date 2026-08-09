# 🎸 GuitarPicker

[![CI](https://github.com/adervec/GuitarPicker/actions/workflows/ci.yml/badge.svg)](https://github.com/adervec/GuitarPicker/actions/workflows/ci.yml)
[![Deploy](https://github.com/adervec/GuitarPicker/actions/workflows/deploy.yml/badge.svg)](https://github.com/adervec/GuitarPicker/actions/workflows/deploy.yml)

**▶ Play it now: [adervec.github.io/GuitarPicker](https://adervec.github.io/GuitarPicker/)** — nothing to install (or install it as an app from the address bar).

An open-source music-learning web app that runs entirely in your browser (in the spirit
of tools like Yousician) — no build step, no account required, local-first (with optional opt-in cloud sync). Plug in a guitar (or any mic), pick a song, and play along while a
scrolling note highway grades every note in real time.

## Quick start

Browsers won't load ES modules from `file://`, so start a tiny local server from this
folder, then open the printed URL:

```powershell
# Option A — Node (zero dependencies)
node serve.mjs            # -> http://localhost:8080

# Option B — PowerShell (zero dependencies, Windows)
powershell -ExecutionPolicy Bypass -File .\serve.ps1

# Option C — Python
python -m http.server 8080
```

Open the URL, go to **Settings**, choose your microphone & output device, then hit a song.
Allow microphone access when prompted (it never leaves your machine).

On Windows, double-click **`GuitarPicker.cmd`** to start the server and open the app in one go
(make a desktop shortcut to it for one-click launch).

## Install as an app

GuitarPicker is a PWA. With the server running, open it in Chrome/Edge and use the
**Install** icon in the address bar — you get a Start-menu/desktop app with its own window,
taskbar shortcuts (Tuner / Songs / Progress), and offline support after the first visit.

## Analyze your progress with Claude

**Progress → 🤖 Export for Claude** downloads a Markdown practice report (summary, per-song
bests, full session log). Drop it into [Claude](https://claude.ai), Claude Desktop, or a
Claude Cowork folder and ask for coaching — the file starts with a suggested prompt.

## What's inside

- **Note highway** — streaming notes, per-note killfeed (Perfect / Good / Off / Miss), a
  healthbar that dips on mistakes but lets you finish (a failed run just won't count as a pass).
- **Tuner** — live pitch + cents needle, out-of-tune detection, multiple instruments & tunings.
- **Songs** — a 45+ song **public-domain** library (folk, spirituals, nursery rhymes, carols,
  classical themes, plus chord-progression trainers) tagged by **genre**, with singalong
  **lyrics**, plus import / export / transpose / capo suggestions.
- **Synthesized backing band** — every song gets one, with no audio files to download. The app
  works out the chords and plays bass, chord comp and (where it suits the song) drums underneath
  you, each in its own instrument voice. Songs can also carry **parts for other instruments**:
  play the guitar line on "When the Saints" and the harmonica answers you — or switch your
  instrument to harmonica and the guitar plays instead. Toggle it with **🎺 Band**.
- **Karaoke** — a full sing-along mode: a scrolling teleprompter that highlights lyrics
  **word-by-word**, a per-line count-in, backing track + an optional guide vocal, and an
  optional **sing-and-score** pass that grades your pitch against the vocal melody (with a live
  pitch ribbon, healthbar and letter grade). The Play view can show the same word fill on its
  lyric line. Import standard or enhanced **`.lrc`** files, or **tap** word timings in the editor.
- **Song Editor** — paint notes on a piano roll or type them in; attach backing/vocal audio;
  add lyrics, import/export `.lrc`, or tap-to-time word-level karaoke timing.
- **Listen & Make** — record yourself, auto-transcribe to a song at three difficulty levels,
  with animated/solid/screen-capture-slideshow backgrounds.
- **Training** — courses with progression + tempo-adjustable skill drills.
- **Theory Games** — ear training and theory quizzes.
- **Glossary** — a music dictionary with interactive chord/scale/interval players.
- **Instruments** — a detailed guide to every supported instrument (specs, playing guides,
  playable reference pitches), also readable standalone as [docs/INSTRUMENTS.md](docs/INSTRUMENTS.md).
- **Progress** — session history and improvement trends.
- **Locker** — build a layered player avatar (skin tone, hair, clothing, tattoos, eyewear,
  headwear, jewellery, frames), design a guitar (body shape, finish, hardware, inlays,
  decals), and choose from 20 app skins. Rarer items are **unlocked with coins**.
- **Coins & rewards** — earn 🪙 by playing songs (accuracy + pass bonus) and completing
  daily activities; spend them in the Locker. Balance shows in the top bar, and your avatar
  rides along in the play HUD.
- **Daily practice** — a home-dashboard checklist of recommended activities that refreshes
  each day, tracks what you've completed, and pays coins.
- **Themes**, clear input/output device display, customizable backing & vocal volumes.
- **Cloud sync (optional, opt-in)** — sync your songs, history, and progress to a private folder
  in your *own* Google Drive. Off until you sign in; the app is fully local/offline until then.
  No backend, no database, and no setup on the live site — see [docs/CLOUD-SYNC-SETUP.md](docs/CLOUD-SYNC-SETUP.md).

## Verify it works

```bash
npm test    # import graph + core music/pitch math + headless view-render checks
```

## License

Source code is released under the **[MIT License](./LICENSE)** — free to use, modify, and
share. The license covers the code only; the built-in songs are public-domain works (see
below) and remain in the public domain.

## Disclaimer

I'm a software developer — **not a doctor, music teacher, coach, or lawyer.** GuitarPicker
is a personal hobby project provided **as is**, without warranty of any kind, for fun and
practice. It is **not** professional music instruction, and nothing in it is medical,
health, hearing, or legal advice. Use your own judgement, and protect your hearing when
playing with audio or headphones. Not affiliated with or endorsed by Yousician or any other
company.

## Privacy

GuitarPicker runs entirely in your browser, with **no analytics and no servers operated by
this project.** Microphone audio is analysed locally for pitch detection and **never leaves
your device.** Your songs, settings, and progress are stored only in this browser's
`localStorage` — export or wipe them anytime from **Settings → Data**. **Cloud sync is opt-in
and off by default**: if you enable it and sign in with Google, your songs/history/progress
sync to a private folder in *your own* Google Drive (`drive.appdata` scope, plus your name/email
so Settings can show which account is connected) — nothing else
goes over the network. Otherwise the app makes no network requests.

## Credits & content

All built-in songs are **traditional or public-domain** works (or original practice
progressions), and the glossary text is original. No third-party libraries, fonts, images,
or audio are bundled. See **[CREDITS.md](./CREDITS.md)** for per-song provenance.

## Architecture

See **[Design.md](./Design.md)** for architecture, the song file format, and known limitations.
