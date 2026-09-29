# GuitarPicker — isolated build + run. Zero npm dependencies, so "build" is
# just copying the static app into the image and running the same verification
# suite CI runs (check-imports, core music/pitch math, cosmetics, DOM smoke).
# A red suite fails the image build, same guarantee as the GitHub Actions gate.
FROM node:22-alpine

WORKDIR /app

# Own the files as the non-root `node` user baked into this image (least
# privilege — the static server never needs root).
COPY --chown=node:node . .

RUN node check-imports.cjs \
 && node test-core.mjs \
 && node test-cosmetics.mjs \
 && node dom-smoke.mjs

USER node
EXPOSE 8080

CMD ["node", "serve.mjs", "8080"]
