/**
 * Cliente del WSFEv1 (Facturación Electrónica) de ARCA.
 *
 * Namespace y nombres de operación tomados del WSDL público real:
 *   https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL  (homologación)
 *   https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL (producción)
 */

const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { config } = require('../config');

const WSFE_URL = {
  homologacion: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  produccion: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
};

const NS = 'http://ar.gov.afip.dif.FEV1/';

function endpoint() {
  return config.arca.production ? WSFE_URL.produccion : WSFE_URL.homologacion;
}

function soapEnvelope(method, innerXml) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method} xmlns="${NS}">
${innerXml}
    </${method}>
  </soap:Body>
</soap:Envelope>`;
}

function authXml(auth) {
  return `      <Auth>
        <Token>${escapeXml(auth.token)}</Token>
        <Sign>${escapeXml(auth.sign)}</Sign>
        <Cuit>${config.arca.cuit}</Cuit>
      </Auth>`;
}

function textOf(v) {
  if (v && typeof v === 'object') return v._ ?? JSON.stringify(v);
  return v;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function call(method, innerXml) {
  const body = soapEnvelope(method, innerXml);
  const res = await axios.post(endpoint(), body, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: `${NS}${method}`,
    },
    validateStatus: () => true,
    timeout: 20000,
  });

  const parsed = await parseStringPromise(res.data, {
    explicitArray: false,
    tagNameProcessors: [n => n.replace(/^\w+:/, '')],
  });

  const bodyParsed = parsed?.Envelope?.Body;
  if (bodyParsed?.Fault) {
    throw new Error(`ARCA WSFE rechazó la operación ${method}: [${textOf(bodyParsed.Fault.faultcode)}] ${textOf(bodyParsed.Fault.faultstring)}`);
  }
  return bodyParsed?.[`${method}Response`]?.[`${method}Result`];
}

/** Chequeo de salud de los servidores de ARCA (no requiere Auth). */
async function dummy() {
  return call('FEDummy', '');
}

/** Devuelve el último número de comprobante autorizado para un punto de venta + tipo. */
async function getUltimoComprobante(auth, cbteTipo, ptoVta = config.arca.ptoVta) {
  const inner = `${authXml(auth)}
      <PtoVta>${ptoVta}</PtoVta>
      <CbteTipo>${cbteTipo}</CbteTipo>`;
  const result = await call('FECompUltimoAutorizado', inner);
  checkErrors(result);
  return Number(result.CbteNro);
}

function ivaArrayXml(ivaItems) {
  if (!ivaItems || ivaItems.length === 0) return '';
  return `        <Iva>
${ivaItems.map(i => `          <AlicIva>
            <Id>${i.id}</Id>
            <BaseImp>${i.baseImp.toFixed(2)}</BaseImp>
            <Importe>${i.importe.toFixed(2)}</Importe>
          </AlicIva>`).join('\n')}
        </Iva>`;
}

/**
 * Solicita el CAE para UN comprobante (CantReg = 1).
 * `detalle` ya viene resuelto (tipo de comprobante, importes, receptor, etc.)
 * desde facturacionService — este módulo sólo arma el XML y lo envía.
 */
async function solicitarCAE(auth, { ptoVta, cbteTipo, detalle }) {
  const inner = `${authXml(auth)}
      <FeCAEReq>
        <FeCabReq>
          <CantReg>1</CantReg>
          <PtoVta>${ptoVta}</PtoVta>
          <CbteTipo>${cbteTipo}</CbteTipo>
        </FeCabReq>
        <FeDetReq>
          <FECAEDetRequest>
            <Concepto>${detalle.concepto}</Concepto>
            <DocTipo>${detalle.docTipo}</DocTipo>
            <DocNro>${detalle.docNro}</DocNro>
            <CbteDesde>${detalle.cbteNro}</CbteDesde>
            <CbteHasta>${detalle.cbteNro}</CbteHasta>
            <CbteFch>${detalle.cbteFch}</CbteFch>
            <ImpTotal>${detalle.impTotal.toFixed(2)}</ImpTotal>
            <ImpTotConc>0.00</ImpTotConc>
            <ImpNeto>${detalle.impNeto.toFixed(2)}</ImpNeto>
            <ImpOpEx>0.00</ImpOpEx>
            <ImpTrib>0.00</ImpTrib>
            <ImpIVA>${detalle.impIVA.toFixed(2)}</ImpIVA>
            ${detalle.fchServDesde ? `<FchServDesde>${detalle.fchServDesde}</FchServDesde>` : ''}
            ${detalle.fchServHasta ? `<FchServHasta>${detalle.fchServHasta}</FchServHasta>` : ''}
            ${detalle.fchVtoPago ? `<FchVtoPago>${detalle.fchVtoPago}</FchVtoPago>` : ''}
            <MonId>PES</MonId>
            <MonCotiz>1</MonCotiz>
            <CondicionIVAReceptorId>${detalle.condicionIvaReceptorId}</CondicionIVAReceptorId>
${ivaArrayXml(detalle.iva)}
          </FECAEDetRequest>
        </FeDetReq>
      </FeCAEReq>`;

  const result = await call('FECAESolicitar', inner);
  return normalizeCAEResult(result);
}

function normalizeCAEResult(result) {
  const cab = result?.FeCabResp;
  let det = result?.FeDetResp?.FECAEDetResponse;
  if (Array.isArray(det)) det = det[0];

  const observaciones = toArray(det?.Observaciones?.Obs).map(o => ({ code: o.Code, msg: o.Msg }));
  const errores = toArray(result?.Errors?.Err).map(e => ({ code: e.Code, msg: e.Msg }));

  return {
    resultado: cab?.Resultado, // 'A' aprobado | 'R' rechazado
    cae: det?.CAE || null,
    caeVencimiento: det?.CAEFchVto || null,
    observaciones,
    errores,
    crudo: result,
  };
}

function toArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function checkErrors(result) {
  const errores = toArray(result?.Errors?.Err);
  if (errores.length) {
    throw new Error('ARCA devolvió errores: ' + errores.map(e => `[${e.Code}] ${e.Msg}`).join('; '));
  }
}

module.exports = { dummy, getUltimoComprobante, solicitarCAE };
