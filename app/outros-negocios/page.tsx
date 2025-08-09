"use client"

import { useEffect, useMemo, useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  addOutroNegocio,
  addPagamento,
  calcularJurosCompostosComPagamentos,
  computeTotals,
  getUniquePessoas,
  loadOutrosNegocios,
  removeOutroNegocio,
  removePagamento,
  saveOutrosNegocios,
  type OutroNegocio,
  type PagamentoParcial,
  type TipoOperacao,
  updateOutroNegocio,
} from "@/lib/outros-negocios"
import { CheckCheck, Edit, History, Plus, Trash2 } from "lucide-react"

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0)
}
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

type FormState = {
  id?: string
  pessoa: string
  tipo: TipoOperacao
  descricao: string
  valor: string
  data: string
  jurosAtivo: boolean
  jurosMesPercent: string
}

type PaymentForm = {
  open: boolean
  itemId?: string
  data: string
  valor: string
}

type HistoryModal = {
  open: boolean
  item?: OutroNegocio
}

export default function OutrosNegociosPage() {
  const [items, setItems] = useState<OutroNegocio[]>([])
  const [pessoaFilter, setPessoaFilter] = useState<string>("all")
  const [somentePendentes, setSomentePendentes] = useState(false)

  const [openItem, setOpenItem] = useState(false)
  const [form, setForm] = useState<FormState>({
    pessoa: "",
    tipo: "emprestimo",
    descricao: "",
    valor: "",
    data: todayISO(),
    jurosAtivo: false,
    jurosMesPercent: "",
  })

  const [payForm, setPayForm] = useState<PaymentForm>({ open: false, data: todayISO(), valor: "" })
  const [history, setHistory] = useState<HistoryModal>({ open: false })

  useEffect(() => {
    setItems(loadOutrosNegocios())
  }, [])

  const pessoas = useMemo(() => getUniquePessoas(items), [items])

  const filtered = useMemo(() => {
    let r = [...items]
    if (pessoaFilter !== "all") r = r.filter((i) => i.pessoa === pessoaFilter)
    // calcular saldo para saber se está pendente
    if (somentePendentes) {
      const today = todayISO()
      r = r.filter((i) => calcularJurosCompostosComPagamentos(i, today).saldoComJuros > 0)
    }
    // ordenar por data desc
    r.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
    return r
  }, [items, pessoaFilter, somentePendentes])

  const totals = useMemo(() => computeTotals(items), [items])

  const isEditing = !!form.id

  function resetForm() {
    setForm({
      pessoa: "",
      tipo: "emprestimo",
      descricao: "",
      valor: "",
      data: todayISO(),
      jurosAtivo: false,
      jurosMesPercent: "",
    })
  }

  function openCreate() {
    resetForm()
    setOpenItem(true)
  }

  function openEdit(item: OutroNegocio) {
    setForm({
      id: item.id,
      pessoa: item.pessoa,
      tipo: item.tipo,
      descricao: item.descricao,
      valor: String(item.valor ?? ""),
      data: item.data,
      jurosAtivo: item.jurosAtivo,
      jurosMesPercent: String(item.jurosMesPercent ?? ""),
    })
    setOpenItem(true)
  }

  function handleSaveItem() {
    const payload: OutroNegocio = {
      id: form.id ?? crypto.randomUUID(),
      pessoa: form.pessoa.trim(),
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      valor: Number(form.valor || 0),
      data: form.data,
      jurosAtivo: form.jurosAtivo,
      jurosMesPercent: form.jurosAtivo ? Number(form.jurosMesPercent || 0) : 0,
      pagamentos: isEditing ? (items.find((x) => x.id === form.id)?.pagamentos ?? []) : [],
    }

    if (!payload.pessoa || !payload.valor || !payload.data) {
      alert("Preencha Pessoa, Valor e Data.")
      return
    }

    let next: OutroNegocio[]
    if (isEditing) {
      next = updateOutroNegocio(payload.id, payload)
    } else {
      next = addOutroNegocio(payload)
    }
    setItems(next)
    setOpenItem(false)
  }

  function excluir(item: OutroNegocio) {
    if (!confirm("Excluir este lançamento?")) return
    const next = removeOutroNegocio(item.id)
    setItems(next)
  }

  function abrirPagamento(item: OutroNegocio, valorSugerido?: number) {
    setPayForm({
      open: true,
      itemId: item.id,
      data: todayISO(),
      valor: valorSugerido ? String(valorSugerido.toFixed(2)) : "",
    })
  }

  function salvarPagamento() {
    if (!payForm.itemId) return
    const valor = Number(payForm.valor || 0)
    if (!valor || valor <= 0) {
      alert("Informe um valor de pagamento válido.")
      return
    }
    const pg: PagamentoParcial = {
      id: crypto.randomUUID(),
      data: payForm.data || todayISO(),
      valor,
    }
    const next = addPagamento(payForm.itemId, pg)
    setItems(next)
    setPayForm({ open: false, data: todayISO(), valor: "" })
  }

  function removerPagamento(itemId: string, pagamentoId: string) {
    const next = removePagamento(itemId, pagamentoId)
    setItems(next)
  }

  function limparTudo() {
    if (!confirm("Apagar TODOS os lançamentos desta aba?")) return
    saveOutrosNegocios([])
    setItems([])
  }

  return (
    <main className="min-h-screen bg-white">
      <AppHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={openItem} onOpenChange={setOpenItem}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova linha
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{isEditing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pessoa">Pessoa</Label>
                  <Input
                    id="pessoa"
                    value={form.pessoa}
                    onChange={(e) => setForm((f) => ({ ...f, pessoa: e.target.value }))}
                    placeholder="Nome da pessoa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v: TipoOperacao) => setForm((f) => ({ ...f, tipo: v }))}>
                    <SelectTrigger id="tipo">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emprestimo">Empréstimo</SelectItem>
                      <SelectItem value="venda">Venda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    placeholder="Ex.: Ferramenta emprestada, produto vendido, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valor">Valor (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={form.valor}
                    onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center justify-between">
                    <span>Juros mensais</span>
                    <Switch
                      checked={form.jurosAtivo}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, jurosAtivo: v }))}
                    />
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="juros">% a.m.</Label>
                  <Input
                    id="juros"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex.: 2"
                    value={form.jurosMesPercent}
                    onChange={(e) => setForm((f) => ({ ...f, jurosMesPercent: e.target.value }))}
                    disabled={!form.jurosAtivo}
                  />
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="ghost" onClick={() => setOpenItem(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveItem}>{isEditing ? "Salvar alterações" : "Adicionar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="ml-auto flex items-center gap-2">
            <Select value={pessoaFilter} onValueChange={setPessoaFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Pessoa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {pessoas.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch checked={somentePendentes} onCheckedChange={setSomentePendentes} id="only" />
              <Label htmlFor="only" className="text-sm text-muted-foreground cursor-pointer">
                Somente pendentes
              </Label>
            </div>
          </div>
        </div>

        {/* Totais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total (principal)</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{formatBRL(totals.totalPrincipal)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pago (principal)</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold text-emerald-600">
              {formatBRL(totals.pagoPrincipal)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Em aberto (c/ juros)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-orange-600">{formatBRL(totals.totalAbertoComJuros)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Inclui {formatBRL(totals.jurosPendentes)} de juros acumulados dos pendentes.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outros negócios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Meses</TableHead>
                    <TableHead className="text-right">Juros (acum.)</TableHead>
                    <TableHead className="text-right">Total devido</TableHead>
                    <TableHead className="text-right">Pagamentos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-sm text-muted-foreground">
                        Nenhum lançamento encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((i) => {
                      const today = todayISO()
                      const { mesesTotais, jurosAcumulados, saldoComJuros, saldoPrincipalRestante } =
                        calcularJurosCompostosComPagamentos(i, today)
                      const totalPagamentos = (i.pagamentos ?? []).reduce((a, p) => a + (p.valor || 0), 0)
                      const statusPago = saldoComJuros <= 0.000001
                      const podeQuitar = !statusPago && saldoComJuros > 0
                      const ultimoPg = (i.pagamentos ?? []).slice(-1)[0]?.data

                      return (
                        <TableRow key={i.id} className={cn(!statusPago ? "bg-emerald-50/40" : "")}>
                          <TableCell>{i.data}</TableCell>
                          <TableCell className="max-w-[220px] truncate" title={i.pessoa}>
                            {i.pessoa}
                          </TableCell>
                          <TableCell>{i.tipo === "emprestimo" ? "Empréstimo" : "Venda"}</TableCell>
                          <TableCell className="max-w-[280px] truncate" title={i.descricao}>
                            {i.descricao}
                          </TableCell>
                          <TableCell className="text-right">{formatBRL(i.valor)}</TableCell>
                          <TableCell className="text-right">{mesesTotais}</TableCell>
                          <TableCell className="text-right">{formatBRL(jurosAcumulados)}</TableCell>
                          <TableCell className="text-right">{formatBRL(Math.max(0, saldoComJuros))}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Dialog
                                open={history.open && history.item?.id === i.id}
                                onOpenChange={(o) => setHistory((h) => ({ ...h, open: o, item: o ? i : undefined }))}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="gap-1"
                                    onClick={() => setHistory({ open: true, item: i })}
                                  >
                                    <History className="h-4 w-4" />
                                    {i.pagamentos?.length || 0}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>Pagamentos</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-2">
                                    {(i.pagamentos ?? []).length === 0 && (
                                      <div className="text-sm text-muted-foreground">Sem pagamentos.</div>
                                    )}
                                    {(i.pagamentos ?? []).map((pg) => (
                                      <div
                                        key={pg.id}
                                        className="flex items-center justify-between rounded border p-2 text-sm"
                                      >
                                        <div>
                                          <div className="font-medium">{formatBRL(pg.valor)}</div>
                                          <div className="text-muted-foreground">{pg.data}</div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-red-600 hover:text-red-700"
                                          onClick={() => removerPagamento(i.id, pg.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </DialogContent>
                              </Dialog>

                              <div className="text-xs text-muted-foreground">
                                {totalPagamentos > 0 ? (
                                  <span title={ultimoPg ? `Último: ${ultimoPg}` : undefined}>
                                    {formatBRL(totalPagamentos)}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {statusPago ? (
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                                Pago
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {podeQuitar && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => abrirPagamento(i, saldoComJuros)}
                                  className="gap-1"
                                  title="Registrar pagamento"
                                >
                                  <CheckCheck className="h-4 w-4" />
                                  Pagar
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => openEdit(i)} title="Editar">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => excluir(i)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {items.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button variant="destructive" onClick={limparTudo}>
                  Limpar tudo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de pagamento parcial */}
      <Dialog open={payForm.open} onOpenChange={(o) => setPayForm((pf) => ({ ...pf, open: o }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dataPg">Data</Label>
              <Input
                id="dataPg"
                type="date"
                value={payForm.data}
                onChange={(e) => setPayForm((pf) => ({ ...pf, data: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valorPg">Valor (R$)</Label>
              <Input
                id="valorPg"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={payForm.valor}
                onChange={(e) => setPayForm((pf) => ({ ...pf, valor: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setPayForm({ open: false, data: todayISO(), valor: "" })}>
              Cancelar
            </Button>
            <Button onClick={salvarPagamento}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
