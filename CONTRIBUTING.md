# Contributing

Thanks for your interest in GuitarPicker! It's a small, dependency-free hobby project, so
contributing is deliberately low-ceremony.

## Run it locally

There's no build step and no dependencies — you just need a recent Node (for the dev server
and tests) and a browser.

```bash
node serve.mjs   # serves http://localhost:8080
npm test         # import graph + core music/pitch math + cosmetics + headless render
```

(`python -m http.server 8080` or `serve.ps1` work too — see the README.)

## Before you open a PR

- **Run `npm test`** and make sure it passes. CI runs the same suite on Node 20 & 22.
- Keep the **zero-dependency, no-build** constraint — everything is vanilla ES modules.
- If you touch **cosmetics or the coin economy**, extend `test-cosmetics.mjs` to cover it.
- New built-in songs must be **public domain** (or your own work) — add a row to
  [CREDITS.md](./CREDITS.md).
- Match the existing style: small modules, the `el()` helper for DOM, SVG-as-strings for art.

## Reporting bugs / ideas

Open an issue describing what you expected and what actually happened. A short repro or a
screenshot helps a lot.

By contributing, you agree that your contributions are licensed under the project's
[MIT License](./LICENSE).
