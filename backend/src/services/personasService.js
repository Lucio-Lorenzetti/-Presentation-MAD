const db = require('../db');
const { ErrorValidacion, nn, requerir, enumerado } = require('../utils/validar');
const { hoyISO } = require('../utils/fechas');

const TIPOS = ['PROPIETARIO', 'INQUILINO'];

// camelCase (API) → columna
const CAMPOS = {
  nombre: 'nombre', tipo: 'tipo', dni: 'dni', cuit: 'cuit', email: 'email', telefono: 'telefono',
  domicilio: 'domicilio', metodoCobro: 'metodo_cobro', cbu: 'cbu', alias: 'alias',
  comisionPct: 'comision_pct', notas: 'notas',
};

const soloDigitos = v => (v === undefined || v === null ? v : String(v).replace(/\D/g, ''));

// Normaliza y valida los campos presentes en `d`. Devuelve { columna: valor }.
function normalizar(d, idExistente = null) {
  const out = {};
  for (const [api, col] of Object.entries(CAMPOS)) {
    if (d[api] !== undefined) out[col] = nn(typeof d[api] === 'string' ? d[api].trim() : d[api]);
  }
  if (out.tipo !== undefined) enumerado(out.tipo, TIPOS, 'tipo');
  if (out.nombre !== undefined && !out.nombre) throw new ErrorValidacion('El nombre no puede estar vacío.');
  if (out.dni) {
    out.dni = soloDigitos(out.dni);
    if (out.dni.length < 7 || out.dni.length > 8) throw new ErrorValidacion('El DNI debe tener 7 u 8 dígitos.');
    const dup = db.prepare('SELECT id, nombre FROM personas WHERE dni = ? AND deleted_at IS NULL AND id != ?').get(out.dni, idExistente ?? -1);
    if (dup) throw new ErrorValidacion(`Ya existe una persona con ese DNI: ${dup.nombre}.`, 409);
  }
  if (out.cuit) {
    out.cuit = soloDigitos(out.cuit);
    if (out.cuit.length !== 11) throw new ErrorValidacion('El CUIT/CUIL debe tener 11 dígitos.');
  }
  if (out.cbu) {
    out.cbu = soloDigitos(out.cbu);
    if (out.cbu.length !== 22) throw new ErrorValidacion('El CBU debe tener 22 dígitos.');
  }
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) throw new ErrorValidacion('El email no es válido.');
  if (out.comision_pct !== undefined && out.comision_pct !== null) {
    out.comision_pct = Number(out.comision_pct);
    if (!(out.comision_pct >= 0 && out.comision_pct <= 100)) throw new ErrorValidacion('La comisión debe estar entre 0 y 100.');
  }
  if (d.listaNegra !== undefined) out.lista_negra = d.listaNegra ? 1 : 0;
  return out;
}

function listar({ tipo, listaNegra, q } = {}) {
  const where = ['p.deleted_at IS NULL'];
  const params = [];
  if (tipo) { where.push('p.tipo = ?'); params.push(tipo); }
  if (listaNegra !== undefined) { where.push('p.lista_negra = ?'); params.push(listaNegra ? 1 : 0); }
  if (q) { where.push('(p.nombre LIKE ? OR p.dni LIKE ? OR p.cuit LIKE ? OR p.email LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
  return db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM garantes g WHERE g.persona_id = p.id AND g.deleted_at IS NULL) AS cant_garantes,
      (SELECT COUNT(*) FROM propiedades x WHERE x.propietario_id = p.id AND x.deleted_at IS NULL) AS cant_propiedades,
      (SELECT COUNT(*) FROM contratos c WHERE c.inquilino_id = p.id AND c.estado = 'ACTIVO' AND c.deleted_at IS NULL) AS cant_contratos_activos
    FROM personas p WHERE ${where.join(' AND ')} ORDER BY p.nombre COLLATE NOCASE
  `).all(...params);
}

// Ficha completa: datos + garantes + propiedades (propietario) o contratos (inquilino).
function obtener(id) {
  const persona = db.prepare('SELECT * FROM personas WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!persona) return null;
  persona.garantes = db.prepare('SELECT * FROM garantes WHERE persona_id = ? AND deleted_at IS NULL ORDER BY id').all(id);
  if (persona.tipo === 'PROPIETARIO') {
    persona.propiedades = db.prepare(`
      SELECT p.id, p.direccion, p.tipo, p.estado,
        (SELECT monto_actual FROM contratos c WHERE c.propiedad_id = p.id AND c.estado = 'ACTIVO' AND c.deleted_at IS NULL LIMIT 1) AS alquiler_actual
      FROM propiedades p WHERE p.propietario_id = ? AND p.deleted_at IS NULL ORDER BY p.direccion COLLATE NOCASE
    `).all(id);
  } else {
    const hoy = hoyISO();
    persona.contratos = db.prepare(`
      SELECT c.id, c.estado, c.monto_actual, c.fecha_inicio, c.fecha_fin, p.direccion AS propiedad_direccion,
        (SELECT COUNT(*) FROM cuotas q WHERE q.contrato_id = c.id AND q.estado = 'PENDIENTE' AND q.vencimiento < ?) AS cuotas_vencidas
      FROM contratos c JOIN propiedades p ON p.id = c.propiedad_id
      WHERE c.inquilino_id = ? AND c.deleted_at IS NULL ORDER BY c.fecha_inicio DESC
    `).all(hoy, id);
  }
  return persona;
}

function crear(d) {
  requerir(d, ['nombre', 'tipo']);
  const v = normalizar(d);
  const cols = Object.keys(v);
  const info = db.prepare(`INSERT INTO personas (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
    .run(...cols.map(c => v[c]));
  const id = Number(info.lastInsertRowid);
  for (const g of d.garantes || []) agregarGarante(id, g);
  return obtener(id);
}

function actualizar(id, d) {
  const a = db.prepare('SELECT * FROM personas WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!a) return null;
  const v = normalizar(d, Number(id));
  if (v.tipo && v.tipo !== a.tipo) {
    const enUso = db.prepare(`
      SELECT 1 FROM contratos c JOIN propiedades p ON p.id = c.propiedad_id
      WHERE (c.inquilino_id = ? OR p.propietario_id = ?) AND c.estado = 'ACTIVO' AND c.deleted_at IS NULL LIMIT 1
    `).get(id, id);
    if (enUso) throw new ErrorValidacion('No se puede cambiar el tipo: la persona tiene contratos activos.', 409);
  }
  const cols = Object.keys(v);
  if (cols.length) {
    db.prepare(`UPDATE personas SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`).run(...cols.map(c => v[c]), id);
  }
  return obtener(id);
}

function eliminar(id) {
  const enUso = db.prepare(`
    SELECT 1 FROM contratos
    WHERE (inquilino_id = ? OR propiedad_id IN (SELECT id FROM propiedades WHERE propietario_id = ? AND deleted_at IS NULL))
      AND estado = 'ACTIVO' AND deleted_at IS NULL LIMIT 1
  `).get(id, id);
  if (enUso) throw new ErrorValidacion('No se puede eliminar: la persona tiene contratos activos.', 409);
  const conPropiedades = db.prepare('SELECT COUNT(*) AS n FROM propiedades WHERE propietario_id = ? AND deleted_at IS NULL').get(id).n;
  if (conPropiedades > 0) {
    throw new ErrorValidacion(`No se puede eliminar: es propietario de ${conPropiedades} propiedad(es). Reasignalas primero.`, 409);
  }
  return db.prepare("UPDATE personas SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL").run(id).changes > 0;
}

function agregarGarante(personaId, g) {
  requerir(g, ['nombre']);
  const dni = g.dni ? soloDigitos(g.dni) : null;
  if (dni && (dni.length < 7 || dni.length > 8)) throw new ErrorValidacion('El DNI del garante debe tener 7 u 8 dígitos.');
  db.prepare('INSERT INTO garantes (persona_id, nombre, dni, telefono, domicilio, tipo_garantia) VALUES (?, ?, ?, ?, ?, ?)')
    .run(personaId, g.nombre.trim(), dni, nn(g.telefono), nn(g.domicilio), nn(g.tipoGarantia));
}

function eliminarGarante(personaId, garanteId) {
  return db.prepare("UPDATE garantes SET deleted_at = datetime('now') WHERE id = ? AND persona_id = ? AND deleted_at IS NULL")
    .run(garanteId, personaId).changes > 0;
}

module.exports = { listar, obtener, crear, actualizar, eliminar, agregarGarante, eliminarGarante };
