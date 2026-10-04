# TriVerse API (apps/server) — runs on Render, Railway, Fly.io, Koyeb or any Docker host.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=4000

# Only the workspaces the API needs (the mobile app stays out of the image).
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/emails/package.json packages/emails/
COPY apps/server/package.json apps/server/
RUN npm install --no-audit --no-fund -w @triverse/server -w @triverse/shared -w @triverse/emails \
 && npm cache clean --force

COPY packages/shared packages/shared
COPY packages/emails packages/emails
COPY apps/server apps/server

WORKDIR /app/apps/server
EXPOSE 4000
CMD ["npx", "tsx", "src/server.ts"]
