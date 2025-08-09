export type TipoOperacao = "emprestimo" | "venda"

export interface PagamentoParcial {
  id: string
  data: string // ISO yyyy-mm-dd
  valor: number
}

export interface OutroNegocio {
  id: string
  pessoa: string
  tipo: TipoOperacao
  descricao: string
  valor: number // principal original
  data: string // ISO
  jurosAtivo: boolean
  jurosMesPercent?: number // % a.m.
  // Novo: pagamentos parciais (substitui pago/dataPagamento antigos)
  pagamentos: PagamentoParcial[]
}

const STORAGE_KEY = "outros_negocios_v1"

function parseJSON<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function loadOutrosNegocios(): OutroNegocio[] {
  if (typeof window === "undefined") return []
  const parsed = parseJSON<OutroNegocio[] | any[]>(localStorage.getItem(STORAGE_KEY))
  if (!parsed || !Array.isArray(parsed)) return []

  // Migração: itens antigos sem "pagamentos" (ex.: tinham "pago" e "dataPagamento")
  const migrated: OutroNegocio[] = parsed.map((raw: any) => {
    const pagamentos: PagamentoParcial[] = Array.isArray(raw.pagamentos)
      ? raw.pagamentos
      : raw.pago && raw.dataPagamento
        ? [
            {
              id: crypto.randomUUID(),
              data: raw.dataPagamento,
              valor: typeof raw.valor === "number" ? raw.valor : Number(raw.valor || 0),
            } as PagamentoParcial,
          ]
        : []

    return {
      id: raw.id ?? crypto.randomUUID(),
      pessoa: raw.pessoa ?? "",
      tipo: (raw.tipo as TipoOperacao) ?? "emprestimo",
      descricao: raw.descricao ?? "",
      valor: typeof raw.valor === "number" ? raw.valor : Number(raw.valor || 0),
      data: raw.data ?? new Date().toISOString().slice(0, 10),
      jurosAtivo: !!raw.jurosAtivo,
      jurosMesPercent: typeof raw.jurosMesPercent === "number" ? raw.jurosMesPercent : Number(raw.jurosMesPercent || 0),
      pagamentos,
    }
  })

  return migrated
}

export function saveOutrosNegocios(items: OutroNegocio[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function addOutroNegocio(item: OutroNegocio) {
  const items = loadOutrosNegocios()
  items.push(item)
  saveOutrosNegocios(items)
  return items
}

export function updateOutroNegocio(id: string, patch: Partial<OutroNegocio>) {
  const items = loadOutrosNegocios()
  const idx = items.findIndex((i) => i.id === id)
  if (idx >= 0) {
    items[idx] = {
      ...items[idx],
      ...patch,
      // nunca permitir pagamentos undefined
      pagamentos: patch.pagamentos ?? items[idx].pagamentos ?? [],
    }
    saveOutrosNegocios(items)
  }
  return items
}

export function removeOutroNegocio(id: string) {
  const items = loadOutrosNegocios().filter((i) => i.id !== id)
  saveOutrosNegocios(items)
  return items
}

export function addPagamento(id: string, pagamento: PagamentoParcial) {
  const items = loadOutrosNegocios()
  const idx = items.findIndex((i) => i.id === id)
  if (idx >= 0) {
    const next = [...(items[idx].pagamentos ?? []), pagamento].sort((a, b) =>
      a.data < b.data ? -1 : a.data > b.data ? 1 : 0,
    )
    items[idx] = { ...items[idx], pagamentos: next }
    saveOutrosNegocios(items)
  }
  return items
}

export function removePagamento(id: string, pagamentoId: string) {
  const items = loadOutrosNegocios()
  const idx = items.findIndex((i) => i.id === id)
  if (idx >= 0) {
    items[idx] = { ...items[idx], pagamentos: (items[idx].pagamentos ?? []).filter((p) => p.id !== pagamentoId) }
    saveOutrosNegocios(items)
  }
  return items
}

/**
 * Meses completos entre duas datas. Se o dia final ainda não atingiu o dia inicial, desconta 1 mês.
 */
export function diffFullMonths(fromISO: string, toISO: string): number {
  const from = new Date(fromISO)
  const to = new Date(toISO)
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0

  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  if (to.getDate() < from.getDate()) months -= 1
  return Math.max(0, months)
}

export interface AccrualResult {
  mesesTotais: number
  jurosAcumulados: number
  saldoComJuros: number // saldo final (principal + juros - pagamentos aplicados ao longo do tempo)
  saldoPrincipalRestante: number // principal remanescente sem juros (apenas para referência)
}

/**
 * Calcula juros compostos mensais sobre o SALDO PENDENTE, respeitando pagamentos parciais no tempo.
 * Algoritmo:
 *  - Ordena pagamentos por data.
 *  - A = principal.
 *  - Para cada período [dataAtual, dataEvento]:
 *      - aplica juros compostos sobre A por m = meses completos do período.
 *      - se o evento é pagamento: A = max(0, A - valorPagamento).
 *  - No período final até "ateISO", aplica juros compostos e encerra.
 * Retorna juros acumulados (somatório de acréscimos) e o saldo final A.
 */
export function calcularJurosCompostosComPagamentos(item: OutroNegocio, ateISO: string): AccrualResult {
  let A = item.valor // saldo que sofrerá juros
  const r = item.jurosAtivo && (item.jurosMesPercent ?? 0) > 0 ? (item.jurosMesPercent as number) / 100 : 0
  let jurosAcumulados = 0
  let mesesTotais = 0

  // pagamentos ordenados
  const pagamentos = [...(item.pagamentos ?? [])].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
  let cursor = item.data

  for (const pg of pagamentos) {
    if (A <= 0) break
    const m = diffFullMonths(cursor, pg.data)
    if (m > 0 && r > 0) {
      const before = A
      A = A * Math.pow(1 + r, m)
      jurosAcumulados += A - before
      mesesTotais += m
    } else if (m > 0) {
      mesesTotais += m
    }
    // aplica pagamento
    A = Math.max(0, A - (pg.valor || 0))
    cursor = pg.data
  }

  // período final até hoje (ou data informada)
  const mFinal = diffFullMonths(cursor, ateISO)
  if (mFinal > 0 && r > 0 && A > 0) {
    const before = A
    A = A * Math.pow(1 + r, mFinal)
    jurosAcumulados += A - before
    mesesTotais += mFinal
  } else if (mFinal > 0) {
    mesesTotais += mFinal
  }

  // saldo principal restante (sem juros): principal - totalPagamentos
  const totalPagamentos = (item.pagamentos ?? []).reduce((acc, p) => acc + (p.valor || 0), 0)
  const saldoPrincipalRestante = Math.max(0, (item.valor || 0) - totalPagamentos)

  return {
    mesesTotais,
    jurosAcumulados,
    saldoComJuros: Math.max(0, A),
    saldoPrincipalRestante,
  }
}

export function getUniquePessoas(items: OutroNegocio[]): string[] {
  const set = new Set<string>()
  items.forEach((i) => i.pessoa && set.add(i.pessoa))
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))
}

export function computeTotals(items: OutroNegocio[]) {
  const totalPrincipal = items.reduce((acc, i) => acc + (i.valor || 0), 0)

  // Principal pago = soma dos pagamentos limitada ao principal de cada item
  const pagoPrincipal = items.reduce((acc, i) => {
    const somaPag = (i.pagamentos ?? []).reduce((a, p) => a + (p.valor || 0), 0)
    return acc + Math.min(i.valor || 0, somaPag)
  }, 0)

  const todayISO = new Date().toISOString().slice(0, 10)

  let jurosPendentes = 0
  let totalAbertoComJuros = 0

  items.forEach((i) => {
    const { jurosAcumulados, saldoComJuros, saldoPrincipalRestante } = calcularJurosCompostosComPagamentos(i, todayISO)
    if (saldoComJuros > 0) {
      totalAbertoComJuros += saldoComJuros
      jurosPendentes += Math.max(0, saldoComJuros - saldoPrincipalRestante)
    }
  })

  return {
    totalPrincipal,
    pagoPrincipal,
    jurosPendentes,
    totalAbertoComJuros,
  }
}
