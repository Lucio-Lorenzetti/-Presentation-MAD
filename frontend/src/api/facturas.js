import { api } from './client';

export const facturasApi = {
  listar: (limit = 50, offset = 0) => api.get(`/api/facturas?limit=${limit}&offset=${offset}`),
  obtener: id => api.get(`/api/facturas/${id}`),
  crear: data => api.post('/api/facturas', data),
  estadoArca: () => api.get('/api/facturas/estado-arca'),
};
