const express = require('express');
const cors = require('cors');
const { config } = require('./config');
const facturasRouter = require('./routes/facturas');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    ambiente: config.arca.production ? 'produccion' : 'homologacion',
  });
});

app.use('/api/facturas', facturasRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
});

app.listen(config.port, () => {
  console.log(`Facturación ARCA escuchando en http://localhost:${config.port}`);
  console.log(`Ambiente ARCA: ${config.arca.production ? 'PRODUCCIÓN' : 'homologación (testing)'}`);
});
