const TASA_MORA_DIARIA = 0.005; // 0.5% diario sobre el monto de la cuota

const pad = n => String(n).padStart(2, '0');

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function diasEntre(desdeISO, hastaISO) {
  const a = Date.parse(`${desdeISO}T00:00:00Z`);
  const b = Date.parse(`${hastaISO}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function sumarDias(iso, dias) {
  const [y, m, d] = iso.split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d + dias));
  return `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(fecha.getUTCDate())}`;
}

// Suma meses respetando fin de mes (31/01 + 1 mes = 28/02).
function sumarMeses(iso, meses) {
  const [y, m, d] = iso.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + meses;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const ultimo = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${pad(nm)}-${pad(Math.min(d, ultimo))}`;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function calcularMora(monto, vencimientoISO, hastaISO = hoyISO()) {
  const dias = Math.max(0, diasEntre(vencimientoISO, hastaISO));
  return { diasMora: dias, mora: round2(monto * TASA_MORA_DIARIA * dias) };
}

module.exports = { TASA_MORA_DIARIA, hoyISO, diasEntre, sumarDias, sumarMeses, round2, calcularMora, pad };
