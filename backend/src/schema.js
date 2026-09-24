// Tablas de los módulos de gestión (personas, propiedades, contratos, cuotas).
// La tabla `facturas` vive en db.js. Borrado lógico: `deleted_at` (el rol
// Desarrollador puede recuperar lo eliminado).
module.exports = function crearEsquema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('PROPIETARIO','INQUILINO')),
      dni TEXT,
      cuit TEXT,
      email TEXT,
      telefono TEXT,
      metodo_cobro TEXT,                 -- Transferencia | Efectivo | ...
      lista_negra INTEGER NOT NULL DEFAULT 0,
      notas TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS garantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      persona_id INTEGER NOT NULL REFERENCES personas(id),
      nombre TEXT NOT NULL,
      dni TEXT,
      telefono TEXT,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS propiedades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direccion TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('CASA','DEPTO','LOCAL','PH')),
      estado TEXT NOT NULL DEFAULT 'DISPONIBLE' CHECK (estado IN ('DISPONIBLE','ALQUILADA','EN_REPARACION')),
      propietario_id INTEGER REFERENCES personas(id),
      servicios TEXT,
      alquiler_sugerido REAL,
      notas TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS contratos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      propiedad_id INTEGER NOT NULL REFERENCES propiedades(id),
      inquilino_id INTEGER NOT NULL REFERENCES personas(id),
      fecha_inicio TEXT NOT NULL,        -- YYYY-MM-DD
      fecha_fin TEXT NOT NULL,
      monto_inicial REAL NOT NULL,
      monto_actual REAL NOT NULL,
      indice TEXT NOT NULL DEFAULT 'ICL' CHECK (indice IN ('ICL','IPC','NINGUNO')),
      periodicidad_meses INTEGER NOT NULL DEFAULT 3,
      proxima_actualizacion TEXT,        -- YYYY-MM-DD
      dia_vencimiento INTEGER NOT NULL DEFAULT 10,
      estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','FINALIZADO','RESCINDIDO')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cuotas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contrato_id INTEGER NOT NULL REFERENCES contratos(id),
      periodo TEXT NOT NULL,             -- YYYY-MM
      vencimiento TEXT NOT NULL,         -- YYYY-MM-DD
      monto REAL NOT NULL,
      estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PAGADA')),
      UNIQUE (contrato_id, periodo)
    );

    CREATE TABLE IF NOT EXISTS pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cuota_id INTEGER NOT NULL REFERENCES cuotas(id),
      fecha TEXT NOT NULL,               -- YYYY-MM-DD
      monto_cuota REAL NOT NULL,
      mora REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      metodo TEXT,
      notas TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK (rol IN ('DESARROLLADOR','ADMINISTRADOR','GESTOR','CONSULTA')),
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ajustes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contrato_id INTEGER NOT NULL REFERENCES contratos(id),
      fecha TEXT NOT NULL,
      indice TEXT NOT NULL,
      porcentaje REAL NOT NULL,
      monto_anterior REAL NOT NULL,
      monto_nuevo REAL NOT NULL
    );
  `);
};

// Migraciones livianas: agrega columnas nuevas sin perder datos de bases ya creadas.
module.exports.migrar = function migrar(db) {
  const agregar = (tabla, columnas) => {
    const existentes = db.prepare(`PRAGMA table_info(${tabla})`).all().map(c => c.name);
    for (const [nombre, tipo] of Object.entries(columnas)) {
      if (!existentes.includes(nombre)) db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${nombre} ${tipo}`);
    }
  };
  agregar('personas', { domicilio: 'TEXT', cbu: 'TEXT', alias: 'TEXT', comision_pct: 'REAL' });
  agregar('garantes', { domicilio: 'TEXT', tipo_garantia: 'TEXT' });
  agregar('propiedades', {
    barrio: 'TEXT', ambientes: 'INTEGER', dormitorios: 'INTEGER', banos: 'INTEGER',
    superficie_m2: 'REAL', expensas: 'REAL', partida: 'TEXT', descripcion: 'TEXT',
  });
  agregar('pagos', { pdf_path: 'TEXT' });
};
