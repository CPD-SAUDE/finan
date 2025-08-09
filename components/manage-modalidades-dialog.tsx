"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { deleteModalidade, getModalidades, saveModalidade, type Modalidade } from "@/lib/modalidades"

export function ManageModalidadesDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved?: () => void
}) {
  const [list, setList] = useState<Modalidade[]>([])
  const [nome, setNome] = useState("")

  function refresh() {
    setList(getModalidades())
    onSaved?.()
  }
  useEffect(() => {
    if (open) refresh()
  }, [open])

  function add() {
    if (!nome.trim()) return
    saveModalidade({ nome: nome.trim() })
    setNome("")
    refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Modalidades</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-4">
              <Label className="sr-only" htmlFor="nome">
                Nome
              </Label>
              <Input
                id="nome"
                placeholder="Ex.: DIRETA, LICITAÇÃO, E-COMMERCE..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="col-span-1">
              <Button className="w-full" onClick={add}>
                Adicionar
              </Button>
            </div>
          </div>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          deleteModalidade(m.id)
                          refresh()
                        }}
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      Nenhuma modalidade cadastrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
