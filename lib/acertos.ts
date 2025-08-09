"use client"

import { getLinhas, setLinhasAcerto, linhasPendentesDeAcerto } from "@/lib/planilha"

export type Participante = {
  id: string
  nome: string
  ativo?: boolean
  defaultPercent?: number
  createdAt: string
}

export type Despesa = {
  id: string
  descricao: string
  valor: number
  tipo: "rateio" | "individual"
  participanteId?: string
}

export type UltimoRecebimentoBanco = {
  nome?: string
  valor?: number
  data?: string // ISO
  banco?: string
}

export type Distribuicao = {
  participanteId: string
  percentual: number
  valorBruto: number
  descontoIndividual: number
  valor: number
}

export type Acerto = {
  id: string
  data: string
  titulo?: string
  observacoes?: string
  linhaIds: string[]
  totalLucro: number
  totalDespesasRateio: number
  totalDespesasIndividuais: number
  totalLiquidoDistribuivel: number
  distribuicoes: Distribuicao[]
  despesas: Despesa[]
  ultimoRecebimentoBanco?: UltimoRecebimentoBanco
  status: "aberto" | "fechado"
  createdAt: string
}

// Despesas salvas para usar futuramente
export type DespesaPendente = Despesa & {
  createdAt: string
  status: "pendente" | "usada"
  usedInAcertoId?: string
}

const LS_PART = "erp:participantes"
const LS_ACERTOS = "erp:acertos"
const LS_DESP_PEND = "erp:despesasPendentes"

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
    const ev = new CustomEvent("ERP_CHANGED_EVENT", { detail: { key } })
    window.dispatchEvent(ev)
  } catch {}
}

// Participantes
export function getParticipantes(): Participante[] {
  return read<Participante[]>(LS_PART, [])
}
export function saveParticipante(p: Omit<Participante, "id" | "createdAt"> & { id?: string }) {
  const list = getParticipantes()
  if (p.id) {
    const idx = list.findIndex((x) => x.id === p.id)
    if (idx >= 0) list[idx] = { ...list[idx], ...p }
  } else {
    list.push({ ...p, id: uid(), createdAt: new Date().toISOString() })
  }
  write(LS_PART, list)
}
export function deleteParticipante(id: string) {
  write(
    LS_PART,
    getParticipantes().filter((p) => p.id !== id),
  )
}

// Acertos
export function getAcertos(): Acerto[] {
  return read<Acerto[]>(LS_ACERTOS, [])
}
export function saveAcerto(a: Omit<Acerto, "id" | "createdAt"> & { id?: string }) {
  const list = getAcertos()
  if (a.id) {
    const idx = list.findIndex((x) => x.id === a.id)
    if (idx >= 0) list[idx] = { ...list[idx], ...a }
  } else {
    list.unshift({ ...a, id: uid(), createdAt: new Date().toISOString() })
  }
  write(LS_ACERTOS, list)
}
export function fecharAcerto(id: string) {
  const list = getAcertos()
  const idx = list.findIndex((x) => x.id === id)
  if (idx >= 0) {
    list[idx].status = "fechado"
    write(LS_ACERTOS, list)
  }
}
export function updateAcerto(id: string, patch: Partial<Acerto>) {
  const list = getAcertos()
  const idx = list.findIndex((x) => x.id === id)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch }
    write(LS_ACERTOS, list)
  }
}

// Utilitários
export function lucroTotalPorLinhas(ids: string[]): number {
  const set = new Set(ids)
  return getLinhas()
    .filter((l) => set.has(l.id))
    .reduce((a, l) => a + (l.lucroValor || 0), 0)
}

export function criarAcerto({
  titulo,
  observacoes,
  linhaIds,
  distribuicoes,
  despesas = [],
  ultimoRecebimentoBanco,
}: {
  titulo?: string
  observacoes?: string
  linhaIds: string[]
  distribuicoes: Array<{ participanteId: string; percentual: number }>
  despesas?: Despesa[]
  ultimoRecebimentoBanco?: UltimoRecebimentoBanco
}): { acertoId: string } {
  const totalLucro = lucroTotalPorLinhas(linhaIds)
  const totalDespesasRateio = despesas.filter((d) => d.tipo === "rateio").reduce((a, d) => a + (d.valor || 0), 0)
  const totalDespesasIndividuais = despesas
    .filter((d) => d.tipo === "individual")
    .reduce((a, d) => a + (d.valor || 0), 0)
  const totalLiquidoDistribuivel = +(totalLucro - totalDespesasRateio).toFixed(2)

  const indivPorPart = despesas
    .filter((d) => d.tipo === "individual" && d.participanteId)
    .reduce<Record<string, number>>((acc, d) => {
      acc[d.participanteId!] = (acc[d.participanteId!] || 0) + (d.valor || 0)
      return acc
    }, {})

  const dist: Distribuicao[] = distribuicoes.map((d) => {
    const valorBruto = +(totalLiquidoDistribuivel * (d.percentual / 100)).toFixed(2)
    const descontoIndividual = +(indivPorPart[d.participanteId] || 0).toFixed(2)
    const valor = +(valorBruto - descontoIndividual).toFixed(2)
    return { participanteId: d.participanteId, percentual: d.percentual, valorBruto, descontoIndividual, valor }
  })

  const acerto: Omit<Acerto, "id" | "createdAt"> = {
    data: new Date().toISOString(),
    titulo,
    observacoes,
    linhaIds,
    totalLucro: +totalLucro.toFixed(2),
    totalDespesasRateio: +totalDespesasRateio.toFixed(2),
    totalDespesasIndividuais: +totalDespesasIndividuais.toFixed(2),
    totalLiquidoDistribuivel,
    distribuicoes: dist,
    despesas,
    ultimoRecebimentoBanco,
    status: "aberto",
  }
  saveAcerto(acerto)
  const id = getAcertos()[0].id
  setLinhasAcerto(linhaIds, id)
  return { acertoId: id }
}

export function pendenciasDeAcerto() {
  return linhasPendentesDeAcerto()
}

// Despesas pendentes (persistentes)
export function getDespesasPendentes(): DespesaPendente[] {
  return read<DespesaPendente[]>(LS_DESP_PEND, [])
}

export function saveDespesaPendente(
  desp: Omit<DespesaPendente, "id" | "createdAt" | "status"> & { id?: string },
): string {
  const list = getDespesasPendentes()
  if (desp.id) {
    const idx = list.findIndex((x) => x.id === desp.id)
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...desp }
    }
  } else {
    const toSave: DespesaPendente = {
      ...desp,
      id: uid(),
      createdAt: new Date().toISOString(),
      status: "pendente",
    }
    list.unshift(toSave)
  }
  write(LS_DESP_PEND, list)
  return list[0]?.id || desp.id || ""
}

export function deleteDespesaPendente(id: string) {
  write(
    LS_DESP_PEND,
    getDespesasPendentes().filter((d) => d.id !== id),
  )
}

export function markDespesasUsadas(ids: string[], acertoId: string) {
  if (!ids || ids.length === 0) return
  const setIds = new Set(ids)
  const list = getDespesasPendentes().map((d) =>
    setIds.has(d.id) ? { ...d, status: "usada" as const, usedInAcertoId: acertoId } : d,
  )
  write(LS_DESP_PEND, list)
}
