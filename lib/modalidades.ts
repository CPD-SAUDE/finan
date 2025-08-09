"use client"

export type Modalidade = {
  id: string
  nome: string
}

const LS_MODALIDADES = "erp:modalidades"

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

export function getModalidades(): Modalidade[] {
  return read<Modalidade[]>(LS_MODALIDADES, [])
}

export function saveModalidade(m: Omit<Modalidade, "id"> & { id?: string }) {
  const list = getModalidades()
  if (m.id) {
    const idx = list.findIndex((x) => x.id === m.id)
    if (idx >= 0) list[idx] = { ...list[idx], ...m }
  } else {
    list.push({ ...m, id: uid() })
  }
  write(LS_MODALIDADES, list)
}

export function deleteModalidade(id: string) {
  write(
    LS_MODALIDADES,
    getModalidades().filter((x) => x.id !== id),
  )
}
