"use client"

import { ERP_CHANGED_EVENT } from "@/lib/data-store"

export type Empresa = {
  id: string
  nome: string
  razaoSocial?: string
  cnpj?: string
  endereco?: string
  logoUrl?: string
  createdAt: string
}

const LS = {
  empresas: "erp:empresas",
  current: "erp:empresa:current",
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

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

export function getEmpresas(): Empresa[] {
  return read<Empresa[]>(LS.empresas, [])
}

export function saveEmpresa(e: Omit<Empresa, "id" | "createdAt"> & { id?: string }) {
  const all = getEmpresas()
  if (e.id) {
    const idx = all.findIndex((x) => x.id === e.id)
    if (idx >= 0) all[idx] = { ...all[idx], ...e }
  } else {
    all.push({ ...e, id: uid(), createdAt: new Date().toISOString() })
  }
  write(LS.empresas, all)
  if (!getCurrentEmpresaId()) setCurrentEmpresaId(all[0].id)
}

export function deleteEmpresa(id: string) {
  const left = getEmpresas().filter((x) => x.id !== id)
  write(LS.empresas, left)
  const cur = getCurrentEmpresaId()
  if (cur === id) setCurrentEmpresaId(left[0]?.id || "")
}

export function getCurrentEmpresaId(): string {
  return read<string>(LS.current, "")
}

export function setCurrentEmpresaId(id: string) {
  write(LS.current, id)
}

export function getCurrentEmpresa(): Empresa | undefined {
  const all = getEmpresas()
  const id = getCurrentEmpresaId()
  return all.find((x) => x.id === id) ?? all[0]
}

/**
 * Garante que exista ao menos uma empresa.
 * Se não existir, cria "Empresa Principal".
 */
export function ensureDefaultEmpresa() {
  const all = getEmpresas()
  if (all.length === 0) {
    const empresa: Empresa = {
      id: uid(),
      nome: "Empresa Principal",
      createdAt: new Date().toISOString(),
    }
    write(LS.empresas, [empresa])
    setCurrentEmpresaId(empresa.id)
  } else if (!getCurrentEmpresaId()) {
    setCurrentEmpresaId(all[0].id)
  }
}
