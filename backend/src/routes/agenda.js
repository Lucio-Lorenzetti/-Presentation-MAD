const express = require('express');
const agenda = require('../services/agendaService');
const { manejar } = require('../utils/validar');

const router = express.Router();

router.get('/', manejar(async (req, res) => res.json(await agenda.proximosVencimientos())));

module.exports = router;
