"use client"

import { useEffect, useMemo, useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { ensureInit, getClientes, type Cliente } from "@/lib/data-store"
import {
  addCredito,
  abaterCredito,
  getSaldoCliente,
  getMovimentosDoCliente,
  deleteMovimento,
  type ValeMovimento,
} from "@/lib/vales"

function brl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0)
}

export default function ValesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteCredito, setClienteCredito] = useState<string>("")
  const [valorCredito, setValorCredito] = useState<string>("")
  const [descCredito, setDescCredito] = useState<string>("")

  const [clienteDebito, setClienteDebito] = useState<string>("")
  const [valorDebito, setValorDebito] = useState<string>("")
  const [descDebito, setDescDebito] = useState<string>("")

  const [mostrarTodos, setMostrarTodos] = useState(false)
  const [extratoCliente, setExtratoCliente] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    ensureInit()
    setClientes(getClientes())
    const onChange = () => {
      setClientes(getClientes())
      setRefreshTick((t) => t + 1)
    }
    if (typeof window !== "undefined") {
      window.addEventListener("erp:changed" as any, onChange)
      return () => window.removeEventListener("erp:changed" as any, onChange)
    }
  }, [])

  const saldos = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of clientes) map.set(c.id, getSaldoCliente(c.id))
    return clientes
      .map((c) => ({ ...c, saldo: map.get(c.id) ?? 0 }))
      .filter((c) => (mostrarTodos ? true : c.saldo > 0))
      .sort((a, b) => b.saldo - a.saldo || a.nome.localeCompare(b.nome))
  }, [clientes, mostrarTodos, refreshTick])

  const saldoClienteDebito = useMemo(
    () => (clienteDebito ? getSaldoCliente(clienteDebito) : 0),
    [clienteDebito, refreshTick],
  )

  async function onAddCredito() {
    try {
      if (!clienteCredito) return toast({ title: "Selecione um cliente." })
      const v = Number(String(valorCredito).replace(",", "."))
      if (!v || v <= 0) return toast({ title: "Informe um valor válido." })
      addCredito(clienteCredito, v, descCredito)
      setValorCredito("")
      setDescCredito("")
      toast({ title: "Crédito adicionado com sucesso." })
      setRefreshTick((t) => t + 1)
    } catch (e: any) {
      toast({ title: e?.message || "Erro ao adicionar crédito." })
    }
  }

  async function onAbaterCredito() {
    try {
      if (!clienteDebito) return toast({ title: "Selecione um cliente." })
      const v = Number(String(valorDebito).replace(",", "."))
      if (!v || v <= 0) return toast({ title: "Informe um valor válido." })
      abaterCredito(clienteDebito, v, descDebito)
      setValorDebito("")
      setDescDebito("")
      toast({ title: "Valor abatido do crédito." })
      setRefreshTick((t) => t + 1)
    } catch (e: any) {
      toast({ title: e?.message || "Erro ao abater crédito." })
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Vale (crédito por cliente)</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="add" className="w-full">
              <TabsList>
                <TabsTrigger value="add">Adicionar crédito</TabsTrigger>
                <TabsTrigger value="use">Abater crédito</TabsTrigger>
              </TabsList>

              <TabsContent value="add" className="mt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Cliente</Label>
                    <Select value={clienteCredito} onValueChange={setClienteCredito}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome} {c.documento ? `• ${c.documento}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Valor do crédito (R$)</Label>
                    <Input
                      inputMode="decimal"
                      placeholder="0,00"
                      value={valorCredito}
                      onChange={(e) => setValorCredito(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-3">
                    <Label>Descrição (opcional)</Label>
                    <Input
                      placeholder="Ex.: Adiantamento, devolução, acordo..."
                      value={descCredito}
                      onChange={(e) => setDescCredito(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Button onClick={onAddCredito}>Adicionar crédito</Button>
                </div>
              </TabsContent>

              <TabsContent value="use" className="mt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Cliente</Label>
                    <Select value={clienteDebito} onValueChange={setClienteDebito}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome} {c.documento ? `• ${c.documento}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {clienteDebito && (
                      <div className="text-sm text-muted-foreground">
                        Saldo atual: <span className="font-medium text-emerald-700">{brl(saldoClienteDebito)}</span>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label>Valor para abater (R$)</Label>
                    <Input
                      inputMode="decimal"
                      placeholder="0,00"
                      value={valorDebito}
                      onChange={(e) => setValorDebito(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-3">
                    <Label>Descrição (opcional)</Label>
                    <Input
                      placeholder="Ex.: Abatimento em mercadoria"
                      value={descDebito}
                      onChange={(e) => setDescDebito(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Button onClick={onAbaterCredito} disabled={!clienteDebito || saldoClienteDebito <= 0}>
                    Abater do crédito
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Saldos por cliente</CardTitle>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={mostrarTodos} onChange={(e) => setMostrarTodos(e.target.checked)} />
              Mostrar todos (inclusive saldo R$ 0,00)
            </label>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saldos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.documento || "-"}</TableCell>
                    <TableCell className="text-right font-medium">{brl(c.saldo)}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="bg-transparent">
                            Extrato
                          </Button>
                        </DialogTrigger>
                        <ExtratoDialog
                          clienteId={c.id}
                          clienteNome={c.nome}
                          onChanged={() => setRefreshTick((t) => t + 1)}
                        />
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {saldos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum registro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function ExtratoDialog({
  clienteId,
  clienteNome,
  onChanged,
}: { clienteId: string; clienteNome: string; onChanged: () => void }) {
  const [movs, setMovs] = useState<ValeMovimento[]>([])
  useEffect(() => {
    setMovs(getMovimentosDoCliente(clienteId))
  }, [clienteId])

  function handleDelete(id: string) {
    deleteMovimento(id)
    setMovs(getMovimentosDoCliente(clienteId))
    onChanged()
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Extrato de vales — {clienteNome}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movs.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{new Date(m.data).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className={m.tipo === "credito" ? "text-emerald-700" : "text-red-600"}>
                  {m.tipo === "credito" ? "Crédito" : "Débito"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.descricao || "-"}</TableCell>
                <TableCell
                  className={[
                    "text-right font-medium",
                    m.tipo === "credito" ? "text-emerald-700" : "text-red-600",
                  ].join(" ")}
                >
                  {brl(m.valor)}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(m.id)}>
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {movs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Sem movimentos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  )
}
