# Backend (Fastify + better-sqlite3)
# Build stage with native deps for better-sqlite3
FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ pkg-config libsqlite3-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*
COPY package.json tsconfig.json ./
RUN npm i
COPY src ./src
RUN npm run build

# Runtime
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/server.js"]
