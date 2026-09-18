const express = require('express');
const personas = require('../services/personasService');
const { manejar } = require('../utils/validar');

const router = express.Router();

router.get('/', manejar((req, res) => {
  const { tipo, q, listaNegra } = req.query;
  res.json(personas.listar({
    tipo: tipo ? String(tipo).toUpperCase() : undefined,
    q,
    listaNegra: listaNegra === undefined ? undefined : listaNegra === 'true',
  }));
}));

router.post('/', manejar((req, res) => res.status(201).json(personas.crear(req.body))));

router.get('/:id', manejar((req, res) => {
  const p = personas.obtener(req.params.id);
  if (!p) return res.status(404).json({ error: 'Persona no encontrada' });
  res.json(p);
}));

router.put('/:id', manejar((req, res) => {
  const p = personas.actualizar(req.params.id, req.body);
  if (!p) return res.status(404).json({ error: 'Persona no encontrada' });
  res.json(p);
}));

router.delete('/:id', manejar((req, res) => {
  if (!personas.eliminar(req.params.id)) return res.status(404).json({ error: 'Persona no encontrada' });
  res.status(204).end();
}));

router.post('/:id/garantes', manejar((req, res) => {
  if (!personas.obtener(req.params.id)) return res.status(404).json({ error: 'Persona no encontrada' });
  personas.agregarGarante(req.params.id, req.body);
  res.status(201).json(personas.obtener(req.params.id));
}));

router.delete('/:id/garantes/:garanteId', manejar((req, res) => {
  if (!personas.eliminarGarante(req.params.id, req.params.garanteId)) return res.status(404).json({ error: 'Garante no encontrado' });
  res.json(personas.obtener(req.params.id));
}));

module.exports = router;
