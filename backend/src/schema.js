// Tablas del sistema (Postgres). Borrado lógico: `deleted_at` (el rol
// Desarrollador puede recuperar lo eliminado). Los campos de fecha de
// negocio (fecha_inicio, vencimiento, periodo, fch_vto_pago, etc.) son TEXT
// en formato YYYY-MM-DD / YYYYMMDD — el código los compara y recorta como
// string, así que quedan igual que en SQLite (no son TIMESTAMPTZ).
async function crearEsquema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS facturas (
      id SERIAL PRIMARY KEY,
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
      importe_neto DOUBLE PRECISION NOT NULL,
      importe_iva DOUBLE PRECISION NOT NULL,
      importe_total DOUBLE PRECISION NOT NULL,
      resultado TEXT NOT NULL,              -- 'A' | 'R'
      cae TEXT,
      cae_vencimiento TEXT,
      observaciones TEXT,                   -- JSON
      pdf_path TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS personas (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('PROPIETARIO','INQUILINO')),
      dni TEXT,
      cuit TEXT,
      email TEXT,
      telefono TEXT,
      metodo_cobro TEXT,                 -- Transferencia | Efectivo | ...
      lista_negra INTEGER NOT NULL DEFAULT 0,
      notas TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS garantes (
      id SERIAL PRIMARY KEY,
      persona_id INTEGER NOT NULL REFERENCES personas(id),
      nombre TEXT NOT NULL,
      dni TEXT,
      telefono TEXT,
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS propiedades (
      id SERIAL PRIMARY KEY,
      direccion TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('CASA','DEPTO','LOCAL','PH')),
      estado TEXT NOT NULL DEFAULT 'DISPONIBLE' CHECK (estado IN ('DISPONIBLE','ALQUILADA','EN_REPARACION')),
      propietario_id INTEGER REFERENCES personas(id),
      servicios TEXT,
      alquiler_sugerido DOUBLE PRECISION,
      notas TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS contratos (
      id SERIAL PRIMARY KEY,
      propiedad_id INTEGER NOT NULL REFERENCES propiedades(id),
      inquilino_id INTEGER NOT NULL REFERENCES personas(id),
      fecha_inicio TEXT NOT NULL,        -- YYYY-MM-DD
      fecha_fin TEXT NOT NULL,
      monto_inicial DOUBLE PRECISION NOT NULL,
      monto_actual DOUBLE PRECISION NOT NULL,
      indice TEXT NOT NULL DEFAULT 'ICL' CHECK (indice IN ('ICL','IPC','NINGUNO')),
      periodicidad_meses INTEGER NOT NULL DEFAULT 3,
      proxima_actualizacion TEXT,        -- YYYY-MM-DD
      dia_vencimiento INTEGER NOT NULL DEFAULT 10,
      estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','FINALIZADO','RESCINDIDO')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS cuotas (
      id SERIAL PRIMARY KEY,
      contrato_id INTEGER NOT NULL REFERENCES contratos(id),
      periodo TEXT NOT NULL,             -- YYYY-MM
      vencimiento TEXT NOT NULL,         -- YYYY-MM-DD
      monto DOUBLE PRECISION NOT NULL,
      estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PAGADA')),
      UNIQUE (contrato_id, periodo)
    );

    CREATE TABLE IF NOT EXISTS pagos (
      id SERIAL PRIMARY KEY,
      cuota_id INTEGER NOT NULL REFERENCES cuotas(id),
      fecha TEXT NOT NULL,               -- YYYY-MM-DD
      monto_cuota DOUBLE PRECISION NOT NULL,
      mora DOUBLE PRECISION NOT NULL DEFAULT 0,
      total DOUBLE PRECISION NOT NULL,
      metodo TEXT,
      notas TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK (rol IN ('DESARROLLADOR','ADMINISTRADOR','GESTOR','CONSULTA')),
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- SQLite usaba COLLATE NOCASE en la columna; acá se resuelve con un
    -- índice único sobre LOWER(email), y los services comparan con LOWER().
    CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_lower_idx ON usuarios (LOWER(email));

    CREATE TABLE IF NOT EXISTS ajustes (
      id SERIAL PRIMARY KEY,
      contrato_id INTEGER NOT NULL REFERENCES contratos(id),
      fecha TEXT NOT NULL,
      indice TEXT NOT NULL,
      porcentaje DOUBLE PRECISION NOT NULL,
      monto_anterior DOUBLE PRECISION NOT NULL,
      monto_nuevo DOUBLE PRECISION NOT NULL
    );
  `);
}

// Migraciones livianas: agrega columnas nuevas sin perder datos de bases ya
// creadas. Postgres soporta "ADD COLUMN IF NOT EXISTS" nativo, así que no
// hace falta consultar el catálogo primero (a diferencia de SQLite/PRAGMA).
async function migrar(db) {
  const agregar = async (tabla, columnas) => {
    for (const [nombre, tipo] of Object.entries(columnas)) {
      await db.exec(`ALTER TABLE ${tabla} ADD COLUMN IF NOT EXISTS ${nombre} ${tipo}`);
    }
  };
  await agregar('personas', { domicilio: 'TEXT', cbu: 'TEXT', alias: 'TEXT', comision_pct: 'DOUBLE PRECISION' });
  await agregar('garantes', { domicilio: 'TEXT', tipo_garantia: 'TEXT' });
  await agregar('propiedades', {
    barrio: 'TEXT', ambientes: 'INTEGER', dormitorios: 'INTEGER', banos: 'INTEGER',
    superficie_m2: 'DOUBLE PRECISION', expensas: 'DOUBLE PRECISION', partida: 'TEXT', descripcion: 'TEXT',
    lat: 'DOUBLE PRECISION', lng: 'DOUBLE PRECISION', geocoding_estado: 'TEXT',
  });
  await agregar('pagos', { pdf_path: 'TEXT', comprobante_path: 'TEXT', comprobante_mime: 'TEXT' });
}

module.exports = { crearEsquema, migrar };
