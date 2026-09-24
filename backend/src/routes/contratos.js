const express = require('express');
const fs = require('fs');
const multer = require('multer');
const contratos = require('../services/contratosService');
const { generarFichaContratoPdf } = require('../services/pdfService');
const indices = require('../services/indicesService');
const { manejar, ErrorValidacion } = require('../utils/validar');
const { sumarMeses, hoyISO } = require('../utils/fechas');

const router = express.Router();

const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const uploadComprobante = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } }).single('comprobante');

router.get('/resumen', manejar(async (req, res) => res.json(await contratos.resumen())));

router.get('/', manejar(async (req, res) => {
  const { estado, q } = req.query;
  res.json(await contratos.listar({ estado: estado ? String(estado).toUpperCase() : undefined, q }));
}));

router.post('/', manejar(async (req, res) => res.status(201).json(await contratos.crear(req.body))));

router.get('/:id', manejar(async (req, res) => {
  const c = await contratos.obtener(req.params.id);
  if (!c) return res.status(404).json({ error: 'Contrato no encontrado' });
  res.json(c);
}));

// Ficha resumen del contrato en PDF (documento de gestión interna, no legal).
router.get('/:id/ficha.pdf', manejar(async (req, res) => {
  const ficha = await contratos.fichaParaPdf(req.params.id);
  if (!ficha) return res.status(404).json({ error: 'Contrato no encontrado' });
  res.setHeader('Content-Type', 'application/pdf');
  generarFichaContratoPdf(ficha, res);
}));

// Sugiere el % de ajuste según el índice oficial del BCRA (ICL o IPC), desde
// el último ajuste (o el inicio del contrato) hasta hoy. No aplica nada.
router.get('/:id/sugerencia-ajuste', manejar(async (req, res) => {
  const c = await contratos.obtener(req.params.id);
  if (!c) return res.status(404).json({ error: 'Contrato no encontrado' });
  if (c.indice === 'NINGUNO') return res.status(400).json({ error: 'El contrato no tiene índice de actualización.' });
  const hoy = hoyISO();
  const base = c.proxima_actualizacion || c.fecha_inicio;
  const desde = c.proxima_actualizacion ? sumarMeses(base, -c.periodicidad_meses) : base;
  try {
    const sugerencia = await indices.sugerirAjuste({ indice: c.indice, desde, hasta: hoy });
    res.json(sugerencia);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}));

// Aplica un ajuste por IPC/ICL: { porcentaje }
router.post('/:id/ajustes', manejar(async (req, res) => {
  const c = await contratos.aplicarAjuste(req.params.id, req.body);
  if (!c) return res.status(404).json({ error: 'Contrato no encontrado' });
  res.json(c);
}));

// Finaliza o rescinde: { estado: 'FINALIZADO' | 'RESCINDIDO' }
router.post('/:id/cierre', manejar(async (req, res) => {
  const c = await contratos.cambiarEstado(req.params.id, req.body.estado);
  if (!c) return res.status(404).json({ error: 'Contrato no encontrado' });
  res.json(c);
}));

// Registra el pago de una cuota (calcula la mora automáticamente y genera el recibo en PDF): { fecha?, metodo?, notas? }
router.post('/cuotas/:cuotaId/pagos', manejar(async (req, res) => {
  const p = await contratos.registrarPago(req.params.cuotaId, req.body);
  if (!p) return res.status(404).json({ error: 'Cuota no encontrada' });
  res.status(201).json(p);
}));

// Descarga el recibo (PDF) de un pago ya registrado.
router.get('/cuotas/pagos/:pagoId/recibo.pdf', manejar(async (req, res) => {
  const pago = await contratos.obtenerPago(req.params.pagoId);
  if (!pago || !pago.pdf_path) return res.status(404).json({ error: 'Recibo no disponible' });
  if (!fs.existsSync(pago.pdf_path)) return res.status(404).json({ error: 'El archivo PDF ya no existe en disco' });
  res.setHeader('Content-Type', 'application/pdf');
  fs.createReadStream(pago.pdf_path).pipe(res);
}));

// Sube (o reemplaza) el comprobante que el inquilino mandó por WhatsApp al transferir: campo "comprobante" (JPG/PNG/WEBP/PDF, hasta 8 MB).
router.post('/cuotas/pagos/:pagoId/comprobante', manejar(async (req, res) => {
  await new Promise((resolve, reject) => uploadComprobante(req, res, err => (err ? reject(err) : resolve())))
    .catch(e => { throw new ErrorValidacion(e.code === 'LIMIT_FILE_SIZE' ? 'El archivo no puede superar los 8 MB.' : 'No se pudo procesar el archivo.'); });
  if (!req.file) throw new ErrorValidacion('Subí un archivo (comprobante).');
  if (!TIPOS_COMPROBANTE.includes(req.file.mimetype)) throw new ErrorValidacion('Formato no permitido: usá JPG, PNG, WEBP o PDF.');
  const pago = await contratos.guardarComprobante(req.params.pagoId, req.file);
  if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });
  res.json(pago);
}));

// Muestra/descarga el comprobante ya cargado de un pago.
router.get('/cuotas/pagos/:pagoId/comprobante', manejar(async (req, res) => {
  const pago = await contratos.obtenerPago(req.params.pagoId);
  if (!pago || !pago.comprobante_path) return res.status(404).json({ error: 'Comprobante no disponible' });
  if (!fs.existsSync(pago.comprobante_path)) return res.status(404).json({ error: 'El archivo ya no existe en disco' });
  res.setHeader('Content-Type', pago.comprobante_mime || 'application/octet-stream');
  fs.createReadStream(pago.comprobante_path).pipe(res);
}));

module.exports = router;
