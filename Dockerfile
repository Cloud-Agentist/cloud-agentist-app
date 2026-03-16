# LifeLift — Next.js 16 Docker image
#
# Uses Next.js standalone output for minimal runtime footprint.
# Build from the lifelift/ directory:
#
#   docker build -t lifelift .
#
# Run:
#   docker run -p 3100:3100 \
#     -e AUTH0_DOMAIN=... \
#     -e AUTH0_CLIENT_ID=... \
#     -e AUTH0_CLIENT_SECRET=... \
#     -e AUTH0_SECRET=... \
#     -e COGNITION_GATEWAY_URL=http://gateway:3000 \
#     lifelift

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules/
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3100

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3100

CMD ["node", "server.js"]
