require('dotenv').config();
const fs = require('fs');
const path = require('path');

function bool(v, def = false) {
  if (v === undefined) return def;
  return String(v).toLowerCase() === 'true';
}

const config = {
  port: Number(process.env.PORT || 3001),

  database: {
    url: process.env.DATABASE_URL || '',
    ssl: bool(process.env.DATABASE_SSL, true),
  },

  arca: {
    production: bool(process.env.ARCA_PRODUCTION, false),
    cuit: process.env.ARCA_CUIT || '',
    ptoVta: Number(process.env.ARCA_PTO_VENTA || 1),
    certPath: path.resolve(process.cwd(), process.env.ARCA_CERT_PATH || './certs/cert.pem'),
    keyPath: path.resolve(process.cwd(), process.env.ARCA_KEY_PATH || './certs/private.key'),
  },

  emisor: {
    condicionIva: (process.env.EMISOR_CONDICION_IVA || 'RI').toUpperCase(), // RI | MONOTRIBUTO
    razonSocial: process.env.EMISOR_RAZON_SOCIAL || 'Inmobiliaria',
    domicilio: process.env.EMISOR_DOMICILIO || '',
  },
};

/**
 * Lee cert/key recién en el momento de usarlos (no al bootear el server),
 * para poder levantar la API y ver /api/health aunque todavía no tengas
 * el certificado de ARCA cargado.
 */
function readCredentials() {
  if (!config.arca.cuit) {
    throw new Error('Falta ARCA_CUIT en el .env');
  }
  if (!fs.existsSync(config.arca.certPath)) {
    throw new Error(
      `No se encontró el certificado de ARCA en ${config.arca.certPath}. ` +
      `Ver backend/README.md → "Cómo obtener el certificado de ARCA".`
    );
  }
  if (!fs.existsSync(config.arca.keyPath)) {
    throw new Error(
      `No se encontró la clave privada de ARCA en ${config.arca.keyPath}. ` +
      `Ver backend/README.md → "Cómo obtener el certificado de ARCA".`
    );
  }
  return {
    cert: fs.readFileSync(config.arca.certPath, 'utf8'),
    key: fs.readFileSync(config.arca.keyPath, 'utf8'),
  };
}

module.exports = { config, readCredentials };
