const express = require('express');
const propiedades = require('../services/propiedadesService');
const { manejar } = require('../utils/validar');

const router = express.Router();

router.get('/resumen', manejar((req, res) => res.json(propiedades.resumen())));

router.get('/', manejar((req, res) => {
  const { tipo, estado, q, propietarioId } = req.query;
  res.json(propiedades.listar({
    tipo: tipo ? String(tipo).toUpperCase() : undefined,
    estado: estado ? String(estado).toUpperCase() : undefined,
    q,
    propietarioId,
  }));
}));

router.post('/', manejar((req, res) => res.status(201).json(propiedades.crear(req.body))));

router.get('/:id', manejar((req, res) => {
  const p = propiedades.obtener(req.params.id);
  if (!p) return res.status(404).json({ error: 'Propiedad no encontrada' });
  res.json(p);
}));

router.put('/:id', manejar((req, res) => {
  const p = propiedades.actualizar(req.params.id, req.body);
  if (!p) return res.status(404).json({ error: 'Propiedad no encontrada' });
  res.json(p);
}));

router.delete('/:id', manejar((req, res) => {
  if (!propiedades.eliminar(req.params.id)) return res.status(404).json({ error: 'Propiedad no encontrada' });
  res.status(204).end();
}));

module.exports = router;
