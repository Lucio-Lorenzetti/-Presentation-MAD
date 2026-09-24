const express = require('express');
const propiedades = require('../services/propiedadesService');
const { manejar } = require('../utils/validar');

const router = express.Router();

router.get('/resumen', manejar(async (req, res) => res.json(await propiedades.resumen())));

router.get('/', manejar(async (req, res) => {
  const { tipo, estado, q, propietarioId } = req.query;
  res.json(await propiedades.listar({
    tipo: tipo ? String(tipo).toUpperCase() : undefined,
    estado: estado ? String(estado).toUpperCase() : undefined,
    q,
    propietarioId,
  }));
}));

router.post('/', manejar(async (req, res) => res.status(201).json(await propiedades.crear(req.body))));

router.get('/:id', manejar(async (req, res) => {
  const p = await propiedades.obtener(req.params.id);
  if (!p) return res.status(404).json({ error: 'Propiedad no encontrada' });
  res.json(p);
}));

router.put('/:id', manejar(async (req, res) => {
  const p = await propiedades.actualizar(req.params.id, req.body);
  if (!p) return res.status(404).json({ error: 'Propiedad no encontrada' });
  res.json(p);
}));

router.delete('/:id', manejar(async (req, res) => {
  if (!(await propiedades.eliminar(req.params.id))) return res.status(404).json({ error: 'Propiedad no encontrada' });
  res.status(204).end();
}));

module.exports = router;
