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

// El PDF requiere el token, así que se baja con fetch y se abre como blob.
export async function abrirPdf(id) {
  const res = await fetch(`${BASE_URL}/api/facturas/${id}/pdf`, { headers: headers() });
  if (!res.ok) throw new ApiError('No se pudo abrir el PDF.', res.status);
  const url = URL.createObjectURL(await res.blob());
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
