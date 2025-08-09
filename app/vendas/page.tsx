"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MetricCard } from "@/components/metric-card"
import { fmtCurrency } from "@/lib/format"
import {
  deleteLinha,
  getLinhas,
  importRowsFromObjects,
  saveLinha,
  templateCSV,
  type LinhaVenda,
  updateLinhaColor,
} from "@/lib/planilha"
import * as XLSX from "xlsx"
import { SlidersHorizontal, Upload, Plus, FileDown, BadgePercent, ListPlus, Palette } from "lucide-react"
import { ManageRatesDialog } from "@/components/manage-rates-dialog"
import { getCapitalRates, getImpostoRates, type Rate } from "@/lib/rates"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ManageModalidadesDialog } from "@/components/manage-modalidades-dialog"
import { getModalidades, type Modalidade } from "@/lib/modalidades"
import { Switch } from "@/components/ui/switch"
import {
  ensureDefaultEmpresa,
  getCurrentEmpresaId,
  getEmpresas,
  setCurrentEmpresaId,
  type Empresa,
} from "@/lib/empresas"
import { getClientes, type Cliente } from "@/lib/data-store"
import ClienteCombobox from "@/components/cliente-combobox"

type Density = "compact" | "default"
const PREFS_KEY = "erp:vendas:prefs"

type Prefs = {
  visible: Record<string, boolean>
  density: Density
}

const allColumns: Array<{ key: keyof LinhaVenda; label: string; essential?: boolean }> = [
  { key: "dataPedido", label: "Data Pedido", essential: true },
  { key: "numeroOF", label: "Nº OF", essential: true },
  { key: "numeroDispensa", label: "Nº Dispensa", essential: false },
  { key: "cliente", label: "Cliente", essential: true },
  { key: "produto", label: "Produto Orçado / Vendido", essential: true },
  { key: "modalidade", label: "Modalidade", essential: true },
  { key: "valorVenda", label: "Valor Venda", essential: true },
  { key: "taxaCapitalPerc", label: "Taxa Capital %" },
  { key: "taxaCapitalVl", label: "Taxa VL Capital" },
  { key: "taxaImpostoPerc", label: "Taxa % Imposto" },
  { key: "taxaImpostoVl", label: "Taxa VL Imposto" },
  { key: "custoMercadoria", label: "Custo da Mercadoria" },
  { key: "somaCustoFinal", label: "Soma Custo Final", essential: true },
  { key: "lucroValor", label: "Lucro (R$)", essential: true },
  { key: "lucroPerc", label: "Lucro (%)", essential: true },
  { key: "dataRecebimento", label: "Data Recebimento", essential: true },
  { key: "paymentStatus", label: "Pagamento", essential: true },
  { key: "settlementStatus", label: "Acerto", essential: false },
]

function loadPrefs(): Prefs {
  if (typeof window === "undefined") {
    return { visible: {}, density: "compact" }
  }
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return JSON.parse(raw) as Prefs
  } catch {}
  const visible = Object.fromEntries(allColumns.map((c) => [c.key, !!c.essential]))
  return { visible, density: "compact" }
}
function savePrefs(p: Prefs) {
  if (typeof window === "undefined") return
  localStorage.setItem(PREFS_KEY, JSON.stringify(p))
}

export default function VendasPlanilhaPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaId, setEmpresaId] = useState<string>("")

  const [linhas, setLinhas] = useState<LinhaVenda[]>([])
  const [filtro, setFiltro] = useState("")
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs())
  const [editing, setEditing] = useState<LinhaVenda | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [openRates, setOpenRates] = useState(false)
  const [openModalidades, setOpenModalidades] = useState(false)
  const [capitalRates, setCapitalRates] = useState<Rate[]>([])
  const [impostoRates, setImpostoRates] = useState<Rate[]>([])
  const [modalidades, setModalidades] = useState<Modalidade[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const [onlyPendAcerto, setOnlyPendAcerto] = useState(false)

  useEffect(() => {
    ensureDefaultEmpresa()
    setEmpresas(getEmpresas())
    setEmpresaId(getCurrentEmpresaId() || "")
    refresh()
    refreshRates()
    refreshModalidades()
  }, [])
  useEffect(() => {
    savePrefs(prefs)
  }, [prefs])

  function refresh() {
    setLinhas(getLinhas())
  }
  function refreshRates() {
    setCapitalRates(getCapitalRates())
    setImpostoRates(getImpostoRates())
  }
  function refreshModalidades() {
    setModalidades(getModalidades())
  }

  async function onImportFile(file: File) {
    const ab = await file.arrayBuffer()
    const wb = XLSX.read(ab, { type: "array" })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { raw: false, defval: "" })
    importRowsFromObjects(json)
    refresh()
  }

  function onDownloadTemplate() {
    const csv = templateCSV()
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "modelo-vendas-orcamento.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function openNew() {
    setEditing(null)
    setOpenDialog(true)
  }
  function openEdit(row: LinhaVenda) {
    setEditing(row)
    setOpenDialog(true)
  }

  const colsVisible = allColumns.filter((c) => prefs.visible[c.key] ?? false)

  const filtradas = useMemo(() => {
    const term = filtro.toLowerCase().trim()
    const base = term
      ? linhas.filter((r) => {
          return (
            (r.cliente || "").toLowerCase().includes(term) ||
            (r.produto || "").toLowerCase().includes(term) ||
            (r.numeroOF || "").toLowerCase().includes(term) ||
            (r.numeroDispensa || "").toLowerCase().includes(term) ||
            (r.modalidade || "").toLowerCase().includes(term)
          )
        })
      : linhas
    const filtered = onlyPendAcerto ? base.filter((r) => r.paymentStatus === "RECEBIDO" && !r.acertoId) : base
    return filtered
  }, [linhas, filtro, onlyPendAcerto])

  const totals = useMemo(() => {
    const sum = (fn: (r: LinhaVenda) => number) => filtradas.reduce((a, r) => a + (fn(r) || 0), 0)
    const totalVenda = sum((r) => r.valorVenda || 0)
    const totalCusto = sum((r) => r.somaCustoFinal || 0)
    const totalLucro = sum((r) => r.lucroValor || 0)
    const margem = totalVenda > 0 ? (totalLucro / totalVenda) * 100 : 0
    const pagos = filtradas.filter((r) => r.paymentStatus === "RECEBIDO").length
    const pendentes = filtradas.length - pagos
    return { totalVenda, totalCusto, totalLucro, margem, pagos, pendentes }
  }, [filtradas])

  function colorRowClass(cor?: string) {
    switch (cor) {
      case "amarelo":
        return "bg-amber-50 dark:bg-amber-900/20"
      case "vermelho":
        return "bg-red-50 dark:bg-red-900/20"
      case "verde":
        return "bg-emerald-50 dark:bg-emerald-900/20"
      case "roxo":
        return "bg-violet-50 dark:bg-violet-900/20"
      case "cinza":
        return "bg-neutral-50 dark:bg-neutral-900/20"
      default:
        return ""
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-4">
        {/* Toolbar */}
        <div className="sticky top-[56px] z-30 mb-4 rounded-md border bg-background/80 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 p-3">
            <div className="flex items-center gap-2">
              {/* Empresa seletor */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Empresa</Label>
                <Select
                  value={empresaId}
                  onValueChange={(v) => {
                    setEmpresaId(v)
                    setCurrentEmpresaId(v)
                    refresh()
                  }}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <a href="/empresas" className="ml-1">
                  <Button size="sm" variant="outline" className="bg-transparent">
                    Gerenciar
                  </Button>
                </a>
              </div>

              <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Importar CSV/XLSX
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onImportFile(f)
                }}
              />
              <Button size="sm" variant="outline" className="bg-transparent" onClick={onDownloadTemplate}>
                <FileDown className="mr-2 h-4 w-4" />
                Baixar modelo
              </Button>
              <Button size="sm" onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                Nova linha
              </Button>
              <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setOpenRates(true)}>
                <BadgePercent className="mr-2 h-4 w-4" />
                Taxas
              </Button>
              <Button size="sm" variant="outline" className="bg-transparent" onClick={() => setOpenModalidades(true)}>
                <ListPlus className="mr-2 h-4 w-4" />
                Modalidades
              </Button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Input
                placeholder="Filtrar por cliente, produto, nº OF, modalidade ou status"
                className="h-8 w-[300px]"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
              <div className="flex items-center gap-2 pl-2">
                <Switch id="onlyPendAcerto" checked={onlyPendAcerto} onCheckedChange={setOnlyPendAcerto} />
                <Label htmlFor="onlyPendAcerto" className="text-sm">
                  Somente pendentes de acerto
                </Label>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="bg-transparent">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Exibir
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Colunas</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allColumns.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={String(col.key)}
                      checked={prefs.visible[col.key] ?? false}
                      onCheckedChange={(v) =>
                        setPrefs((p) => ({ ...p, visible: { ...p.visible, [col.key]: Boolean(v) } }))
                      }
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Densidade</DropdownMenuLabel>
                  <div className="px-2 py-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant={prefs.density === "compact" ? "default" : "outline"}
                        onClick={() => setPrefs((p) => ({ ...p, density: "compact" }))}
                      >
                        Compacto
                      </Button>
                      <Button
                        size="sm"
                        variant={prefs.density === "default" ? "default" : "outline"}
                        onClick={() => setPrefs((p) => ({ ...p, density: "default" }))}
                      >
                        Padrão
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total de Vendas" value={fmtCurrency(totals.totalVenda)} />
          <MetricCard title="Soma dos Custos" value={fmtCurrency(totals.totalCusto)} />
          <MetricCard title="Lucro Total" value={fmtCurrency(totals.totalLucro)} />
          <MetricCard
            title="Margem Média"
            value={`${totals.margem.toFixed(2)}%`}
            hint={`Pagos: ${totals.pagos} • Pendentes: ${totals.pendentes}`}
          />
        </div>

        {/* Guia visual opcional */}
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Ver guia visual do cabeçalho (opcional)</summary>
          <div className="mt-3 overflow-auto rounded border">
            <Image
              src="/images/vendas-orcamento.png"
              width={2048}
              height={151}
              alt="Exemplo visual de cabeçalho para Vendas/Orçamento"
            />
          </div>
        </details>

        {/* Tabela */}
        <Card className="mt-4">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Vendas / Orçamento</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className={prefs.density === "compact" ? "h-8" : ""}>
                  {colsVisible.map((c) => (
                    <TableHead key={String(c.key)} className="whitespace-nowrap">
                      {c.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((r) => (
                  <TableRow
                    key={r.id}
                    className={`${prefs.density === "compact" ? "h-8" : ""} ${colorRowClass(r.cor)}`}
                  >
                    {colsVisible.map((c) => {
                      const k = c.key
                      let content: React.ReactNode = (r as any)[k]
                      switch (k) {
                        case "dataPedido":
                        case "dataRecebimento":
                          content = (r as any)[k] ? new Date((r as any)[k]).toLocaleDateString("pt-BR") : ""
                          break
                        case "valorVenda":
                        case "taxaCapitalVl":
                        case "taxaImpostoVl":
                        case "custoMercadoria":
                        case "somaCustoFinal":
                        case "lucroValor":
                          content = fmtCurrency((r as any)[k] || 0)
                          break
                        case "taxaCapitalPerc":
                        case "taxaImpostoPerc":
                        case "lucroPerc":
                          content = `${((r as any)[k] ?? 0).toFixed(2)}%`
                          break
                        case "produto":
                          content = (
                            <div className="max-w-[360px] truncate" title={r.produto || ""}>
                              {r.produto || ""}
                            </div>
                          )
                          break
                        case "paymentStatus": {
                          const isRec = r.paymentStatus === "RECEBIDO"
                          content = (
                            <span
                              className={
                                "inline-flex items-center rounded px-2 py-0.5 text-xs " +
                                (isRec ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800")
                              }
                            >
                              {isRec ? "Recebido" : "Pendente"}
                            </span>
                          )
                          break
                        }
                        case "settlementStatus": {
                          const done = r.settlementStatus === "CONCLUIDO" || !!r.acertoId
                          content = (
                            <span
                              className={
                                "inline-flex items-center rounded px-2 py-0.5 text-xs " +
                                (done ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-800")
                              }
                            >
                              {done ? "Concluído" : "Pendente"}
                            </span>
                          )
                          break
                        }
                      }
                      if (k === "lucroValor" || k === "lucroPerc") {
                        const lucro = (k === "lucroValor" ? r.lucroValor || 0 : r.lucroPerc || 0) as number
                        const color =
                          lucro < 0
                            ? "text-red-600"
                            : lucro < 10 && k === "lucroPerc"
                              ? "text-amber-600"
                              : "text-emerald-700"
                        content = <span className={`tabular-nums ${color}`}>{content}</span>
                      }
                      return (
                        <TableCell key={String(k)} className="text-xs">
                          {content}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent mr-1"
                        onClick={() => {
                          const next = r.paymentStatus === "RECEBIDO" ? "PENDENTE" : "RECEBIDO"
                          saveLinha({ ...r, paymentStatus: next })
                          refresh()
                        }}
                      >
                        {r.paymentStatus === "RECEBIDO" ? "Marcar pendente" : "Marcar recebido"}
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="bg-transparent mr-1">
                            <Palette className="mr-2 h-4 w-4" />
                            Cor
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Cor da linha</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <button
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              updateLinhaColor(r.id, undefined)
                              refresh()
                            }}
                          >
                            <span className="h-3 w-3 rounded border" />
                            Sem cor
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              updateLinhaColor(r.id, "amarelo")
                              refresh()
                            }}
                          >
                            <span className="h-3 w-3 rounded bg-amber-400" />
                            Amarelo
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              updateLinhaColor(r.id, "vermelho")
                              refresh()
                            }}
                          >
                            <span className="h-3 w-3 rounded bg-red-400" />
                            Vermelho
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              updateLinhaColor(r.id, "verde")
                              refresh()
                            }}
                          >
                            <span className="h-3 w-3 rounded bg-emerald-400" />
                            Verde
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              updateLinhaColor(r.id, "roxo")
                              refresh()
                            }}
                          >
                            <span className="h-3 w-3 rounded bg-violet-400" />
                            Roxo
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              updateLinhaColor(r.id, "cinza")
                              refresh()
                            }}
                          >
                            <span className="h-3 w-3 rounded bg-neutral-400" />
                            Cinza
                          </button>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          deleteLinha(r.id)
                          refresh()
                        }}
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={colsVisible.length + 1} className="text-center text-muted-foreground">
                      Nenhuma linha encontrada. Selecione outra empresa, importe uma planilha ou adicione linhas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal de Edição/Criação */}
        <EditDialog
          open={openDialog}
          onOpenChange={setOpenDialog}
          row={editing}
          onSaved={() => {
            setOpenDialog(false)
            setEditing(null)
            refresh()
          }}
          capitalRates={capitalRates}
          impostoRates={impostoRates}
          modalidades={modalidades}
          onOpenManageRates={() => setOpenRates(true)}
          onOpenManageModalidades={() => setOpenModalidades(true)}
        />

        {/* Gerenciar taxas */}
        <ManageRatesDialog
          open={openRates}
          onOpenChange={(v) => {
            setOpenRates(v)
            if (!v) refreshRates()
          }}
          onSaved={refreshRates}
        />

        {/* Gerenciar modalidades */}
        <ManageModalidadesDialog
          open={openModalidades}
          onOpenChange={(v) => {
            setOpenModalidades(v)
            if (!v) refreshModalidades()
          }}
          onSaved={refreshModalidades}
        />
      </main>
    </div>
  )
}

function EditDialog({
  open,
  onOpenChange,
  row,
  onSaved,
  capitalRates,
  impostoRates,
  modalidades,
  onOpenManageRates,
  onOpenManageModalidades,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  row: LinhaVenda | null
  onSaved: () => void
  capitalRates: Rate[]
  impostoRates: Rate[]
  modalidades: Modalidade[]
  onOpenManageRates: () => void
  onOpenManageModalidades: () => void
}) {
  const [capId, setCapId] = useState<string>("")
  const [impId, setImpId] = useState<string>("")
  const [modId, setModId] = useState<string>("")
  const [valorVenda, setValorVenda] = useState<string>(row?.valorVenda != null ? String(row.valorVenda) : "")
  const [custo, setCusto] = useState<string>(row?.custoMercadoria != null ? String(row.custoMercadoria) : "")
  const [paymentStatus, setPaymentStatus] = useState<"PENDENTE" | "RECEBIDO">(
    row?.paymentStatus ?? ((row?.status || "").toLowerCase().includes("recebido") ? "RECEBIDO" : "PENDENTE"),
  )
  const [form, setForm] = useState({
    dataPedido: row?.dataPedido ? String(row.dataPedido).slice(0, 10) : new Date().toISOString().slice(0, 10),
    numeroOF: row?.numeroOF || "",
    numeroDispensa: row?.numeroDispensa || "",
    cliente: row?.cliente || "",
    produto: row?.produto || "",
    modalidade: row?.modalidade || "",
    dataRecebimento: row?.dataRecebimento ? String(row.dataRecebimento).slice(0, 10) : "",
  })
  const [clientes, setClientes] = useState<Cliente[]>([])
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (open) {
      setClientes(getClientes())
    }
  }, [open])

  useEffect(() => {
    if (row?.taxaCapitalPerc != null) {
      const m = findByPercent(capitalRates, row.taxaCapitalPerc)
      if (m) setCapId(m.id)
    }
    if (row?.taxaImpostoPerc != null) {
      const m = findByPercent(impostoRates, row.taxaImpostoPerc)
      if (m) setImpId(m.id)
    }
    if (row?.modalidade) {
      const m = modalidades.find((x) => x.nome.toLowerCase() === row.modalidade?.toLowerCase())
      if (m) setModId(m.id)
    }
  }, [row, capitalRates, impostoRates, modalidades])

  // Atalho Ctrl/Cmd+S para salvar
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key.toLowerCase() === "p") setPaymentStatus("PENDENTE")
        if (e.key.toLowerCase() === "r") setPaymentStatus("RECEBIDO")
      }
    }
    if (open) {
      window.addEventListener("keydown", onKey)
      return () => window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const capPerc = capitalRates.find((r) => r.id === capId)?.percentual ?? 0
  const impPerc = impostoRates.find((r) => r.id === impId)?.percentual ?? 0
  const valor = Number(valorVenda || "0")
  const custoN = Number(custo || "0")
  const taxaCapitalVl = +(valor * (capPerc / 100)).toFixed(2)
  const taxaImpostoVl = +(valor * (impPerc / 100)).toFixed(2)
  const somaCustoFinal = +(custoN + taxaCapitalVl + taxaImpostoVl).toFixed(2)
  const lucroValor = +(valor - somaCustoFinal).toFixed(2)
  const lucroPerc = valor > 0 ? +((lucroValor / valor) * 100).toFixed(2) : 0

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const modNome = modalidades.find((m) => m.id === modId)?.nome ?? form.modalidade
    const payload: Omit<LinhaVenda, "id" | "companyId"> & { id?: string } = {
      id: row?.id,
      dataPedido: new Date(form.dataPedido).toISOString(),
      numeroOF: form.numeroOF,
      numeroDispensa: form.numeroDispensa,
      cliente: form.cliente,
      produto: form.produto,
      modalidade: modNome,
      valorVenda: valor,
      taxaCapitalPerc: capPerc,
      taxaImpostoPerc: impPerc,
      custoMercadoria: custoN,
      dataRecebimento: form.dataRecebimento ? new Date(form.dataRecebimento).toISOString() : undefined,
      paymentStatus,
      settlementStatus: row?.acertoId ? "CONCLUIDO" : row?.settlementStatus, // preserve
    }
    saveLinha(payload)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <form ref={formRef} onSubmit={onSubmit} className="flex max-h-[85vh] flex-col">
          {/* Header (sticky) */}
          <div className="sticky top-0 z-10 border-b bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <DialogHeader>
              <DialogTitle>{row ? "Editar linha" : "Nova linha"}</DialogTitle>
            </DialogHeader>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-6">
            {/* Resumo do cálculo */}
            <div className="grid gap-2 rounded-md border p-3 md:grid-cols-5">
              <SummaryStat label="Capital" value={fmtCurrency(taxaCapitalVl)} />
              <SummaryStat label="Imposto" value={fmtCurrency(taxaImpostoVl)} />
              <SummaryStat label="Final" value={fmtCurrency(somaCustoFinal)} />
              <SummaryStat
                label="Lucro (R$)"
                value={fmtCurrency(lucroValor)}
                valueClass={lucroValor < 0 ? "text-red-600" : "text-emerald-700"}
              />
              <SummaryStat
                label="Lucro (%)"
                value={`${lucroPerc.toFixed(2)}%`}
                valueClass={lucroPerc < 0 ? "text-red-600" : "text-emerald-700"}
              />
            </div>

            {/* Dados do pedido */}
            <FieldGroup title="Dados do pedido">
              <div className="grid gap-4 md:grid-cols-4">
                <Field label="Data Pedido">
                  <Input
                    id="dataPedido"
                    type="date"
                    value={form.dataPedido}
                    onChange={(e) => setForm((f) => ({ ...f, dataPedido: e.target.value }))}
                  />
                </Field>
                <Field label="Nº OF">
                  <Input
                    id="numeroOF"
                    value={form.numeroOF}
                    onChange={(e) => setForm((f) => ({ ...f, numeroOF: e.target.value }))}
                  />
                </Field>
                <Field label="Nº Dispensa">
                  <Input
                    id="numeroDispensa"
                    value={form.numeroDispensa}
                    onChange={(e) => setForm((f) => ({ ...f, numeroDispensa: e.target.value }))}
                    placeholder="Ex.: 12345/2025"
                  />
                </Field>
                <Field className="md:col-span-2" label="Cliente">
                  <div className="flex gap-2">
                    <ClienteCombobox
                      clientes={clientes}
                      value={form.cliente}
                      onChange={(nome) => setForm((f) => ({ ...f, cliente: nome }))}
                      placeholder="Selecione ou digite o nome"
                    />
                    <a href="/clientes">
                      <Button type="button" variant="outline" className="bg-transparent">
                        Cadastrar
                      </Button>
                    </a>
                  </div>
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field className="md:col-span-2" label="Produto Orçado / Vendido">
                  <Textarea
                    id="produto"
                    value={form.produto}
                    onChange={(e) => setForm((f) => ({ ...f, produto: e.target.value }))}
                    rows={2}
                    placeholder="Descreva o item vendido"
                  />
                </Field>
                <Field label="Modalidade" hint="Cadastre as modalidades e selecione">
                  <Select
                    value={modId}
                    onValueChange={(v) => {
                      setModId(v)
                      const nome = modalidades.find((m) => m.id === v)?.nome || ""
                      setForm((f) => ({ ...f, modalidade: nome }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a modalidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {modalidades.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FieldGroup>

            {/* Valores & Taxas */}
            <FieldGroup title="Valores e taxas">
              <div className="grid gap-4 md:grid-cols-5">
                <Field className="md:col-span-2" label="Valor Venda (R$)">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {"R$"}
                    </span>
                    <Input
                      id="valorVenda"
                      type="number"
                      step="0.01"
                      className="pl-10"
                      value={valorVenda}
                      onChange={(e) => setValorVenda(e.target.value)}
                    />
                  </div>
                </Field>

                <Field className="md:col-span-2" label="Taxa Capital (%)" hint="Selecione entre as taxas cadastradas">
                  <Select value={capId} onValueChange={setCapId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a taxa" />
                    </SelectTrigger>
                    <SelectContent>
                      {capitalRates.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nome} — {r.percentual.toFixed(2)}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field className="md:col-span-1" label="Taxa Imposto (%)">
                  <Select value={impId} onValueChange={setImpId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {impostoRates.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nome} — {r.percentual.toFixed(2)}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FieldGroup>

            {/* Custo, recebimento e status */}
            <FieldGroup title="Custo, recebimento e status">
              <div className="grid gap-4 md:grid-cols-4">
                <Field label="Custo da Mercadoria (R$)">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {"R$"}
                    </span>
                    <Input
                      id="custoMercadoria"
                      type="number"
                      step="0.01"
                      className="pl-10"
                      value={custo}
                      onChange={(e) => setCusto(e.target.value)}
                    />
                  </div>
                </Field>
                <Field label="Data Recebimento">
                  <Input
                    id="dataRecebimento"
                    type="date"
                    value={form.dataRecebimento}
                    onChange={(e) => setForm((f) => ({ ...f, dataRecebimento: e.target.value }))}
                  />
                </Field>
                <Field className="md:col-span-2" label="Pagamento">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={paymentStatus === "PENDENTE" ? "default" : "outline"}
                      onClick={() => setPaymentStatus("PENDENTE")}
                    >
                      Pendente (P)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={paymentStatus === "RECEBIDO" ? "default" : "outline"}
                      onClick={() => setPaymentStatus("RECEBIDO")}
                    >
                      Recebido (R)
                    </Button>
                  </div>
                </Field>
                <Field label="Acerto">
                  <div>
                    <span
                      className={
                        "inline-flex items-center rounded px-2 py-1 text-xs " +
                        (row?.acertoId || row?.settlementStatus === "CONCLUIDO"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-slate-100 text-slate-800")
                      }
                    >
                      {row?.acertoId || row?.settlementStatus === "CONCLUIDO" ? "Concluído" : "Pendente"}
                    </span>
                  </div>
                </Field>
              </div>
            </FieldGroup>
          </div>

          {/* Footer (sticky) */}
          <div className="sticky bottom-0 z-10 border-t bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit">{row ? "Salvar alterações" : "Adicionar"}</Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" className="bg-transparent" onClick={onOpenManageModalidades}>
                  Cadastrar/editar modalidades
                </Button>
                <Button type="button" variant="outline" className="bg-transparent" onClick={onOpenManageRates}>
                  Cadastrar/editar taxas
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Subcomponentes de UI locais ao modal
function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  )
}

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`grid gap-2 ${className}`}>
      <Label className="text-sm">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function SummaryStat({
  label,
  value,
  valueClass = "",
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</div>
    </div>
  )
}

function findByPercent(list: Rate[], p: number) {
  const EPS = 0.001
  return list.find((r) => Math.abs(r.percentual - p) < EPS)
}
