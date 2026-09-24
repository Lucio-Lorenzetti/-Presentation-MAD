const express = require('express');
const personas = require('../services/personasService');
const { manejar } = require('../utils/validar');

const router = express.Router();

router.get('/', manejar(async (req, res) => {
  const { tipo, q, listaNegra } = req.query;
  res.json(await personas.listar({
    tipo: tipo ? String(tipo).toUpperCase() : undefined,
    q,
    listaNegra: listaNegra === undefined ? undefined : listaNegra === 'true',
  }));
}));

router.post('/', manejar(async (req, res) => res.status(201).json(await personas.crear(req.body))));

router.get('/:id', manejar(async (req, res) => {
  const p = await personas.obtener(req.params.id);
  if (!p) return res.status(404).json({ error: 'Persona no encontrada' });
  res.json(p);
}));

router.put('/:id', manejar(async (req, res) => {
  const p = await personas.actualizar(req.params.id, req.body);
  if (!p) return res.status(404).json({ error: 'Persona no encontrada' });
  res.json(p);
}));

router.delete('/:id', manejar(async (req, res) => {
  if (!(await personas.eliminar(req.params.id))) return res.status(404).json({ error: 'Persona no encontrada' });
  res.status(204).end();
}));

router.post('/:id/garantes', manejar(async (req, res) => {
  if (!(await personas.obtener(req.params.id))) return res.status(404).json({ error: 'Persona no encontrada' });
  await personas.agregarGarante(req.params.id, req.body);
  res.status(201).json(await personas.obtener(req.params.id));
}));

router.delete('/:id/garantes/:garanteId', manejar(async (req, res) => {
  if (!(await personas.eliminarGarante(req.params.id, req.params.garanteId))) return res.status(404).json({ error: 'Garante no encontrado' });
  res.json(await personas.obtener(req.params.id));
}));

module.exports = router;
