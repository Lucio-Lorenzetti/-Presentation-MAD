// En dev, Vite hace de proxy de /api hacia el backend (ver vite.config.js).
// En producción, se puede apuntar a un backend en otro dominio con VITE_API_URL.
const BASE_URL = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'mad_token';
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = t => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* sin storage */ }
};

function headers() {
  const t = getToken();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

// El AuthProvider escucha este evento para volver al login cuando la sesión vence.
function sesionVencida() {
  setToken(null);
  window.dispatchEvent(new Event('mad:sesion-vencida'));
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: headers(),
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : null;

  if (res.status === 401 && !path.startsWith('/api/auth/login')) sesionVencida();
  if (!res.ok) {
    throw new ApiError(body?.error || `Error ${res.status}`, res.status, body);
  }
  return body;
}

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export const api = {
  get: path => request(path),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
  delete: path => request(path, { method: 'DELETE' }),
};

// Abre la pestaña YA (síncrono, todavía dentro del click) y recién después
// espera el fetch del PDF — si se abre la pestaña recién cuando llega la
// respuesta, el navegador ya no lo considera un gesto directo del usuario y
// la bloquea como pop-up, sin avisar (por eso "no pasaba nada" al clickear).
async function abrirPdfDesde(path, mensajeError) {
  const ventana = window.open('', '_blank');
  try {
    const res = await fetch(`${BASE_URL}${path}`, { headers: headers() });
    if (!res.ok) throw new ApiError(mensajeError, res.status);
    const url = URL.createObjectURL(await res.blob());
    if (ventana) ventana.location.href = url;
    else window.open(url, '_blank'); // el navegador no dejó abrir la pestaña vacía: probamos igual, por si acaso
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    ventana?.close();
    throw e;
  }
}

export function abrirPdf(id) {
  return abrirPdfDesde(`/api/facturas/${id}/pdf`, 'No se pudo abrir el PDF.');
}

async function blobDeRecibo(pagoId) {
  const res = await fetch(`${BASE_URL}/api/contratos/cuotas/pagos/${pagoId}/recibo.pdf`, { headers: headers() });
  if (!res.ok) throw new ApiError('No se pudo obtener el recibo.', res.status);
  return res.blob();
}

export function abrirReciboPdf(pagoId) {
  return abrirPdfDesde(`/api/contratos/cuotas/pagos/${pagoId}/recibo.pdf`, 'No se pudo obtener el recibo.');
}

// Descarga el PDF del recibo a disco (para adjuntarlo a mano en WhatsApp).
export async function descargarReciboPdf(pagoId, nombreArchivo) {
  const url = URL.createObjectURL(await blobDeRecibo(pagoId));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo || `recibo-${pagoId}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Ficha resumen del contrato (documento de gestión interna, no legal).
export function abrirFichaContratoPdf(contratoId) {
  return abrirPdfDesde(`/api/contratos/${contratoId}/ficha.pdf`, 'No se pudo generar la ficha del contrato.');
}

// Comprobante que el inquilino manda por WhatsApp al transferir (foto/captura/PDF), vinculado al pago.
export function abrirComprobante(pagoId) {
  return abrirPdfDesde(`/api/contratos/cuotas/pagos/${pagoId}/comprobante`, 'No se pudo abrir el comprobante.');
}

export async function subirComprobante(pagoId, archivo) {
  const form = new FormData();
  form.append('comprobante', archivo);
  const t = getToken();
  const res = await fetch(`${BASE_URL}/api/contratos/cuotas/pagos/${pagoId}/comprobante`, {
    method: 'POST',
    headers: t ? { Authorization: `Bearer ${t}` } : {}, // sin Content-Type: FormData arma el boundary del multipart solo
    body: form,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : null;
  if (res.status === 401) sesionVencida();
  if (!res.ok) throw new ApiError(body?.error || `Error ${res.status}`, res.status, body);
  return body;
}

// Abre (ya, síncrono) una pestaña para WhatsApp y recién después la navega
// al link armado — mismo motivo que abrirPdfDesde: si el `window.open` pasa
// después de un `await`, el navegador lo bloquea como pop-up sin avisar.
export function abrirVentanaWhatsApp() {
  const ventana = window.open('', '_blank');
  return {
    navegar: link => { if (ventana) ventana.location.href = link; else window.open(link, '_blank'); },
    cerrar: () => ventana?.close(),
  };
}
