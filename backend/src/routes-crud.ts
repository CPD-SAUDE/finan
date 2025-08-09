import type { FastifyInstance } from "fastify"
import { getDB } from "./db.js"
import { nowIso, toLike, uid } from "./util.js"
import { requireAuth, requireAdmin } from "./routes-auth.js"

export async function registerCrudRoutes(app: FastifyInstance) {
  const db = getDB()

  // Clientes
  app.get(
    "/clientes",
    requireAuth((req, rep) => {
      const q = (req.query as any)?.q as string | undefined
      const rows = q
        ? db.prepare(`SELECT * FROM clientes WHERE nome LIKE ? ORDER BY createdAt DESC`).all(toLike(q))
        : db.prepare(`SELECT * FROM clientes ORDER BY createdAt DESC`).all()
      rep.send(rows.map(normalizeRow))
    }),
  )

  app.post(
    "/clientes",
    requireAuth((req, rep) => {
      const body = req.body as any
      const id = body.id || uid()
      db.prepare(
        `INSERT INTO clientes (id, nome, documento, email, telefone, cidade, uf, createdAt, data)
       VALUES (@id,@nome,@documento,@email,@telefone,@cidade,@uf,@createdAt,@data)`,
      ).run({
        id,
        nome: body.nome,
        documento: body.documento ?? null,
        email: body.email ?? null,
        telefone: body.telefone ?? null,
        cidade: body.cidade ?? null,
        uf: body.uf ?? null,
        createdAt: nowIso(),
        data: JSON.stringify(body),
      })
      rep.send({ id })
    }),
  )

  app.get(
    "/clientes/:id",
    requireAuth((req, rep) => {
      const { id } = req.params as any
      const row = db.prepare(`SELECT * FROM clientes WHERE id = ?`).get(id)
      if (!row) return rep.status(404).send({ error: "not_found" })
      rep.send(normalizeRow(row))
    }),
  )

  app.put(
    "/clientes/:id",
    requireAuth((req, rep) => {
      const { id } = req.params as any
      const body = req.body as any
      db.prepare(
        `UPDATE clientes SET nome=@nome, documento=@documento, email=@email, telefone=@telefone, cidade=@cidade, uf=@uf, updatedAt=@updatedAt, data=@data WHERE id=@id`,
      ).run({
        id,
        nome: body.nome,
        documento: body.documento ?? null,
        email: body.email ?? null,
        telefone: body.telefone ?? null,
        cidade: body.cidade ?? null,
        uf: body.uf ?? null,
        updatedAt: nowIso(),
        data: JSON.stringify(body),
      })
      rep.send({ ok: true })
    }),
  )

  app.delete(
    "/clientes/:id",
    requireAdmin((req, rep) => {
      const { id } = req.params as any
      db.prepare(`DELETE FROM clientes WHERE id = ?`).run(id)
      rep.send({ ok: true })
    }),
  )

  // Produtos
  app.get(
    "/produtos",
    requireAuth((_req, rep) => {
      const rows = db.prepare(`SELECT * FROM produtos ORDER BY createdAt DESC`).all()
      rep.send(rows.map(normalizeRow))
    }),
  )

  app.post(
    "/produtos",
    requireAuth((req, rep) => {
      const b = req.body as any
      const id = b.id || uid()
      db.prepare(
        `INSERT INTO produtos (id, nome, sku, preco, unidade, ativo, createdAt, data) VALUES (@id,@nome,@sku,@preco,@unidade,@ativo,@createdAt,@data)`,
      ).run({
        id,
        nome: b.nome,
        sku: b.sku ?? null,
        preco: b.preco ?? 0,
        unidade: b.unidade ?? null,
        ativo: b.ativo ? 1 : 0,
        createdAt: nowIso(),
        data: JSON.stringify(b),
      })
      rep.send({ id })
    }),
  )

  app.put(
    "/produtos/:id",
    requireAuth((req, rep) => {
      const { id } = req.params as any
      const b = req.body as any
      db.prepare(
        `UPDATE produtos SET nome=@nome, sku=@sku, preco=@preco, unidade=@unidade, ativo=@ativo, updatedAt=@updatedAt, data=@data WHERE id=@id`,
      ).run({
        id,
        nome: b.nome,
        sku: b.sku ?? null,
        preco: b.preco ?? 0,
        unidade: b.unidade ?? null,
        ativo: b.ativo ? 1 : 0,
        updatedAt: nowIso(),
        data: JSON.stringify(b),
      })
      rep.send({ ok: true })
    }),
  )

  app.delete(
    "/produtos/:id",
    requireAdmin((req, rep) => {
      const { id } = req.params as any
      db.prepare(`DELETE FROM produtos WHERE id = ?`).run(id)
      rep.send({ ok: true })
    }),
  )

  // Pedidos + Itens
  app.get(
    "/pedidos",
    requireAuth((req, rep) => {
      const rows = db.prepare(`SELECT * FROM pedidos ORDER BY dataEmissao DESC`).all()
      const itemsByPedido = db.prepare(`SELECT * FROM itens_pedido WHERE pedidoId = ?`)
      const out = rows.map((r: any) => ({
        ...normalizeRow(r),
        itens: (itemsByPedido.all(r.id) as any[]).map(normalizeRow),
      }))
      rep.send(out)
    }),
  )

  app.post(
    "/pedidos",
    requireAuth((req, rep) => {
      const b = req.body as any
      const id = b.id || uid()
      db.prepare(
        `INSERT INTO pedidos (id, numero, clienteId, empresaId, status, dataEmissao, totalBruto, totalDescontos, totalLiquido, createdAt, data)
       VALUES (@id,@numero,@clienteId,@empresaId,@status,@dataEmissao,@totalBruto,@totalDescontos,@totalLiquido,@createdAt,@data)`,
      ).run({
        id,
        numero: b.numero ?? null,
        clienteId: b.clienteId ?? null,
        empresaId: b.empresaId ?? null,
        status: b.status ?? null,
        dataEmissao: b.dataEmissao ?? null,
        totalBruto: b.totalBruto ?? 0,
        totalDescontos: b.totalDescontos ?? 0,
        totalLiquido: b.totalLiquido ?? 0,
        createdAt: nowIso(),
        data: JSON.stringify(b),
      })
      if (Array.isArray(b.itens)) {
        const stmt = db.prepare(
          `INSERT INTO itens_pedido (id, pedidoId, produtoId, quantidade, precoUnit, desconto, totalItem, data) VALUES (@id,@pedidoId,@produtoId,@quantidade,@precoUnit,@desconto,@totalItem,@data)`,
        )
        for (const it of b.itens) {
          stmt.run({
            id: it.id || uid(),
            pedidoId: id,
            produtoId: it.produtoId ?? null,
            quantidade: it.quantidade ?? 0,
            precoUnit: it.precoUnit ?? 0,
            desconto: it.desconto ?? 0,
            totalItem: it.totalItem ?? (it.quantidade ?? 0) * (it.precoUnit ?? 0) - (it.desconto ?? 0),
            data: JSON.stringify(it),
          })
        }
      }
      rep.send({ id })
    }),
  )

  app.put(
    "/pedidos/:id",
    requireAuth((req, rep) => {
      const { id } = req.params as any
      const b = req.body as any
      db.prepare(
        `UPDATE pedidos SET numero=@numero, clienteId=@clienteId, empresaId=@empresaId, status=@status, dataEmissao=@dataEmissao, totalBruto=@totalBruto, totalDescontos=@totalDescontos, totalLiquido=@totalLiquido, updatedAt=@updatedAt, data=@data WHERE id=@id`,
      ).run({
        id,
        numero: b.numero ?? null,
        clienteId: b.clienteId ?? null,
        empresaId: b.empresaId ?? null,
        status: b.status ?? null,
        dataEmissao: b.dataEmissao ?? null,
        totalBruto: b.totalBruto ?? 0,
        totalDescontos: b.totalDescontos ?? 0,
        totalLiquido: b.totalLiquido ?? 0,
        updatedAt: nowIso(),
        data: JSON.stringify(b),
      })
      if (Array.isArray(b.itens)) {
        db.prepare(`DELETE FROM itens_pedido WHERE pedidoId = ?`).run(id)
        const stmt = db.prepare(
          `INSERT INTO itens_pedido (id, pedidoId, produtoId, quantidade, precoUnit, desconto, totalItem, data) VALUES (@id,@pedidoId,@produtoId,@quantidade,@precoUnit,@desconto,@totalItem,@data)`,
        )
        for (const it of b.itens) {
          stmt.run({
            id: it.id || uid(),
            pedidoId: id,
            produtoId: it.produtoId ?? null,
            quantidade: it.quantidade ?? 0,
            precoUnit: it.precoUnit ?? 0,
            desconto: it.desconto ?? 0,
            totalItem: it.totalItem ?? (it.quantidade ?? 0) * (it.precoUnit ?? 0) - (it.desconto ?? 0),
            data: JSON.stringify(it),
          })
        }
      }
      rep.send({ ok: true })
    }),
  )

  app.delete(
    "/pedidos/:id",
    requireAdmin((req, rep) => {
      const { id } = req.params as any
      db.prepare(`DELETE FROM pedidos WHERE id = ?`).run(id)
      rep.send({ ok: true })
    }),
  )

  // Recebimentos
  app.get(
    "/recebimentos",
    requireAuth((_req, rep) => {
      const rows = db.prepare(`SELECT * FROM recebimentos ORDER BY COALESCE(dataRecebida, dataPrevista) DESC`).all()
      rep.send(rows.map(normalizeRow))
    }),
  )

  app.post(
    "/recebimentos",
    requireAuth((req, rep) => {
      const b = req.body as any
      const id = b.id || uid()
      db.prepare(
        `INSERT INTO recebimentos (id, pedidoId, valor, dataPrevista, dataRecebida, status, meio, createdAt, data)
       VALUES (@id,@pedidoId,@valor,@dataPrevista,@dataRecebida,@status,@meio,@createdAt,@data)`,
      ).run({
        id,
        pedidoId: b.pedidoId ?? null,
        valor: b.valor ?? 0,
        dataPrevista: b.dataPrevista ?? null,
        dataRecebida: b.dataRecebida ?? null,
        status: b.status ?? "pendente",
        meio: b.meio ?? null,
        createdAt: nowIso(),
        data: JSON.stringify(b),
      })
      rep.send({ id })
    }),
  )

  app.put(
    "/recebimentos/:id",
    requireAuth((req, rep) => {
      const { id } = req.params as any
      const b = req.body as any
      db.prepare(
        `UPDATE recebimentos SET pedidoId=@pedidoId, valor=@valor, dataPrevista=@dataPrevista, dataRecebida=@dataRecebida, status=@status, meio=@meio, updatedAt=@updatedAt, data=@data WHERE id=@id`,
      ).run({
        id,
        pedidoId: b.pedidoId ?? null,
        valor: b.valor ?? 0,
        dataPrevista: b.dataPrevista ?? null,
        dataRecebida: b.dataRecebida ?? null,
        status: b.status ?? "pendente",
        meio: b.meio ?? null,
        updatedAt: nowIso(),
        data: JSON.stringify(b),
      })
      rep.send({ ok: true })
    }),
  )

  app.delete(
    "/recebimentos/:id",
    requireAdmin((req, rep) => {
      const { id } = req.params as any
      db.prepare(`DELETE FROM recebimentos WHERE id = ?`).run(id)
      rep.send({ ok: true })
    }),
  )

  // Empresas e Config
  app.get(
    "/empresas",
    requireAuth((_req, rep) => {
      const rows = db.prepare(`SELECT * FROM empresas ORDER BY createdAt DESC`).all()
      rep.send(rows.map(normalizeRow))
    }),
  )

  app.post(
    "/empresas",
    requireAdmin((req, rep) => {
      const b = req.body as any
      const id = b.id || uid()
      db.prepare(
        `INSERT INTO empresas (id, nome, documento, createdAt, data) VALUES (@id,@nome,@documento,@createdAt,@data)`,
      ).run({
        id,
        nome: b.nome,
        documento: b.documento ?? null,
        createdAt: nowIso(),
        data: JSON.stringify(b),
      })
      rep.send({ id })
    }),
  )

  app.put(
    "/empresas/:id",
    requireAdmin((req, rep) => {
      const { id } = req.params as any
      const b = req.body as any
      db.prepare(
        `UPDATE empresas SET nome=@nome, documento=@documento, updatedAt=@updatedAt, data=@data WHERE id=@id`,
      ).run({
        id,
        nome: b.nome,
        documento: b.documento ?? null,
        updatedAt: nowIso(),
        data: JSON.stringify(b),
      })
      rep.send({ ok: true })
    }),
  )

  app.get(
    "/empresa-config/:empresaId",
    requireAuth((req, rep) => {
      const { empresaId } = req.params as any
      const row = db.prepare(`SELECT * FROM empresa_config WHERE empresaId = ?`).get(empresaId)
      rep.send(row ? normalizeRow(row) : null)
    }),
  )
  app.put(
    "/empresa-config/:empresaId",
    requireAdmin((req, rep) => {
      const { empresaId } = req.params as any
      const b = req.body as any
      const row = db.prepare(`SELECT id FROM empresa_config WHERE empresaId = ?`).get(empresaId) as any
      if (row?.id) {
        db.prepare(`UPDATE empresa_config SET data=@data, updatedAt=@updatedAt WHERE id=@id`).run({
          id: row.id,
          data: JSON.stringify(b),
          updatedAt: nowIso(),
        })
        rep.send({ ok: true })
      } else {
        db.prepare(
          `INSERT INTO empresa_config (id, empresaId, data, updatedAt) VALUES (@id,@empresaId,@data,@updatedAt)`,
        ).run({
          id: uid(),
          empresaId,
          data: JSON.stringify(b),
          updatedAt: nowIso(),
        })
        rep.send({ ok: true })
      }
    }),
  )

  // Usuários (admin)
  app.get(
    "/usuarios",
    requireAdmin((_req, rep) => {
      const rows = db
        .prepare(`SELECT id, nome, papel, createdAt, updatedAt, data FROM usuarios ORDER BY createdAt DESC`)
        .all()
      rep.send(rows.map(normalizeRow))
    }),
  )
  app.post(
    "/usuarios",
    requireAdmin((req, rep) => {
      const b = req.body as any
      const id = b.id || uid()
      db.prepare(
        `INSERT INTO usuarios (id, nome, papel, passwordHash, createdAt, data) VALUES (@id,@nome,@papel,@passwordHash,@createdAt,@data)`,
      ).run({
        id,
        nome: b.nome,
        papel: b.papel ?? "vendedor",
        passwordHash: b.senha
          ? require("crypto")
              .createHash("sha256")
              .update(b.senha + (process.env.PASSWORD_SALT || "erp_local_salt_v1"))
              .digest("hex")
          : null,
        createdAt: nowIso(),
        data: JSON.stringify(b),
      })
      rep.send({ id })
    }),
  )
  app.put(
    "/usuarios/:id",
    requireAdmin((req, rep) => {
      const { id } = req.params as any
      const b = req.body as any
      const patchPwd = typeof b.senha === "string" && b.senha.length > 0
      db.prepare(
        `UPDATE usuarios SET nome=@nome, papel=@papel, ${patchPwd ? "passwordHash=@passwordHash," : ""} updatedAt=@updatedAt, data=@data WHERE id=@id`,
      ).run({
        id,
        nome: b.nome,
        papel: b.papel ?? "vendedor",
        passwordHash: patchPwd
          ? require("crypto")
              .createHash("sha256")
              .update(b.senha + (process.env.PASSWORD_SALT || "erp_local_salt_v1"))
              .digest("hex")
          : undefined,
        updatedAt: nowIso(),
        data: JSON.stringify(b),
      })
      rep.send({ ok: true })
    }),
  )
  app.delete(
    "/usuarios/:id",
    requireAdmin((req, rep) => {
      const { id } = req.params as any
      db.prepare(`DELETE FROM usuarios WHERE id = ?`).run(id)
      rep.send({ ok: true })
    }),
  )
}

function normalizeRow(r: any) {
  if (r?.data) {
    try {
      const json = JSON.parse(r.data)
      return { ...json, id: r.id }
    } catch {
      return r
    }
  }
  return r
}
