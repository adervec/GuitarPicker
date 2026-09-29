# Running GuitarPicker in Docker

> This covers the deployed vanilla app (root of the repo). The separate
> `web/` project — the FSD/Next.js/TanStack Query/TypeScript pilot — has its
> own Dockerfile and runs on a different port (`:3000` vs. this app's `:8080`);
> see [web/README.md](../web/README.md#docker). `docker compose up` (using
> the root `docker-compose.yml`) brings both up together.

GuitarPicker has zero npm dependencies, so the Docker image just copies the
static app in, runs the same verification suite CI runs, and serves it with
the zero-dependency Node server (`serve.mjs`). Nothing is installed from the
network at build time beyond the base `node:22-alpine` image.

Everything — the "build" (really just the test/verification pass, since
there's no bundler) and the running server — happens **inside the
container**, isolated from your host Node/npm install.

## 1. Build the image

```bash
docker build -t guitarpicker .
```

This copies the repo into the image and runs, in order:
`check-imports.cjs` → `test-core.mjs` → `test-cosmetics.mjs` → `dom-smoke.mjs`
(the same four checks `npm test` runs). **If any check fails, the image build
fails** — a broken build can't be shipped, same guarantee as the `CI` GitHub
Actions workflow.

## 2. Run it

```bash
docker run --rm -p 8080:8080 guitarpicker
```

Open **http://localhost:8080**. The container serves on `localhost` from the
browser's point of view, so microphone access (`getUserMedia`) still works —
browsers treat `http://localhost` as a secure context even though the app
itself is served from a container.

To use a different host port: `docker run --rm -p 3000:8080 guitarpicker`
(the app inside the container always listens on 8080).

## 3. Or use Docker Compose

```bash
docker compose up --build
```

Stop with `Ctrl+C`, or `docker compose down`. Edit `docker-compose.yml` to
change the published port or add `restart` policies for long-running hosts.

## 4. Run only the test suite (no server)

Useful in a CI job or to verify a change without publishing a port:

```bash
docker build -t guitarpicker .   # the build itself is the test run
# or, against an already-built image, without rebuilding:
docker run --rm --entrypoint node guitarpicker check-imports.cjs
docker run --rm --entrypoint node guitarpicker test-core.mjs
docker run --rm --entrypoint node guitarpicker test-cosmetics.mjs
docker run --rm --entrypoint node guitarpicker dom-smoke.mjs
```

## Notes

- **No secrets, no config.** The image needs no environment variables — the
  app is entirely client-side (`localStorage`), and optional Google Drive
  cloud sync uses a public OAuth client ID already committed in
  `src/cloud/config.js` (see [CLOUD-SYNC-SETUP.md](./CLOUD-SYNC-SETUP.md)).
  There's nothing to inject into the container.
- **Isolation.** The container has no access to your host filesystem or
  Node/npm install unless you explicitly bind-mount something. It only
  exposes port 8080; the app makes no server-side network calls at all (all
  network activity — Google Drive sync — happens client-side, in the
  browser, opt-in).
- **Live-editing during development.** The image is a snapshot; for local
  development with instant reloads, bind-mount the repo instead of
  rebuilding on every change (the server always sends `Cache-Control:
  no-cache`, so a browser refresh is enough):
  ```bash
  docker run --rm -p 8080:8080 -v "$(pwd)":/app -w /app node:22-alpine \
    node serve.mjs 8080
  ```
  This skips the image's baked-in verification step entirely (it's a plain
  `node:22-alpine` container running your working tree directly) — run
  `npm test` on the host, or `docker build`, before shipping.
- **Multi-arch.** `node:22-alpine` has official images for amd64 and arm64,
  so the same `docker build` works unchanged on Apple Silicon, ARM servers,
  or Raspberry Pi.
