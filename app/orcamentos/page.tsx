"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Printer, Trash2 } from "lucide-react"
import { fmtCurrency } from "@/lib/format"
import OrcamentoForm from "@/components/orcamento-form"
import { AppHeader } from "@/components/app-header"
import { makeOrcamentoHTML, openPrintWindow } from "@/lib/print"
import { ensureDefaultEmpresa } from "@/lib/empresas"

type OrcamentoItem = {
  descricao: string
  marca?: string
  quantidade: number
  valorUnitario: number
}

type LocalOrcamento = {
  id: string
  numero: number
  data: string
  cliente: {
    id?: string
    nome: string
    documento?: string
    telefone?: string
    email?: string
    endereco?: string
  }
  itens: OrcamentoItem[]
  observacoes?: string
}

function getOrcamentos(): LocalOrcamento[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem("erp_orcamentos")
    return raw ? (JSON.parse(raw) as LocalOrcamento[]) : []
  } catch {
    return []
  }
}

function deleteOrcamento(id: string) {
  const all = getOrcamentos()
  const rest = all.filter((o) => o.id !== id)
  localStorage.setItem("erp_orcamentos", JSON.stringify(rest))
  window.dispatchEvent(new CustomEvent("erp-changed"))
}

function totalOrcamento(o: LocalOrcamento) {
  return o.itens.reduce((acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), 0)
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<LocalOrcamento[]>([])

  const reload = () => setOrcamentos(getOrcamentos())

  useEffect(() => {
    reload()
    const onChange = () => reload()
    window.addEventListener("erp-changed", onChange as EventListener)
    window.addEventListener("storage", onChange)
    return () => {
      window.removeEventListener("erp-changed", onChange as EventListener)
      window.removeEventListener("storage", onChange)
    }
  }, [])

  const handleGerarDocumento = (o: LocalOrcamento) => {
    // Garante empresa atual definida nas Configurações Gerais
    ensureDefaultEmpresa()
    // Passa o total calculado para o gerador de HTML
    const withTotal = { ...o, total: totalOrcamento(o) }
    const html = makeOrcamentoHTML(withTotal as any)
    openPrintWindow(html, `Orçamento #${o.numero}`)
  }

  return (
    <>
      <AppHeader />
      <main className="container mx-auto max-w-6xl space-y-6 p-4">
        <h1 className="text-2xl font-semibold">Orçamentos</h1>

        <Tabs defaultValue="criar">
          <TabsList>
            <TabsTrigger value="criar">Criar Orçamento</TabsTrigger>
            <TabsTrigger value="salvos">Orçamentos Salvos</TabsTrigger>
          </TabsList>

          <TabsContent value="criar" className="mt-4">
            <OrcamentoForm />
          </TabsContent>

          <TabsContent value="salvos" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Orçamentos Salvos</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-32" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orcamentos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhum orçamento salvo.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orcamentos.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell>{o.numero}</TableCell>
                          <TableCell>{o.cliente?.nome}</TableCell>
                          <TableCell>{new Date(o.data).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">{fmtCurrency(totalOrcamento(o))}</TableCell>
                          <TableCell className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              title="Gerar documento do orçamento"
                              onClick={() => handleGerarDocumento(o)}
                            >
                              <Printer className="h-4 w-4" />
                              <span className="sr-only">Gerar documento</span>
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              title="Excluir orçamento"
                              onClick={() => {
                                deleteOrcamento(o.id)
                                reload()
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Excluir</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}
