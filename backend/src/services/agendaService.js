// Agenda de vencimientos: cobros de cuotas, ajustes IPC/ICL pendientes y
// fin de contrato próximos. Alimenta el calendario de la pantalla de Inicio.
const db = require('../db');
const { hoyISO, sumarDias, calcularMora, round2 } = require('../utils/fechas');

async function proximosVencimientos({ diasAtras = 60, diasAdelante = 90 } = {}) {
  const hoy = hoyISO();
  const desde = sumarDias(hoy, -diasAtras);
  const hasta = sumarDias(hoy, diasAdelante);
  const items = [];

  const cuotas = await db.prepare(`
    SELECT q.periodo, q.vencimiento, q.monto, c.id AS contrato_id,
      i.nombre AS inquilino_nombre, i.telefono AS inquilino_telefono,
      p.direccion AS propiedad_direccion
    FROM cuotas q
    JOIN contratos c ON c.id = q.contrato_id
    JOIN personas i ON i.id = c.inquilino_id
    JOIN propiedades p ON p.id = c.propiedad_id
    WHERE q.estado = 'PENDIENTE' AND c.estado = 'ACTIVO' AND c.deleted_at IS NULL
      AND q.vencimiento BETWEEN ? AND ?
  `).all(desde, hasta);
  for (const q of cuotas) {
    const vencida = q.vencimiento < hoy;
    const mora = vencida ? calcularMora(q.monto, q.vencimiento, hoy).mora : 0;
    items.push({
      tipo: 'COBRO',
      fecha: q.vencimiento,
      vencida,
      contratoId: q.contrato_id,
      titulo: `Cobrar cuota ${q.periodo}`,
      persona: q.inquilino_nombre,
      telefono: q.inquilino_telefono,
      propiedad: q.propiedad_direccion,
      monto: round2(q.monto + mora),
    });
  }

  const ajustes = await db.prepare(`
    SELECT c.id AS contrato_id, c.indice, c.proxima_actualizacion, c.monto_actual,
      i.nombre AS inquilino_nombre, i.telefono AS inquilino_telefono,
      p.direccion AS propiedad_direccion
    FROM contratos c
    JOIN personas i ON i.id = c.inquilino_id
    JOIN propiedades p ON p.id = c.propiedad_id
    WHERE c.estado = 'ACTIVO' AND c.deleted_at IS NULL AND c.indice != 'NINGUNO'
      AND c.proxima_actualizacion BETWEEN ? AND ?
  `).all(desde, hasta);
  for (const a of ajustes) {
    items.push({
      tipo: 'AJUSTE',
      fecha: a.proxima_actualizacion,
      vencida: a.proxima_actualizacion < hoy,
      contratoId: a.contrato_id,
      titulo: `Aplicar ajuste ${a.indice}`,
      persona: a.inquilino_nombre,
      telefono: a.inquilino_telefono,
      propiedad: a.propiedad_direccion,
      monto: a.monto_actual,
    });
  }

  const fines = await db.prepare(`
    SELECT c.id AS contrato_id, c.fecha_fin,
      i.nombre AS inquilino_nombre, i.telefono AS inquilino_telefono,
      pe.nombre AS propietario_nombre, pe.telefono AS propietario_telefono,
      p.direccion AS propiedad_direccion
    FROM contratos c
    JOIN personas i ON i.id = c.inquilino_id
    JOIN propiedades p ON p.id = c.propiedad_id
    LEFT JOIN personas pe ON pe.id = p.propietario_id
    WHERE c.estado = 'ACTIVO' AND c.deleted_at IS NULL AND c.fecha_fin BETWEEN ? AND ?
  `).all(desde, hasta);
  for (const f of fines) {
    items.push({
      tipo: 'FIN_CONTRATO',
      fecha: f.fecha_fin,
      vencida: f.fecha_fin < hoy,
      contratoId: f.contrato_id,
      titulo: 'Vencimiento de contrato',
      persona: f.inquilino_nombre,
      telefono: f.inquilino_telefono,
      propietario: f.propietario_nombre,
      propietarioTelefono: f.propietario_telefono,
      propiedad: f.propiedad_direccion,
    });
  }

  return items.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

module.exports = { proximosVencimientos };
