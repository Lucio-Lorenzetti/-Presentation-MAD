const fs = require('fs');
const path = require('path');
const db = require('../db');
const { ErrorValidacion, nn, requerir, enumerado, esFechaISO } = require('../utils/validar');
const { hoyISO, diasEntre, sumarMeses, round2, calcularMora, pad } = require('../utils/fechas');
const { generarReciboPdf } = require('./pdfService');

const INDICES = ['ICL', 'IPC', 'NINGUNO'];

const COMPROBANTES_DIR = path.resolve(process.cwd(), 'storage', 'comprobantes');
fs.mkdirSync(COMPROBANTES_DIR, { recursive: true });
const EXTENSION_POR_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

// Cuántas cuotas mensuales tiene un contrato entre dos fechas.
function cantidadCuotas(inicio, fin) {
  const [iy, im, id] = inicio.split('-').map(Number);
  const [fy, fm, fd] = fin.split('-').map(Number);
  const meses = (fy * 12 + fm) - (iy * 12 + im) + (fd >= id ? 1 : 0);
  return Math.max(1, meses);
}

function vencimientoDe(periodoISO, dia) {
  const [y, m] = periodoISO.split('-').map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${pad(m)}-${pad(Math.min(dia, ultimo))}`;
}

// Estado de la cuota "que importa" hoy: la pendiente más vieja ya vencida.
async function decorar(c) {
  const hoy = hoyISO();
  const vencida = await db.prepare(`
    SELECT * FROM cuotas WHERE contrato_id = ? AND estado = 'PENDIENTE' AND vencimiento < ?
    ORDER BY vencimiento LIMIT 1
  `).get(c.id, hoy);
  const cantVencidas = (await db.prepare(
    "SELECT COUNT(*) AS n FROM cuotas WHERE contrato_id = ? AND estado = 'PENDIENTE' AND vencimiento < ?"
  ).get(c.id, hoy)).n;

  let estadoCuota;
  if (vencida) {
    const { diasMora, mora } = calcularMora(vencida.monto, vencida.vencimiento, hoy);
    estadoCuota = { tipo: 'VENCIDA', diasMora, mora, monto: vencida.monto, cantVencidas, periodo: vencida.periodo };
  } else if (c.estado === 'ACTIVO' && c.indice !== 'NINGUNO' && c.proxima_actualizacion && c.proxima_actualizacion <= hoy) {
    estadoCuota = { tipo: 'AJUSTE_PENDIENTE', indice: c.indice };
  } else {
    estadoCuota = { tipo: 'AL_DIA' };
  }
  return { ...c, estadoCuota };
}

const SELECT_CONTRATO = `
  SELECT c.*, i.nombre AS inquilino_nombre, p.direccion AS propiedad_direccion, p.tipo AS propiedad_tipo
  FROM contratos c
  JOIN personas i ON i.id = c.inquilino_id
  JOIN propiedades p ON p.id = c.propiedad_id
`;

async function listar({ estado, q } = {}) {
  const where = ['c.deleted_at IS NULL'];
  const params = [];
  if (estado) { where.push('c.estado = ?'); params.push(estado); }
  if (q) { where.push('(i.nombre ILIKE ? OR p.direccion ILIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const filas = await db.prepare(`${SELECT_CONTRATO} WHERE ${where.join(' AND ')} ORDER BY c.id DESC`).all(...params);
  return Promise.all(filas.map(decorar));
}

async function obtener(id) {
  const c = await db.prepare(`${SELECT_CONTRATO} WHERE c.id = ? AND c.deleted_at IS NULL`).get(id);
  if (!c) return null;
  const hoy = hoyISO();
  const cuotasCrudas = await db.prepare('SELECT * FROM cuotas WHERE contrato_id = ? ORDER BY periodo').all(id);
  const cuotas = cuotasCrudas.map(q => {
    if (q.estado !== 'PENDIENTE') return q;
    const { diasMora, mora } = calcularMora(q.monto, q.vencimiento, hoy);
    return { ...q, diasMora, mora, totalConMora: round2(q.monto + mora) };
  });
  const ajustes = await db.prepare('SELECT * FROM ajustes WHERE contrato_id = ? ORDER BY id DESC').all(id);
  const pagos = await db.prepare(`
    SELECT p.*, q.periodo AS periodo, q.vencimiento AS vencimiento
    FROM pagos p JOIN cuotas q ON q.id = p.cuota_id
    WHERE q.contrato_id = ?
    ORDER BY p.id DESC
  `).all(id);
  return { ...(await decorar(c)), cuotas, ajustes, pagos };
}

async function crear(d) {
  requerir(d, ['propiedadId', 'inquilinoId', 'fechaInicio', 'fechaFin', 'montoInicial']);
  if (!esFechaISO(d.fechaInicio) || !esFechaISO(d.fechaFin)) throw new ErrorValidacion('Las fechas deben tener formato YYYY-MM-DD.');
  if (d.fechaFin <= d.fechaInicio) throw new ErrorValidacion('fechaFin debe ser posterior a fechaInicio.');
  if (!(d.montoInicial > 0)) throw new ErrorValidacion('montoInicial debe ser mayor a 0.');
  const indice = enumerado(d.indice || 'ICL', INDICES, 'indice');
  const periodicidad = Number(d.periodicidadMeses || 3);
  const diaVto = Number(d.diaVencimiento || 10);
  if (!(periodicidad >= 1) || !(diaVto >= 1 && diaVto <= 28)) {
    throw new ErrorValidacion('periodicidadMeses debe ser >= 1 y diaVencimiento entre 1 y 28.');
  }

  const prop = await db.prepare('SELECT * FROM propiedades WHERE id = ? AND deleted_at IS NULL').get(d.propiedadId);
  if (!prop) throw new ErrorValidacion('La propiedad indicada no existe.');
  if (prop.estado === 'ALQUILADA') throw new ErrorValidacion('La propiedad ya está alquilada.', 409);
  if (prop.estado === 'EN_REPARACION') throw new ErrorValidacion('La propiedad está en reparación.', 409);
  const inq = await db.prepare('SELECT * FROM personas WHERE id = ? AND deleted_at IS NULL').get(d.inquilinoId);
  if (!inq) throw new ErrorValidacion('El inquilino indicado no existe.');
  if (inq.tipo !== 'INQUILINO') throw new ErrorValidacion('La persona indicada no es un inquilino.');
  if (inq.lista_negra) throw new ErrorValidacion('El inquilino está en la lista negra.', 409);

  const proxima = indice === 'NINGUNO' ? null : sumarMeses(d.fechaInicio, periodicidad);

  const id = await db.transaccion(async tx => {
    const info = await tx.prepare(`
      INSERT INTO contratos (propiedad_id, inquilino_id, fecha_inicio, fecha_fin, monto_inicial, monto_actual,
        indice, periodicidad_meses, proxima_actualizacion, dia_vencimiento)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(d.propiedadId, d.inquilinoId, d.fechaInicio, d.fechaFin, d.montoInicial, d.montoInicial,
      indice, periodicidad, proxima, diaVto);
    const contratoId = Number(info.lastInsertRowid);

    const n = cantidadCuotas(d.fechaInicio, d.fechaFin);
    const ins = tx.prepare('INSERT INTO cuotas (contrato_id, periodo, vencimiento, monto) VALUES (?, ?, ?, ?)');
    for (let i = 0; i < n; i++) {
      const p = sumarMeses(d.fechaInicio.slice(0, 7) + '-01', i);
      await ins.run(contratoId, p.slice(0, 7), vencimientoDe(p, diaVto), d.montoInicial);
    }
    await tx.prepare("UPDATE propiedades SET estado = 'ALQUILADA' WHERE id = ?").run(d.propiedadId);
    return contratoId;
  });
  return obtener(id);
}

async function cambiarEstado(id, estado) {
  enumerado(estado, ['FINALIZADO', 'RESCINDIDO'], 'estado');
  const c = await obtener(id);
  if (!c) return null;
  if (c.estado !== 'ACTIVO') throw new ErrorValidacion('El contrato ya no está activo.', 409);
  await db.transaccion(async tx => {
    await tx.prepare('UPDATE contratos SET estado = ? WHERE id = ?').run(estado, id);
    await tx.prepare("UPDATE propiedades SET estado = 'DISPONIBLE' WHERE id = ?").run(c.propiedad_id);
  });
  return obtener(id);
}

async function registrarPago(cuotaId, d = {}) {
  const cuota = await db.prepare(`
    SELECT q.*, c.estado AS contrato_estado, c.id AS contrato_id,
           i.nombre AS inquilino_nombre, p.direccion AS propiedad_direccion
    FROM cuotas q
    JOIN contratos c ON c.id = q.contrato_id
    JOIN personas i ON i.id = c.inquilino_id
    JOIN propiedades p ON p.id = c.propiedad_id
    WHERE q.id = ?
  `).get(cuotaId);
  if (!cuota) return null;
  if (cuota.estado === 'PAGADA') throw new ErrorValidacion('La cuota ya está pagada.', 409);
  const fecha = d.fecha || hoyISO();
  if (!esFechaISO(fecha)) throw new ErrorValidacion('fecha debe tener formato YYYY-MM-DD.');
  const { diasMora, mora } = calcularMora(cuota.monto, cuota.vencimiento, fecha);
  const total = round2(cuota.monto + mora);

  const pagoId = await db.transaccion(async tx => {
    const info = await tx.prepare(`
      INSERT INTO pagos (cuota_id, fecha, monto_cuota, mora, total, metodo, notas) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(cuotaId, fecha, cuota.monto, mora, total, nn(d.metodo), nn(d.notas));
    await tx.prepare("UPDATE cuotas SET estado = 'PAGADA' WHERE id = ?").run(cuotaId);
    return Number(info.lastInsertRowid);
  });

  let pdfPath = null;
  try {
    pdfPath = await generarReciboPdf({
      pagoId,
      fecha,
      inquilinoNombre: cuota.inquilino_nombre,
      propiedadDireccion: cuota.propiedad_direccion,
      periodo: cuota.periodo,
      montoCuota: cuota.monto,
      mora,
      total,
      metodo: d.metodo || null,
    });
    await db.prepare('UPDATE pagos SET pdf_path = ? WHERE id = ?').run(pdfPath, pagoId);
  } catch (e) {
    // El pago ya quedó registrado; el recibo se puede regenerar más adelante si hace falta.
    console.error('No se pudo generar el PDF del recibo:', e);
  }

  return { id: pagoId, cuotaId: Number(cuotaId), fecha, montoCuota: cuota.monto, diasMora, mora, total, metodo: d.metodo ?? null, pdfPath };
}

async function obtenerPago(pagoId) {
  return db.prepare('SELECT * FROM pagos WHERE id = ?').get(pagoId);
}

// El comprobante que el inquilino manda por WhatsApp al transferir (foto/captura/PDF),
// para dejarlo vinculado al pago. Reemplaza el anterior si ya había uno cargado.
async function guardarComprobante(pagoId, archivo) {
  const pago = await db.prepare('SELECT id, comprobante_path FROM pagos WHERE id = ?').get(pagoId);
  if (!pago) return null;
  const ext = EXTENSION_POR_MIME[archivo.mimetype] || 'bin';
  const filePath = path.join(COMPROBANTES_DIR, `comprobante-${pagoId}.${ext}`);
  if (pago.comprobante_path && pago.comprobante_path !== filePath) {
    await fs.promises.unlink(pago.comprobante_path).catch(() => {});
  }
  await fs.promises.writeFile(filePath, archivo.buffer);
  await db.prepare('UPDATE pagos SET comprobante_path = ?, comprobante_mime = ? WHERE id = ?').run(filePath, archivo.mimetype, pagoId);
  return obtenerPago(pagoId);
}

// Junta contrato + propiedad + propietario + inquilino + garantes + ajustes
// para la ficha resumen en PDF (documento de gestión interna, no legal).
async function fichaParaPdf(id) {
  const c = await obtener(id);
  if (!c) return null;

  const propiedad = await db.prepare(`
    SELECT p.*, pe.nombre AS propietario_nombre, pe.telefono AS propietario_telefono, pe.email AS propietario_email
    FROM propiedades p LEFT JOIN personas pe ON pe.id = p.propietario_id
    WHERE p.id = ?
  `).get(c.propiedad_id);

  const inquilino = await db.prepare('SELECT * FROM personas WHERE id = ?').get(c.inquilino_id);
  const garantes = await db.prepare('SELECT * FROM garantes WHERE persona_id = ? AND deleted_at IS NULL ORDER BY id').all(c.inquilino_id);

  return { contrato: c, propiedad, inquilino, garantes, ajustes: c.ajustes };
}

// Aplica un ajuste por índice (%): actualiza monto_actual y las cuotas futuras aún no vencidas.
async function aplicarAjuste(id, d = {}) {
  const c = await obtener(id);
  if (!c) return null;
  if (c.estado !== 'ACTIVO') throw new ErrorValidacion('El contrato no está activo.', 409);
  if (c.indice === 'NINGUNO') throw new ErrorValidacion('El contrato no tiene índice de actualización.', 409);
  const porcentaje = Number(d.porcentaje);
  if (!Number.isFinite(porcentaje) || porcentaje <= -100) throw new ErrorValidacion('porcentaje inválido.');
  const hoy = hoyISO();
  const montoNuevo = round2(c.monto_actual * (1 + porcentaje / 100));
  const proxima = sumarMeses(c.proxima_actualizacion || hoy, c.periodicidad_meses);

  await db.transaccion(async tx => {
    await tx.prepare('UPDATE contratos SET monto_actual = ?, proxima_actualizacion = ? WHERE id = ?').run(montoNuevo, proxima, id);
    await tx.prepare("UPDATE cuotas SET monto = ? WHERE contrato_id = ? AND estado = 'PENDIENTE' AND vencimiento >= ?")
      .run(montoNuevo, id, hoy);
    await tx.prepare(`
      INSERT INTO ajustes (contrato_id, fecha, indice, porcentaje, monto_anterior, monto_nuevo) VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, hoy, c.indice, porcentaje, c.monto_actual, montoNuevo);
  });
  return obtener(id);
}

async function resumen() {
  const hoy = hoyISO();
  const mes = hoy.slice(0, 7);
  const activos = (await db.prepare("SELECT COUNT(*) AS n FROM contratos WHERE estado = 'ACTIVO' AND deleted_at IS NULL").get()).n;
  const filasActivos = await db.prepare(
    "SELECT fecha_fin FROM contratos WHERE estado = 'ACTIVO' AND deleted_at IS NULL"
  ).all();
  const porVencer = filasActivos.filter(r => diasEntre(hoy, r.fecha_fin) <= 60 && diasEntre(hoy, r.fecha_fin) >= 0).length;

  const esperado = (await db.prepare(`
    SELECT COALESCE(SUM(q.monto), 0) AS t FROM cuotas q JOIN contratos c ON c.id = q.contrato_id
    WHERE q.periodo = ? AND c.estado = 'ACTIVO' AND c.deleted_at IS NULL
  `).get(mes)).t;
  const cobrado = (await db.prepare("SELECT COALESCE(SUM(total), 0) AS t FROM pagos WHERE substr(fecha, 1, 7) = ?").get(mes)).t;

  const ajustes = (await db.prepare(`
    SELECT COUNT(*) AS n FROM contratos
    WHERE estado = 'ACTIVO' AND deleted_at IS NULL AND indice != 'NINGUNO' AND proxima_actualizacion < ?
  `).get(sumarMeses(mes + '-01', 1))).n;

  const vencidas = await db.prepare(`
    SELECT q.monto, q.vencimiento FROM cuotas q JOIN contratos c ON c.id = q.contrato_id
    WHERE q.estado = 'PENDIENTE' AND q.vencimiento < ? AND c.estado = 'ACTIVO' AND c.deleted_at IS NULL
  `).all(hoy);
  const montoVencido = vencidas.reduce((a, q) => a + q.monto + calcularMora(q.monto, q.vencimiento, hoy).mora, 0);

  return {
    contratosActivos: activos,
    porVencer,
    cobrosMes: round2(cobrado),
    esperadoMes: round2(esperado),
    ajustesPendientes: ajustes,
    cuotasVencidas: vencidas.length,
    montoVencidoConMora: round2(montoVencido),
  };
}

module.exports = { listar, obtener, crear, cambiarEstado, registrarPago, obtenerPago, guardarComprobante, aplicarAjuste, resumen, fichaParaPdf };
