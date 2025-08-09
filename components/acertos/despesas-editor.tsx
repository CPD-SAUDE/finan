"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Plus } from "lucide-react"
import type { Despesa, Participante } from "@/lib/acertos"
import { fmtCurrency } from "@/lib/format"

type Props = {
  participantes?: Participante[]
  despesas?: Despesa[]
  onAdd?: (d: Omit<Despesa, "id">) => void
  onRemove?: (id: string) => void
  onSavePendente?: (d: Omit<Despesa, "id">) => void
  title?: string
  className?: string
}

export default function DespesasEditor({
  participantes = [],
  despesas = [],
  onAdd = () => {},
  onRemove = () => {},
  onSavePendente = () => {},
  title = "Despesas do acerto",
  className = "",
}: Props) {
  const [descricao, setDescricao] = useState("")
  const [valor, setValor] = useState("")
  const [tipo, setTipo] = useState<Despesa["tipo"]>("rateio")
  const [participanteId, setParticipanteId] = useState<string>("")

  const totalRateio = useMemo(
    () => despesas.filter((d) => d.tipo === "rateio").reduce((a, d) => a + (d.valor || 0), 0),
    [despesas],
  )
  const totalIndividuais = useMemo(
    () => despesas.filter((d) => d.tipo === "individual").reduce((a, d) => a + (d.valor || 0), 0),
    [despesas],
  )

  function buildPayload(): Omit<Despesa, "id"> | null {
    const v = Number(valor || "0")
    if (!descricao.trim() || !isFinite(v) || v <= 0) return null
    if (tipo === "individual" && !participanteId) return null
    return {
      descricao: descricao.trim(),
      valor: +v.toFixed(2),
      tipo,
      participanteId: tipo === "individual" ? participanteId : undefined,
    }
  }

  function handleAdd() {
    const payload = buildPayload()
    if (!payload) return
    onAdd(payload)
    resetInputs()
  }

  function handleSavePendente() {
    const payload = buildPayload()
    if (!payload) return
    onSavePendente(payload)
    resetInputs()
  }

  function resetInputs() {
    setDescricao("")
    setValor("")
    setTipo("rateio")
    setParticipanteId("")
  }

  return (
    <div className={`rounded-md border ${className}`}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded bg-rose-500" />
          <Label className="text-sm text-foreground">{title}</Label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar despesa
          </Button>
          <Button size="sm" variant="outline" className="bg-transparent" onClick={handleSavePendente}>
            <Download className="mr-2 h-4 w-4" />
            Salvar como pendente
          </Button>
        </div>
      </div>

      <div className="grid gap-3 p-3 md:grid-cols-5">
        <div className="md:col-span-2">
          <Label>Descrição</Label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Frete" />
        </div>
        <div>
          <Label>Valor (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as Despesa["tipo"])}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rateio">Rateio geral</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Participante</Label>
          <Select value={participanteId} onValueChange={setParticipanteId} disabled={tipo !== "individual"}>
            <SelectTrigger>
              <SelectValue placeholder={tipo === "individual" ? "Selecione" : "N/A"} />
            </SelectTrigger>
            <SelectContent>
              {participantes.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-auto px-3 pb-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Participante</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {despesas.map((d) => {
              const part = participantes.find((p) => p.id === d.participanteId)
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.descricao}</TableCell>
                  <TableCell className="capitalize">{d.tipo}</TableCell>
                  <TableCell>{part?.nome ?? "-"}</TableCell>
                  <TableCell className="tabular-nums">{fmtCurrency(d.valor)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="destructive" onClick={() => onRemove(d.id)}>
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {despesas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhuma despesa adicionada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <Label>Total despesas de rateio</Label>
            <Input readOnly value={fmtCurrency(totalRateio)} />
          </div>
          <div>
            <Label>Total despesas individuais</Label>
            <Input readOnly value={fmtCurrency(totalIndividuais)} />
          </div>
        </div>
      </div>
    </div>
  )
}
