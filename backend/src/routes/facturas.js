const express = require('express');
const fs = require('fs');
const facturacionService = require('../services/facturacionService');
const wsaa = require('../services/wsaa');
const wsfe = require('../services/wsfe');
const { manejar } = require('../utils/validar');

const router = express.Router();

router.get('/estado-arca', async (req, res) => {
  try {
    const dummy = await wsfe.dummy();
    let auth = null;
    let authError = null;
    try {
      auth = await wsaa.getAuth('wsfe');
    } catch (e) {
      authError = e.message;
    }
    res.json({
      arcaOnline: dummy,
      autenticado: !!auth,
      errorAutenticacion: authError,
    });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const factura = await facturacionService.emitirFacturaHonorarios(req.body);
    const status = factura.resultado === 'A' ? 201 : 422;
    res.status(status).json(factura);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/', manejar(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  res.json(await facturacionService.listarFacturas({ limit, offset }));
}));

router.get('/:id', manejar(async (req, res) => {
  const factura = await facturacionService.obtenerFactura(req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json(factura);
}));

router.get('/:id/pdf', manejar(async (req, res) => {
  const factura = await facturacionService.obtenerFactura(req.params.id);
  if (!factura || !factura.pdf_path) return res.status(404).json({ error: 'PDF no disponible' });
  if (!fs.existsSync(factura.pdf_path)) return res.status(404).json({ error: 'El archivo PDF ya no existe en disco' });
  res.setHeader('Content-Type', 'application/pdf');
  fs.createReadStream(factura.pdf_path).pipe(res);
}));

module.exports = router;
