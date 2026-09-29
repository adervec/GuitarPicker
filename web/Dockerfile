# GuitarPicker Tuner pilot (FSD + Next.js + TanStack Query + TypeScript) —
# isolated build + run, same spirit as the vanilla app's root Dockerfile.
# Multi-stage so the final image only ships the traced production output
# (next.config.ts sets output: "standalone"), not node_modules or source.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run lint && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Own the files as the non-root `node` user baked into this image, same
# least-privilege reasoning as the vanilla app's Dockerfile.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
