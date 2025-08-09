"use client"

import { sha256 } from "js-sha256"

export type Cliente = {
  id: string
  nome: string
  documento: string // CNPJ/CPF
  endereco?: string
  telefone?: string
  email?: string
  createdAt: string
}

export type Produto = {
  id: string
  nome: string
  descricao?: string
  marca?: string
  precoVenda: number
  custo: number
  taxaImposto: number // 0.0 - 1.0
  modalidadeVenda?: string
  estoque?: number
  // NOVOS CAMPOS (privados e opcionais)
  marca?: string
  linkRef?: string
  custoRef?: number
  createdAt: string
}

export type ItemPedido = {
  produtoId: string
  quantidade: number
  precoUnitario: number
  custoUnitario: number
  taxaImposto: number
}

export type Pedido = {
  id: string
  numero: number
  data: string
  clienteId: string
  itens: ItemPedido[]
  tipo: "Venda" | "Orçamento"
  observacoes?: string
}

export type Recebimento = {
  id: string
  pedidoId: string
  valor: number
  data: string
  formaPagamento: string
}

export type EmpresaConfig = {
  nome: string
  endereco?: string
  logoUrl?: string
  razaoSocial?: string
  cnpj?: string
  taxaImpostoPadrao?: number
  taxaCapitalPadrao?: number
}

// Agora com senha (hash) — sem email
export type Usuario = {
  id: string
  nome: string
  papel: "admin" | "vendedor" | "financeiro"
  passwordHash?: string
}

const LS = {
  clientes: "erp:clientes",
  produtos: "erp:produtos",
  pedidos: "erp:pedidos",
  recebimentos: "erp:recebimentos",
  config: "erp:config",
  usuarios: "erp:usuarios",
  seqPedido: "erp:seq:pedido",
}

export const ERP_CHANGED_EVENT = "erp:changed"

// Salt fixo para hashing local simples (não use em produção)
const PASSWORD_SALT = "erp_local_salt_v1"
const hash = (s: string) => sha256(s + PASSWORD_SALT)

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
    // evita quebrar em ambientes sem window
  }
}

export function ensureInit() {
  const inited = read<Cliente[]>(LS.clientes, [])
  if (inited.length > 0) return
  // Seed de exemplo
  const clientes: Cliente[] = [
    {
      id: uid(),
      nome: "ACME Ltda",
      documento: "12.345.678/0001-99",
      endereco: "Rua A, 123",
      telefone: "(11) 99999-9999",
      email: "contato@acme.com",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      nome: "João Silva",
      documento: "123.456.789-10",
      endereco: "Av. B, 456",
      telefone: "(11) 98888-8888",
      email: "joao@email.com",
      createdAt: new Date().toISOString(),
    },
  ]
  const produtos: Produto[] = [
    {
      id: uid(),
      nome: "Produto A",
      descricao: "Descrição A",
      marca: "Marca X",
      precoVenda: 120,
      custo: 70,
      custoRef: 68,
      linkRef: "https://example.com/produto-a",
      taxaImposto: 0.12,
      modalidadeVenda: "Unitário",
      estoque: 50,
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      nome: "Produto B",
      descricao: "Descrição B",
      marca: "Marca Y",
      precoVenda: 80,
      custo: 40,
      custoRef: 38,
      linkRef: "https://example.com/produto-b",
      taxaImposto: 0.08,
      modalidadeVenda: "Unitário",
      estoque: 120,
      createdAt: new Date().toISOString(),
    },
  ]
  const pedidoId = uid()
  const pedidos: Pedido[] = [
    {
      id: pedidoId,
      numero: 1,
      data: new Date().toISOString(),
      clienteId: clientes[0].id,
      tipo: "Venda",
      observacoes: "Entrega padrão",
      itens: [
        {
          produtoId: produtos[0].id,
          quantidade: 2,
          precoUnitario: produtos[0].precoVenda,
          custoUnitario: produtos[0].custo,
          taxaImposto: produtos[0].taxaImposto,
        },
        {
          produtoId: produtos[1].id,
          quantidade: 1,
          precoUnitario: produtos[1].precoVenda,
          custoUnitario: produtos[1].custo,
          taxaImposto: produtos[1].taxaImposto,
        },
      ],
    },
  ]
  const recebimentos: Recebimento[] = [
    { id: uid(), pedidoId, valor: 200, data: new Date().toISOString(), formaPagamento: "Pix" },
  ]
  const config: EmpresaConfig = {
    nome: "Meu ERP",
    razaoSocial: "Meu ERP LTDA",
    cnpj: "",
    taxaImpostoPadrao: 0.1,
    taxaCapitalPadrao: 0.15,
  }
  // Seed de usuários — admin/admin
  const usuarios: Usuario[] = [{ id: uid(), nome: "admin", papel: "admin", passwordHash: hash("admin") }]

  write(LS.clientes, clientes)
  write(LS.produtos, produtos)
  write(LS.pedidos, pedidos)
  write(LS.recebimentos, recebimentos)
  write(LS.config, config)
  write(LS.usuarios, usuarios)
  write(LS.seqPedido, 2)
}

export function getClientes() {
  return read<Cliente[]>(LS.clientes, [])
}
export function saveCliente(c: Omit<Cliente, "id" | "createdAt"> & { id?: string }) {
  const all = getClientes()
  if (c.id) {
    const idx = all.findIndex((x) => x.id === c.id)
    if (idx >= 0) all[idx] = { ...all[idx], ...c }
  } else {
    all.push({ ...c, id: uid(), createdAt: new Date().toISOString() })
  }
  write(LS.clientes, all)
}
export function deleteCliente(id: string) {
  write(
    LS.clientes,
    getClientes().filter((c) => c.id !== id),
  )
}

export function getProdutos() {
  return read<Produto[]>(LS.produtos, [])
}
export function saveProduto(p: Omit<Produto, "id" | "createdAt"> & { id?: string }) {
  const all = getProdutos()
  if (p.id) {
    const idx = all.findIndex((x) => x.id === p.id)
    if (idx >= 0) all[idx] = { ...all[idx], ...p }
  } else {
    all.push({ ...p, id: uid(), createdAt: new Date().toISOString() })
  }
  write(LS.produtos, all)
}
export function deleteProduto(id: string) {
  write(
    LS.produtos,
    getProdutos().filter((p) => p.id !== id),
  )
}

export function getPedidos() {
  return read<Pedido[]>(LS.pedidos, [])
}
export function getNextNumeroPedido() {
  const seq = read<number>(LS.seqPedido, 1)
  write(LS.seqPedido, seq + 1)
  return seq
}
export function savePedido(p: Omit<Pedido, "id" | "numero"> & { id?: string; numero?: number }) {
  const all = getPedidos()
  if (p.id) {
    const idx = all.findIndex((x) => x.id === p.id)
    if (idx >= 0) all[idx] = { ...all[idx], ...p }
  } else {
    const numero = p.numero ?? getNextNumeroPedido()
    all.push({ ...p, id: uid(), numero })
  }
  write(LS.pedidos, all)
}
export function deletePedido(id: string) {
  write(
    LS.pedidos,
    getPedidos().filter((o) => o.id !== id),
  )
}

export function getRecebimentos() {
  return read<Recebimento[]>(LS.recebimentos, [])
}
export function saveRecebimento(r: Omit<Recebimento, "id"> & { id?: string }) {
  const all = getRecebimentos()
  if (r.id) {
    const idx = all.findIndex((x) => x.id === r.id)
    if (idx >= 0) all[idx] = { ...all[idx], ...r }
  } else {
    all.push({ ...r, id: uid() })
  }
  write(LS.recebimentos, all)
}
export function deleteRecebimento(id: string) {
  write(
    LS.recebimentos,
    getRecebimentos().filter((x) => x.id !== id),
  )
}

export function getConfig() {
  return read<EmpresaConfig>(LS.config, {
    nome: "Meu ERP",
    razaoSocial: "Meu ERP LTDA",
    cnpj: "",
    taxaImpostoPadrao: 0.1,
    taxaCapitalPadrao: 0.15,
  })
}
export function saveConfig(cfg: Partial<EmpresaConfig>) {
  write(LS.config, { ...getConfig(), ...cfg })
}

export function getUsuarios() {
  return read<Usuario[]>(LS.usuarios, [])
}

// Agora aceita senha opcional para setar/alterar hash
export function saveUsuario(u: Omit<Usuario, "id" | "passwordHash"> & { id?: string; senha?: string }) {
  const all = getUsuarios()
  if (u.id) {
    const idx = all.findIndex((x) => x.id === u.id)
    if (idx >= 0) {
      const prev = all[idx]
      const passwordHash = u.senha ? hash(u.senha) : prev.passwordHash
      all[idx] = { ...prev, nome: u.nome, papel: u.papel, passwordHash }
    }
  } else {
    const passwordHash = u.senha ? hash(u.senha) : undefined
    all.push({ id: uid(), nome: u.nome, papel: u.papel, passwordHash })
  }
  write(LS.usuarios, all)
}

export function resetUsuarioSenha(id: string, senha: string) {
  const all = getUsuarios()
  const idx = all.findIndex((u) => u.id === id)
  if (idx >= 0) {
    all[idx] = { ...all[idx], passwordHash: hash(senha) }
    write(LS.usuarios, all)
  }
}

export function deleteUsuario(id: string) {
  write(
    LS.usuarios,
    getUsuarios().filter((u) => u.id !== id),
  )
}

// Helpers de cálculo
export function totalPedido(p: Pedido) {
  return p.itens.reduce((acc, i) => acc + i.precoUnitario * i.quantidade, 0)
}
export function impostosPedido(p: Pedido) {
  return p.itens.reduce((acc, i) => acc + i.precoUnitario * i.taxaImposto * i.quantidade, 0)
}
export function lucroPedido(p: Pedido) {
  return p.itens.reduce(
    (acc, i) => acc + (i.precoUnitario - i.custoUnitario - i.precoUnitario * i.taxaImposto) * i.quantidade,
    0,
  )
}
export function recebidoDoPedido(id: string) {
  return getRecebimentos()
    .filter((r) => r.pedidoId === id)
    .reduce((a, r) => a + r.valor, 0)
}
export function statusPedido(p: Pedido) {
  const recebido = recebidoDoPedido(p.id)
  const total = totalPedido(p)
  return recebido >= total && total > 0 ? "Pago" : "Pendente"
}

// Série mensal agregada para gráficos
export function seriesMensal() {
  const pedidos = getPedidos()
  const map = new Map<string, { vendas: number; lucros: number; impostos: number }>()
  for (const p of pedidos) {
    const d = new Date(p.data)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (!map.has(key)) map.set(key, { vendas: 0, lucros: 0, impostos: 0 })
    const agg = map.get(key)!
    agg.vendas += totalPedido(p)
    agg.lucros += lucroPedido(p)
    agg.impostos += impostosPedido(p)
    map.set(key, agg)
  }
  const entries = Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1))
  return entries.map(([key, v]) => {
    const [y, m] = key.split("-")
    return { name: `${m}/${y}`, ...v }
  })
}

// Totais para o dashboard
export function dashboardTotals() {
  const pedidos = getPedidos()
  const receb = getRecebimentos()
  const totalRecebido = receb.reduce((a, r) => a + r.valor, 0)
  const totalVendas = pedidos.reduce((a, p) => a + totalPedido(p), 0)
  const totalAReceber = Math.max(totalVendas - totalRecebido, 0)
  const lucroTotal = pedidos.reduce((a, p) => a + lucroPedido(p), 0)
  const impostosTotais = pedidos.reduce((a, p) => a + impostosPedido(p), 0)
  const pendentes = pedidos.filter((p) => statusPedido(p) === "Pendente").length
  return { totalRecebido, totalAReceber, lucroTotal, impostosTotais, totalVendas, pendentes }
}

/* ===== Backup/Restore ===== */

export type BackupPayload = {
  version: number
  exportedAt: string
  data: {
    clientes: Cliente[]
    produtos: Produto[]
    pedidos: Pedido[]
    recebimentos: Recebimento[]
    config: EmpresaConfig
    usuarios: Usuario[]
    seqPedido: number
  }
}

function isArrayOfObjects(a: unknown): a is Record<string, unknown>[] {
  return Array.isArray(a)
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const map = new Map<string, T>()
  for (const c of current) map.set(c.id, c)
  for (const n of incoming) map.set(n.id, { ...(map.get(n.id) as T | undefined), ...n })
  return Array.from(map.values())
}

export function getBackup(): BackupPayload {
  const seq = read<number>(LS.seqPedido, 1)
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      clientes: getClientes(),
      produtos: getProdutos(),
      pedidos: getPedidos(),
      recebimentos: getRecebimentos(),
      config: getConfig(),
      usuarios: getUsuarios(),
      seqPedido: typeof seq === "number" ? seq : 1,
    },
  }
}

export function restoreBackup(payload: BackupPayload, opts?: { merge?: boolean }) {
  const merge = Boolean(opts?.merge)
  if (!payload || typeof payload !== "object") throw new Error("Backup inválido")
  if (typeof payload.version !== "number" || !payload.data) throw new Error("Estrutura de backup desconhecida")

  const d = payload.data as BackupPayload["data"]

  // Validações mínimas
  if (!isArrayOfObjects(d.clientes)) d.clientes = []
  if (!isArrayOfObjects(d.produtos)) d.produtos = []
  if (!isArrayOfObjects(d.pedidos)) d.pedidos = []
  if (!isArrayOfObjects(d.recebimentos)) d.recebimentos = []
  if (!isArrayOfObjects(d.usuarios)) d.usuarios = []
  if (typeof d.seqPedido !== "number") d.seqPedido = 1
  d.config = (d.config || {}) as EmpresaConfig

  if (merge) {
    write(LS.clientes, mergeById(getClientes(), d.clientes as Cliente[]))
    write(LS.produtos, mergeById(getProdutos(), d.produtos as Produto[]))
    write(LS.pedidos, mergeById(getPedidos(), d.pedidos as Pedido[]))
    write(LS.recebimentos, mergeById(getRecebimentos(), d.recebimentos as Recebimento[]))
    write(LS.usuarios, mergeById(getUsuarios(), d.usuarios as Usuario[]))
    // Mescla configs e seq
    write(LS.config, { ...getConfig(), ...(d.config as EmpresaConfig) })
    const currentSeq = read<number>(LS.seqPedido, 1)
    write(LS.seqPedido, Math.max(currentSeq, d.seqPedido))
  } else {
    write(LS.clientes, d.clientes as Cliente[])
    write(LS.produtos, d.produtos as Produto[])
    write(LS.pedidos, d.pedidos as Pedido[])
    write(LS.recebimentos, d.recebimentos as Recebimento[])
    write(LS.usuarios, d.usuarios as Usuario[])
    write(LS.config, d.config as EmpresaConfig)
    write(LS.seqPedido, d.seqPedido)
  }
  return { merge }
}
