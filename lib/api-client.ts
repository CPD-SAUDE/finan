"use client"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`)
  }
  return (await res.json()) as T
}

export async function apiLogin(nome: string, senha: string) {
  return http<{ ok: true; user: { id: string; nome: string; papel: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ nome, senha }),
  })
}

export async function apiLogout() {
  return http<{ ok: true }>("/auth/logout", { method: "POST" })
}

export async function getMe() {
  return http<{ ok: boolean; user?: { id: string; nome: string; papel: string } }>("/auth/me")
}

// Dashboard (para a próxima etapa de migração da página inicial)
export async function getDashboardTotals(range?: { start?: string; end?: string }) {
  const p = new URLSearchParams()
  if (range?.start) p.set("start", range.start)
  if (range?.end) p.set("end", range.end)
  const q = p.toString()
  return http<{ vendasTotal: number; recebidosTotal: number; pendentesTotal: number }>(
    `/dashboard/totals${q ? `?${q}` : ""}`,
  )
}

export async function getDashboardSeries(range?: { start?: string; end?: string }) {
  const p = new URLSearchParams()
  if (range?.start) p.set("start", range.start)
  if (range?.end) p.set("end", range.end)
  const q = p.toString()
  return http<{ vendas: { dia: string; total: number }[]; recebimentos: { dia: string; total: number }[] }>(
    `/dashboard/series${q ? `?${q}` : ""}`,
  )
}

// CRUD genéricos
export const api = {
  clientes: {
    list: () => http<any[]>("/clientes"),
    get: (id: string) => http<any>(`/clientes/${id}`),
    create: (data: any) => http<{ id: string }>("/clientes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      http<{ ok: true }>(`/clientes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/clientes/${id}`, { method: "DELETE" }),
  },
  produtos: {
    list: () => http<any[]>("/produtos"),
    create: (data: any) => http<{ id: string }>("/produtos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      http<{ ok: true }>(`/produtos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/produtos/${id}`, { method: "DELETE" }),
  },
  pedidos: {
    list: () => http<any[]>("/pedidos"),
    create: (data: any) => http<{ id: string }>("/pedidos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      http<{ ok: true }>(`/pedidos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/pedidos/${id}`, { method: "DELETE" }),
  },
  recebimentos: {
    list: () => http<any[]>("/recebimentos"),
    create: (data: any) => http<{ id: string }>("/recebimentos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      http<{ ok: true }>(`/recebimentos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/recebimentos/${id}`, { method: "DELETE" }),
  },
  empresas: {
    list: () => http<any[]>("/empresas"),
    create: (data: any) => http<{ id: string }>("/empresas", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      http<{ ok: true }>(`/empresas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    config: {
      get: (empresaId: string) => http<any | null>(`/empresa-config/${empresaId}`),
      set: (empresaId: string, data: any) =>
        http<{ ok: true }>(`/empresa-config/${empresaId}`, { method: "PUT", body: JSON.stringify(data) }),
    },
  },
  usuarios: {
    list: () => http<any[]>("/usuarios"),
    create: (data: any) => http<{ id: string }>("/usuarios", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      http<{ ok: true }>(`/usuarios/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/usuarios/${id}`, { method: "DELETE" }),
  },
  backup: {
    export: () => http<any>("/backup/export"),
    import: (payload: any) => http<{ ok: true }>("/backup/import", { method: "POST", body: JSON.stringify(payload) }),
  },
}
