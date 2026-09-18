class ErrorValidacion extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Normaliza '' / undefined a null (node:sqlite no acepta undefined).
const nn = v => (v === undefined || v === '' ? null : v);

function requerir(obj, campos) {
  for (const c of campos) {
    if (obj[c] === undefined || obj[c] === null || obj[c] === '') {
      throw new ErrorValidacion(`Falta el campo obligatorio: ${c}`);
    }
  }
}

function enumerado(valor, validos, nombre) {
  if (!validos.includes(valor)) {
    throw new ErrorValidacion(`${nombre} inválido: ${valor}. Válidos: ${validos.join(', ')}`);
  }
  return valor;
}

const esFechaISO = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// Envuelve un handler para mapear ErrorValidacion → status HTTP.
const manejar = fn => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (e instanceof ErrorValidacion) return res.status(e.status).json({ error: e.message });
    next(e);
  }
};

module.exports = { ErrorValidacion, nn, requerir, enumerado, esFechaISO, manejar };
