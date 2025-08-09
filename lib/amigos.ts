"use client"

export type StatusAmigo = "Pendente" | "Pago"
export type TipoAmigo = "Empréstimo" | "Venda"

export interface AmigoLancamento {
  id: string
  pessoa: string
  tipo: TipoAmigo
  descricao: string
  valor: number
  data: string // ISO
  status: StatusAmigo
  dataPagamento?: string // ISO
  observacoes?: string
  // Juros
  interestEnabled?: boolean
  interestMonthlyPercent?: number // exemplo: 2 => 2% a.m.
  createdAt?: string
  updatedAt?: string
}

const STORAGE_KEY = "erp_br_amigos_v1"

function safeGetStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readAll(): AmigoLancamento[] {
  const store = safeGetStorage()
  if (!store) return []
  const raw = store.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const data = JSON.parse(raw) as AmigoLancamento[]
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function writeAll(list: AmigoLancamento[]) {
  const store = safeGetStorage()
  if (!store) return
  store.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function ensureAmigosInit() {
  const store = safeGetStorage()
  if (!store) return
  if (!store.getItem(STORAGE_KEY)) {
    writeAll([])
  }
}

export function getAmigoLancamentos(): AmigoLancamento[] {
  return readAll().sort((a, b) => +new Date(b.data) - +new Date(a.data))
}

/**
 * Quantidade de meses completos entre duas datas (floor).
 * Se o dia de fim ainda não alcançou o dia de início no mês corrente, subtrai 1.
 */
export function monthsBetween(startISO: string, endISO: string): number {
  const a = new Date(startISO)
  const b = new Date(endISO)
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (b.getDate() < a.getDate()) months -= 1
  return Math.max(0, months)
}

/**
 * Calcula juros compostos mensais de um lançamento até "agora"
 * ou até a dataPagamento (se status === "Pago" e tiver data).
 */
export function calcularJurosInfo(l: AmigoLancamento): {
  meses: number
  juros: number
  totalDevido: number
  ateISO: string
} {
  const enabled = !!l.interestEnabled && !!l.interestMonthlyPercent && l.interestMonthlyPercent > 0
  const endISO = l.status === "Pago" && l.dataPagamento ? l.dataPagamento : new Date().toISOString()
  if (!enabled) {
    return { meses: 0, juros: 0, totalDevido: l.valor ?? 0, ateISO: endISO }
  }
  const meses = monthsBetween(l.data, endISO)
  const r = (l.interestMonthlyPercent ?? 0) / 100
  const juros = meses > 0 ? +(l.valor * (Math.pow(1 + r, meses) - 1)).toFixed(2) : 0
  const totalDevido = +(Math.max(0, l.valor) + juros).toFixed(2)
  return { meses, juros, totalDevido, ateISO: endISO }
}

export function saveAmigoLancamento(payload: Omit<AmigoLancamento, "id"> & { id?: string }): AmigoLancamento {
  const list = readAll()
  const nowIso = new Date().toISOString()

  const normalized: Omit<AmigoLancamento, "id"> & { id?: string } = {
    ...payload,
    valor: Number(payload.valor || 0),
    interestEnabled: !!payload.interestEnabled && (payload.interestMonthlyPercent ?? 0) > 0,
    interestMonthlyPercent:
      payload.interestMonthlyPercent && payload.interestMonthlyPercent > 0
        ? Number(payload.interestMonthlyPercent)
        : undefined,
  }

  if (normalized.id) {
    const idx = list.findIndex((x) => x.id === normalized.id)
    if (idx >= 0) {
      const updated: AmigoLancamento = {
        ...list[idx],
        ...normalized,
        id: normalized.id,
        updatedAt: nowIso,
      }
      list[idx] = updated
      writeAll(list)
      return updated
    }
  }

  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())

  const created: AmigoLancamento = {
    id,
    pessoa: normalized.pessoa,
    tipo: normalized.tipo,
    descricao: normalized.descricao,
    valor: normalized.valor,
    data: normalized.data || nowIso,
    status: normalized.status || "Pendente",
    dataPagamento: normalized.dataPagamento,
    observacoes: normalized.observacoes,
    interestEnabled: normalized.interestEnabled,
    interestMonthlyPercent: normalized.interestMonthlyPercent,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
  list.push(created)
  writeAll(list)
  return created
}

export function deleteAmigoLancamento(id: string) {
  writeAll(readAll().filter((x) => x.id !== id))
}

export function marcarPago(id: string) {
  const list = readAll()
  const idx = list.findIndex((x) => x.id === id)
  if (idx >= 0) {
    const nowIso = new Date().toISOString()
    list[idx] = {
      ...list[idx],
      status: "Pago",
      dataPagamento: list[idx].dataPagamento || nowIso,
      updatedAt: nowIso,
    }
    writeAll(list)
  }
}

/**
 * Totais:
 * - totalPrincipal: soma de valores (sem juros)
 * - pagoPrincipal: soma de valores pagos (sem juros)
 * - emAbertoPrincipal: soma de valores pendentes (sem juros)
 * - jurosPendentes: juros acumulados dos pendentes até hoje
 * - totalEmAbertoComJuros: emAbertoPrincipal + jurosPendentes
 */
export function totaisAmigos() {
  const list = readAll()
  const totalPrincipal = list.reduce((acc, x) => acc + (x.valor || 0), 0)
  const pagoPrincipal = list.filter((x) => x.status === "Pago").reduce((acc, x) => acc + (x.valor || 0), 0)
  const emAbertoPrincipal = Math.max(totalPrincipal - pagoPrincipal, 0)
  const jurosPendentes = list
    .filter((x) => x.status === "Pendente")
    .reduce((acc, x) => acc + calcularJurosInfo(x).juros, 0)
  const totalEmAbertoComJuros = emAbertoPrincipal + jurosPendentes

  return {
    totalPrincipal,
    pagoPrincipal,
    emAbertoPrincipal,
    jurosPendentes,
    totalEmAbertoComJuros,
  }
}
