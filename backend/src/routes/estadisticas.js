const express = require('express');
const estadisticas = require('../services/estadisticasService');
const { manejar } = require('../utils/validar');

const router = express.Router();

router.get('/', manejar(async (req, res) => res.json(await estadisticas.panel())));

module.exports = router;
