const express = require('express');
const agenda = require('../services/agendaService');
const { manejar } = require('../utils/validar');

const router = express.Router();

router.get('/', manejar((req, res) => res.json(agenda.proximosVencimientos())));

module.exports = router;
