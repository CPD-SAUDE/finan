"use client"

import { useEffect, useMemo, useState } from "react"
import { AppHeader } from "@/components/app-header"
import { type Produto, ensureInit, getProdutos, deleteProduto } from "@/lib/data-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import ProductForm from "@/components/product-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

function brl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0)
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Produto | null>(null)
  const { toast } = useToast()

  function refresh() {
    setProdutos(getProdutos())
  }
  useEffect(() => {
    ensureInit()
    refresh()
  }, [])

  const columns = useMemo(
    () => ["Produto", "Marca", "Preço", "Custo", "Estoque", "Custo ref.", "Link ref.", "Ações"],
    [],
  )

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Produtos</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditing(null)
                  setOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Novo produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar produto" : "Cadastrar produto"}</DialogTitle>
              </DialogHeader>
              <ProductForm
                initial={editing}
                onSaved={() => {
                  setOpen(false)
                  refresh()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Seu catálogo</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c}>{c}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium">{p.nome}</div>
                      {p.descricao && <div className="text-xs text-muted-foreground">{p.descricao}</div>}
                      {p.modalidadeVenda && (
                        <div className="mt-1">
                          <Badge variant="secondary">{p.modalidadeVenda}</Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{p.marca || "-"}</TableCell>
                    <TableCell>{brl(p.precoVenda)}</TableCell>
                    <TableCell>{brl(p.custo)}</TableCell>
                    <TableCell>{p.estoque ?? 0}</TableCell>
                    <TableCell>
                      <div className={p.custoRef && p.custo && p.custo > (p.custoRef || 0) ? "text-amber-600" : ""}>
                        {p.custoRef ? brl(p.custoRef) : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.linkRef ? (
                        <a
                          href={p.linkRef}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2"
                          title="Abrir link de referência (privado)"
                        >
                          Abrir <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setEditing(p)
                          setOpen(true)
                        }}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => {
                          if (!confirm("Excluir este produto?")) return
                          deleteProduto(p.id)
                          refresh()
                          toast({ title: "Produto excluído" })
                        }}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {produtos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                      Nenhum produto cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-3 text-xs text-muted-foreground">
              Observação: “Link ref.” e “Custo ref.” são campos privados para seu controle e não aparecem em orçamentos,
              vendas ou relatórios enviados a clientes.
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
