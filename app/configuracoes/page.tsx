"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, CheckCircle, KeyRound } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Empresa } from "@/lib/empresas"
import {
  deleteEmpresa,
  ensureDefaultEmpresa,
  getCurrentEmpresa,
  getCurrentEmpresaId,
  getEmpresas,
  saveEmpresa,
  setCurrentEmpresaId,
} from "@/lib/empresas"
import {
  ERP_CHANGED_EVENT,
  type Usuario,
  getUsuarios,
  saveUsuario,
  deleteUsuario,
  getBackup,
  restoreBackup,
  resetUsuarioSenha,
} from "@/lib/data-store"
import { type EmpresaConfig as EmpresaCfgScoped, getActiveEmpresaConfig, saveEmpresaConfig } from "@/lib/company-config"

export default function ConfiguracoesPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [currentId, setCurrentId] = useState<string>("")
  const [formEmpresa, setFormEmpresa] = useState<Partial<Empresa>>({})
  const [formCfg, setFormCfg] = useState<EmpresaCfgScoped>({})
  const [editing, setEditing] = useState<Empresa | null>(null)
  const [openDialog, setOpenDialog] = useState(false)

  // Gestão de usuários (com senha)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [nomeU, setNomeU] = useState("")
  const [senhaU, setSenhaU] = useState("")
  const [papelU, setPapelU] = useState<Usuario["papel"]>("admin")

  // Backup
  const [mergeImport, setMergeImport] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  const currentEmpresa = useMemo(() => empresas.find((e) => e.id === currentId), [empresas, currentId])

  const reload = () => {
    ensureDefaultEmpresa()
    const all = getEmpresas()
    const curId = getCurrentEmpresaId()
    setEmpresas(all)
    setCurrentId(curId)
    const cur = all.find((e) => e.id === curId) || all[0]
    if (cur) {
      setFormEmpresa({
        id: cur.id,
        nome: cur.nome,
        razaoSocial: cur.razaoSocial || "",
        cnpj: cur.cnpj || "",
        endereco: cur.endereco || "",
        logoUrl: cur.logoUrl || "",
      })
      setFormCfg(getActiveEmpresaConfig())
    }
    setUsuarios(getUsuarios())
  }

  useEffect(() => {
    reload()
    const onChange = () => reload()
    window.addEventListener(ERP_CHANGED_EVENT, onChange as EventListener)
    window.addEventListener("storage", onChange)
    return () => {
      window.removeEventListener(ERP_CHANGED_EVENT, onChange as EventListener)
      window.removeEventListener("storage", onChange)
    }
  }, [])

  const handleSalvarGeral = () => {
    if (!currentId) return
    const payload: Omit<Empresa, "createdAt"> & { createdAt?: string } = {
      id: currentId,
      nome: formEmpresa.nome?.trim() || "Minha Empresa",
      razaoSocial: formEmpresa.razaoSocial?.trim() || "",
      cnpj: formEmpresa.cnpj?.trim() || "",
      endereco: formEmpresa.endereco?.trim() || "",
      logoUrl: formEmpresa.logoUrl?.trim() || "",
      createdAt: currentEmpresa?.createdAt,
    }
    saveEmpresa(payload as any)
    saveEmpresaConfig(currentId, {
      impostoPadrao: formCfg.impostoPadrao ? Number(formCfg.impostoPadrao) : undefined,
      capitalPadrao: formCfg.capitalPadrao ? Number(formCfg.capitalPadrao) : undefined,
    })
    toast({ title: "Configurações salvas" })
    reload()
  }

  const openNew = () => {
    setEditing({
      id: "",
      nome: "",
      createdAt: new Date().toISOString(),
      cnpj: "",
      razaoSocial: "",
      endereco: "",
      logoUrl: "",
    } as Empresa)
    setOpenDialog(true)
  }
  const openEdit = (e: Empresa) => {
    setEditing({ ...e })
    setOpenDialog(true)
  }
  const closeDialog = () => {
    setOpenDialog(false)
    setEditing(null)
  }
  const saveDialog = () => {
    if (!editing) return
    const toSave: Omit<Empresa, "id" | "createdAt"> & { id?: string } = {
      id: editing.id || undefined,
      nome: editing.nome?.trim() || "Nova Empresa",
      razaoSocial: editing.razaoSocial?.trim() || "",
      cnpj: editing.cnpj?.trim() || "",
      endereco: editing.endereco?.trim() || "",
      logoUrl: editing.logoUrl?.trim() || "",
    }
    saveEmpresa(toSave)
    setCurrentEmpresaId(getCurrentEmpresa()?.id || "")
    closeDialog()
    reload()
  }

  const handleExcluir = (id: string) => {
    if (!confirm("Excluir esta empresa? Esta ação não pode ser desfeita.")) return
    deleteEmpresa(id)
    reload()
  }

  // Usuários
  const addUser = () => {
    if (!nomeU.trim()) return
    saveUsuario({ nome: nomeU.trim(), papel: papelU, senha: senhaU.trim() || "123456" })
    setUsuarios(getUsuarios())
    setNomeU("")
    setSenhaU("")
    setPapelU("admin")
    toast({ title: "Usuário adicionado" })
  }

  const resetSenha = (u: Usuario) => {
    const nova = window.prompt(`Nova senha para ${u.nome}:`)
    if (!nova) return
    resetUsuarioSenha(u.id, nova)
    toast({ title: "Senha atualizada" })
  }

  // Backup
  const handleExport = () => {
    try {
      const backup = getBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")
      a.download = `erp-backup-${date}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({ title: "Backup exportado", description: "Arquivo .json baixado com sucesso." })
    } catch (e) {
      toast({ title: "Falha ao exportar", description: "Tente novamente.", variant: "destructive" })
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      restoreBackup(parsed, { merge: mergeImport })
      reload()
      toast({
        title: "Importação concluída",
        description: mergeImport ? "Dados foram mesclados." : "Dados atuais foram substituídos.",
      })
    } catch (err) {
      toast({
        title: "Falha ao importar",
        description: "Verifique o arquivo .json do backup.",
        variant: "destructive",
      })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="container mx-auto max-w-6xl space-y-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Configurações Gerais</h1>
          <div className="text-sm text-muted-foreground">
            Empresa atual: <span className="font-medium">{currentEmpresa?.nome || "—"}</span>
          </div>
        </div>

        {/* Empresas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Empresas</CardTitle>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nova empresa
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead className="w-64 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell>{e.cnpj || "-"}</TableCell>
                    <TableCell className="text-right">
                      {e.id === currentId ? (
                        <Button variant="secondary" size="sm" className="mr-2" disabled>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Atual
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mr-2"
                          onClick={() => {
                            setCurrentEmpresaId(e.id)
                            reload()
                          }}
                        >
                          Usar
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="mr-2 bg-transparent" onClick={() => openEdit(e)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleExcluir(e.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {empresas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhuma empresa cadastrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Config da empresa atual */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações da empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome da Empresa</Label>
                <Input
                  id="nome"
                  value={formEmpresa.nome || ""}
                  onChange={(e) => setFormEmpresa((s) => ({ ...s, nome: e.target.value }))}
                  placeholder="Minha Empresa LTDA"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="imposto">Taxa de Imposto Padrão (%)</Label>
                <Input
                  id="imposto"
                  type="number"
                  step="0.01"
                  value={formCfg.impostoPadrao ?? ""}
                  onChange={(e) =>
                    setFormCfg((s) => ({
                      ...s,
                      impostoPadrao: e.target.value === "" ? undefined : Number(e.target.value),
                    }))
                  }
                  placeholder="Ex.: 11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="razao">Razão Social</Label>
                <Input
                  id="razao"
                  value={formEmpresa.razaoSocial || ""}
                  onChange={(e) => setFormEmpresa((s) => ({ ...s, razaoSocial: e.target.value }))}
                  placeholder="Razão social"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formEmpresa.cnpj || ""}
                  onChange={(e) => setFormEmpresa((s) => ({ ...s, cnpj: e.target.value }))}
                  placeholder="Somente números"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="capital">Taxa de Capital Padrão (%)</Label>
                <Input
                  id="capital"
                  type="number"
                  step="0.01"
                  value={formCfg.capitalPadrao ?? ""}
                  onChange={(e) =>
                    setFormCfg((s) => ({
                      ...s,
                      capitalPadrao: e.target.value === "" ? undefined : Number(e.target.value),
                    }))
                  }
                  placeholder="Ex.: 3"
                />
              </div>
              <div className="grid gap-2 md:col-span-1">
                <Label htmlFor="logo">URL da Logo (opcional)</Label>
                <Input
                  id="logo"
                  value={formEmpresa.logoUrl || ""}
                  onChange={(e) => setFormEmpresa((s) => ({ ...s, logoUrl: e.target.value }))}
                  placeholder="https://.../logo.png"
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formEmpresa.endereco || ""}
                  onChange={(e) => setFormEmpresa((s) => ({ ...s, endereco: e.target.value }))}
                  placeholder="Rua, nº, bairro, cidade - UF"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleSalvarGeral}>Salvar Configurações</Button>
            </div>
          </CardContent>
        </Card>

        {/* Backup de Dados */}
        <Card>
          <CardHeader>
            <CardTitle>Backup de Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Exporte e importe um arquivo .json contendo clientes, produtos, pedidos, recebimentos, usuários,
              configurações e sequência de pedidos.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleExport}>Exportar (.json)</Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => {
                  fileInputRef.current?.click()
                }}
              >
                Importar (.json)
              </Button>

              <div className="flex items-center gap-2">
                <Checkbox id="merge" checked={mergeImport} onCheckedChange={(v) => setMergeImport(Boolean(v))} />
                <label htmlFor="merge" className="text-sm">
                  Mesclar com dados existentes (não remove registros)
                </label>
              </div>
            </div>
            {!mergeImport && (
              <p className="text-xs text-amber-600">
                Atenção: ao importar sem mescla, todos os dados atuais serão substituídos pelos do arquivo.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Gestão de Usuários (com senha) */}
        <Card>
          <CardHeader>
            <CardTitle>Gestão de Usuários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-4">
              <div className="grid gap-2 md:col-span-2">
                <Label>Nome de usuário</Label>
                <Input value={nomeU} onChange={(e) => setNomeU(e.target.value)} placeholder="Ex.: joao" />
              </div>
              <div className="grid gap-2">
                <Label>Senha</Label>
                <Input
                  value={senhaU}
                  onChange={(e) => setSenhaU(e.target.value)}
                  placeholder="Defina a senha"
                  type="password"
                />
              </div>
              <div className="grid gap-2">
                <Label>Papel</Label>
                <select
                  value={papelU}
                  onChange={(e) => setPapelU(e.target.value as Usuario["papel"])}
                  className="h-9 rounded-md border bg-transparent px-3 py-1 text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="vendedor">Vendedor</option>
                  <option value="financeiro">Financeiro</option>
                </select>
              </div>
              <div className="md:col-span-4">
                <Button onClick={addUser}>Adicionar Usuário</Button>
              </div>
            </div>

            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell className="capitalize">{u.papel}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2 bg-transparent"
                          onClick={() => resetSenha(u)}
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          Resetar senha
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            deleteUsuario(u.id)
                            setUsuarios(getUsuarios())
                            toast({ title: "Usuário removido" })
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {usuarios.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhum usuário.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Dialog de criar/editar empresa */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar empresa" : "Nova empresa"}</DialogTitle>
            <DialogDescription>Informe os dados básicos da empresa.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="e-nome">Nome</Label>
              <Input
                id="e-nome"
                value={editing?.nome || ""}
                onChange={(e) => setEditing((s) => (s ? { ...s, nome: e.target.value } : s))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-razao">Razão Social</Label>
              <Input
                id="e-razao"
                value={editing?.razaoSocial || ""}
                onChange={(e) => setEditing((s) => (s ? { ...s, razaoSocial: e.target.value } : s))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-cnpj">CNPJ</Label>
              <Input
                id="e-cnpj"
                value={editing?.cnpj || ""}
                onChange={(e) => setEditing((s) => (s ? { ...s, cnpj: e.target.value } : s))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-end">Endereço</Label>
              <Input
                id="e-end"
                value={editing?.endereco || ""}
                onChange={(e) => setEditing((s) => (s ? { ...s, endereco: e.target.value } : s))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="e-logo">URL da Logo</Label>
              <Input
                id="e-logo"
                value={editing?.logoUrl || ""}
                onChange={(e) => setEditing((s) => (s ? { ...s, logoUrl: e.target.value } : s))}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={saveDialog}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
