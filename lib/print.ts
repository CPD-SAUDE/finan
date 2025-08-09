"use client"

import { fmtCurrency } from "@/lib/format"
import { getConfig } from "@/lib/data-store"
import { ensureDefaultEmpresa, getCurrentEmpresa } from "@/lib/empresas"
import type { Orcamento } from "@/lib/orcamentos"

type DistribuicaoRow = { nome: string; total: number; qtdAcertos: number }
type FaturamentoAno = { ano: number; total: number }

function baseStyles() {
  // Print-friendly CSS. A4 page with generous margins, legible tables and header.
  return `
    <style>
      @page {
        size: A4;
        margin: 18mm 14mm 18mm 14mm;
      }
      * { box-sizing: border-box; }
      html, body { padding: 0; margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; color: #0a0a0a; }
      .container { width: 100%; }
      .doc-header {
        display: grid;
        grid-template-columns: 72px 1fr;
        gap: 16px;
        align-items: center;
        border-bottom: 2px solid #11182720;
        padding-bottom: 10px;
        margin-bottom: 16px;
      }
      .logo {
        width: 64px; height: 64px; border-radius: 8px; object-fit: contain; border: 1px solid #e5e7eb;
      }
      .muted { color: #6b7280; font-size: 12px; }
      h1 { font-size: 20px; margin: 0 0 2px 0; }
      .meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 2px; font-size: 12px; color: #374151; }
      .kpis { width: 100%; border-collapse: collapse; margin: 10px 0 18px; }
      .kpis th, .kpis td { padding: 8px 10px; border: 1px solid #e5e7eb; }
      .kpis th { text-align: left; background: #f9fafb; font-weight: 600; }
      .kpis td.amount { text-align: right; font-variant-numeric: tabular-nums; }
      .section { margin: 18px 0 0; }
      .section h2 { font-size: 14px; margin: 0 0 8px 0; color: #111827; }
      table.list { width: 100%; border-collapse: collapse; }
      table.list th, table.list td { padding: 8px 10px; border: 1px solid #e5e7eb; }
      table.list th { background: #f9fafb; text-align: left; font-weight: 600; }
      .right { text-align: right; }
      .green { color: #047857; }
      .red { color: #b91c1c; }
      .footer {
        margin-top: 16px; padding-top: 10px; border-top: 1px dashed #e5e7eb; font-size: 11px; color: #6b7280; display: flex; justify-content: space-between;
      }
      /* Orcamento specific */
      .two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .card { padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; }
      .title-sm { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
      .strong { font-weight: 600; }
      .totals { margin-top: 10px; width: 100%; border-collapse: collapse; }
      .totals td { padding: 6px 10px; }
      .totals .label { text-align: right; font-weight: 600; }
    </style>
  `
}

export function openPrintWindow(html: string, title = "Documento") {
  const w = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768")
  if (!w) return
  w.document.open()
  w.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        ${baseStyles()}
      </head>
      <body>
        <div class="container">${html}</div>
        <script>
          try {
            setTimeout(() => { window.focus(); window.print(); }, 150);
          } catch (e) {}
        </script>
      </body>
    </html>
  `)
  w.document.close()
}

function currentHeader() {
  // Garante empresa padrão e lê a empresa atual da Configuração Geral
  try {
    ensureDefaultEmpresa()
  } catch {}
  const empresa = getCurrentEmpresa()
  const cfg = getConfig() || {}

  return {
    nome: (empresa?.nome || cfg.nome || "Minha Empresa") as string,
    razaoSocial: (empresa?.razaoSocial || cfg.razaoSocial || "") as string,
    cnpj: (empresa?.cnpj || cfg.cnpj || "") as string,
    endereco: (empresa?.endereco || cfg.endereco || "") as string,
    logoUrl:
      (empresa?.logoUrl && String(empresa.logoUrl).trim().length > 0
        ? empresa.logoUrl
        : cfg.logoUrl && String(cfg.logoUrl).trim().length > 0
          ? cfg.logoUrl
          : "/placeholder.svg?height=64&width=64") || "/placeholder.svg?height=64&width=64",
  }
}

/**
 * Monta o HTML de um Relatório com cabeçalho da empresa atual (Configurações Gerais).
 */
export function makeReportHTML(args: {
  title?: string
  periodLabel: string
  resumo: { label: string; amount: number; highlight?: "green" | "red" }[]
  faturamentoAnual: FaturamentoAno[]
  distribuicao: DistribuicaoRow[]
}) {
  const hdr = currentHeader()
  const now = new Date()
  const title = args.title ?? "Relatório Financeiro"

  const resumoRows = args.resumo
    .map((r) => {
      const cls = r.highlight === "green" ? "green" : r.highlight === "red" ? "red" : ""
      return `<tr><td>${r.label}</td><td class="amount ${cls}">${fmtCurrency(r.amount)}</td></tr>`
    })
    .join("")

  const faturamentoRows =
    args.faturamentoAnual
      .map((r) => `<tr><td>${r.ano}</td><td class="right">${fmtCurrency(r.total)}</td></tr>`)
      .join("") || `<tr><td colspan="2" class="muted">Sem dados.</td></tr>`

  const distRows =
    args.distribuicao
      .map(
        (r) =>
          `<tr><td>${r.nome}</td><td class="right">${fmtCurrency(r.total)}</td><td class="right">${r.qtdAcertos}</td></tr>`,
      )
      .join("") || `<tr><td colspan="3" class="muted">Nenhuma distribuição no período.</td></tr>`

  return `
    <div class="doc-header">
      <img class="logo" src="${hdr.logoUrl}" alt="Logo" crossorigin="anonymous" />
      <div>
        <h1>${title}</h1>
        <div class="meta">
          <div><span class="strong">${hdr.nome}</span></div>
          ${hdr.razaoSocial ? `<div>Razão Social: ${hdr.razaoSocial}</div>` : ""}
          ${hdr.cnpj ? `<div>CNPJ: ${formatCNPJ(hdr.cnpj)}</div>` : ""}
          ${hdr.endereco ? `<div>${hdr.endereco}</div>` : ""}
        </div>
        <div class="muted">Período: ${args.periodLabel} • Emitido em ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</div>
      </div>
    </div>

    <table class="kpis">
      <thead><tr><th>Indicador</th><th>Valor</th></tr></thead>
      <tbody>${resumoRows}</tbody>
    </table>

    <div class="section">
      <h2>Faturamento por ano</h2>
      <table class="list">
        <thead><tr><th>Ano</th><th class="right">Faturamento</th></tr></thead>
        <tbody>${faturamentoRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Distribuição por participante</h2>
      <table class="list">
        <thead><tr><th>Participante</th><th class="right">Total recebido</th><th class="right">Qtd. acertos</th></tr></thead>
        <tbody>${distRows}</tbody>
      </table>
    </div>

    <div class="footer">
      <div>Documento gerado pelo ERP</div>
      <div>Página 1</div>
    </div>
  `
}

/**
 * Documento do Orçamento: usa a Empresa atual das Configurações Gerais (Empresas).
 */
export function makeOrcamentoHTML(orc: Orcamento | (Record<string, any> & { total?: number })) {
  const hdr = currentHeader()
  const data = new Date((orc as any).data)
  const itens = (orc as any).itens as Array<{
    descricao: string
    marca?: string
    quantidade: number
    valorUnitario: number
  }>

  const itensRows =
    itens
      ?.map((it, idx) => {
        const total = (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0)
        return `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(it.descricao)}</td>
        <td>${escapeHtml(it.marca || "")}</td>
        <td class="right">${Number(it.quantidade) || 0}</td>
        <td class="right">${fmtCurrency(Number(it.valorUnitario) || 0)}</td>
        <td class="right">${fmtCurrency(total)}</td>
      </tr>
    `
      })
      .join("") || ""

  // Total: se não vier no objeto, calcula
  const totalCalc =
    (itens || []).reduce((acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), 0) || 0
  const total = Number((orc as any).total) || totalCalc

  return `
    <div class="doc-header">
      <img class="logo" src="${hdr.logoUrl}" alt="Logo" crossorigin="anonymous" />
      <div>
        <h1>Orçamento #${(orc as any).numero}</h1>
        <div class="meta">
          <div><span class="strong">${hdr.nome}</span></div>
          ${hdr.razaoSocial ? `<div>Razão Social: ${hdr.razaoSocial}</div>` : ""}
          ${hdr.cnpj ? `<div>CNPJ: ${formatCNPJ(hdr.cnpj)}</div>` : ""}
          ${hdr.endereco ? `<div>${hdr.endereco}</div>` : ""}
        </div>
        <div class="muted">Data: ${data.toLocaleDateString()}</div>
      </div>
    </div>

    <div class="two-cols">
      <div class="card">
        <div class="title-sm">Fornecedor</div>
        <div class="strong">${escapeHtml(hdr.nome)}</div>
        ${hdr.endereco ? `<div>${escapeHtml(hdr.endereco)}</div>` : ""}
      </div>
      <div class="card">
        <div class="title-sm">Cliente</div>
        <div class="strong">${escapeHtml((orc as any).cliente?.nome || "")}</div>
        ${(orc as any).cliente?.documento ? `<div>Documento: ${escapeHtml((orc as any).cliente.documento)}</div>` : ""}
        ${(orc as any).cliente?.endereco ? `<div>${escapeHtml((orc as any).cliente.endereco)}</div>` : ""}
        ${(orc as any).cliente?.telefone ? `<div>Tel: ${escapeHtml((orc as any).cliente.telefone)}</div>` : ""}
        ${(orc as any).cliente?.email ? `<div>Email: ${escapeHtml((orc as any).cliente.email)}</div>` : ""}
      </div>
    </div>

    <div class="section">
      <h2>Itens</h2>
      <table class="list">
        <thead>
          <tr>
            <th>#</th>
            <th>Descrição</th>
            <th>Marca</th>
            <th class="right">Qtd.</th>
            <th class="right">Valor unit.</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>${itensRows || `<tr><td colspan="6" class="muted">Nenhum item.</td></tr>`}</tbody>
      </table>

      <table class="totals">
        <tbody>
          <tr>
            <td class="label" style="width: 80%;">Total do orçamento</td>
            <td class="right strong">${fmtCurrency(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${
      (orc as any).observacoes
        ? `
      <div class="section">
        <h2>Observações</h2>
        <div>${escapeHtml((orc as any).observacoes)}</div>
      </div>`
        : ""
    }

    <div class="footer">
      <div>Orçamento sem valor fiscal • Validade sugerida: 15 dias</div>
      <div>Página 1</div>
    </div>
  `
}

function escapeHtml(s?: string) {
  if (!s) return ""
  return s.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case '"':
        return "&quot;"
      case "'":
        return "&#039;"
      default:
        return m
    }
  })
}

function formatCNPJ(v?: string) {
  if (!v) return ""
  const digits = String(v).replace(/\D/g, "")
  if (digits.length !== 14) return v
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}
