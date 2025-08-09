"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ensureAmigosInit,
  getAmigoLancamentos,
  saveAmigoLancamento,
  deleteAmigoLancamento,
  marcarPago,
  type AmigoLancamento,
  totaisAmigos,
  calcularJurosInfo,
} from "@/lib/amigos"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { fmtCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CheckCircle2, Pencil, Plus, Trash2, UserRound, Percent } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { redirect } from "next/navigation"

const ALL_VALUE = "all"

export default function AmigosPage() {
  redirect("/outros-negocios")

  const [rows, setRows] = useState<AmigoLancamento[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AmigoLancamento | null>(null)
  const [filtroPessoa, setFiltroPessoa] = useState(ALL_VALUE)
  const [somentePendentes, setSomentePendentes] = useState(false)
  const [jurosEnabled, setJurosEnabled] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    ensureAmigosInit()
    setRows(getAmigoLancamentos())
  }, [])

  // Ajusta o switch quando abrir o diálogo
  useEffect(() => {
    if (open) {
      setJurosEnabled(editing?.interestEnabled ?? false)
    } else {
      setJurosEnabled(false)
    }
  }, [open, editing])

  const totals = useMemo(() => totaisAmigos(), [rows])

  const pessoas = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.pessoa.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [rows],
  )

  const filtered = useMemo(() => {
    let list = [...rows]
    if (filtroPessoa !== ALL_VALUE) list = list.filter((r) => r.pessoa === filtroPessoa)
    if (somentePendentes) list = list.filter((r) => r.status === "Pendente")
    return list.sort((a, b) => +new Date(b.data) - +new Date(a.data))
  }, [rows, filtroPessoa, somentePendentes])

  function handleSubmit(form: FormData) {
    const interestEnabled = String(form.get("interestEnabled") || "0") === "1"
    const interestMonthlyPercent = Number(String(form.get("interestMonthlyPercent") || "").replace(",", "."))

    const payload: Omit<AmigoLancamento, "id"> & { id?: string } = {
      id: editing?.id,
      pessoa: String(form.get("pessoa") || "").trim(),
      tipo: String(form.get("tipo") || "Empréstimo") as "Empréstimo" | "Venda",
      descricao: String(form.get("descricao") || "").trim(),
      valor: Number(String(form.get("valor") || "0").replace(",", ".")),
      data: String(form.get("data") || new Date().toISOString()),
      status: String(form.get("status") || "Pendente") as "Pendente" | "Pago",
      dataPagamento: form.get("dataPagamento") ? String(form.get("dataPagamento")) : undefined,
      observacoes: String(form.get("observacoes") || "").trim() || undefined,
      interestEnabled,
      interestMonthlyPercent: isFinite(interestMonthlyPercent) ? interestMonthlyPercent : undefined,
    }

    if (!payload.pessoa || payload.valor <= 0) {
      toast({ title: "Preencha os campos obrigatórios", description: "Pessoa e Valor são obrigatórios." })
      return
    }
    if (payload.interestEnabled && (!payload.interestMonthlyPercent || payload.interestMonthlyPercent <= 0)) {
      toast({ title: "Informe a taxa de juros", description: "Defina a % a.m. para habilitar juros." })
      return
    }

    if (payload.status === "Pago" && !payload.dataPagamento) {
      payload.dataPagamento = new Date().toISOString()
    }

    saveAmigoLancamento(payload)
    setRows(getAmigoLancamentos())
    setOpen(false)
    setEditing(null)
    toast({ title: editing ? "Lançamento atualizado" : "Lançamento adicionado" })
  }

  function onMarcarPago(id: string) {
    marcarPago(id)
    setRows(getAmigoLancamentos())
    toast({ title: "Pagamento registrado" })
  }

  function onExcluir(id: string) {
    deleteAmigoLancamento(id)
    setRows(getAmigoLancamentos())
    toast({ title: "Lançamento excluído" })
  }

  const defaultDate = new Date().toISOString().slice(0, 10)

  return (
    <>
      <AppHeader />
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-7xl px-4 py-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Dialog
              open={open}
              onOpenChange={(o) => {
                setOpen(o)
                if (!o) setEditing(null)
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova linha
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
                </DialogHeader>
                <form
                  action={(formData) => {
                    handleSubmit(formData)
                  }}
                  className="grid gap-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="pessoa">Pessoa</Label>
                      <Input
                        id="pessoa"
                        name="pessoa"
                        defaultValue={editing?.pessoa ?? ""}
                        placeholder="Nome do amigo"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="tipo">Tipo</Label>
                      <Select name="tipo" defaultValue={editing?.tipo ?? "Empréstimo"}>
                        <SelectTrigger id="tipo">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Empréstimo">Empréstimo</SelectItem>
                          <SelectItem value="Venda">Venda</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Input
                        id="descricao"
                        name="descricao"
                        defaultValue={editing?.descricao ?? ""}
                        placeholder="Ex.: caixa de som, serviço, etc."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="valor">Valor (R$)</Label>
                      <Input
                        id="valor"
                        name="valor"
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        defaultValue={editing ? String(editing.valor) : ""}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor="data">Data</Label>
                      <Input
                        id="data"
                        name="data"
                        type="date"
                        defaultValue={editing?.data ? editing.data.slice(0, 10) : defaultDate}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue={editing?.status ?? "Pendente"}>
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Pago">Pago</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dataPagamento">Data pagamento</Label>
                      <Input
                        id="dataPagamento"
                        name="dataPagamento"
                        type="date"
                        defaultValue={editing?.dataPagamento ? editing.dataPagamento.slice(0, 10) : ""}
                        placeholder="se pago"
                      />
                    </div>
                  </div>

                  {/* Juros */}
                  <div className="rounded-md border p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium leading-none">Juros mensais</p>
                          <p className="text-xs text-muted-foreground">
                            Compostos a cada mês completo. Ex.: 2% a.m. por 3 meses.
                          </p>
                        </div>
                      </div>
                      <Switch id="interestEnabledSwitch" checked={jurosEnabled} onCheckedChange={setJurosEnabled} />
                    </div>

                    {/* Input hidden para enviar no FormData */}
                    <input type="hidden" name="interestEnabled" value={jurosEnabled ? "1" : "0"} readOnly />

                    <div className="grid gap-2 sm:max-w-xs">
                      <Label htmlFor="interestMonthlyPercent">% a.m.</Label>
                      <Input
                        id="interestMonthlyPercent"
                        name="interestMonthlyPercent"
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="Ex.: 2"
                        defaultValue={
                          editing?.interestMonthlyPercent !== undefined ? String(editing.interestMonthlyPercent) : ""
                        }
                        disabled={!jurosEnabled}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Input
                      id="observacoes"
                      name="observacoes"
                      defaultValue={editing?.observacoes ?? ""}
                      placeholder="Opcional"
                    />
                  </div>

                  <DialogFooter className="mt-2">
                    <Button type="submit">{editing ? "Salvar alterações" : "Adicionar"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <Select value={filtroPessoa} onValueChange={setFiltroPessoa}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Todas as pessoas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Todas</SelectItem>
                    {pessoas.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={somentePendentes} onCheckedChange={setSomentePendentes} id="pendentes" />
                <Label htmlFor="pendentes" className="cursor-pointer">
                  Somente pendentes
                </Label>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Total (principal)</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{fmtCurrency(totals.totalPrincipal)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Pago (principal)</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold text-emerald-600">
                {fmtCurrency(totals.pagoPrincipal)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Em aberto (c/ juros)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-amber-600">{fmtCurrency(totals.totalEmAbertoComJuros)}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Inclui {fmtCurrency(totals.jurosPendentes)} de juros acumulados dos pendentes.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Amigos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[1120px] text-sm">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left font-medium">Data</th>
                      <th className="px-3 py-2 text-left font-medium">Pessoa</th>
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="px-3 py-2 text-left font-medium">Descrição</th>
                      <th className="px-3 py-2 text-left font-medium">Valor</th>
                      <th className="px-3 py-2 text-left font-medium">Meses</th>
                      <th className="px-3 py-2 text-left font-medium">Juros (acum.)</th>
                      <th className="px-3 py-2 text-left font-medium">Total devido</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Data pagamento</th>
                      <th className="px-3 py-2 text-left font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const info = calcularJurosInfo(r)
                      const isPago = r.status === "Pago"
                      const dataFmt = r.data.slice(0, 10).split("-").reverse().join("/")
                      const dataPgFmt = r.dataPagamento
                        ? r.dataPagamento.slice(0, 10).split("-").reverse().join("/")
                        : "-"

                      return (
                        <tr key={r.id} className={cn("border-b", isPago ? "bg-emerald-50/40" : "bg-amber-50/40")}>
                          <td className="px-3 py-2">{dataFmt}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span>{r.pessoa}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">{r.tipo}</td>
                          <td className="px-3 py-2">
                            <span className="truncate block max-w-[320px]" title={r.descricao}>
                              {r.descricao}
                            </span>
                            {r.interestEnabled && r.interestMonthlyPercent ? (
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {r.interestMonthlyPercent}% a.m.
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 font-medium">{fmtCurrency(r.valor)}</td>
                          <td className="px-3 py-2">{r.interestEnabled ? `${info.meses} m` : "-"}</td>
                          <td className="px-3 py-2">{r.interestEnabled ? fmtCurrency(info.juros) : "-"}</td>
                          <td className="px-3 py-2">
                            {r.interestEnabled ? fmtCurrency(info.totalDevido) : fmtCurrency(r.valor)}
                          </td>
                          <td className="px-3 py-2">
                            {isPago ? (
                              <Badge variant="default">Pago</Badge>
                            ) : (
                              <Badge variant="destructive">Pendente</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2">{dataPgFmt}</td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-2">
                              {!isPago && (
                                <Button size="sm" variant="secondary" onClick={() => onMarcarPago(r.id)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Marcar pago
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => {
                                  setEditing(r)
                                  setOpen(true)
                                }}
                                aria-label="Editar"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="destructive"
                                onClick={() => onExcluir(r.id)}
                                aria-label="Excluir"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                          Nenhum lançamento encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  )
}
