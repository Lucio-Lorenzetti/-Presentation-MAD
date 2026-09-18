const db = require('../db');
const { ErrorValidacion, nn, requerir, enumerado } = require('../utils/validar');

const TIPOS = ['CASA', 'DEPTO', 'LOCAL', 'PH'];
const ESTADOS = ['DISPONIBLE', 'ALQUILADA', 'EN_REPARACION'];

const CAMPOS = {
  direccion: 'direccion', tipo: 'tipo', estado: 'estado', propietarioId: 'propietario_id',
  servicios: 'servicios', alquilerSugerido: 'alquiler_sugerido', notas: 'notas',
  barrio: 'barrio', ambientes: 'ambientes', dormitorios: 'dormitorios', banos: 'banos',
  superficieM2: 'superficie_m2', expensas: 'expensas', partida: 'partida', descripcion: 'descripcion',
};
const NUMERICOS = ['propietario_id', 'alquiler_sugerido', 'ambientes', 'dormitorios', 'banos', 'superficie_m2', 'expensas'];

function normalizar(d, idExistente = null) {
  const out = {};
  for (const [api, col] of Object.entries(CAMPOS)) {
    if (d[api] !== undefined) out[col] = nn(typeof d[api] === 'string' ? d[api].trim() : d[api]);
  }
  if (out.direccion !== undefined && !out.direccion) throw new ErrorValidacion('La dirección no puede estar vacía.');
  if (out.tipo !== undefined) enumerado(out.tipo, TIPOS, 'tipo');
  if (out.estado !== undefined) enumerado(out.estado, ESTADOS, 'estado');
  for (const col of NUMERICOS) {
    if (out[col] === undefined || out[col] === null) continue;
    out[col] = Number(out[col]);
    if (!Number.isFinite(out[col]) || out[col] < 0) throw new ErrorValidacion(`${col} debe ser un número mayor o igual a 0.`);
  }
  if (out.direccion) {
    const dup = db.prepare('SELECT id FROM propiedades WHERE direccion = ? COLLATE NOCASE AND deleted_at IS NULL AND id != ?').get(out.direccion, idExistente ?? -1);
    if (dup) throw new ErrorValidacion('Ya existe una propiedad con esa dirección.', 409);
  }
  if (out.propietario_id !== undefined && out.propietario_id !== null) {
    const p = db.prepare('SELECT tipo FROM personas WHERE id = ? AND deleted_at IS NULL').get(out.propietario_id);
    if (!p) throw new ErrorValidacion('El propietario indicado no existe.');
    if (p.tipo !== 'PROPIETARIO') throw new ErrorValidacion('La persona indicada no es un propietario.');
  }
  return out;
}

function listar({ tipo, estado, q, propietarioId } = {}) {
  const where = ['p.deleted_at IS NULL'];
  const params = [];
  if (tipo) { where.push('p.tipo = ?'); params.push(tipo); }
  if (estado) { where.push('p.estado = ?'); params.push(estado); }
  if (propietarioId) { where.push('p.propietario_id = ?'); params.push(propietarioId); }
  if (q) { where.push('(p.direccion LIKE ? OR p.barrio LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  return db.prepare(`
    SELECT p.*, pe.nombre AS propietario_nombre,
      (SELECT monto_actual FROM contratos c
        WHERE c.propiedad_id = p.id AND c.estado = 'ACTIVO' AND c.deleted_at IS NULL LIMIT 1) AS alquiler_actual
    FROM propiedades p LEFT JOIN personas pe ON pe.id = p.propietario_id
    WHERE ${where.join(' AND ')} ORDER BY p.direccion COLLATE NOCASE
  `).all(...params);
}

// Ficha: datos + propietario + historial de contratos.
function obtener(id) {
  const p = db.prepare(`
    SELECT p.*, pe.nombre AS propietario_nombre FROM propiedades p
    LEFT JOIN personas pe ON pe.id = p.propietario_id WHERE p.id = ? AND p.deleted_at IS NULL
  `).get(id);
  if (!p) return null;
  p.contratos = db.prepare(`
    SELECT c.id, c.estado, c.monto_actual, c.fecha_inicio, c.fecha_fin, i.nombre AS inquilino_nombre
    FROM contratos c JOIN personas i ON i.id = c.inquilino_id
    WHERE c.propiedad_id = ? AND c.deleted_at IS NULL ORDER BY c.fecha_inicio DESC
  `).all(id);
  return p;
}

function crear(d) {
  requerir(d, ['direccion', 'tipo']);
  const v = normalizar(d);
  if (v.estado === 'ALQUILADA') throw new ErrorValidacion('El estado "alquilada" se asigna al crear un contrato.');
  const cols = Object.keys(v);
  const info = db.prepare(`INSERT INTO propiedades (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
    .run(...cols.map(c => v[c]));
  return obtener(Number(info.lastInsertRowid));
}

function actualizar(id, d) {
  const a = db.prepare('SELECT * FROM propiedades WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!a) return null;
  const v = normalizar(d, Number(id));
  if (v.estado !== undefined && v.estado !== a.estado) {
    if (a.estado === 'ALQUILADA') throw new ErrorValidacion('La propiedad está alquilada: finalizá el contrato para liberarla.', 409);
    if (v.estado === 'ALQUILADA') throw new ErrorValidacion('El estado "alquilada" se asigna al crear un contrato.', 409);
  }
  const cols = Object.keys(v);
  if (cols.length) {
    db.prepare(`UPDATE propiedades SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`).run(...cols.map(c => v[c]), id);
  }
  return obtener(id);
}

function eliminar(id) {
  const enUso = db.prepare("SELECT 1 FROM contratos WHERE propiedad_id = ? AND estado = 'ACTIVO' AND deleted_at IS NULL").get(id);
  if (enUso) throw new ErrorValidacion('No se puede eliminar: la propiedad tiene un contrato activo.', 409);
  return db.prepare("UPDATE propiedades SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL").run(id).changes > 0;
}

function resumen() {
  const r = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(estado = 'DISPONIBLE') AS disponibles,
      SUM(estado = 'ALQUILADA') AS alquiladas,
      SUM(estado = 'EN_REPARACION') AS en_reparacion
    FROM propiedades WHERE deleted_at IS NULL
  `).get();
  return { total: r.total, disponibles: r.disponibles || 0, alquiladas: r.alquiladas || 0, enReparacion: r.en_reparacion || 0 };
}

module.exports = { listar, obtener, crear, actualizar, eliminar, resumen };
