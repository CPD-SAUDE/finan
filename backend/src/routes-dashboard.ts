import type { FastifyInstance } from "fastify"
import { getDB } from "./db.js"
import { requireAuth } from "./routes-auth.js"

function parseRange(q: any) {
  const end = q?.end ? new Date(q.end) : new Date()
  const start = q?.start ? new Date(q.start) : new Date(end.getTime() - 29 * 24 * 3600_000)
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function registerDashboardRoutes(app: FastifyInstance) {
  const db = getDB()

  app.get(
    "/dashboard/totals",
    requireAuth((_req, rep) => {
      const q = (_req.query as any) || {}
      const { start, end } = parseRange(q)

      const vendas = db
        .prepare(`SELECT COALESCE(SUM(totalLiquido),0) as total FROM pedidos WHERE dataEmissao BETWEEN ? AND ?`)
        .get(start, end) as { total: number }

      const recebidos = db
        .prepare(
          `SELECT COALESCE(SUM(valor),0) as total FROM recebimentos WHERE status='recebido' AND COALESCE(dataRecebida, dataPrevista) BETWEEN ? AND ?`,
        )
        .get(start, end) as { total: number }

      const pendentes = db
        .prepare(
          `SELECT COALESCE(SUM(valor),0) as total FROM recebimentos WHERE status='pendente' AND COALESCE(dataPrevista, dataRecebida) BETWEEN ? AND ?`,
        )
        .get(start, end) as { total: number }

      rep.send({
        vendasTotal: vendas.total,
        recebidosTotal: recebidos.total,
        pendentesTotal: pendentes.total,
      })
    }),
  )

  app.get(
    "/dashboard/series",
    requireAuth((_req, rep) => {
      const q = (_req.query as any) || {}
      const { start, end } = parseRange(q)

      const rowsV = db
        .prepare(
          `SELECT substr(dataEmissao,1,10) as dia, COALESCE(SUM(totalLiquido),0) as total
         FROM pedidos
         WHERE dataEmissao BETWEEN ? AND ?
         GROUP BY dia ORDER BY dia`,
        )
        .all(start, end) as { dia: string; total: number }[]

      const rowsR = db
        .prepare(
          `SELECT substr(COALESCE(dataRecebida, dataPrevista),1,10) as dia, COALESCE(SUM(valor),0) as total
         FROM recebimentos
         WHERE COALESCE(dataRecebida, dataPrevista) BETWEEN ? AND ?
         GROUP BY dia ORDER BY dia`,
        )
        .all(start, end) as { dia: string; total: number }[]

      rep.send({
        vendas: rowsV,
        recebimentos: rowsR,
      })
    }),
  )
}
