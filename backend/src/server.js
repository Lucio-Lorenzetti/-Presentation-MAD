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

app.use('/api/auth', require('./routes/auth'));

// Todo lo que sigue requiere sesión y se filtra por rol (ver middleware/auth.js).
const { autenticar, autorizar } = require('./middleware/auth');
app.use('/api/facturas', autenticar, autorizar, facturasRouter);
app.use('/api/usuarios', autenticar, autorizar, require('./routes/usuarios'));
app.use('/api/personas', autenticar, autorizar, require('./routes/personas'));
app.use('/api/propiedades', autenticar, autorizar, require('./routes/propiedades'));
app.use('/api/contratos', autenticar, autorizar, require('./routes/contratos'));
app.use('/api/estadisticas', autenticar, autorizar, require('./routes/estadisticas'));
app.use('/api/agenda', autenticar, autorizar, require('./routes/agenda'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
});

require('./services/authService').asegurarAdminInicial();

app.listen(config.port, () => {
  console.log(`Facturación ARCA escuchando en http://localhost:${config.port}`);
  console.log(`Ambiente ARCA: ${config.arca.production ? 'PRODUCCIÓN' : 'homologación (testing)'}`);
});
