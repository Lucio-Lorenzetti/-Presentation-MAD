const express = require('express');
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

// Registra el pago de una cuota (calcula la mora automáticamente): { fecha?, metodo?, notas? }
router.post('/cuotas/:cuotaId/pagos', manejar((req, res) => {
  const p = contratos.registrarPago(req.params.cuotaId, req.body);
  if (!p) return res.status(404).json({ error: 'Cuota no encontrada' });
  res.status(201).json(p);
}));

module.exports = router;
