// Ubica en el mapa las propiedades que se cargaron antes de tener geocodificación
// automática (o que quedaron sin resultado). Respeta ~1 request/seg (política de Nominatim).
// Uso: npm run geocodificar-propiedades
const db = require('../src/db');
const { geocodificar } = require('../src/services/geocodingService');

const esperar = ms => new Promise(r => setTimeout(r, ms));
const forzarTodas = process.argv.includes('--todas');

(async () => {
  await db.inicializar();

  const pendientes = await db.prepare(
    forzarTodas
      ? 'SELECT id, direccion, barrio FROM propiedades WHERE deleted_at IS NULL'
      : "SELECT id, direccion, barrio FROM propiedades WHERE deleted_at IS NULL AND (lat IS NULL OR geocoding_estado NOT IN ('OK', 'APROXIMADO'))"
  ).all();

  if (pendientes.length === 0) {
    console.log('No hay propiedades pendientes de geocodificar.');
    process.exit(0);
  }

  console.log(`Geocodificando ${pendientes.length} propiedad(es)...`);
  for (const p of pendientes) {
    const geo = await geocodificar(p.direccion, p.barrio);
    await db.prepare('UPDATE propiedades SET lat = ?, lng = ?, geocoding_estado = ? WHERE id = ?')
      .run(geo.lat, geo.lng, geo.geocodingEstado, p.id);
    const icono = geo.geocodingEstado === 'OK' ? '✅' : geo.geocodingEstado === 'APROXIMADO' ? '〰️' : '⚠️ ';
    console.log(`  ${icono} ${p.direccion} → ${geo.geocodingEstado}${geo.lat ? ` (${geo.lat}, ${geo.lng})` : ''}`);
    await esperar(1100); // Nominatim: máx. ~1 req/seg
  }
  console.log('Listo.');
  process.exit(0);
})();
