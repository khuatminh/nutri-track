# Internal staging image: production build (`next build` + `next start`, NODE_ENV=production).
# Keeps dev dependencies because the one-shot migrate service needs prisma + tsx.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* && npm install -g pnpm@10
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm install --frozen-lockfile && pnpm exec prisma generate && NODE_ENV=production pnpm build
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.revision=$GIT_SHA
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["pnpm", "start"]
