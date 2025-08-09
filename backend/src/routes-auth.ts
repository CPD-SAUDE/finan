import type { FastifyInstance } from "fastify"
import { getDB } from "./db.js"
import { hashPassword, nowIso, uid } from "./util.js"

const COOKIE = "sid"

export async function registerAuthRoutes(app: FastifyInstance) {
  // Pre-handler para hidratar req.user
  app.addHook("preHandler", async (req) => {
    const sid = (req.cookies as any)?.[COOKIE] as string | undefined
    if (!sid) return
    const db = getDB()
    const sess = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(sid) as any
    if (!sess) return
    if (sess.expiresAt && new Date(sess.expiresAt).getTime() < Date.now()) {
      db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sess.id)
      return
    }
    const user = db.prepare(`SELECT id, nome, papel FROM usuarios WHERE id = ?`).get(sess.userId) as any
    if (user) (req as any).user = user
  })

  // Seed/migração admin/admin
  app.addHook("onReady", async () => {
    const db = getDB()
    const count = db.prepare(`SELECT COUNT(*) as c FROM usuarios`).get() as { c: number }
    if (count.c === 0) {
      db.prepare(
        `INSERT INTO usuarios (id, nome, papel, passwordHash, createdAt) VALUES (@id,'admin','admin',@hash,@now)`,
      ).run({ id: uid(), hash: hashPassword(process.env.ADMIN_DEFAULT_PASSWORD || "admin"), now: nowIso() })
    } else {
      const admin = db.prepare(`SELECT * FROM usuarios WHERE nome = 'admin'`).get() as any
      if (admin && !admin.passwordHash) {
        db.prepare(`UPDATE usuarios SET passwordHash = @h WHERE id = @id`).run({
          h: hashPassword(process.env.ADMIN_DEFAULT_PASSWORD || "admin"),
          id: admin.id,
        })
      }
    }
  })

  app.post("/auth/login", async (req, rep) => {
    const body = req.body as { nome?: string; senha?: string }
    const nome = (body?.nome || "").trim()
    const senha = body?.senha || ""
    if (!nome || !senha) return rep.status(400).send({ error: "invalid_body" })
    const db = getDB()
    const user = db.prepare(`SELECT * FROM usuarios WHERE nome = ?`).get(nome) as any
    if (!user) return rep.status(401).send({ error: "invalid_credentials" })
    // migração para admin sem hash usando admin/admin
    if (!user.passwordHash && nome === "admin" && senha === "admin") {
      db.prepare(`UPDATE usuarios SET passwordHash = ? WHERE id = ?`).run(hashPassword("admin"), user.id)
      user.passwordHash = hashPassword("admin")
    }
    if (user.passwordHash !== hashPassword(senha)) {
      return rep.status(401).send({ error: "invalid_credentials" })
    }
    const sid = uid()
    const expires = new Date(Date.now() + 7 * 24 * 3600_000).toISOString()
    db.prepare(`INSERT INTO sessions (id, userId, createdAt, expiresAt) VALUES (?,?,?,?)`).run(
      sid,
      user.id,
      nowIso(),
      expires,
    )
    rep.setCookie(COOKIE, sid, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 7 * 24 * 3600,
    })
    return rep.send({ ok: true, user: { id: user.id, nome: user.nome, papel: user.papel } })
  })

  app.post("/auth/logout", async (req, rep) => {
    const sid = (req.cookies as any)?.[COOKIE]
    if (sid) {
      const db = getDB()
      db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sid)
    }
    rep.clearCookie(COOKIE, { path: "/" })
    return rep.send({ ok: true })
  })

  app.get("/auth/me", async (req, rep) => {
    const user = (req as any).user
    if (!user) return rep.status(401).send({ ok: false })
    return rep.send({ ok: true, user })
  })
}

export function requireAuth(handler: any) {
  return async (req: any, rep: any) => {
    if (!(req as any).user) return rep.status(401).send({ error: "not_authenticated" })
    return handler(req, rep)
  }
}

export function requireAdmin(handler: any) {
  return requireAuth((req: any, rep: any) => {
    if ((req as any).user?.papel !== "admin") return rep.status(403).send({ error: "forbidden" })
    return handler(req, rep)
  })
}
