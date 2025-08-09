"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import type { DespesaPendente, Participante } from "@/lib/acertos"
import { fmtCurrency } from "@/lib/format"

type Props = {
  pendentes?: DespesaPendente[]
  participantes?: Participante[]
  onUse?: (ids: string[]) => void
  onDelete?: (ids: string[]) => void
  title?: string
  className?: string
}

export default function DespesasPendentesPanel({
  pendentes = [],
  participantes = [],
  onUse = () => {},
  onDelete = () => {},
  title = "Despesas salvas anteriormente",
  className = "",
}: Props) {
  const [sel, setSel] = useState<Record<string, boolean>>({})

  const allSelected = useMemo(() => {
    if (pendentes.length === 0) return false
    const count = Object.values(sel).filter(Boolean).length
    return count === pendentes.length
  }, [pendentes, sel])

  const anySelected = useMemo(() => Object.values(sel).some(Boolean), [sel])

  function toggleAll(v: boolean) {
    setSel(v ? Object.fromEntries(pendentes.map((d) => [d.id, true])) : {})
  }

  function selectedIds() {
    return Object.keys(sel).filter((k) => sel[k])
  }

  return (
    <div className={`rounded-md border bg-muted/20 ${className}`}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded bg-emerald-500" />
          <Label className="text-sm text-foreground">{title}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => onUse(selectedIds())} disabled={!anySelected}>
            <Upload className="mr-2 h-4 w-4" />
            Usar selecionadas no acerto
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-transparent"
            onClick={() => onDelete(selectedIds())}
            disabled={!anySelected}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(Boolean(v))} />
              </TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Participante</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendentes.map((d) => {
              const part = participantes.find((p) => p.id === d.participanteId)
              return (
                <TableRow key={d.id}>
                  <TableCell className="w-10">
                    <Checkbox
                      checked={!!sel[d.id]}
                      onCheckedChange={(v) => setSel((s) => ({ ...s, [d.id]: Boolean(v) }))}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{d.descricao}</TableCell>
                  <TableCell className="capitalize">{d.tipo}</TableCell>
                  <TableCell>{part?.nome ?? "-"}</TableCell>
                  <TableCell className="tabular-nums">{fmtCurrency(d.valor)}</TableCell>
                  <TableCell>{d.createdAt ? new Date(d.createdAt).toLocaleDateString("pt-BR") : "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="destructive" onClick={() => onDelete([d.id])}>
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {pendentes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma despesa pendente salva.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
