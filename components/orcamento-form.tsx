"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, ExternalLink, LockKeyhole, ChevronDown, ChevronRight } from "lucide-react"
import { fmtCurrency } from "@/lib/format"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { ERP_CHANGED_EVENT, getClientes } from "@/lib/data-store"

export type OrcamentoItem = {
  descricao: string
  marca?: string
  quantidade: number
  valorUnitario: number
  // privados (não saem no documento do cliente)
  linkRef?: string
  custoRef?: number
}

type ClienteState = {
  id?: string
  nome: string
  documento?: string
  telefone?: string
  email?: string
  endereco?: string
}

function saveOrcamentoLocal(payload: { cliente: ClienteState; itens: OrcamentoItem[]; observacoes?: string }) {
  const key = "erp_orcamentos"
  const all = JSON.parse(localStorage.getItem(key) || "[]") as any[]
  const numero = (all.length > 0 ? (all[all.length - 1]?.numero ?? all.length) + 1 : 1) as number
  all.push({ id: crypto.randomUUID(), numero, data: new Date().toISOString(), ...payload })
  localStorage.setItem(key, JSON.stringify(all))
  window.dispatchEvent(new CustomEvent("erp-changed"))
}

export function OrcamentoForm() {
  const { toast } = useToast()
  const [clientes, setClientes] = useState(getClientes())
  const [clienteIdSel, setClienteIdSel] = useState<string>("")
  const [cliente, setCliente] = useState<ClienteState>({ nome: "" })
  const [observacoes, setObservacoes] = useState("")
  const [itens, setItens] = useState<OrcamentoItem[]>([
    { descricao: "", marca: "", quantidade: 1, valorUnitario: 0, linkRef: "", custoRef: undefined },
  ])

  // Sincroniza a lista de clientes quando houver alterações em outras abas
  useEffect(() => {
    const reload = () => setClientes(getClientes())
    window.addEventListener(ERP_CHANGED_EVENT, reload as EventListener)
    window.addEventListener("storage", reload)
    return () => {
      window.removeEventListener(ERP_CHANGED_EVENT, reload as EventListener)
      window.removeEventListener("storage", reload)
    }
  }, [])

  // Seleção do cliente cadastrado preenche o formulário
  useEffect(() => {
    if (!clienteIdSel) return
    const c = clientes.find((x) => x.id === clienteIdSel)
    if (c) {
      setCliente({
        id: c.id,
        nome: c.nome || "",
        documento: c.documento || "",
        telefone: c.telefone || "",
        email: c.email || "",
        endereco: c.endereco || "",
      })
    }
  }, [clienteIdSel, clientes])

  const total = useMemo(
    () => itens.reduce((acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), 0),
    [itens],
  )

  const addItem = () =>
    setItens((arr) => [
      ...arr,
      { descricao: "", marca: "", quantidade: 1, valorUnitario: 0, linkRef: "", custoRef: undefined },
    ])

  const removeItem = (idx: number) => setItens((arr) => arr.filter((_, i) => i !== idx))

  const updateItem = (idx: number, patch: Partial<OrcamentoItem>) =>
    setItens((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  const canSave =
    cliente.nome.trim().length > 0 &&
    itens.length > 0 &&
    itens.every((it) => it.descricao.trim().length > 0 && it.quantidade > 0 && it.valorUnitario >= 0)

  const onSalvar = () => {
    if (!canSave) return
    try {
      saveOrcamentoLocal({ cliente, itens, observacoes })
      setCliente({ nome: "" })
      setClienteIdSel("")
      setObservacoes("")
      setItens([{ descricao: "", marca: "", quantidade: 1, valorUnitario: 0, linkRef: "", custoRef: undefined }])
      toast({ title: "Orçamento salvo!", description: "Confira em 'Orçamentos Salvos'." })
    } catch (e) {
      toast({ title: "Erro ao salvar orçamento", description: "Tente novamente.", variant: "destructive" })
    }
  }

  return (
    <div className="grid gap-6">
      {/* Selecionar cliente cadastrado */}
      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-2">
            <Label>Selecionar cliente cadastrado</Label>
            <Select value={clienteIdSel} onValueChange={setClienteIdSel}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um cliente" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {clientes.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    Nenhum cliente cadastrado
                  </SelectItem>
                ) : (
                  clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.documento ? `— ${c.documento}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A lista vem da aba Clientes. Ao cadastrar/editar lá, aparece aqui automaticamente.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente-nome">Nome</Label>
            <Input
              id="cliente-nome"
              placeholder="Ex.: ACME Ltda / João da Silva"
              value={cliente.nome}
              onChange={(e) => setCliente((c) => ({ ...c, nome: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cliente-doc">Documento (CNPJ/CPF)</Label>
            <Input
              id="cliente-doc"
              placeholder="00.000.000/0000-00"
              value={cliente.documento || ""}
              onChange={(e) => setCliente((c) => ({ ...c, documento: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cliente-tel">Telefone</Label>
            <Input
              id="cliente-tel"
              placeholder="(11) 99999-9999"
              value={cliente.telefone || ""}
              onChange={(e) => setCliente((c) => ({ ...c, telefone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cliente-email">E-mail</Label>
            <Input
              id="cliente-email"
              type="email"
              placeholder="contato@cliente.com"
              value={cliente.email || ""}
              onChange={(e) => setCliente((c) => ({ ...c, email: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="cliente-endereco">Endereço</Label>
            <Input
              id="cliente-endereco"
              placeholder="Rua, número, bairro, cidade - UF"
              value={cliente.endereco || ""}
              onChange={(e) => setCliente((c) => ({ ...c, endereco: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Itens do orçamento */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Itens do Orçamento</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar item
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="min-w-[280px]">Produto/Serviço</TableHead>
                <TableHead className="w-[180px]">Marca</TableHead>
                <TableHead className="w-[88px]">Qtd</TableHead>
                <TableHead className="w-[160px]">Valor Unitário</TableHead>
                <TableHead className="w-[160px]">Subtotal</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((it, idx) => {
                const subtotal = (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0)
                return (
                  <ItemRow
                    key={idx}
                    index={idx}
                    item={it}
                    subtotal={subtotal}
                    onChange={updateItem}
                    onRemove={removeItem}
                  />
                )
              })}
            </TableBody>
          </Table>

          <div className="mt-6 flex items-center justify-end">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-semibold tabular-nums">{fmtCurrency(total)}</div>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Somente “Link ref.” e “Custo ref.” são privados e não aparecem no documento do cliente.
          </p>
        </CardContent>
      </Card>

      {/* Observações e ações */}
      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Condições de pagamento, validade do orçamento, etc."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={onSalvar} disabled={!canSave}>
          Salvar Orçamento
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setCliente({ nome: "" })
            setClienteIdSel("")
            setObservacoes("")
            setItens([{ descricao: "", marca: "", quantidade: 1, valorUnitario: 0, linkRef: "", custoRef: undefined }])
          }}
        >
          Limpar
        </Button>
      </div>
    </div>
  )
}

function ItemRow({
  index,
  item,
  subtotal,
  onChange,
  onRemove,
}: {
  index: number
  item: OrcamentoItem
  subtotal: number
  onChange: (idx: number, patch: Partial<OrcamentoItem>) => void
  onRemove: (idx: number) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <TableRow className={cn(open && "align-top")}>
      <TableCell className="align-top">
        <div className="space-y-2">
          <Input
            placeholder="Ex.: Velas aromáticas"
            value={item.descricao}
            onChange={(e) => onChange(index, { descricao: e.target.value })}
          />

          <div className="rounded-md border bg-muted/30 p-2">
            <button
              type="button"
              className="flex w-full items-center justify-between text-sm"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={`privado-${index}`}
            >
              <span className="inline-flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Detalhes internos</span>
                <span className="text-xs text-muted-foreground">(não sai no documento)</span>
              </span>
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            {open && (
              <div id={`privado-${index}`} className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Link ref. (privado)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://loja.com/produto"
                      value={item.linkRef || ""}
                      onChange={(e) => onChange(index, { linkRef: e.target.value })}
                    />
                    {item.linkRef ? (
                      <a
                        href={item.linkRef}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent"
                        title="Abrir link de referência"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Custo ref. (privado)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0,00"
                    value={item.custoRef ?? ""}
                    onChange={(e) =>
                      onChange(index, { custoRef: e.target.value === "" ? undefined : Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell className="align-top">
        <Input
          placeholder="Ex.: Marca X"
          value={item.marca || ""}
          onChange={(e) => onChange(index, { marca: e.target.value })}
        />
      </TableCell>

      <TableCell className="align-top">
        <Input
          type="number"
          min={0}
          step="1"
          value={item.quantidade}
          onChange={(e) => onChange(index, { quantidade: Number(e.target.value) })}
        />
      </TableCell>

      <TableCell className="align-top">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={item.valorUnitario}
          onChange={(e) => onChange(index, { valorUnitario: Number(e.target.value) })}
        />
      </TableCell>

      <TableCell className="align-top font-medium">{fmtCurrency(subtotal)}</TableCell>

      <TableCell className="align-top text-right">
        <Button variant="ghost" size="icon" aria-label="Remover item" onClick={() => onRemove(index)} disabled={false}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

export default OrcamentoForm
