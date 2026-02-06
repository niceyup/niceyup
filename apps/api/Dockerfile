FROM node:22-alpine AS base

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /app
# Install turbo globally
RUN pnpm add -g turbo@^2
COPY . .

# Generate a partial monorepo with a pruned lockfile for a target workspace.
# Assuming "api" is the name entered in the project's package.json: { name: "api" }
RUN turbo prune api --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .

# Environment variables
COPY --from=builder /app/.env .env

# Uncomment and use build args to enable remote caching
# ARG TURBO_TEAM
# ENV TURBO_TEAM=$TURBO_TEAM

# ARG TURBO_TOKEN
# ENV TURBO_TOKEN=$TURBO_TOKEN

RUN pnpm turbo run build

FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

COPY --from=installer --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=installer --chown=fastify:nodejs /app/apps/api/node_modules ./apps/api/node_modules

COPY --from=installer --chown=fastify:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=installer --chown=fastify:nodejs /app/apps/api/package.json ./apps/api/package.json

USER fastify

EXPOSE 3333

ENV PORT=3333

CMD ["node", "apps/api/dist/http/server.js"]
