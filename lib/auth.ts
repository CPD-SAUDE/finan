"use client"

import { sha256 } from "js-sha256"
import { ERP_CHANGED_EVENT, type Usuario, getUsuarios, saveUsuario } from "@/lib/data-store"

const SESSION_KEY = "erp:session"
const PASSWORD_SALT = "erp_local_salt_v1" // must match data-store
const hash = (s: string) => sha256(s + PASSWORD_SALT)

export type Session = {
  userId: string
  nome: string
  papel: Usuario["papel"]
  loggedAt: string
}

export function hashPassword(raw: string) {
  return hash(raw)
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function isLoggedIn() {
  return Boolean(getSession())
}

export function signOut() {
  if (typeof window === "undefined") return
  localStorage.removeItem(SESSION_KEY)
  try {
    window.dispatchEvent(new CustomEvent(ERP_CHANGED_EVENT, { detail: { key: SESSION_KEY } }))
  } catch {}
}

/**
 * Robust sign-in with on-the-fly seeding/migration:
 * - If there are no users, seed admin/admin.
 * - If "admin" user exists without passwordHash and you login with "admin"/"admin",
 *   it migrates by setting the hash and proceeds.
 */
export function signIn(nome: string, senha: string): { ok: boolean; error?: string; session?: Session } {
  let users = getUsuarios()

  // Seed admin/admin if there are no users at all
  if (!users || users.length === 0) {
    try {
      saveUsuario({ nome: "admin", papel: "admin", senha: "admin" })
      users = getUsuarios()
    } catch (e) {
      return { ok: false, error: "Não foi possível inicializar o usuário padrão." }
    }
  }

  const user = users.find((u) => u.nome.trim().toLowerCase() === nome.trim().toLowerCase())
  if (!user) return { ok: false, error: "Usuário não encontrado" }

  // Migration: user has no hash yet and is admin trying admin/admin
  if (!user.passwordHash && nome.trim().toLowerCase() === "admin" && senha === "admin") {
    try {
      saveUsuario({ id: user.id, nome: user.nome, papel: user.papel, senha: "admin" })
    } catch {}
  }

  const refreshed = getUsuarios().find((u) => u.id === user.id) || user
  const expected = refreshed.passwordHash || ""
  const got = hash(senha)

  if (expected !== got) return { ok: false, error: "Senha inválida" }

  const session: Session = {
    userId: refreshed.id,
    nome: refreshed.nome,
    papel: refreshed.papel,
    loggedAt: new Date().toISOString(),
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    try {
      window.dispatchEvent(new CustomEvent(ERP_CHANGED_EVENT, { detail: { key: SESSION_KEY } }))
    } catch {}
  }

  return { ok: true, session }
}
