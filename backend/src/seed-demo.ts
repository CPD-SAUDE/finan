import { getDB } from "./db.js"
import { nowIso, uid } from "./util.js"

const db = getDB()

function ensureCliente(nome: string) {
  const row = db.prepare(`SELECT id FROM clientes WHERE nome=?`).get(nome) as any
  if (row?.id) return row.id
  const id = uid()
  db.prepare(`INSERT INTO clientes (id, nome, createdAt, data) VALUES (@id,@nome,@createdAt,@data)`).run({
    id,
    nome,
    createdAt: nowIso(),
    data: JSON.stringify({ id, nome }),
  })
  return id
}

function ensureProduto(nome: string, preco: number) {
  const row = db.prepare(`SELECT id FROM produtos WHERE nome=?`).get(nome) as any
  if (row?.id) return row.id
  const id = uid()
  db.prepare(`INSERT INTO produtos (id, nome, preco, createdAt, data) VALUES (@id,@nome,@preco,@createdAt,@data)`).run({
    id,
    nome,
    preco,
    createdAt: nowIso(),
    data: JSON.stringify({ id, nome, preco }),
  })
  return id
}

function addPedido(clienteId: string, total: number, diasAtras: number) {
  const id = uid()
  const emissao = new Date(Date.now() - diasAtras * 24 * 3600_000).toISOString()
  db.prepare(
    `INSERT INTO pedidos (id, numero, clienteId, status, dataEmissao, totalBruto, totalLiquido, createdAt, data)
     VALUES (@id,@numero,@clienteId,'concluido',@dataEmissao,@total,@total,@createdAt,@data)`,
  ).run({
    id,
    numero: `P-${String(Math.floor(Math.random() * 99999)).padStart(5, "0")}`,
    clienteId,
    dataEmissao: emissao,
    total,
    createdAt: nowIso(),
    data: JSON.stringify({ id, clienteId, dataEmissao: emissao, totalLiquido: total }),
  })
  // recebimento (metade recebido)
  const recId = uid()
  db.prepare(
    `INSERT INTO recebimentos (id, pedidoId, valor, dataPrevista, dataRecebida, status, meio, createdAt, data)
     VALUES (@id,@pedidoId,@valor,@dataPrevista,@dataRecebida,@status,'pix',@createdAt,@data)`,
  ).run({
    id: recId,
    pedidoId: id,
    valor: total / 2,
    dataPrevista: emissao,
    dataRecebida: emissao,
    status: "recebido",
    createdAt: nowIso(),
    data: JSON.stringify({ id: recId, pedidoId: id, valor: total / 2, status: "recebido" }),
  })
}

function main() {
  const c1 = ensureCliente("Cliente Exemplo")
  ensureProduto("Produto A", 100)
  ensureProduto("Produto B", 80)

  addPedido(c1, 500, 1)
  addPedido(c1, 800, 5)
  addPedido(c1, 300, 10)

  console.log("Seed demo concluído.")
}

main()
