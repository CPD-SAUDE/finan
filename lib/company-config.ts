"use client"

import { ERP_CHANGED_EVENT } from "@/lib/data-store"
import { getCurrentEmpresaId } from "@/lib/empresas"

export type EmpresaConfig = {
  impostoPadrao?: number // %
  capitalPadrao?: number // %
}

const KEY_PREFIX = "erp:empresa:config:"

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
  try {
    window.dispatchEvent(new CustomEvent(ERP_CHANGED_EVENT, { detail: { key } }))
  } catch {}
}

export function getEmpresaConfig(id: string): EmpresaConfig {
  return read<EmpresaConfig>(`${KEY_PREFIX}${id}`, { impostoPadrao: undefined, capitalPadrao: undefined })
}

export function saveEmpresaConfig(id: string, cfg: EmpresaConfig) {
  write(`${KEY_PREFIX}${id}`, cfg)
}

export function getActiveEmpresaConfig(): EmpresaConfig {
  const id = getCurrentEmpresaId()
  if (!id) return {}
  return getEmpresaConfig(id)
}
