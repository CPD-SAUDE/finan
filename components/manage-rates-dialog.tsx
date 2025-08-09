"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  deleteCapitalRate,
  deleteImpostoRate,
  getCapitalRates,
  getImpostoRates,
  saveCapitalRate,
  saveImpostoRate,
  type Rate,
} from "@/lib/rates"

export function ManageRatesDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved?: () => void
}) {
  const [capital, setCapital] = useState<Rate[]>([])
  const [imposto, setImposto] = useState<Rate[]>([])
  const [nomeCap, setNomeCap] = useState("")
  const [percCap, setPercCap] = useState("")
  const [nomeImp, setNomeImp] = useState("")
  const [percImp, setPercImp] = useState("")

  function refresh() {
    setCapital(getCapitalRates())
    setImposto(getImpostoRates())
    onSaved?.()
  }
  useEffect(() => {
    if (open) refresh()
  }, [open])

  function addCapital() {
    const p = Number(percCap.replace(",", "."))
    if (!nomeCap || isNaN(p)) return
    saveCapitalRate({ nome: nomeCap, percentual: p })
    setNomeCap("")
    setPercCap("")
    refresh()
  }
  function addImposto() {
    const p = Number(percImp.replace(",", "."))
    if (!nomeImp || isNaN(p)) return
    saveImpostoRate({ nome: nomeImp, percentual: p })
    setNomeImp("")
    setPercImp("")
    refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Taxas</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Taxas de Capital</h3>
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-3">
                <Label className="sr-only" htmlFor="nomeCap">
                  Nome
                </Label>
                <Input
                  id="nomeCap"
                  placeholder="Nome (ex.: Capital 3%)"
                  value={nomeCap}
                  onChange={(e) => setNomeCap(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label className="sr-only" htmlFor="percCap">
                  Percentual
                </Label>
                <Input
                  id="percCap"
                  placeholder="%"
                  value={percCap}
                  onChange={(e) => setPercCap(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div className="col-span-5">
                <Button onClick={addCapital} className="w-full">
                  Adicionar
                </Button>
              </div>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capital.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell>{r.percentual.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            deleteCapitalRate(r.id)
                            refresh()
                          }}
                        >
                          Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {capital.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhuma taxa cadastrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Taxas de Imposto</h3>
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-3">
                <Label className="sr-only" htmlFor="nomeImp">
                  Nome
                </Label>
                <Input
                  id="nomeImp"
                  placeholder="Nome (ex.: Imposto 8%)"
                  value={nomeImp}
                  onChange={(e) => setNomeImp(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label className="sr-only" htmlFor="percImp">
                  Percentual
                </Label>
                <Input
                  id="percImp"
                  placeholder="%"
                  value={percImp}
                  onChange={(e) => setPercImp(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div className="col-span-5">
                <Button onClick={addImposto} className="w-full">
                  Adicionar
                </Button>
              </div>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imposto.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell>{r.percentual.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            deleteImpostoRate(r.id)
                            refresh()
                          }}
                        >
                          Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {imposto.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhuma taxa cadastrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
