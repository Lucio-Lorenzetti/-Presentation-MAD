const express = require('express');
const auth = require('../services/authService');
const { autenticar } = require('../middleware/auth');
const { manejar } = require('../utils/validar');

const router = express.Router();

router.post('/login', manejar((req, res) => {
  res.json(auth.login(req.body.email, req.body.password, req.ip));
}));

router.get('/me', autenticar, (req, res) => res.json(req.usuario));

router.post('/password', autenticar, manejar((req, res) => {
  auth.cambiarPassword(req.usuario.id, req.body.actual, req.body.nueva);
  res.status(204).end();
}));

module.exports = router;
