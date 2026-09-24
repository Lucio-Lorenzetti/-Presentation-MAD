// Convierte la dirección de una propiedad en coordenadas (lat/lng) usando
// Nominatim (OpenStreetMap) — gratis, sin API key. Política de uso de
// Nominatim: identificarse con un User-Agent propio y no golpearlo en
// paralelo/en bucle — acá se dispara una vez por alta o edición de
// propiedad, nunca en batch, así que entra cómodo en ese límite.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Sistema-MAD-Inmobiliaria/1.0 (uso interno, gestion@mad.local)';

// Nominatim no entiende "piso/depto" pegado al número de calle (ej. "234, 3° B"
// da 0 resultados) — se lo sacamos antes de consultar, sólo para geocodificar
// (no se toca el campo `direccion` que se guarda y se muestra).
function limpiarDireccion(direccion) {
  return direccion
    .replace(/,?\s*\d+\s*°\s*[A-Za-z°]*/gi, '') // "3° B", "2° A", "1° C"...
    .replace(/,?\s*\bPB\b/gi, '')               // planta baja
    .trim();
}

async function buscar(consulta) {
  const url = `${NOMINATIM_URL}?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(consulta)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  const resultados = await res.json();
  if (!resultados.length) return null;
  const lat = Number(resultados[0].lat);
  const lng = Number(resultados[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // OpenStreetMap no tiene el número de puerta cargado para todas las calles de
  // Bahía Blanca: cuando pasa, Nominatim devuelve igual un resultado, pero es
  // el centro de la calle entera (no la altura pedida). Lo marcamos como
  // aproximado en vez de mentir que es una ubicación precisa.
  const preciso = Boolean(resultados[0].address?.house_number);
  return { lat, lng, preciso };
}

async function geocodificar(direccion, barrio) {
  const direccionLimpia = limpiarDireccion(direccion);
  try {
    // El barrio cargado a mano no siempre coincide con el nombre que usa
    // OpenStreetMap, así que primero probamos sin él (mejor tasa de acierto)
    // y sólo lo sumamos como segundo intento si la dirección sola no alcanza.
    let resultado = await buscar(`${direccionLimpia}, Bahía Blanca, Argentina`);
    if (!resultado && barrio) resultado = await buscar(`${direccionLimpia}, ${barrio}, Bahía Blanca, Argentina`);
    if (!resultado) return { lat: null, lng: null, geocodingEstado: 'SIN_RESULTADO' };
    return { lat: resultado.lat, lng: resultado.lng, geocodingEstado: resultado.preciso ? 'OK' : 'APROXIMADO' };
  } catch (e) {
    return { lat: null, lng: null, geocodingEstado: 'ERROR' };
  }
}

module.exports = { geocodificar };
