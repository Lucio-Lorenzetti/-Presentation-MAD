const { config } = require('../config');
const wsaa = require('./wsaa');
const wsfe = require('./wsfe');
const db = require('../db');
const { generarFacturaPdf } = require('./pdfService');
const {
  CBTE_TIPO,
  CONCEPTO,
  DOC_TIPO,
  CONDICION_IVA_RECEPTOR,
  ALICUOTA_IVA,
  resolverTipoComprobante,
} = require('../utils/afipCodes');

function hoyYYYYMMDD() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function toYYYYMMDD(dateStr) {
  // acepta 'YYYY-MM-DD' o ya 'YYYYMMDD'
  return dateStr.includes('-') ? dateStr.replace(/-/g, '') : dateStr;
}

/**
 * Emite una factura de honorarios (comisión de la inmobiliaria) contra ARCA.
 *
 * @param {Object} input
 * @param {Object} input.receptor - { docTipo: 'CUIT'|'DNI'|'CONSUMIDOR_FINAL', docNro, razonSocial, condicionIva: 'RESPONSABLE_INSCRIPTO'|'MONOTRIBUTO'|'CONSUMIDOR_FINAL'|'EXENTO' }
 * @param {number} input.importeNeto - importe de la comisión sin IVA (si el emisor es RI); si es Monotributo, es el importe total (no lleva IVA discriminado).
 * @param {string} [input.descripcion] - detalle que va impreso en la factura.
 * @param {Object} [input.periodo] - { desde: 'YYYY-MM-DD', hasta: 'YYYY-MM-DD' } — obligatorio para Concepto Servicios.
 * @param {string} [input.fchVtoPago] - 'YYYY-MM-DD'.
 */
async function emitirFacturaHonorarios(input) {
  const { receptor, importeNeto, descripcion, periodo, fchVtoPago } = input;

  if (!receptor || !receptor.docTipo || receptor.docNro === undefined) {
    throw new Error('Falta especificar el receptor (docTipo, docNro).');
  }
  if (!(importeNeto > 0)) {
    throw new Error('importeNeto debe ser un número mayor a 0.');
  }

  const docTipo = DOC_TIPO[receptor.docTipo];
  if (docTipo === undefined) {
    throw new Error(`docTipo inválido: ${receptor.docTipo}. Válidos: ${Object.keys(DOC_TIPO).join(', ')}`);
  }
  const condicionIvaReceptorId = CONDICION_IVA_RECEPTOR[receptor.condicionIva];
  if (condicionIvaReceptorId === undefined) {
    throw new Error(`condicionIva de receptor inválida: ${receptor.condicionIva}. Válidas: ${Object.keys(CONDICION_IVA_RECEPTOR).join(', ')}`);
  }

  const cbteTipo = resolverTipoComprobante(config.emisor.condicionIva, receptor.condicionIva);
  const emiteConIva = cbteTipo !== CBTE_TIPO.FACTURA_C;

  let impNeto, impIVA, impTotal, ivaArray;
  if (emiteConIva) {
    impNeto = round2(importeNeto);
    impIVA = round2(importeNeto * (ALICUOTA_IVA.IVA_21.porcentaje / 100));
    impTotal = round2(impNeto + impIVA);
    ivaArray = [{ id: ALICUOTA_IVA.IVA_21.id, baseImp: impNeto, importe: impIVA }];
  } else {
    impNeto = round2(importeNeto);
    impIVA = 0;
    impTotal = impNeto;
    ivaArray = [];
  }

  const auth = await wsaa.getAuth('wsfe');
  const ultimoNro = await wsfe.getUltimoComprobante(auth, cbteTipo, config.arca.ptoVta);
  const cbteNro = ultimoNro + 1;

  const detalle = {
    concepto: CONCEPTO.SERVICIOS,
    docTipo,
    docNro: docTipo === DOC_TIPO.CONSUMIDOR_FINAL ? 0 : receptor.docNro,
    cbteNro,
    cbteFch: hoyYYYYMMDD(),
    impTotal,
    impNeto,
    impIVA,
    fchServDesde: periodo ? toYYYYMMDD(periodo.desde) : hoyYYYYMMDD(),
    fchServHasta: periodo ? toYYYYMMDD(periodo.hasta) : hoyYYYYMMDD(),
    fchVtoPago: fchVtoPago ? toYYYYMMDD(fchVtoPago) : hoyYYYYMMDD(),
    condicionIvaReceptorId,
    iva: ivaArray,
  };

  const resultadoCae = await wsfe.solicitarCAE(auth, {
    ptoVta: config.arca.ptoVta,
    cbteTipo,
    detalle,
  });

  const registro = {
    ambiente: config.arca.production ? 'produccion' : 'homologacion',
    cbte_tipo: cbteTipo,
    pto_vta: config.arca.ptoVta,
    numero: cbteNro,
    fecha: detalle.cbteFch,
    concepto: detalle.concepto,
    receptor_doc_tipo: docTipo,
    receptor_doc_nro: String(detalle.docNro),
    receptor_razon_social: receptor.razonSocial || null,
    receptor_condicion_iva: receptor.condicionIva,
    descripcion: descripcion || 'Honorarios por intermediación inmobiliaria',
    periodo_desde: detalle.fchServDesde,
    periodo_hasta: detalle.fchServHasta,
    fch_vto_pago: detalle.fchVtoPago,
    importe_neto: impNeto,
    importe_iva: impIVA,
    importe_total: impTotal,
    resultado: resultadoCae.resultado,
    cae: resultadoCae.cae,
    cae_vencimiento: resultadoCae.caeVencimiento,
    observaciones: JSON.stringify([...resultadoCae.observaciones, ...resultadoCae.errores]),
  };

  const columnas = Object.keys(registro);
  const info = await db.prepare(`
    INSERT INTO facturas (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})
  `).run(...columnas.map(c => registro[c] ?? null));
  const id = info.lastInsertRowid;

  let pdfPath = null;
  if (resultadoCae.resultado === 'A' && resultadoCae.cae) {
    pdfPath = await generarFacturaPdf({
      id,
      cbteTipo,
      ptoVta: config.arca.ptoVta,
      numero: cbteNro,
      fecha: detalle.cbteFch,
      receptorRazonSocial: receptor.razonSocial,
      receptorDocTipo: docTipo,
      receptorDocNro: detalle.docNro,
      periodoDesde: detalle.fchServDesde,
      periodoHasta: detalle.fchServHasta,
      descripcion: registro.descripcion,
      importeNeto: impNeto,
      importeIva: impIVA,
      importeTotal: impTotal,
      cae: resultadoCae.cae,
      caeVencimiento: resultadoCae.caeVencimiento,
    });
    await db.prepare('UPDATE facturas SET pdf_path = ? WHERE id = ?').run(pdfPath, id);
  }

  return { id, ...registro, pdf_path: pdfPath };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function listarFacturas({ limit = 50, offset = 0 } = {}) {
  return db.prepare('SELECT * FROM facturas ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);
}

async function obtenerFactura(id) {
  return db.prepare('SELECT * FROM facturas WHERE id = ?').get(id);
}

module.exports = { emitirFacturaHonorarios, listarFacturas, obtenerFactura };
