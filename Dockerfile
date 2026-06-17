# syntax=docker/dockerfile:1

# ─── deps ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ─── builder ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── runner ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next.js standalone output: minimal server + traced node_modules.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# esbuild is invoked at runtime to compile tsx; ensure its package (with the
# native binary) is present even if dependency tracing misses the binary.
COPY --from=builder /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder /app/node_modules/@esbuild ./node_modules/@esbuild
# Next.js standalone tracing prunes packages down to the files its own server
# imports, dropping subpaths the uploaded tsx needs (e.g. react-dom/client).
# esbuild bundles those at runtime, so the full library trees must be present.
# Add a line here for any extra library you allow uploaded tsx to import.
COPY --from=builder /app/node_modules/react ./node_modules/react
COPY --from=builder /app/node_modules/react-dom ./node_modules/react-dom
COPY --from=builder /app/node_modules/scheduler ./node_modules/scheduler

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
