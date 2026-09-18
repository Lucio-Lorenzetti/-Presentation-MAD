const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite'); // Requiere Node >= 22.5 (incluido en Node, sin dependencias nativas)

const DATA_DIR = path.resolve(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'facturacion.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS facturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ambiente TEXT NOT NULL,               -- 'homologacion' | 'produccion'
    cbte_tipo INTEGER NOT NULL,
    pto_vta INTEGER NOT NULL,
    numero INTEGER NOT NULL,
    fecha TEXT NOT NULL,                  -- yyyymmdd
    concepto INTEGER NOT NULL,
    receptor_doc_tipo INTEGER NOT NULL,
    receptor_doc_nro TEXT NOT NULL,
    receptor_razon_social TEXT,
    receptor_condicion_iva TEXT NOT NULL,
    descripcion TEXT,
    periodo_desde TEXT,
    periodo_hasta TEXT,
    fch_vto_pago TEXT,
    importe_neto REAL NOT NULL,
    importe_iva REAL NOT NULL,
    importe_total REAL NOT NULL,
    resultado TEXT NOT NULL,              -- 'A' | 'R'
    cae TEXT,
    cae_vencimiento TEXT,
    observaciones TEXT,                   -- JSON
    pdf_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const crearEsquema = require('./schema');
crearEsquema(db);
crearEsquema.migrar(db);

module.exports = db;
