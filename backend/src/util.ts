import crypto from "crypto"

export function uid(): string {
  if ((crypto as any).randomUUID) return (crypto as any).randomUUID()
  return crypto.randomBytes(16).toString("hex")
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function env(name: string, def?: string): string {
  const v = process.env[name]
  if (v && v.length > 0) return v
  if (def !== undefined) return def
  throw new Error(`Missing env: ${name}`)
}

export function hashPassword(raw: string): string {
  const salt = env("PASSWORD_SALT", "erp_local_salt_v1")
  const h = crypto.createHash("sha256")
  h.update(raw + salt)
  return h.digest("hex")
}

export function toLike(s: string) {
  return `%${s.replace(/[%_]/g, "")}%`
}
