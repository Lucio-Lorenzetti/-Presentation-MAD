const express = require('express');
const estadisticas = require('../services/estadisticasService');
const { manejar } = require('../utils/validar');

const router = express.Router();

router.get('/', manejar((req, res) => res.json(estadisticas.panel())));

module.exports = router;
