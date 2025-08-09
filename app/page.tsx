"use client"

import { useEffect, useMemo, useState } from "react"
import { AppHeader } from "@/components/app-header"
import { MetricCard } from "@/components/metric-card"
import { OverviewChart } from "@/components/charts/overview-chart"
import {
  type Cliente,
  type Pedido,
  ensureInit,
  getClientes,
  getPedidos,
  statusPedido,
  totalPedido,
  ERP_CHANGED_EVENT,
  type DashboardTotals,
} from "@/lib/data-store"
import { fmtCurrency, fmtDate } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  getDashboardTotals as apiTotals,
  getDashboardSeries as apiSeries,
  getClientes as apiClientes,
  getPedidos as apiPedidos,
} from "@/lib/api-client"

export default function DashboardPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [chartType, setChartType] = useState<"bar" | "line">("bar")

  // Estados de auditoria/sincronização
  const [dataTick, setDataTick] = useState(0)
  const [lastChangedKey, setLastChangedKey] = useState<string | null>(null)
  const [changeCount, setChangeCount] = useState(0)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(Date.now())

  const [totals, setTotals] = useState<DashboardTotals>({
    totalRecebido: 0,
    totalAReceber: 0,
    lucroTotal: 0,
    impostosTotais: 0,
    totalVendas: 0,
    pendentes: 0,
  })
  const [data, setData] = useState<{ name: string; vendas: number; lucros: number; impostos: number }[]>([])

  const loadAll = () => {
    setClientes(getClientes())
    setPedidos(getPedidos())
  }

  useEffect(() => {
    ensureInit()
    loadAll()

    const onChange = (evt?: Event) => {
      // Captura a chave alterada (vinda do nosso CustomEvent ou do evento storage nativo)
      let changed: string | null = null
      try {
        const ce = evt as CustomEvent<{ key?: string }>
        if (ce?.detail?.key) changed = ce.detail.key as string
      } catch {
        // ignore
      }
      // storage event (nativo do browser)
      if (!changed && evt && "key" in (evt as StorageEvent)) {
        const se = evt as StorageEvent
        changed = se.key ?? "storage"
      }

      setLastChangedKey(changed)
      setChangeCount((c) => c + 1)
      setLastUpdatedAt(Date.now())

      // Recarrega coleções e força recompute
      loadAll()
      setDataTick((t) => t + 1)
    }

    window.addEventListener(ERP_CHANGED_EVENT, onChange as EventListener)
    window.addEventListener("storage", onChange as EventListener)

    const loadFromApi = async () => {
      try {
        const [t, s, cls, pds] = await Promise.all([apiTotals(), apiSeries(), apiClientes(), apiPedidos()])
        setTotals(t)
        setData(s)
        setClientes(cls)
        setPedidos(pds as any)
      } catch (e) {
        // If not authenticated or backend offline, fallback to local storage functions so UI still renders
        setTotals({
          totalRecebido: 0,
          totalAReceber: 0,
          lucroTotal: 0,
          impostosTotais: 0,
          totalVendas: 0,
          pendentes: 0,
        })
        setData([])
      }
    }

    loadFromApi()

    return () => {
      window.removeEventListener(ERP_CHANGED_EVENT, onChange as EventListener)
      window.removeEventListener("storage", onChange as EventListener)
    }
  }, [])

  const recentes = useMemo(
    () => [...pedidos].sort((a, b) => +new Date(b.data) - +new Date(a.data)).slice(0, 5),
    [pedidos],
  )

  return (
    <div className="min-h-screen">
      <AppHeader />

      {/* Barra de sincronização/diagnóstico */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">Sincronização do Dashboard</div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Eventos: {changeCount}
            </Badge>
            {lastChangedKey && (
              <Badge variant="secondary" className="text-xs">
                Última chave: {lastChangedKey}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Atualizado: {new Date(lastUpdatedAt).toLocaleTimeString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const [t, s, cls, pds] = await Promise.all([apiTotals(), apiSeries(), apiClientes(), apiPedidos()])
                  setTotals(t)
                  setData(s)
                  setClientes(cls)
                  setPedidos(pds as any)
                } catch {
                  loadAll()
                  setTotals({
                    totalRecebido: 0,
                    totalAReceber: 0,
                    lucroTotal: 0,
                    impostosTotais: 0,
                    totalVendas: 0,
                    pendentes: 0,
                  })
                  setData([])
                }
                setDataTick((t) => t + 1)
                setLastChangedKey("manual")
                setChangeCount((c) => c + 1)
                setLastUpdatedAt(Date.now())
              }}
            >
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total Recebido" value={fmtCurrency(totals.totalRecebido)} />
          <MetricCard title="Total a Receber" value={fmtCurrency(totals.totalAReceber)} />
          <MetricCard title="Lucro Total" value={fmtCurrency(totals.lucroTotal)} />
          <MetricCard title="Impostos Totais" value={fmtCurrency(totals.impostosTotais)} />
        </div>

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Gráficos de Performance</CardTitle>
            <Tabs defaultValue="bar" value={chartType} onValueChange={(v) => setChartType(v as "bar" | "line")}>
              <TabsList>
                <TabsTrigger value="bar">Barras</TabsTrigger>
                <TabsTrigger value="line">Linhas</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <OverviewChart data={data} type={chartType} />
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recentes.map((p) => {
                  const st = statusPedido(p)
                  return (
                    <li key={p.id} className="flex items-center gap-3">
                      <Badge variant={st === "Pago" ? "default" : "destructive"}>{st}</Badge>
                      <span className="text-sm">
                        Pedido #{p.numero} • {fmtDate(p.data)} • Total {fmtCurrency(totalPedido(p))}
                      </span>
                      <Link href="/vendas" className="ml-auto">
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </Link>
                    </li>
                  )
                })}
                {recentes.length === 0 && <p className="text-sm text-muted-foreground">Sem pedidos recentes.</p>}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex items-center justify-between py-1">
                <span>Clientes</span>
                <span className="font-medium">{clientes.length}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Pedidos</span>
                <span className="font-medium">{pedidos.length}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Pedidos Pendentes</span>
                <span className="font-medium">{totals.pendentes}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
