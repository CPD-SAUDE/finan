"use client"

import { useEffect, useMemo, useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  criarAcerto,
  getAcertos,
  getParticipantes,
  pendenciasDeAcerto,
  saveParticipante,
  deleteParticipante,
  updateAcerto,
  getDespesasPendentes,
  saveDespesaPendente,
  deleteDespesaPendente,
  markDespesasUsadas,
  type Participante,
  type Acerto,
  type Despesa,
  type DespesaPendente,
} from "@/lib/acertos"
import type { LinhaVenda } from "@/lib/planilha"
import { fmtCurrency } from "@/lib/format"
import { toast } from "@/hooks/use-toast"
import { Plus, Users, Receipt, Pencil } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import DespesasPendentesPanel from "@/components/acertos/despesas-pendentes-panel"
import DespesasEditor from "@/components/acertos/despesas-editor"

export default function AcertosPage() {
  // Participantes
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [nomePart, setNomePart] = useState("")
  const [defaultPercent, setDefaultPercent] = useState("")

  // Pendências de linhas
  const [pendentes, setPendentes] = useState<LinhaVenda[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  // Despesas do acerto (cesta)
  const [despesas, setDespesas] = useState<Despesa[]>([])

  // Despesas pendentes salvas
  const [despesasPendentes, setDespesasPendentes] = useState<DespesaPendente[]>([])
  const [usadasNesteAcerto, setUsadasNesteAcerto] = useState<string[]>([])

  // Último recebimento (acerto atual)
  const [bancoNome, setBancoNome] = useState("")
  const [bancoValor, setBancoValor] = useState("")
  const [bancoData, setBancoData] = useState("") // yyyy-mm-dd
  const [bancoInstituicao, setBancoInstituicao] = useState("")
  const [bancoLocked, setBancoLocked] = useState(false)

  // Distribuição
  const [observacoes, setObservacoes] = useState("")
  const [titulo, setTitulo] = useState("")
  const [dist, setDist] = useState<Record<string, number>>({})

  // Histórico
  const [acertos, setAcertos] = useState<Acerto[]>([])

  // Modal de edição do "último recebimento" no histórico
  const [editRecOpen, setEditRecOpen] = useState(false)
  const [editAcertoId, setEditAcertoId] = useState<string>("")
  const [editBancoNome, setEditBancoNome] = useState("")
  const [editBancoValor, setEditBancoValor] = useState("")
  const [editBancoData, setEditBancoData] = useState("")
  const [editBancoInstituicao, setEditBancoInstituicao] = useState("")

  useEffect(() => {
    refreshAll()
    const onAny = () => refreshAll()
    if (typeof window !== "undefined") {
      window.addEventListener("ERP_CHANGED_EVENT" as any, onAny)
      window.addEventListener("storage", onAny)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("ERP_CHANGED_EVENT" as any, onAny)
        window.removeEventListener("storage", onAny)
      }
    }
  }, [])

  function refreshAll() {
    setParticipantes(getParticipantes())
    setPendentes(pendenciasDeAcerto())
    setAcertos(getAcertos())
    setDespesasPendentes(getDespesasPendentes().filter((d) => d.status === "pendente"))
  }

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected])

  const totalLucroSel = useMemo(
    () => pendentes.filter((l) => selectedIds.includes(l.id)).reduce((a, l) => a + (l.lucroValor || 0), 0),
    [pendentes, selectedIds],
  )
  const totalRateio = useMemo(
    () => despesas.filter((d) => d.tipo === "rateio").reduce((a, d) => a + (d.valor || 0), 0),
    [despesas],
  )
  const baseDistribuivel = useMemo(() => Math.max(totalLucroSel - totalRateio, 0), [totalLucroSel, totalRateio])

  const indivPorPart = useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of despesas) {
      if (d.tipo === "individual" && d.participanteId) {
        map[d.participanteId] = (map[d.participanteId] || 0) + (d.valor || 0)
      }
    }
    return map
  }, [despesas])

  function distribuirIgual() {
    if (participantes.length === 0) return
    const base = +(100 / participantes.length).toFixed(4)
    const d: Record<string, number> = {}
    participantes.forEach((p, idx) => {
      d[p.id] = idx === participantes.length - 1 ? +(100 - base * (participantes.length - 1)).toFixed(4) : base
    })
    setDist(d)
  }

  // Callbacks para os componentes de despesas
  function onAddDespesa(payload: Omit<Despesa, "id">) {
    const nova: Despesa = { id: crypto.randomUUID(), ...payload }
    setDespesas((d) => [nova, ...d])
  }
  function onRemoveDespesa(id: string) {
    setDespesas((d) => d.filter((x) => x.id !== id))
  }
  function onSavePendente(payload: Omit<Despesa, "id">) {
    saveDespesaPendente(payload as any)
    setDespesasPendentes(getDespesasPendentes().filter((d) => d.status === "pendente"))
    toast({ title: "Despesa salva para acerto futuro." })
  }
  function onUsePendentes(ids: string[]) {
    if (!ids.length) return
    const pend = despesasPendentes.filter((d) => ids.includes(d.id))
    const toAdd: Despesa[] = pend.map((p) => ({
      id: crypto.randomUUID(),
      descricao: p.descricao,
      valor: p.valor,
      tipo: p.tipo,
      participanteId: p.participanteId,
    }))
    setDespesas((d) => [...toAdd, ...d])
    setUsadasNesteAcerto((prev) => [...prev, ...ids])
    toast({ title: `Adicionadas ${toAdd.length} despesa(s) ao acerto.` })
  }
  function onDeletePendentes(ids: string[]) {
    ids.forEach((id) => deleteDespesaPendente(id))
    setDespesasPendentes(getDespesasPendentes().filter((d) => d.status === "pendente"))
    toast({ title: "Despesas pendentes excluídas." })
  }

  function salvarAcerto() {
    if (selectedIds.length === 0) {
      toast({ title: "Selecione ao menos uma venda recebida pendente de acerto." })
      return
    }
    if (participantes.length === 0) {
      toast({ title: "Cadastre ao menos um participante." })
      return
    }
    const soma = participantes.reduce((a, p) => a + (dist[p.id] ?? p.defaultPercent ?? 0), 0)
    if (Math.abs(soma - 100) > 0.01) {
      toast({ title: "A soma dos percentuais deve ser 100%." })
      return
    }
    const distribuicoes = participantes.map((p) => ({
      participanteId: p.id,
      percentual: dist[p.id] ?? p.defaultPercent ?? 0,
    }))

    const nome = bancoNome.trim()
    const valNum = Number(bancoValor || "0")
    const banco = bancoInstituicao.trim()
    const dataISO = bancoData ? new Date(bancoData).toISOString() : undefined
    const anyField = !!(nome || banco || dataISO || (isFinite(valNum) && valNum > 0))
    const ultimoRecebimentoBanco = anyField
      ? {
          nome: nome || undefined,
          valor: isFinite(valNum) ? +valNum.toFixed(2) : undefined,
          banco: banco || undefined,
          data: dataISO,
        }
      : undefined

    const { acertoId } = criarAcerto({
      titulo: titulo.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      linhaIds: selectedIds,
      distribuicoes,
      despesas,
      ultimoRecebimentoBanco,
    })

    if (usadasNesteAcerto.length) {
      markDespesasUsadas(usadasNesteAcerto, acertoId)
    }

    // reset UI
    setSelected({})
    setTitulo("")
    setObservacoes("")
    setDespesas([])
    setUsadasNesteAcerto([])
    setBancoNome("")
    setBancoValor("")
    setBancoData("")
    setBancoInstituicao("")
    setBancoLocked(false)
    refreshAll()
    toast({ title: `Acerto criado (${acertoId}) com sucesso!` })
  }

  // Participantes CRUD
  function addParticipante() {
    if (!nomePart.trim()) return
    const dp = Number(defaultPercent || "0")
    const sane = isFinite(dp) ? dp : 0
    saveParticipante({ nome: nomePart.trim(), defaultPercent: sane, ativo: true })
    setNomePart("")
    setDefaultPercent("")
    setParticipantes(getParticipantes())
  }

  // Editar "último recebimento" no histórico
  function openEditReceb(a: Acerto) {
    setEditAcertoId(a.id)
    setEditBancoNome(a.ultimoRecebimentoBanco?.nome || "")
    setEditBancoValor(a.ultimoRecebimentoBanco?.valor != null ? String(a.ultimoRecebimentoBanco.valor) : "")
    setEditBancoData(a.ultimoRecebimentoBanco?.data ? a.ultimoRecebimentoBanco.data.slice(0, 10) : "")
    setEditBancoInstituicao(a.ultimoRecebimentoBanco?.banco || "")
    setEditRecOpen(true)
  }
  function saveEditReceb() {
    if (!editAcertoId) return
    const nome = editBancoNome.trim()
    const val = Number(editBancoValor || "0")
    const banco = editBancoInstituicao.trim()
    const dataISO = editBancoData ? new Date(editBancoData).toISOString() : undefined
    const anyField = !!(nome || banco || dataISO || (isFinite(val) && val > 0))
    const payload = anyField
      ? {
          nome: nome || undefined,
          valor: isFinite(val) ? +val.toFixed(2) : undefined,
          banco: banco || undefined,
          data: dataISO,
        }
      : undefined
    updateAcerto(editAcertoId, { ultimoRecebimentoBanco: payload })
    setEditRecOpen(false)
    setEditAcertoId("")
    refreshAll()
    toast({ title: "Último recebimento atualizado." })
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 space-y-6">
        {/* Participantes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participantes da divisão de lucros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>Nome</Label>
                <Input
                  value={nomePart}
                  onChange={(e) => setNomePart(e.target.value)}
                  placeholder="Nome do participante"
                />
              </div>
              <div>
                <Label>Percentual padrão (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={defaultPercent}
                  onChange={(e) => setDefaultPercent(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={addParticipante}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </div>

            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Percentual padrão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participantes.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{(p.defaultPercent ?? 0).toFixed(2)}%</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            deleteParticipante(p.id)
                            setParticipantes(getParticipantes())
                          }}
                        >
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {participantes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhum participante cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Pendentes de acerto (linhas) */}
          <Card>
            <CardHeader>
              <CardTitle>Vendas pendentes de acerto</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={pendentes.length > 0 && selectedIds.length === pendentes.length}
                        onCheckedChange={(v) => {
                          const on = Boolean(v)
                          setSelected(on ? Object.fromEntries(pendentes.map((l) => [l.id, true])) : {})
                        }}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Lucro (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendentes.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Checkbox
                          checked={!!selected[l.id]}
                          onCheckedChange={(v) => setSelected((s) => ({ ...s, [l.id]: Boolean(v) }))}
                          aria-label="Selecionar linha"
                        />
                      </TableCell>
                      <TableCell>{l.dataPedido ? new Date(l.dataPedido).toLocaleDateString("pt-BR") : "-"}</TableCell>
                      <TableCell className="max-w-[180px] truncate" title={l.cliente || ""}>
                        {l.cliente || "-"}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate" title={l.produto || ""}>
                        {l.produto || "-"}
                      </TableCell>
                      <TableCell className="tabular-nums font-medium text-emerald-700">
                        {fmtCurrency(l.lucroValor || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendentes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Não há vendas “RECEBIDO VALOR” pendentes de acerto.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-3 text-sm">
                <span className="text-muted-foreground">Selecionadas:</span>{" "}
                <span className="font-medium">{selectedIds.length}</span>
                <span className="ml-3 text-muted-foreground">Lucro total:</span>{" "}
                <span className="font-semibold tabular-nums">{fmtCurrency(totalLucroSel)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Despesas + Distribuição + Último recebimento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Despesas e distribuição do acerto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Último recebimento */}
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Último recebimento no banco</div>
                  <div className="flex items-center gap-2">
                    {!bancoLocked ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent"
                        onClick={() => setBancoLocked(true)}
                      >
                        Salvar
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => setBancoLocked(false)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setBancoNome("")
                            setBancoValor("")
                            setBancoData("")
                            setBancoInstituicao("")
                            setBancoLocked(false)
                          }}
                        >
                          Limpar
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <Label>Nome / Identificador</Label>
                    <Input
                      value={bancoNome}
                      onChange={(e) => setBancoNome(e.target.value)}
                      placeholder="Ex.: Cliente XPTO / Identificador"
                      disabled={bancoLocked}
                    />
                  </div>
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={bancoValor}
                      onChange={(e) => setBancoValor(e.target.value)}
                      placeholder="0,00"
                      disabled={bancoLocked}
                    />
                  </div>
                  <div>
                    <Label>Data da transação</Label>
                    <Input
                      type="date"
                      value={bancoData}
                      onChange={(e) => setBancoData(e.target.value)}
                      disabled={bancoLocked}
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <div>
                    <Label>Nome do banco</Label>
                    <Input
                      value={bancoInstituicao}
                      onChange={(e) => setBancoInstituicao(e.target.value)}
                      placeholder="Ex.: Nubank, Itaú, Bradesco..."
                      disabled={bancoLocked}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Essa informação é opcional e será salva junto ao acerto.
                </p>
              </div>

              <Separator className="my-4" />

              {/* Despesas salvas anteriormente */}
              <DespesasPendentesPanel
                pendentes={despesasPendentes}
                participantes={participantes}
                onUse={onUsePendentes}
                onDelete={onDeletePendentes}
              />

              {/* Editor de despesas do acerto */}
              <DespesasEditor
                participantes={participantes}
                despesas={despesas}
                onAdd={onAddDespesa}
                onRemove={onRemoveDespesa}
                onSavePendente={onSavePendente}
                className="mt-4"
              />

              {/* Resumo / Observações / Distribuição */}
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Total líquido para distribuir</Label>
                  <Input readOnly value={fmtCurrency(baseDistribuivel)} />
                </div>
                <div className="md:col-span-3">
                  <Label>Observações</Label>
                  <Textarea
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Detalhes do acerto (opcional)"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" type="button" onClick={distribuirIgual}>
                  Distribuir igualmente
                </Button>
                <div className="text-sm text-muted-foreground">
                  Soma dos percentuais:{" "}
                  <span className="font-medium">
                    {participantes.reduce((a, p) => a + (dist[p.id] ?? p.defaultPercent ?? 0), 0).toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Participante</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Bruto</TableHead>
                      <TableHead>Despesas indiv.</TableHead>
                      <TableHead>Líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participantes.map((p) => {
                      const perc = dist[p.id] ?? p.defaultPercent ?? 0
                      const bruto = +(baseDistribuivel * (perc / 100)).toFixed(2)
                      const indiv = +despesas
                        .filter((d) => d.tipo === "individual" && d.participanteId === p.id)
                        .reduce((a, d) => a + (d.valor || 0), 0)
                        .toFixed(2)
                      const liquido = +(bruto - indiv).toFixed(2)
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.nome}</TableCell>
                          <TableCell className="w-36">
                            <Input
                              type="number"
                              step="0.01"
                              value={String(perc)}
                              onChange={(e) => setDist((d) => ({ ...d, [p.id]: Number(e.target.value || "0") }))}
                            />
                          </TableCell>
                          <TableCell className="tabular-nums">{fmtCurrency(bruto)}</TableCell>
                          <TableCell className="tabular-nums text-red-600">{fmtCurrency(indiv)}</TableCell>
                          <TableCell className="tabular-nums font-semibold text-emerald-700">
                            {fmtCurrency(liquido)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {participantes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Cadastre participantes para definir a distribuição.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={salvarAcerto} disabled={pendentes.length === 0}>
                  Salvar acerto e marcar linhas
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de acertos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Linhas</TableHead>
                  <TableHead>Total Lucro</TableHead>
                  <TableHead>Desp. Rateio</TableHead>
                  <TableHead>Desp. Individuais</TableHead>
                  <TableHead>Total Líquido</TableHead>
                  <TableHead>Últ. Receb. (Nome)</TableHead>
                  <TableHead>Últ. Receb. (Valor)</TableHead>
                  <TableHead>Últ. Receb. (Data)</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acertos.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{new Date(a.data).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="max-w-[240px] truncate" title={a.titulo || ""}>
                      {a.titulo || "-"}
                    </TableCell>
                    <TableCell>{a.linhaIds.length}</TableCell>
                    <TableCell className="tabular-nums">{fmtCurrency(a.totalLucro)}</TableCell>
                    <TableCell className="tabular-nums text-amber-700">{fmtCurrency(a.totalDespesasRateio)}</TableCell>
                    <TableCell className="tabular-nums text-red-700">
                      {fmtCurrency(a.totalDespesasIndividuais)}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium text-emerald-700">
                      {fmtCurrency(a.totalLiquidoDistribuivel)}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate" title={a.ultimoRecebimentoBanco?.nome || ""}>
                      {a.ultimoRecebimentoBanco?.nome || "-"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {a.ultimoRecebimentoBanco?.valor != null ? fmtCurrency(a.ultimoRecebimentoBanco.valor) : "-"}
                    </TableCell>
                    <TableCell>
                      {a.ultimoRecebimentoBanco?.data
                        ? new Date(a.ultimoRecebimentoBanco.data).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate" title={a.ultimoRecebimentoBanco?.banco || ""}>
                      {a.ultimoRecebimentoBanco?.banco || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="bg-transparent" onClick={() => openEditReceb(a)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar receb.
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {acertos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground">
                      Nenhum acerto registrado ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal editar último recebimento no histórico */}
        <Dialog open={editRecOpen} onOpenChange={setEditRecOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar último recebimento (banco)</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>Nome / Identificador</Label>
                <Input
                  value={editBancoNome}
                  onChange={(e) => setEditBancoNome(e.target.value)}
                  placeholder="Ex.: Cliente XPTO / Identificador"
                />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editBancoValor}
                  onChange={(e) => setEditBancoValor(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Data da transação</Label>
                <Input type="date" value={editBancoData} onChange={(e) => setEditBancoData(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3">
              <div>
                <Label>Nome do banco</Label>
                <Input
                  value={editBancoInstituicao}
                  onChange={(e) => setEditBancoInstituicao(e.target.value)}
                  placeholder="Ex.: Nubank, Itaú, Bradesco..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditRecOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => {
                  setEditBancoNome("")
                  setEditBancoValor("")
                  setEditBancoData("")
                  setEditBancoInstituicao("")
                }}
              >
                Limpar
              </Button>
              <Button
                onClick={() => {
                  saveEditReceb()
                }}
              >
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
