// Agregados de sólo lectura para el dashboard de Estadísticas.
// No agrega tablas nuevas: reusa pagos, facturas, cuotas, contratos y propiedades.
const db = require('../db');
const contratosService = require('./contratosService');
const propiedadesService = require('./propiedadesService');
const { hoyISO, sumarMeses, calcularMora, round2 } = require('../utils/fechas');

// Últimos n períodos 'YYYY-MM', terminando en el mes actual.
function ultimosMeses(n) {
  const actual = hoyISO().slice(0, 7) + '-01';
  const periodos = [];
  for (let i = n - 1; i >= 0; i--) periodos.push(sumarMeses(actual, -i).slice(0, 7));
  return periodos;
}

function cobrosPorMes(n = 12) {
  const periodos = ultimosMeses(n);
  const filas = db.prepare(`
    SELECT substr(fecha, 1, 7) AS periodo, COALESCE(SUM(total), 0) AS total
    FROM pagos WHERE substr(fecha, 1, 7) >= ? GROUP BY periodo
  `).all(periodos[0]);
  const porPeriodo = Object.fromEntries(filas.map(f => [f.periodo, f.total]));
  return periodos.map(p => ({ periodo: p, total: round2(porPeriodo[p] || 0) }));
}

function facturadoPorMes(n = 12) {
  const periodos = ultimosMeses(n);
  // facturas.fecha está en formato YYYYMMDD (sin guiones).
  const filas = db.prepare(`
    SELECT substr(fecha, 1, 4) || '-' || substr(fecha, 5, 2) AS periodo, COALESCE(SUM(importe_total), 0) AS total
    FROM facturas WHERE resultado = 'A' AND (substr(fecha, 1, 4) || '-' || substr(fecha, 5, 2)) >= ?
    GROUP BY periodo
  `).all(periodos[0]);
  const porPeriodo = Object.fromEntries(filas.map(f => [f.periodo, f.total]));
  return periodos.map(p => ({ periodo: p, total: round2(porPeriodo[p] || 0) }));
}

function topDeudores(limite = 5) {
  const hoy = hoyISO();
  const vencidas = db.prepare(`
    SELECT q.monto, q.vencimiento, i.id AS inquilino_id, i.nombre AS inquilino_nombre, p.direccion AS propiedad_direccion
    FROM cuotas q
    JOIN contratos c ON c.id = q.contrato_id
    JOIN personas i ON i.id = c.inquilino_id
    JOIN propiedades p ON p.id = c.propiedad_id
    WHERE q.estado = 'PENDIENTE' AND q.vencimiento < ? AND c.estado = 'ACTIVO' AND c.deleted_at IS NULL
  `).all(hoy);

  const porInquilino = new Map();
  for (const v of vencidas) {
    const { mora } = calcularMora(v.monto, v.vencimiento, hoy);
    const acc = porInquilino.get(v.inquilino_id) || {
      inquilinoId: v.inquilino_id, inquilinoNombre: v.inquilino_nombre, propiedadDireccion: v.propiedad_direccion,
      cuotasVencidas: 0, deuda: 0,
    };
    acc.cuotasVencidas += 1;
    acc.deuda = round2(acc.deuda + v.monto + mora);
    porInquilino.set(v.inquilino_id, acc);
  }
  return [...porInquilino.values()].sort((a, b) => b.deuda - a.deuda).slice(0, limite);
}

function resumenGeneral() {
  const contratos = contratosService.resumen();
  const propiedades = propiedadesService.resumen();
  const facturas = db.prepare(`
    SELECT COUNT(*) AS total, SUM(resultado = 'A') AS aprobadas, SUM(resultado = 'R') AS rechazadas,
      COALESCE(SUM(CASE WHEN resultado = 'A' THEN importe_total ELSE 0 END), 0) AS totalFacturado
    FROM facturas
  `).get();
  return {
    contratos,
    propiedades,
    facturacion: {
      total: facturas.total,
      aprobadas: facturas.aprobadas || 0,
      rechazadas: facturas.rechazadas || 0,
      totalFacturado: round2(facturas.totalFacturado),
    },
  };
}

function panel() {
  return {
    resumen: resumenGeneral(),
    cobrosPorMes: cobrosPorMes(12),
    facturadoPorMes: facturadoPorMes(12),
    topDeudores: topDeudores(5),
  };
}

module.exports = { panel, cobrosPorMes, facturadoPorMes, topDeudores, resumenGeneral };
