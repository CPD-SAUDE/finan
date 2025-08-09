"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { AppHeader } from "@/components/app-header"
import {
  type Empresa,
  getEmpresas,
  saveEmpresa,
  deleteEmpresa,
  getCurrentEmpresaId,
  setCurrentEmpresaId,
  ensureDefaultEmpresa,
} from "@/lib/empresas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function EmpresasPage() {
  const [list, setList] = useState<Empresa[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Empresa | null>(null)
  const [form, setForm] = useState({ nome: "", cnpj: "" })

  useEffect(() => {
    ensureDefaultEmpresa()
    refresh()
  }, [])

  function refresh() {
    setList(getEmpresas())
    setCurrentId(getCurrentEmpresaId())
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.nome.trim().length === 0) return
    if (editing) {
      saveEmpresa({ id: editing.id, nome: form.nome.trim(), cnpj: form.cnpj.trim() || undefined })
    } else {
      saveEmpresa({ nome: form.nome.trim(), cnpj: form.cnpj.trim() || undefined })
    }
    setOpen(false)
    setEditing(null)
    setForm({ nome: "", cnpj: "" })
    refresh()
  }

  const currentName = useMemo(() => list.find((e) => e.id === currentId)?.nome || "", [list, currentId])

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button onClick={() => setOpen(true)}>Nova empresa</Button>
          <div className="ml-auto text-sm text-muted-foreground">
            Empresa atual: <span className="font-medium text-foreground">{currentName}</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Empresas</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhuma empresa cadastrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((e) => (
                    <TableRow key={e.id} className={e.id === currentId ? "bg-muted/40" : ""}>
                      <TableCell className="font-medium">{e.nome}</TableCell>
                      <TableCell>{e.cnpj || "-"}</TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        <Button
                          variant={e.id === currentId ? "secondary" : "outline"}
                          className="bg-transparent"
                          size="sm"
                          onClick={() => {
                            setCurrentEmpresaId(e.id)
                            refresh()
                          }}
                        >
                          {e.id === currentId ? "Atual" : "Usar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => {
                            setEditing(e)
                            setForm({ nome: e.nome, cnpj: e.cnpj || "" })
                            setOpen(true)
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Excluir esta empresa? As vendas permanecerão salvas, mas sem acesso direto."))
                              deleteEmpresa(e.id)
                            refresh()
                          }}
                        >
                          Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={(v) => (setOpen(v), v || setEditing(null))}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar empresa" : "Nova empresa"}</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex.: ACME LTDA"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                <Input
                  id="cnpj"
                  value={form.cnpj}
                  onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" className="bg-transparent" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editing ? "Salvar" : "Adicionar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
