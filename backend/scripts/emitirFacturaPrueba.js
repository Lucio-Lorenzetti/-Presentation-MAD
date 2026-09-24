/**
 * Emite una factura B de prueba en el ambiente de homologación, usando el
 * CUIT de prueba que ARCA documenta en sus manuales (20111111112).
 * Uso: npm run emitir-factura-prueba
 */
const db = require('../src/db');
const { emitirFacturaHonorarios } = require('../src/services/facturacionService');
const { config } = require('../src/config');

(async () => {
  if (config.arca.production) {
    console.error('⚠️  Este script es sólo para homologación. Poné ARCA_PRODUCTION=false antes de correrlo.');
    process.exit(1);
  }

  await db.inicializar();

  const factura = await emitirFacturaHonorarios({
    receptor: {
      docTipo: 'CUIT',
      docNro: 20111111112,
      razonSocial: 'Cliente de prueba',
      condicionIva: 'CONSUMIDOR_FINAL',
    },
    importeNeto: 50000,
    descripcion: 'Honorarios por intermediación en alquiler — mes de prueba',
    periodo: { desde: new Date().toISOString().slice(0, 10), hasta: new Date().toISOString().slice(0, 10) },
  });

  console.log('Resultado:', factura.resultado === 'A' ? '✅ APROBADA' : '❌ RECHAZADA');
  console.log(factura);
})().catch(e => {
  console.error('❌ Error al emitir factura de prueba:', e.message);
  process.exit(1);
});
