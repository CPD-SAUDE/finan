import Database from "better-sqlite3"
import fs from "fs"
import path from "path"
import { env } from "./util.js"

let _db: Database.Database | null = null

export function dbPath(): string {
  const p = env("DB_PATH", "./data/erp.sqlite")
  const dir = path.dirname(p)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return p
}

export function getDB() {
  if (_db) return _db
  const p = dbPath()
  _db = new Database(p)
  _db.pragma("journal_mode = WAL")
  _db.pragma("synchronous = NORMAL")
  _db.pragma("foreign_keys = ON")
  migrate(_db)
  return _db
}

function migrate(d: Database.Database) {
  d.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL,
    papel TEXT NOT NULL CHECK(papel IN ('admin','vendedor','financeiro')),
    passwordHash TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT,
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    token TEXT, -- opcional se quiser token separado
    createdAt TEXT NOT NULL,
    expiresAt TEXT,
    FOREIGN KEY(userId) REFERENCES usuarios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS empresas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    documento TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT,
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS empresa_config (
    id TEXT PRIMARY KEY,
    empresaId TEXT NOT NULL,
    data TEXT NOT NULL,
    updatedAt TEXT,
    FOREIGN KEY(empresaId) REFERENCES empresas(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    documento TEXT,
    email TEXT,
    telefone TEXT,
    cidade TEXT,
    uf TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT,
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS produtos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    sku TEXT,
    preco NUMBER,
    unidade TEXT,
    ativo INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT,
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS pedidos (
    id TEXT PRIMARY KEY,
    numero TEXT,
    clienteId TEXT,
    empresaId TEXT,
    status TEXT,
    dataEmissao TEXT,
    totalBruto NUMBER DEFAULT 0,
    totalDescontos NUMBER DEFAULT 0,
    totalLiquido NUMBER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT,
    data TEXT,
    FOREIGN KEY(clienteId) REFERENCES clientes(id),
    FOREIGN KEY(empresaId) REFERENCES empresas(id)
  );

  CREATE TABLE IF NOT EXISTS itens_pedido (
    id TEXT PRIMARY KEY,
    pedidoId TEXT NOT NULL,
    produtoId TEXT,
    quantidade NUMBER NOT NULL,
    precoUnit NUMBER NOT NULL,
    desconto NUMBER DEFAULT 0,
    totalItem NUMBER NOT NULL,
    data TEXT,
    FOREIGN KEY(pedidoId) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY(produtoId) REFERENCES produtos(id)
  );

  CREATE TABLE IF NOT EXISTS recebimentos (
    id TEXT PRIMARY KEY,
    pedidoId TEXT,
    valor NUMBER NOT NULL,
    dataPrevista TEXT,
    dataRecebida TEXT,
    status TEXT, -- pendente, recebido, estornado
    meio TEXT,
    data TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT,
    FOREIGN KEY(pedidoId) REFERENCES pedidos(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS seqs (
    name TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_pedidos_datas ON pedidos(dataEmissao);
  CREATE INDEX IF NOT EXISTS idx_recebimentos_prev ON recebimentos(dataPrevista);
  CREATE INDEX IF NOT EXISTS idx_recebimentos_rec ON recebimentos(dataRecebida);
  `)
}
