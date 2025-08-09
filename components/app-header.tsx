"use client"

import type React from "react"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useEffect, useMemo, useState } from "react"
import { getConfig, ERP_CHANGED_EVENT } from "@/lib/data-store"
import { ensureDefaultEmpresa, getCurrentEmpresa } from "@/lib/empresas"
import { getSession, signOut } from "@/lib/auth"
import { LogOut, User } from "lucide-react"

const routes = [
  { href: "/", label: "Dashboard" },
  { href: "/vendas", label: "Vendas" },
  { href: "/acertos", label: "Acertos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/vales", label: "Vale" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/outros-negocios", label: "Outros negócios" },
  { href: "/orcamentos", label: "Orçamentos" },
  { href: "/configuracoes", label: "Configurações" },
]

export function AppHeader({ className = "" }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [brand, setBrand] = useState<string>("Meu ERP")
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined)
  const [empresaNome, setEmpresaNome] = useState<string>("")
  const [userName, setUserName] = useState<string>("")

  const placeholderLogo = useMemo(() => "/placeholder.svg?height=28&width=28", [])

  useEffect(() => {
    ensureDefaultEmpresa()
    const cfg = getConfig()
    const curEmp = getCurrentEmpresa()
    setBrand(cfg?.nome || "Meu ERP")
    setLogoUrl(cfg?.logoUrl || undefined)
    setEmpresaNome(curEmp?.nome || "")

    const sess = getSession()
    setUserName(sess?.nome || "")

    const onChanged = () => {
      const cfg2 = getConfig()
      const cur2 = getCurrentEmpresa()
      setBrand(cfg2?.nome || "Meu ERP")
      setLogoUrl(cfg2?.logoUrl || undefined)
      setEmpresaNome(cur2?.nome || "")
      const s2 = getSession()
      setUserName(s2?.nome || "")
    }
    window.addEventListener(ERP_CHANGED_EVENT, onChanged as EventListener)
    return () => window.removeEventListener(ERP_CHANGED_EVENT, onChanged as EventListener)
  }, [pathname])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <div className="mx-auto flex h-14 min-h-14 max-w-7xl items-center gap-3 px-4">
        {/* Marca */}
        <Link href="/" className="flex shrink-0 items-center gap-2" title={brand}>
          <Image
            src={logoUrl && logoUrl.trim() !== "" ? logoUrl : placeholderLogo}
            alt="Logo da empresa"
            width={28}
            height={28}
            className="rounded object-cover"
          />
          <span className="font-semibold truncate max-w-[40vw]">{brand}</span>
        </Link>

        {/* Navegação principal */}
        <nav
          aria-label="Principal"
          className="hidden md:flex flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap
                     [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          {routes.map((r) => {
            const active = pathname === r.href
            return (
              <Link key={r.href} href={r.href} className="shrink-0">
                <Button
                  variant={active ? "default" : "ghost"}
                  className={cn("text-sm", active ? "" : "text-muted-foreground hover:text-foreground")}
                >
                  {r.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Usuário e empresa */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link href="/empresas" className="hidden md:inline-flex">
            <Button
              variant="outline"
              className="bg-transparent max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap"
              title={empresaNome ? `Empresa: ${empresaNome}` : "Selecionar empresa"}
            >
              {empresaNome ? `Empresa: ${empresaNome}` : "Selecionar empresa"}
            </Button>
          </Link>

          {userName ? (
            <>
              <Button variant="ghost" className="hidden md:inline-flex text-sm">
                <User className="mr-2 h-4 w-4" />
                {userName}
              </Button>
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => {
                  signOut()
                  router.replace("/login")
                }}
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="outline" className="bg-transparent">
                Entrar
              </Button>
            </Link>
          )}

          {/* Navegação compacta no mobile */}
          <div className="md:hidden">
            <Link href="/menu">
              <Button variant="ghost" className="text-sm">
                Menu
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Barra secundária no mobile */}
      <div className="md:hidden border-t">
        <div
          className="flex items-center gap-1 overflow-x-auto px-2 py-2 whitespace-nowrap
                     [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          {routes.map((r) => {
            const active = pathname === r.href
            return (
              <Link key={r.href} href={r.href} className="shrink-0">
                <Button size="sm" variant={active ? "secondary" : "ghost"} className="text-xs">
                  {r.label}
                </Button>
              </Link>
            )
          })}
          <Link href="/empresas" className="shrink-0">
            <Button size="sm" variant="outline" className="text-xs bg-transparent">
              {empresaNome ? "Empresa" : "Selecionar empresa"}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
