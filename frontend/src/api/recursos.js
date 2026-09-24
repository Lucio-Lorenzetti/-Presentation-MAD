import { api } from './client';

const qs = params => {
  const p = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== null) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const personasApi = {
  listar: params => api.get(`/api/personas${qs(params)}`),
  obtener: id => api.get(`/api/personas/${id}`),
  eliminarGarante: (id, garanteId) => api.delete(`/api/personas/${id}/garantes/${garanteId}`),
  crear: data => api.post('/api/personas', data),
  actualizar: (id, data) => api.put(`/api/personas/${id}`, data),
  eliminar: id => api.delete(`/api/personas/${id}`),
  agregarGarante: (id, data) => api.post(`/api/personas/${id}/garantes`, data),
};

export const propiedadesApi = {
  listar: params => api.get(`/api/propiedades${qs(params)}`),
  obtener: id => api.get(`/api/propiedades/${id}`),
  resumen: () => api.get('/api/propiedades/resumen'),
  crear: data => api.post('/api/propiedades', data),
  actualizar: (id, data) => api.put(`/api/propiedades/${id}`, data),
  eliminar: id => api.delete(`/api/propiedades/${id}`),
};

export const contratosApi = {
  listar: params => api.get(`/api/contratos${qs(params)}`),
  obtener: id => api.get(`/api/contratos/${id}`),
  resumen: () => api.get('/api/contratos/resumen'),
  crear: data => api.post('/api/contratos', data),
  ajustar: (id, porcentaje) => api.post(`/api/contratos/${id}/ajustes`, { porcentaje }),
  sugerenciaAjuste: id => api.get(`/api/contratos/${id}/sugerencia-ajuste`),
  cerrar: (id, estado) => api.post(`/api/contratos/${id}/cierre`, { estado }),
  pagarCuota: (cuotaId, data) => api.post(`/api/contratos/cuotas/${cuotaId}/pagos`, data),
};

export const estadisticasApi = {
  panel: () => api.get('/api/estadisticas'),
};

export const agendaApi = {
  listar: () => api.get('/api/agenda'),
};

export const usuariosApi = {
  listar: () => api.get('/api/usuarios'),
  crear: data => api.post('/api/usuarios', data),
  actualizar: (id, data) => api.put(`/api/usuarios/${id}`, data),
  cambiarPassword: (actual, nueva) => api.post('/api/auth/password', { actual, nueva }),
};
