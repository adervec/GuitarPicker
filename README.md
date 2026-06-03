# 🎸 GuitarPicker

[![CI](https://github.com/adervec/GuitarPicker/actions/workflows/ci.yml/badge.svg)](https://github.com/adervec/GuitarPicker/actions/workflows/ci.yml)
[![Deploy](https://github.com/adervec/GuitarPicker/actions/workflows/deploy.yml/badge.svg)](https://github.com/adervec/GuitarPicker/actions/workflows/deploy.yml)

A Yousician-style music-learning app that runs in your browser — no build step, no
account, no cloud. Plug in a guitar (or any mic), pick a song, and play along while a
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

## What's inside

- **Note highway** — streaming notes, per-note killfeed (Perfect / Good / Off / Miss), a
  healthbar that dips on mistakes but lets you finish (a failed run just won't count as a pass).
- **Tuner** — live pitch + cents needle, out-of-tune detection, multiple instruments & tunings.
- **Songs** — a public-domain library tagged by **genre**, with singalong **lyrics**, plus
  import / export / transpose / capo suggestions.
- **Song Editor** — paint notes on a piano roll or type them in; attach backing/vocal audio.
- **Listen & Make** — record yourself, auto-transcribe to a song at three difficulty levels,
  with animated/solid/screen-capture-slideshow backgrounds.
- **Training** — courses with progression + tempo-adjustable skill drills.
- **Theory Games** — ear training and theory quizzes.
- **Glossary** — a music dictionary with interactive chord/scale/interval players.
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

## Verify it works

```bash
npm test    # import graph + core music/pitch math + headless view-render checks
```

See **[Design.md](./Design.md)** for architecture, the song file format, and known limitations.
