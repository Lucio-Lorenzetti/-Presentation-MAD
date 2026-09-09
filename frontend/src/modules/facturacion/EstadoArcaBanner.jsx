import { useEffect, useState } from 'react';
import { facturasApi } from '../../api/facturas';
import { ApiError } from '../../api/client';

export default function EstadoArcaBanner() {
  const [estado, setEstado] = useState(null); // null = cargando
  const [errorConexion, setErrorConexion] = useState(null);

  useEffect(() => {
    let cancelado = false;
    facturasApi.estadoArca()
      .then(data => { if (!cancelado) setEstado(data); })
      .catch(e => {
        if (cancelado) return;
        setErrorConexion(
          e instanceof ApiError
            ? e.message
            : 'No se pudo conectar con el backend. ¿Está corriendo en http://localhost:3001?'
        );
      });
    return () => { cancelado = true; };
  }, []);

  if (errorConexion) {
    return (
      <div className="mx-6 mt-5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3 flex items-start gap-2.5">
        <i className="fa-solid fa-plug-circle-xmark mt-0.5"></i>
        <div><strong>No se pudo consultar el estado de ARCA.</strong> {errorConexion}</div>
      </div>
    );
  }

  if (!estado) {
    return (
      <div className="mx-6 mt-5 bg-stone-50 border border-stone-200 text-stone-500 text-xs rounded-xl px-4 py-3">
        Consultando estado de ARCA…
      </div>
    );
  }

  if (!estado.autenticado) {
    return (
      <div className="mx-6 mt-5 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-4 py-3 flex items-start gap-2.5">
        <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
        <div>
          <strong>ARCA está en línea, pero todavía no se puede facturar.</strong> {estado.errorAutenticacion}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-6 mt-5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-4 py-3 flex items-center gap-2.5">
      <i className="fa-solid fa-circle-check"></i>
      Conectado a ARCA — listo para facturar.
    </div>
  );
}
