const express = require('express');
const auth = require('../services/authService');
const { manejar } = require('../utils/validar');

const router = express.Router();

router.get('/', manejar((req, res) => res.json(auth.listarUsuarios())));

router.post('/', manejar((req, res) => {
  if (req.body.rol === 'DESARROLLADOR' && req.usuario.rol !== 'DESARROLLADOR') {
    return res.status(403).json({ error: 'Sólo un Desarrollador puede crear usuarios con ese rol.' });
  }
  res.status(201).json(auth.crearUsuario(req.body));
}));

router.put('/:id', manejar((req, res) => {
  const u = auth.actualizarUsuario(req.params.id, req.body, req.usuario);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(u);
}));

module.exports = router;
