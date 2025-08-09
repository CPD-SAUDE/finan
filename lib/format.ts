export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)

export const fmtDate = (d: string | Date) => new Intl.DateTimeFormat("pt-BR").format(new Date(d))
