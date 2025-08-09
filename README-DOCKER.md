ERP-BR - Backend Fastify + SQLite (Docker)

Importante:
- Não há uso de PDF. Exportações/relatórios futuros devem ser CSV/XLSX. PDF está proibido.
- O frontend não foi alterado nesta etapa; layout e campos permanecem intactos.

Requisitos:
- Docker e Docker Compose instalados.

Subir serviços:
1) Ajuste variáveis no docker-compose.yml se necessário (CORS_ORIGIN e NEXT_PUBLIC_API_URL).
2) docker compose up --build
3) Acesse:
   - Backend: http://localhost:4000/health
   - Frontend: http://localhost:3000
4) Login no backend: POST http://localhost:4000/auth/login
   Body: { "nome": "admin", "senha": "admin" }
   O backend cria o admin/admin automaticamente caso não exista.

Estrutura dos containers:
- backend: Fastify + better-sqlite3, acessa /data/erp.sqlite (volume compartilhado).
- frontend: seu Next.js atual (sem mudanças de layout).
- db: container utilitário apenas para manter o volume e permitir inspeção (sqlite3).

Variáveis de ambiente relevantes (backend):
- PORT=4000
- DB_PATH=/data/erp.sqlite
- CORS_ORIGIN=http://localhost:3000
- PASSWORD_SALT=erp_local_salt_v1
- ADMIN_DEFAULT_PASSWORD=admin
- DISABLE_PDF=true (somente documenta a restrição; não há rotas PDF)

Rotas principais:
- Autenticação:
  POST /auth/login { nome, senha } -> cookie HttpOnly
  POST /auth/logout
  GET  /auth/me
- Dashboard:
  GET  /dashboard/totals?start=ISO&end=ISO
  GET  /dashboard/series?start=ISO&end=ISO
- CRUD:
  /clientes, /produtos, /pedidos, /recebimentos, /empresas, /empresa-config/:empresaId, /usuarios (admin)
- Backup:
  GET  /backup/export
  POST /backup/import { mode: "merge" | "replace", ...coleções }

Inspecionar o banco:
- docker exec -it erp_sqlite sqlite3 /data/erp.sqlite

Próxima etapa:
- Integrar apenas o Dashboard do frontend ao backend usando lib/api-client.ts sem mudar o layout.
- Em ambiente de rede local, ajuste:
  - NEXT_PUBLIC_API_URL no serviço do frontend para o IP do servidor (ex.: http://192.168.0.10:4000)
  - CORS_ORIGIN para o mesmo domínio/IP do frontend.
