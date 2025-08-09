"use client"

import { getCurrentEmpresaId, ensureDefaultEmpresa } from "@/lib/empresas"

export type PaymentStatus = "PENDENTE" | "RECEBIDO"
export type SettlementStatus = "PENDENTE" | "CONCLUIDO"

export type LinhaVenda = {
  id: string
  companyId?: string
  dataPedido?: string
  numeroOF?: string
  numeroDispensa?: string
  cliente?: string
  produto?: string
  modalidade?: string
  valorVenda?: number
  taxaCapitalPerc?: number
  taxaCapitalVl?: number
  taxaImpostoPerc?: number
  taxaImpostoVl?: number
  custoMercadoria?: number
  somaCustoFinal?: number
  lucroValor?: number
  lucroPerc?: number
  dataRecebimento?: string
  paymentStatus?: PaymentStatus
  settlementStatus?: SettlementStatus
  cor?: "amarelo" | "vermelho" | "verde" | "roxo" | "cinza"
  acertoId?: string
}

const LS_KEY = "erp:linhas-vendas"

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

// Helpers de parsing e formatação
export function parseBRLCurrency(value: unknown): number {
  if (typeof value === "number") return value
  if (!value) return 0
  let s = String(value).trim()
  s = s.replace(/\s/g, "").replace(/[Rr]\$?/g, "")
  s = s.replace(/\./g, "").replace(/,/g, ".")
  const n = Number(s)
  return isFinite(n) ? n : 0
}
export function parsePercent(value: unknown): number {
  if (typeof value === "number") return value
  if (!value) return 0
  const s = String(value).trim().replace("%", "").replace(",", ".")
  const n = Number(s)
  return isFinite(n) ? n : 0
}
export function parseDateISO(value: unknown): string | undefined {
  if (!value) return undefined
  if (value instanceof Date && !isNaN(+value)) return value.toISOString()
  const s = String(value).trim()
  const dm = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (dm) {
    const [_, d, m, y] = dm
    const iso = new Date(Number(y), Number(m) - 1, Number(d)).toISOString()
    return iso
  }
  const dt = new Date(s)
  return isNaN(+dt) ? undefined : dt.toISOString()
}

function computeDerived(raw: LinhaVenda): LinhaVenda {
  const valorVenda = Number(raw.valorVenda ?? 0)
  const taxaCapitalPerc = Number(raw.taxaCapitalPerc ?? 0)
  const taxaImpostoPerc = Number(raw.taxaImpostoPerc ?? 0)
  const custoMercadoria = Number(raw.custoMercadoria ?? 0)

  // Sempre recalcula os valores derivados
  const taxaCapitalVl = +(valorVenda * (taxaCapitalPerc / 100)).toFixed(2)
  const taxaImpostoVl = +(valorVenda * (taxaImpostoPerc / 100)).toFixed(2)
  const somaCustoFinal = +(custoMercadoria + taxaCapitalVl + taxaImpostoVl).toFixed(2)
  const lucroValor = +(valorVenda - somaCustoFinal).toFixed(2)
  const lucroPerc = valorVenda > 0 ? +((lucroValor / valorVenda) * 100).toFixed(2) : 0

  return {
    ...raw,
    valorVenda,
    taxaCapitalPerc,
    taxaCapitalVl,
    taxaImpostoPerc,
    taxaImpostoVl,
    custoMercadoria,
    somaCustoFinal,
    lucroValor,
    lucroPerc,
  }
}

function migrate(rows: LinhaVenda[]): LinhaVenda[] {
  // Garante que existe empresa default e current
  const cur = getCurrentEmpresaId() || ensureDefaultEmpresa().id
  const migrated = rows.map((r: any) => {
    // Migrar status legado
    let paymentStatus: PaymentStatus | undefined = r.paymentStatus
    if (!paymentStatus) {
      const st = String(r.status || "").toLowerCase()
      paymentStatus = st.includes("recebido") ? "RECEBIDO" : "PENDENTE"
    }
    const settlementStatus: SettlementStatus = r.acertoId ? "CONCLUIDO" : r.settlementStatus || "PENDENTE"

    const withCompany: LinhaVenda = {
      ...r,
      paymentStatus,
      settlementStatus,
      companyId: r.companyId || cur,
    }
    delete (withCompany as any).status
    delete (withCompany as any).pendenteAcerto
    return computeDerived(withCompany)
  })
  // Se precisou atribuir companyId em massa, persiste
  if (migrated.some((r) => !rows.find((x) => x.id === r.id)?.companyId)) {
    setLinhas(migrated)
  }
  return migrated
}

export function getLinhasAll(): LinhaVenda[] {
  const rows = read<LinhaVenda[]>(LS_KEY, [])
  return migrate(rows)
}

export function getLinhas(): LinhaVenda[] {
  const cur = getCurrentEmpresaId() || ensureDefaultEmpresa().id
  return getLinhasAll().filter((r) => (r.companyId || cur) === cur)
}

export function setLinhas(rows: LinhaVenda[]) {
  write(LS_KEY, rows)
}

export function saveLinha(row: Omit<LinhaVenda, "id" | "companyId"> & { id?: string }) {
  const rows = getLinhasAll()
  const cur = getCurrentEmpresaId() || ensureDefaultEmpresa().id
  if (row.id) {
    const idx = rows.findIndex((r) => r.id === row.id)
    if (idx >= 0) rows[idx] = computeDerived({ ...rows[idx], ...row })
  } else {
    rows.unshift(computeDerived({ ...row, id: uid(), companyId: cur }))
  }
  setLinhas(rows)
}

export function deleteLinha(id: string) {
  setLinhas(getLinhasAll().filter((r) => r.id !== id))
}

export type LinhaCor = "amarelo" | "vermelho" | "verde" | "roxo" | "cinza"

export function updateLinhaColor(id: string, cor?: LinhaCor) {
  const rows = getLinhasAll()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], cor }
    setLinhas(rows)
  }
}

export function linhasPendentesDeAcerto(): LinhaVenda[] {
  return getLinhas().filter((r) => r.paymentStatus === "RECEBIDO" && !r.acertoId)
}

export function setLinhasAcerto(ids: string[], acertoId: string) {
  const all = getLinhasAll()
  const set = new Set(ids)
  const updated = all.map((r) => (set.has(r.id) ? { ...r, acertoId, settlementStatus: "CONCLUIDO" } : r))
  setLinhas(updated)
}

// Importação a partir de headers variados
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, " ")
    .trim()
}
const headerMap: Record<string, keyof LinhaVenda> = {
  "data pedid": "dataPedido",
  "data pedido": "dataPedido",
  "n of": "numeroOF",
  "nº of": "numeroOF",
  "numero of": "numeroOF",
  "n dispensa": "numeroDispensa",
  "nº dispensa": "numeroDispensa",
  "numero dispensa": "numeroDispensa",
  "numero de dispensa": "numeroDispensa",
  cliente: "cliente",
  "produto orcado vendido": "produto",
  produto: "produto",
  modalidade: "modalidade",
  "valor venda": "valorVenda",
  "taxa capital %": "taxaCapitalPerc",
  "taxa capital": "taxaCapitalPerc",
  "taxa vl capital": "taxaCapitalVl",
  "taxa % imposto": "taxaImpostoPerc",
  "taxa imposto %": "taxaImpostoPerc",
  "taxa vl imposto": "taxaImpostoVl",
  "custo da mercadoria": "custoMercadoria",
  "custo mercadoria": "custoMercadoria",
  "soma custo final": "somaCustoFinal",
  "lucro em valor": "lucroValor",
  "lucro valor": "lucroValor",
  "lucro em %": "lucroPerc",
  "lucro %": "lucroPerc",
  "data recebiment": "dataRecebimento",
  "data recebimento": "dataRecebimento",
  status: "paymentStatus",
  "status pagamento": "paymentStatus",
  "status do pagamento": "paymentStatus",
  "status acerto": "settlementStatus",
  "status do acerto": "settlementStatus",
  "pendente acerto": "pendenteAcerto",
  cor: "cor",
}

export function importRowsFromObjects(objs: Record<string, any>[]) {
  const cur = getCurrentEmpresaId() || ensureDefaultEmpresa().id
  const mapped: LinhaVenda[] = objs.map((o) => {
    const row: LinhaVenda = { id: uid(), companyId: cur }
    for (const [key, val] of Object.entries(o)) {
      const k = headerMap[normalizeHeader(key)]
      if (!k) continue
      switch (k) {
        case "valorVenda":
        case "taxaCapitalVl":
        case "taxaImpostoVl":
        case "custoMercadoria":
        case "somaCustoFinal":
        case "lucroValor":
          ;(row as any)[k] = parseBRLCurrency(val)
          break
        case "taxaCapitalPerc":
        case "taxaImpostoPerc":
        case "lucroPerc":
          ;(row as any)[k] = parsePercent(val)
          break
        case "dataPedido":
        case "dataRecebimento":
          ;(row as any)[k] = parseDateISO(val)
          break
        case "paymentStatus": {
          const s = String(val).trim().toLowerCase()
          ;(row as any).paymentStatus = s.includes("recebido") ? "RECEBIDO" : "PENDENTE"
          break
        }
        case "settlementStatus": {
          const s = String(val).trim().toLowerCase()
          ;(row as any).settlementStatus = s.includes("conclu") ? "CONCLUIDO" : "PENDENTE"
          break
        }
        default:
          ;(row as any)[k] = typeof val === "string" ? val.trim() : val
      }
    }
    return computeDerived(row)
  })
  setLinhas(mapped)
}

export function templateCSV(): string {
  const headers = [
    "DATA PEDIDO",
    "Nº OF",
    "Nº DISPENSA",
    "CLIENTE",
    "PRODUTO ORÇADO / VENDIDO",
    "MODALIDADE",
    "VALOR VENDA",
    "TAXA CAPITAL %",
    "TAXA VL CAPITAL",
    "TAXA % IMPOSTO",
    "TAXA VL IMPOSTO",
    "CUSTO DA MERCADORIA",
    "SOMA CUSTO FINAL",
    "LUCRO EM VALOR",
    "LUCRO EM %",
    "DATA RECEBIMENTO",
    "STATUS PAGAMENTO",
    "STATUS ACERTO",
    "COR",
  ]
  const empty = Array(headers.length).fill("")
  const rows = [headers, empty]
  return rows.map((r) => r.join(";")).join("\n")
}
