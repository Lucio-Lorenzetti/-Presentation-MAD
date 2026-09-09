/**
 * Prueba mínima: ¿ARCA está arriba? ¿nuestro certificado es válido y nos deja autenticar?
 * Uso: npm run verificar-conexion
 */
const wsaa = require('../src/services/wsaa');
const wsfe = require('../src/services/wsfe');
const { config } = require('../src/config');

(async () => {
  console.log(`Ambiente: ${config.arca.production ? 'PRODUCCIÓN' : 'homologación'}`);

  console.log('\n1) Consultando estado de los servidores de ARCA (FEDummy)...');
  const dummy = await wsfe.dummy();
  console.log('   ', dummy);

  console.log('\n2) Pidiendo Token de acceso (WSAA) con el certificado configurado...');
  const auth = await wsaa.getAuth('wsfe', { force: true });
  console.log('    Token obtenido OK. Sign (primeros 30 caracteres):', auth.sign.slice(0, 30) + '...');

  console.log('\n✅ Todo listo: se puede facturar contra ARCA.');
})().catch(e => {
  console.error('\n❌ Falló la verificación:', e.message);
  process.exit(1);
});
