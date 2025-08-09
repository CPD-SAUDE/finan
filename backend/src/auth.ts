import type { FastifyReply, FastifyRequest } from "fastify"
import { db } from "./db.js"
import { env, hashPassword, nowIso, uid } from "./util.js"

const SESSION_COOKIE = "sid"
const SESSION_TTL_HOURS = 24 * 7

export type Session = { id: string; userId: string; createdAt: string; expiresAt: string }
export type User = { id: string; nome: string; papel: "admin" | "vendedor" | "financeiro"; passwordHash?: string }

export function hoursFromNow(h: number) {
  const d = new Date()
  d.setHours(d.getHours() + h)
  return d.toISOString()
}

export function setSessionCookie(rep: FastifyReply, sid: string) {
  rep.setCookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false, // para LAN/local; ajustar true se usar HTTPS
    maxAge: SESSION_TTL_HOURS * 3600,
  })
}

export function clearSessionCookie(rep: FastifyReply) {
  rep.clearCookie(SESSION_COOKIE, { path: "/" })
}

export function getSessionById(id: string) {
  return db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as Session | undefined
}

export function createSession(userId: string): Session {
  const id = uid()
  const now = nowIso()
  const expiresAt = hoursFromNow(SESSION_TTL_HOURS)
  db.prepare(`INSERT INTO sessions (id, userId, createdAt, expiresAt) VALUES (?,?,?,?)`).run(id, userId, now, expiresAt)
  return { id, userId, createdAt: now, expiresAt }
}

export function deleteSession(id: string) {
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id)
}

export function requireAuth(req: FastifyRequest, rep: FastifyReply, done: (err?: Error) => void) {
  const sid = (req.cookies as any)?.[SESSION_COOKIE]
  if (!sid) {
    rep.status(401).send({ error: "not_authenticated" })
    return
  }
  const session = getSessionById(sid)
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
    if (session) deleteSession(session.id)
    rep.status(401).send({ error: "session_expired" })
    return
  }
  const user = db.prepare(`SELECT id, nome, papel FROM usuarios WHERE id = ?`).get(session.userId) as User | undefined
  if (!user) {
    deleteSession(session.id)
    rep.status(401).send({ error: "user_not_found" })
    return
  }
  ;(req as any).user = user
  ;(req as any).session = session
  done()
}

export function requireAdmin(req: FastifyRequest, rep: FastifyReply, done: (err?: Error) => void) {
  const user = (req as any).user as User | undefined
  if (!user || user.papel !== "admin") {
    rep.status(403).send({ error: "forbidden" })
    return
  }
  done()
}

export function ensureAdminSeed() {
  const count = db.prepare(`SELECT COUNT(*) as c FROM usuarios`).get() as any
  if (count?.c === 0) {
    const id = uid()
    db.prepare(`INSERT INTO usuarios (id, nome, papel, passwordHash) VALUES (?,?,?,?)`).run(
      id,
      "admin",
      "admin",
      hashPassword(env("ADMIN_DEFAULT_PASSWORD", "admin")!),
    )
  } else {
    // Ensure admin exists and has a password
    const admin = db.prepare(`SELECT * FROM usuarios WHERE nome = 'admin'`).get() as User | undefined
    if (admin && !admin.passwordHash) {
      db.prepare(`UPDATE usuarios SET passwordHash = ? WHERE id = ?`).run(
        hashPassword(env("ADMIN_DEFAULT_PASSWORD", "admin")!),
        admin.id,
      )
    } else if (!admin) {
      const id = uid()
      db.prepare(`INSERT INTO usuarios (id, nome, papel, passwordHash) VALUES (?,?,?,?)`).run(
        id,
        "admin",
        "admin",
        hashPassword(env("ADMIN_DEFAULT_PASSWORD", "admin")!),
      )
    }
  }
}
