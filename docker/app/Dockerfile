# syntax=docker/dockerfile:1
# Release image for the NutriTrack VPS deployment (QLD-51).
#
# Produces a Next.js standalone runtime (~250 MB) so the shared VPS keeps enough disk
# headroom. Build for the target architecture explicitly:
#
#   docker buildx build --platform linux/amd64 -f docker/app/Dockerfile \
#     --build-arg GIT_SHA=$(git rev-parse --short=12 HEAD) -t nutritrack:<sha> --load .
#
# Migrations are NOT run from this image. `prisma migrate deploy` runs from the deploy
# host/CI runner against the database published on the VPS loopback interface.

FROM node:22-bookworm-slim AS build
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@10
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ARG GIT_SHA=unknown
# `output: "standalone"` is opt-in so dev/CI/staging builds are unaffected.
ENV NEXT_OUTPUT=standalone
RUN pnpm exec prisma generate \
  && mkdir -p public \
  && NODE_ENV=production pnpm build

# Next's tracer follows @node-rs/argon2 but not its platform-specific optional package.
# Materialise both under a stable path so the runtime stage does not pin a pnpm version.
RUN mkdir -p /app/relocate/@node-rs \
  && cp -a node_modules/.pnpm/@node-rs+argon2-linux-x64-gnu@*/node_modules/@node-rs/argon2-linux-x64-gnu /app/relocate/@node-rs/

FROM node:22-bookworm-slim AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone server + static assets. Prisma client, its query engine and
# @node-rs/argon2 are already part of the traced output; only the argon2 native
# platform package has to be added.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/relocate/@node-rs/ ./node_modules/@node-rs/

RUN chown -R node:node /app
USER node

ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="nutritrack" \
      org.opencontainers.image.revision=$GIT_SHA

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/dang-nhap').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
