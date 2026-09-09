/**
 * Genera el PDF de la factura, incluyendo el código QR obligatorio
 * (RG 4892/2020 de AFIP/ARCA) que enlaza a https://www.afip.gob.ar/fe/qr/
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { config } = require('../config');
const { CBTE_TIPO } = require('../utils/afipCodes');

const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'facturas');
fs.mkdirSync(STORAGE_DIR, { recursive: true });

const LETRA_POR_TIPO = {
  [CBTE_TIPO.FACTURA_A]: 'A',
  [CBTE_TIPO.FACTURA_B]: 'B',
  [CBTE_TIPO.FACTURA_C]: 'C',
};

async function buildQrDataUrl(factura) {
  const payload = {
    ver: 1,
    fecha: `${factura.fecha.slice(0, 4)}-${factura.fecha.slice(4, 6)}-${factura.fecha.slice(6, 8)}`,
    cuit: Number(config.arca.cuit),
    ptoVta: factura.ptoVta,
    tipoCmp: factura.cbteTipo,
    nroCmp: factura.numero,
    importe: factura.importeTotal,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: factura.receptorDocTipo,
    nroDocRec: Number(factura.receptorDocNro),
    tipoCodAut: 'E',
    codAut: Number(factura.cae),
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const url = `https://www.afip.gob.ar/fe/qr/?p=${b64}`;
  return QRCode.toDataURL(url, { margin: 1, width: 180 });
}

async function generarFacturaPdf(factura) {
  const filePath = path.join(STORAGE_DIR, `factura-${factura.id}.pdf`);
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const letra = LETRA_POR_TIPO[factura.cbteTipo] || '?';

  // Encabezado
  doc.rect(40, 40, 515, 90).stroke();
  doc.fontSize(16).text(config.emisor.razonSocial, 50, 50);
  doc.fontSize(9).text(config.emisor.domicilio, 50, 70);
  doc.fontSize(9).text(`CUIT: ${config.arca.cuit}`, 50, 84);
  doc.fontSize(9).text(
    `Condición IVA: ${config.emisor.condicionIva === 'RI' ? 'Responsable Inscripto' : 'Monotributo'}`,
    50, 98
  );

  doc.rect(420, 40, 30, 30).stroke();
  doc.fontSize(20).text(letra, 428, 46);
  doc.fontSize(8).text('COD. ' + factura.cbteTipo, 400, 74);

  doc.fontSize(12).text(`Factura ${letra}`, 400, 90);
  doc.fontSize(9).text(`N° ${String(factura.ptoVta).padStart(5, '0')}-${String(factura.numero).padStart(8, '0')}`, 400, 105);

  // Datos comprobante
  let y = 145;
  doc.fontSize(10).text(`Fecha de emisión: ${formatFecha(factura.fecha)}`, 40, y);
  y += 20;
  doc.text(`Cliente: ${factura.receptorRazonSocial || '-'}`, 40, y);
  y += 15;
  doc.text(`${docTipoLabel(factura.receptorDocTipo)}: ${factura.receptorDocNro}`, 40, y);
  y += 15;
  if (factura.periodoDesde && factura.periodoHasta) {
    doc.text(`Período facturado: ${formatFecha(factura.periodoDesde)} a ${formatFecha(factura.periodoHasta)}`, 40, y);
    y += 15;
  }
  y += 10;

  // Detalle
  doc.moveTo(40, y).lineTo(555, y).stroke();
  y += 8;
  doc.fontSize(9).text('Descripción', 40, y);
  doc.text('Importe', 480, y);
  y += 14;
  doc.moveTo(40, y).lineTo(555, y).stroke();
  y += 8;
  doc.fontSize(9).text(factura.descripcion || 'Honorarios por intermediación inmobiliaria', 40, y, { width: 400 });
  doc.text(`$ ${factura.importeNeto.toFixed(2)}`, 480, y);
  y += 30;

  doc.moveTo(320, y).lineTo(555, y).stroke();
  y += 8;
  if (factura.importeIva > 0) {
    doc.text('Neto gravado:', 320, y);
    doc.text(`$ ${factura.importeNeto.toFixed(2)}`, 480, y);
    y += 15;
    doc.text('IVA 21%:', 320, y);
    doc.text(`$ ${factura.importeIva.toFixed(2)}`, 480, y);
    y += 15;
  }
  doc.fontSize(11).text('TOTAL:', 320, y);
  doc.text(`$ ${factura.importeTotal.toFixed(2)}`, 480, y);
  y += 50;

  // CAE (columna izquierda) + QR de ARCA (columna derecha), a la misma altura
  const caeY = y;
  doc.fontSize(9).text(`CAE N°: ${factura.cae}`, 40, caeY, { width: 350 });
  doc.text(`Vencimiento CAE: ${formatFecha(factura.caeVencimiento)}`, 40, caeY + 14, { width: 350 });

  const qrDataUrl = await buildQrDataUrl(factura);
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  doc.image(qrBuffer, 460, caeY - 10, { width: 90, height: 90 });
  y = caeY + 90;

  const ambienteLabel = config.arca.production ? '' : 'COMPROBANTE DE PRUEBA — AMBIENTE DE HOMOLOGACIÓN ARCA, SIN VALIDEZ FISCAL';
  if (ambienteLabel) {
    doc.fontSize(8).fillColor('red').text(ambienteLabel, 40, 780, { width: 515, align: 'center' });
    doc.fillColor('black');
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return filePath;
}

function formatFecha(yyyymmdd) {
  if (!yyyymmdd) return '-';
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}

function docTipoLabel(docTipo) {
  if (docTipo === 80) return 'CUIT';
  if (docTipo === 86) return 'CUIL';
  if (docTipo === 96) return 'DNI';
  return 'Doc.';
}

module.exports = { generarFacturaPdf };
