"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "@/lib/auth"
import { ensureInit } from "@/lib/data-store"

export default function LoginPage() {
  // Garantir seed inicial (inclui admin/admin se necessário)
  ensureInit()

  const [usuario, setUsuario] = useState("admin")
  const [senha, setSenha] = useState("admin")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)
    try {
      const res = signIn(usuario, senha)
      if (!res.ok) {
        setErro(res.error || "Falha ao entrar")
        return
      }
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-0px)] w-full flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Acessar o sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usuario">Usuário</Label>
              <Input
                id="usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ex.: admin"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="flex gap-2">
                <Input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMostrarSenha((v) => !v)}
                  title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {erro && <p className="text-sm text-red-600">{erro}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <p className="text-xs text-muted-foreground">
              Dica: usuário admin e senha admin já estão cadastrados para testar.
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
