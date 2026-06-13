FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile

# ── Development ──────────────────────────────────────────────────────
FROM base AS dev
COPY . .
RUN npx prisma generate
CMD ["npm", "run", "dev"]

# ── Build ────────────────────────────────────────────────────────────
FROM base AS build
COPY . .
RUN npx prisma generate && npm run build

# ── Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS prod
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma

USER appuser

CMD ["node", "dist/server.js"]
