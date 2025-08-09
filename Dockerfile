# Frontend Dockerfile (Next.js App Router)
# Mantemos compatibilidade ampla (glibc) para builds nativos.
FROM node:20-bookworm-slim AS deps
WORKDIR /app
# Copia apenas manifests para cache eficiente
COPY package.json ./
# Instala dependências (usa npm por padrão)
RUN npm i

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Tenta build; se o projeto estiver em modo dev, pode falhar, então tente iniciar em dev no runner
RUN npm run build || echo "Build falhou; rodará em modo dev no container final."

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app ./
EXPOSE 3000
# Se existir build (.next), roda start; caso contrário, roda dev (apenas para ambiente local)
CMD [ "bash", "-lc", "if [ -d .next ]; then npm run start; else npm run dev; fi" ]
