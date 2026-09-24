// Trae los índices oficiales de ajuste de alquiler (ICL, IPC) publicados por
// el BCRA — API pública, sin autenticación ni API key.
// https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/{idVariable}
const BASE = 'https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias';

// idVariable del catálogo de "Principales variables monetarias y financieras" del BCRA.
const VARIABLE = {
  ICL: 40, // Índice para Contratos de Locación (base 30.6.20=1) — nivel del índice
  IPC: 27, // Variación mensual del IPC (%) — hay que acumularla geométricamente
};

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function obtenerSerie(indice, desde, hasta) {
  const idVariable = VARIABLE[indice];
  if (!idVariable) throw new Error(`Índice no soportado: ${indice}`);
  const url = `${BASE}/${idVariable}?desde=${desde}&hasta=${hasta}`;
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(`No se pudo conectar con la API del BCRA: ${e.message}`);
  }
  if (!res.ok) throw new Error(`El BCRA respondió ${res.status} al consultar ${indice}.`);
  const body = await res.json();
  const detalle = body.results?.[0]?.detalle || [];
  // El BCRA devuelve los valores con el más reciente primero.
  return detalle.slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// ICL: es un índice de nivel — el ajuste es la variación entre el valor al
// inicio y al final del período (no se acumula, ya viene acumulado).
async function porcentajeICL(desde, hasta) {
  const serie = await obtenerSerie('ICL', desde, hasta);
  if (serie.length < 2) throw new Error('El BCRA todavía no publicó suficientes valores de ICL en ese rango.');
  const inicial = serie[0].valor;
  const final = serie[serie.length - 1].valor;
  return round2((final / inicial - 1) * 100);
}

// IPC: el BCRA publica la variación mensual (%) — el ajuste del período es
// la acumulación geométrica de esos meses, no la suma simple.
async function porcentajeIPC(desde, hasta) {
  const serie = await obtenerSerie('IPC', desde, hasta);
  if (serie.length === 0) throw new Error('El BCRA todavía no publicó el IPC de ese período.');
  const factor = serie.reduce((acc, m) => acc * (1 + m.valor / 100), 1);
  return round2((factor - 1) * 100);
}

// Sugerencia de ajuste para un contrato: variación del índice desde la
// fecha indicada (normalmente el último ajuste, o el inicio del contrato)
// hasta hoy. No aplica nada — sólo calcula el porcentaje sugerido.
async function sugerirAjuste({ indice, desde, hasta }) {
  if (indice === 'NINGUNO') throw new Error('El contrato no tiene índice de actualización.');
  const porcentaje = indice === 'ICL' ? await porcentajeICL(desde, hasta) : await porcentajeIPC(desde, hasta);
  return { indice, desde, hasta, porcentaje, fuente: 'BCRA (api.bcra.gob.ar)' };
}

module.exports = { sugerirAjuste, porcentajeICL, porcentajeIPC };
