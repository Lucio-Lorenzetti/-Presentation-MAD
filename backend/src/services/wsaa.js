/**
 * Cliente del WSAA (Web Service de Autenticación y Autorización) de ARCA.
 *
 * Flujo (ver "Especificación Técnica WSAA" de ARCA):
 *  1. Armar un "Ticket de Requerimiento de Acceso" (TRA) en XML.
 *  2. Firmarlo con el certificado + clave privada del contribuyente,
 *     usando CMS/PKCS#7 (equivalente a `openssl smime -sign`).
 *  3. Enviar el CMS en base64 al método loginCms del WSAA.
 *  4. ARCA devuelve un Token + Sign válidos por 12hs, para ese "service"
 *     (en nuestro caso "wsfe").
 *
 * El Token/Sign se cachean en memoria y en disco (.wsaa-cache) para no pedir
 * uno nuevo en cada request — ARCA rechaza pedidos de TA demasiado seguidos.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const forge = require('node-forge');
const { parseStringPromise } = require('xml2js');
const { config, readCredentials } = require('../config');

const WSAA_URL = {
  homologacion: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  produccion: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
};

const CACHE_DIR = path.resolve(process.cwd(), '.wsaa-cache');

function cacheFile(service) {
  const env = config.arca.production ? 'prod' : 'homo';
  return path.join(CACHE_DIR, `${service}-${env}.json`);
}

function readCache(service) {
  try {
    const raw = fs.readFileSync(cacheFile(service), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(service, data) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cacheFile(service), JSON.stringify(data, null, 2));
}

// xml2js a veces devuelve { _: 'texto', $: {...atributos} } cuando el nodo tiene
// namespaces inline (como <faultcode xmlns:ns1="...">ns1:algo</faultcode>).
function textOf(v) {
  if (v && typeof v === 'object') return v._ ?? JSON.stringify(v);
  return v;
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function isoOffset(d) {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' +
    pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) +
    sign + pad(Math.floor(abs / 60)) + ':' + pad(abs % 60)
  );
}

function buildTRA(service) {
  const now = new Date();
  const from = new Date(now.getTime() - 60 * 1000);
  const to = new Date(now.getTime() + 10 * 60 * 1000);
  const uniqueId = Math.floor(now.getTime() / 1000);

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${isoOffset(from)}</generationTime>
    <expirationTime>${isoOffset(to)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

function signTRA(traXml, certPem, keyPem) {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(traXml, 'utf8');
  p7.addCertificate(certPem);
  p7.addSigner({
    key: keyPem,
    certificate: certPem,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign({ detached: false });
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.encode64(der);
}

async function callLoginCms(cms) {
  const url = config.arca.production ? WSAA_URL.produccion : WSAA_URL.homologacion;
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await axios.post(url, envelope, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
    validateStatus: () => true,
    timeout: 20000,
  });

  const parsed = await parseStringPromise(res.data, { explicitArray: false, tagNameProcessors: [n => n.replace(/^\w+:/, '')] });
  const body = parsed?.Envelope?.Body;

  if (body?.Fault) {
    throw new Error(`ARCA WSAA rechazó el login: [${textOf(body.Fault.faultcode)}] ${textOf(body.Fault.faultstring)}`);
  }

  const loginReturn = body?.loginCmsResponse?.loginCmsReturn;
  if (!loginReturn) {
    throw new Error('Respuesta de WSAA inesperada: ' + JSON.stringify(parsed));
  }

  const loginTicket = await parseStringPromise(loginReturn, { explicitArray: false });
  return loginTicket.loginTicketResponse;
}

/**
 * Devuelve { token, sign, expirationTime } para el servicio pedido
 * ("wsfe" para facturación electrónica), pidiendo uno nuevo a ARCA sólo
 * si no hay uno cacheado vigente.
 */
async function getAuth(service = 'wsfe', { force = false } = {}) {
  if (!force) {
    const cached = readCache(service);
    if (cached && new Date(cached.expirationTime).getTime() - Date.now() > 5 * 60 * 1000) {
      return { token: cached.token, sign: cached.sign };
    }
  }

  const { cert, key } = readCredentials();
  const tra = buildTRA(service);
  const cms = signTRA(tra, cert, key);
  const ticket = await callLoginCms(cms);

  const result = {
    token: ticket.credentials.token,
    sign: ticket.credentials.sign,
    expirationTime: ticket.header.expirationTime,
  };
  writeCache(service, result);
  return { token: result.token, sign: result.sign };
}

module.exports = { getAuth, buildTRA, signTRA };
