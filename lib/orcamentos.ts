"use client"

// Itens do orçamento
export type OrcamentoItem = {
  descricao: string
  quantidade: number
  valorUnitario: number
  // Pública: aparece em PDFs/CSVs para o cliente
  marca?: string
  // Privados: uso interno, NÃO aparecem para o cliente
  linkRef?: string
  custoRef?: number
}

// Dados básicos do cliente
export type OrcamentoCliente = {
  id?: string
  nome: string
  documento?: string
  telefone?: string
  email?: string
  endereco?: string
}

export type Orcamento = {
  id: string
  numero: number
  data: string // ISO date
  createdAt: string // ISO datetime
  updatedAt: string // ISO datetime
  cliente: OrcamentoCliente
  itens: OrcamentoItem[]
  observacoes?: string
}

const LS = {
  orcamentos: "erp:orcamentos:v1",
  seq: "erp:orcamentos:seq",
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

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
    window.dispatchEvent(new CustomEvent("erp-changed", { detail: { key } }))
  } catch {
    // no-op
  }
}

export function getOrcamentos(): Orcamento[] {
  return read<Orcamento[]>(LS.orcamentos, [])
}

export function getNextNumeroOrcamento(): number {
  const cur = read<number>(LS.seq, 1)
  write(LS.seq, cur + 1)
  return cur
}

export function totalOrcamento(o: Pick<Orcamento, "itens">): number {
  return o.itens.reduce((acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), 0)
}

type SaveInput = Omit<Orcamento, "id" | "numero" | "data" | "createdAt" | "updatedAt"> & {
  id?: string
  numero?: number
  data?: string
}

export function saveOrcamento(input: SaveInput): Orcamento {
  const all = getOrcamentos()
  const now = new Date().toISOString()

  if (input.id) {
    const idx = all.findIndex((x) => x.id === input.id)
    if (idx >= 0) {
      const updated: Orcamento = { ...all[idx], ...input, updatedAt: now }
      all[idx] = updated
      write(LS.orcamentos, all)
      return updated
    }
  }

  const created: Orcamento = {
    id: uid(),
    numero: input.numero ?? getNextNumeroOrcamento(),
    data: input.data ?? new Date().toISOString(),
    createdAt: now,
    updatedAt: now,
    cliente: input.cliente,
    itens: input.itens,
    observacoes: input.observacoes,
  }
  all.push(created)
  write(LS.orcamentos, all)
  return created
}

export function deleteOrcamento(id: string) {
  write(
    LS.orcamentos,
    getOrcamentos().filter((o) => o.id !== id),
  )
}

// Ao gerar documento para o cliente, mantenha a marca (pública) e remova os campos privados.
export function sanitizeOrcamentoForCustomer(o: Orcamento) {
  return {
    ...o,
    itens: o.itens.map(({ descricao, quantidade, valorUnitario, marca }) => ({
      descricao,
      quantidade,
      valorUnitario,
      marca, // permanece
    })),
  }
}
