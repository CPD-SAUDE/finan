import type { FastifyInstance } from "fastify"
import { getDB } from "./db.js"
import { requireAdmin } from "./routes-auth.js"
import { db } from "./db.js" // Declare the db variable here

export async function registerBackupRoutes(app: FastifyInstance) {
  const dbInstance = getDB()

  app.get(
    "/backup/export",
    requireAdmin((_req, rep) => {
      const dump = {
        usuarios: dbInstance.prepare(`SELECT * FROM usuarios`).all(),
        clientes: dbInstance.prepare(`SELECT * FROM clientes`).all(),
        produtos: dbInstance.prepare(`SELECT * FROM produtos`).all(),
        empresas: dbInstance.prepare(`SELECT * FROM empresas`).all(),
        empresa_config: dbInstance.prepare(`SELECT * FROM empresa_config`).all(),
        pedidos: dbInstance.prepare(`SELECT * FROM pedidos`).all(),
        itens_pedido: dbInstance.prepare(`SELECT * FROM itens_pedido`).all(),
        recebimentos: dbInstance.prepare(`SELECT * FROM recebimentos`).all(),
      }
      rep.header("content-type", "application/json; charset=utf-8")
      rep.send(dump)
    }),
  )

  app.post(
    "/backup/import",
    requireAdmin((req, rep) => {
      const body = req.body as any
      const mode = (body?.mode as "merge" | "replace") || "merge"
      const tx = dbInstance.transaction(() => {
        if (mode === "replace") {
          dbInstance.prepare(`DELETE FROM itens_pedido`).run()
          dbInstance.prepare(`DELETE FROM recebimentos`).run()
          dbInstance.prepare(`DELETE FROM pedidos`).run()
          dbInstance.prepare(`DELETE FROM clientes`).run()
          dbInstance.prepare(`DELETE FROM produtos`).run()
          dbInstance.prepare(`DELETE FROM empresa_config`).run()
          dbInstance.prepare(`DELETE FROM empresas`).run()
          // não apagamos usuarios por segurança; se quiser, incluir explicitamente
        }
        upsert("clientes", body?.clientes)
        upsert("produtos", body?.produtos)
        upsert("empresas", body?.empresas)
        upsert("empresa_config", body?.empresa_config)
        upsert("pedidos", body?.pedidos)
        upsert("itens_pedido", body?.itens_pedido)
        upsert("recebimentos", body?.recebimentos)
        // usuarios opcional
        if (Array.isArray(body?.usuarios)) upsert("usuarios", body.usuarios)
      })
      tx()
      rep.send({ ok: true })
    }),
  )
}

function upsert(table: string, rows: any[]) {
  if (!Array.isArray(rows)) return
  const cols = Object.keys(rows[0] || {})
  if (cols.length === 0) return
  const placeholders = cols.map((c) => `@${c}`).join(",")
  const setCols = cols
    .filter((c) => c !== "id")
    .map((c) => `${c}=@${c}`)
    .join(",")
  const insert = db.prepare(`INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`)
  const update = db.prepare(`UPDATE ${table} SET ${setCols} WHERE id=@id`)

  for (const r of rows) {
    try {
      insert.run(r)
    } catch {
      update.run(r)
    }
  }
}
