// Conexión a Postgres (gestionado, ej. Supabase) vía `pg`. Expone un shim
// con la misma forma que usaba node:sqlite (`db.prepare(sql).get/all/run`)
// para no tener que reescribir cada query a mano — sólo se le agrega
// `async`/`await` a cada llamada existente.
const { Pool, types } = require('pg');
const { config } = require('./config');
const { crearEsquema, migrar } = require('./schema');

// Postgres devuelve COUNT(*)/SUM(entero) como bigint (OID 20), y pg lo
// parsea como string por defecto para no perder precisión más allá de
// Number.MAX_SAFE_INTEGER. Acá nunca se llega ni cerca de eso (son conteos
// y sumas de pesos), así que se parsea como number para no romper el resto
// del código (aritmética, JSON al frontend) que ya esperaba un número.
types.setTypeParser(20, v => parseInt(v, 10));

if (!config.database.url) {
  throw new Error(
    'Falta DATABASE_URL en el .env. Necesitás el connection string de Postgres ' +
    '(ej. Supabase → Project Settings → Database → Connection string → Session pooler).'
  );
}

const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
});

// '?' posicional (como usaba node:sqlite) → '$1, $2, ...' (lo que espera pg).
function aPosicional(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// A los INSERT que no pidan explícitamente otra cosa les agregamos
// `RETURNING id`, así el shim puede devolver `lastInsertRowid` como antes.
function conReturning(sql) {
  const esInsert = /^\s*insert\s+into/i.test(sql);
  if (esInsert && !/returning/i.test(sql)) return `${sql} RETURNING id`;
  return sql;
}

// `queryable` es el pool (fuera de una transacción) o un client dedicado
// (dentro de una transacción) — ambos exponen `.query(text, params)`.
function shim(queryable) {
  return {
    prepare(sql) {
      const texto = conReturning(aPosicional(sql));
      return {
        get: async (...params) => (await queryable.query(texto, params)).rows[0],
        all: async (...params) => (await queryable.query(texto, params)).rows,
        run: async (...params) => {
          const r = await queryable.query(texto, params);
          return { lastInsertRowid: r.rows[0]?.id, changes: r.rowCount };
        },
      };
    },
    exec: sql => queryable.query(sql),
  };
}

const db = shim(pool);

// Corre `fn(tx)` dentro de una transacción real (cliente dedicado del pool,
// no se puede transaccionar sobre conexiones compartidas).
db.transaccion = async fn => {
  const client = await pool.connect();
  const tx = shim(client);
  try {
    await client.query('BEGIN');
    const resultado = await fn(tx);
    await client.query('COMMIT');
    return resultado;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

// Crea las tablas (si no existen) y aplica las migraciones livianas.
// Hay que esperarlo antes de levantar el server o correr los scripts.
db.inicializar = async () => {
  await crearEsquema(db);
  await migrar(db);
};

module.exports = db;
