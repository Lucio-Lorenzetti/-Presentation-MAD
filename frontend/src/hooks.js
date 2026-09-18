import { useCallback, useEffect, useState } from 'react';
import { ApiError } from './api/client';

// Carga un recurso del backend y expone { datos, cargando, error, recargar }.
export function useCarga(fn, deps = []) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recargar = useCallback(() => {
    setCargando(true);
    return fn()
      .then(d => { setDatos(d); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'No se pudo conectar con el backend.'))
      .finally(() => setCargando(false));
  }, deps);

  useEffect(() => { recargar(); }, [recargar]);
  return { datos, cargando, error, recargar };
}
