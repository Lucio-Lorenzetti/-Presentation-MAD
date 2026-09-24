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

async function cobrosPorMes(n = 12) {
  const periodos = ultimosMeses(n);
  const filas = await db.prepare(`
    SELECT substr(fecha, 1, 7) AS periodo, COALESCE(SUM(total), 0) AS total
    FROM pagos WHERE substr(fecha, 1, 7) >= ? GROUP BY periodo
  `).all(periodos[0]);
  const porPeriodo = Object.fromEntries(filas.map(f => [f.periodo, f.total]));
  return periodos.map(p => ({ periodo: p, total: round2(porPeriodo[p] || 0) }));
}

async function facturadoPorMes(n = 12) {
  const periodos = ultimosMeses(n);
  // facturas.fecha está en formato YYYYMMDD (sin guiones).
  const filas = await db.prepare(`
    SELECT substr(fecha, 1, 4) || '-' || substr(fecha, 5, 2) AS periodo, COALESCE(SUM(importe_total), 0) AS total
    FROM facturas WHERE resultado = 'A' AND (substr(fecha, 1, 4) || '-' || substr(fecha, 5, 2)) >= ?
    GROUP BY periodo
  `).all(periodos[0]);
  const porPeriodo = Object.fromEntries(filas.map(f => [f.periodo, f.total]));
  return periodos.map(p => ({ periodo: p, total: round2(porPeriodo[p] || 0) }));
}

async function topDeudores(limite = 5) {
  const hoy = hoyISO();
  const vencidas = await db.prepare(`
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

async function resumenGeneral() {
  const contratos = await contratosService.resumen();
  const propiedades = await propiedadesService.resumen();
  const facturas = await db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN resultado = 'A' THEN 1 ELSE 0 END) AS aprobadas,
      SUM(CASE WHEN resultado = 'R' THEN 1 ELSE 0 END) AS rechazadas,
      COALESCE(SUM(CASE WHEN resultado = 'A' THEN importe_total ELSE 0 END), 0) AS total_facturado
    FROM facturas
  `).get();
  return {
    contratos,
    propiedades,
    facturacion: {
      total: facturas.total,
      aprobadas: facturas.aprobadas || 0,
      rechazadas: facturas.rechazadas || 0,
      totalFacturado: round2(facturas.total_facturado),
    },
  };
}

async function panel() {
  const [resumen, cobros, facturado, deudores] = await Promise.all([
    resumenGeneral(), cobrosPorMes(12), facturadoPorMes(12), topDeudores(5),
  ]);
  return { resumen, cobrosPorMes: cobros, facturadoPorMes: facturado, topDeudores: deudores };
}

module.exports = { panel, cobrosPorMes, facturadoPorMes, topDeudores, resumenGeneral };
