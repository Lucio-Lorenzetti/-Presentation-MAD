const express = require('express');
const fs = require('fs');
const contratos = require('../services/contratosService');
const { manejar } = require('../utils/validar');

const router = express.Router();

router.get('/resumen', manejar((req, res) => res.json(contratos.resumen())));

router.get('/', manejar((req, res) => {
  const { estado, q } = req.query;
  res.json(contratos.listar({ estado: estado ? String(estado).toUpperCase() : undefined, q }));
}));

router.post('/', manejar((req, res) => res.status(201).json(contratos.crear(req.body))));

router.get('/:id', manejar((req, res) => {
  const c = contratos.obtener(req.params.id);
  if (!c) return res.status(404).json({ error: 'Contrato no encontrado' });
  res.json(c);
}));

// Aplica un ajuste por IPC/ICL: { porcentaje }
router.post('/:id/ajustes', manejar((req, res) => {
  const c = contratos.aplicarAjuste(req.params.id, req.body);
  if (!c) return res.status(404).json({ error: 'Contrato no encontrado' });
  res.json(c);
}));

// Finaliza o rescinde: { estado: 'FINALIZADO' | 'RESCINDIDO' }
router.post('/:id/cierre', manejar((req, res) => {
  const c = contratos.cambiarEstado(req.params.id, req.body.estado);
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
router.get('/cuotas/pagos/:pagoId/recibo.pdf', manejar((req, res) => {
  const pago = contratos.obtenerPago(req.params.pagoId);
  if (!pago || !pago.pdf_path) return res.status(404).json({ error: 'Recibo no disponible' });
  if (!fs.existsSync(pago.pdf_path)) return res.status(404).json({ error: 'El archivo PDF ya no existe en disco' });
  res.setHeader('Content-Type', 'application/pdf');
  fs.createReadStream(pago.pdf_path).pipe(res);
}));

module.exports = router;
