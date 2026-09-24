const express = require('express');
const auth = require('../services/authService');
const { manejar } = require('../utils/validar');

const router = express.Router();

router.get('/', manejar(async (req, res) => res.json(await auth.listarUsuarios())));

router.post('/', manejar(async (req, res) => {
  if (req.body.rol === 'DESARROLLADOR' && req.usuario.rol !== 'DESARROLLADOR') {
    return res.status(403).json({ error: 'Sólo un Desarrollador puede crear usuarios con ese rol.' });
  }
  res.status(201).json(await auth.crearUsuario(req.body));
}));

router.put('/:id', manejar(async (req, res) => {
  const u = await auth.actualizarUsuario(req.params.id, req.body, req.usuario);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(u);
}));

module.exports = router;
