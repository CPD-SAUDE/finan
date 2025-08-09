"use client"

export type Rate = {
  id: string
  nome: string
  percentual: number // em %
}

const LS_CAPITAL = "erp:rates:capital"
const LS_IMPOSTO = "erp:rates:imposto"

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
}

// Capital
export function getCapitalRates(): Rate[] {
  return read<Rate[]>(LS_CAPITAL, [])
}
export function saveCapitalRate(rate: Omit<Rate, "id"> & { id?: string }) {
  const list = getCapitalRates()
  if (rate.id) {
    const idx = list.findIndex((r) => r.id === rate.id)
    if (idx >= 0) list[idx] = { ...list[idx], ...rate }
  } else {
    list.push({ ...rate, id: uid() })
  }
  write(LS_CAPITAL, list)
}
export function deleteCapitalRate(id: string) {
  write(
    LS_CAPITAL,
    getCapitalRates().filter((r) => r.id !== id),
  )
}

// Imposto
export function getImpostoRates(): Rate[] {
  return read<Rate[]>(LS_IMPOSTO, [])
}
export function saveImpostoRate(rate: Omit<Rate, "id"> & { id?: string }) {
  const list = getImpostoRates()
  if (rate.id) {
    const idx = list.findIndex((r) => r.id === rate.id)
    if (idx >= 0) list[idx] = { ...list[idx], ...rate }
  } else {
    list.push({ ...rate, id: uid() })
  }
  write(LS_IMPOSTO, list)
}
export function deleteImpostoRate(id: string) {
  write(
    LS_IMPOSTO,
    getImpostoRates().filter((r) => r.id !== id),
  )
}
