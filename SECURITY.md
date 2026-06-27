# Security Policy

GuitarPicker is a static, client-side web app — it runs entirely in your browser with no
backend operated by this project. By default it makes no network requests and your data never
leaves your device. The one exception is **opt-in** cloud sync: if enabled and signed in, the
app talks directly to Google Drive (the user's own `appDataFolder`, `drive.appdata` scope) —
no third-party server is involved. The practical attack surface is small (mainly: could
maliciously crafted imported song/avatar JSON, or a synced payload, cause unintended behaviour?).

## Reporting a vulnerability

Please report security issues **privately** rather than in a public issue:

- Use GitHub's [private vulnerability reporting](https://github.com/adervec/GuitarPicker/security/advisories/new)
  (the repo's **Security → Report a vulnerability** button).

This is a hobby project maintained in spare time — there's no formal SLA, but I'll review
reports and respond as soon as I reasonably can.

## Supported versions

Only the latest commit on `main` is supported.
