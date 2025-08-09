"use client"

import { ERP_CHANGED_EVENT } from "@/lib/data-store"

export type ValeMovimento = {
  id: string
  clienteId: string
  data: string
  tipo: "credito" | "debito"
  valor: number
  descricao?: string
  referenciaId?: string // opcional: id de venda/recebimento
}

const KEY = "erp:vales:movimentos"

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
  } catch {
    // ignore
  }
}

export function getMovimentos(): ValeMovimento[] {
  return read<ValeMovimento[]>(KEY, [])
}

export function getMovimentosDoCliente(clienteId: string): ValeMovimento[] {
  return getMovimentos()
    .filter((m) => m.clienteId === clienteId)
    .sort((a, b) => (a.data < b.data ? 1 : -1))
}

export function deleteMovimento(id: string) {
  write(
    KEY,
    getMovimentos().filter((m) => m.id !== id),
  )
}

export function addCredito(clienteId: string, valor: number, descricao?: string) {
  const mov: ValeMovimento = {
    id: uid(),
    clienteId,
    data: new Date().toISOString(),
    tipo: "credito",
    valor: Math.max(0, Number(valor) || 0),
    descricao: descricao?.trim(),
  }
  write(KEY, [...getMovimentos(), mov])
  return mov
}

export function abaterCredito(clienteId: string, valor: number, descricao?: string) {
  const saldo = getSaldoCliente(clienteId)
  const v = Math.max(0, Number(valor) || 0)
  if (v <= 0) throw new Error("Informe um valor maior que zero.")
  if (v > saldo) throw new Error("Valor maior que o saldo disponível.")
  const mov: ValeMovimento = {
    id: uid(),
    clienteId,
    data: new Date().toISOString(),
    tipo: "debito",
    valor: v,
    descricao: descricao?.trim(),
  }
  write(KEY, [...getMovimentos(), mov])
  return mov
}

export function getSaldoCliente(clienteId: string) {
  const movs = getMovimentos().filter((m) => m.clienteId === clienteId)
  const credito = movs.filter((m) => m.tipo === "credito").reduce((a, m) => a + m.valor, 0)
  const debito = movs.filter((m) => m.tipo === "debito").reduce((a, m) => a + m.valor, 0)
  return Math.max(0, credito - debito)
}

export function getSaldosPorCliente(): Record<string, number> {
  const map = new Map<string, number>()
  for (const m of getMovimentos()) {
    const cur = map.get(m.clienteId) ?? 0
    map.set(m.clienteId, m.tipo === "credito" ? cur + m.valor : cur - m.valor)
  }
  // nunca negativo
  const out: Record<string, number> = {}
  for (const [id, saldo] of map) out[id] = Math.max(0, saldo)
  return out
}
