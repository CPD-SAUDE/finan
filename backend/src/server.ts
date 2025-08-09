import Fastify from "fastify"
import cookie from "@fastify/cookie"
import cors from "@fastify/cors"
import { env } from "./util.js"
import { getDB } from "./db.js"
import { registerAuthRoutes } from "./routes-auth.js"
import { registerCrudRoutes } from "./routes-crud.js"
import { registerDashboardRoutes } from "./routes-dashboard.js"
import { registerBackupRoutes } from "./routes-backup.js"

const app = Fastify({ logger: true })

await app.register(cookie)
await app.register(cors, {
  origin: env("CORS_ORIGIN", "http://localhost:3000"),
  credentials: true,
})

await registerAuthRoutes(app)
await registerCrudRoutes(app)
await registerDashboardRoutes(app)
await registerBackupRoutes(app)

app.get("/health", async () => ({ ok: true }))

// Inicializa DB
getDB()

const port = Number(env("PORT", "4000"))
app.listen({ port, host: "0.0.0.0" }).then(() => {
  console.log(`Backend rodando em http://0.0.0.0:${port}`)
})
