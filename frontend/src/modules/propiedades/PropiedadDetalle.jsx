import Modal from '../../components/Modal';
import Boton from '../../components/Boton';
import { propiedadesApi } from '../../api/recursos';
import { useCarga } from '../../hooks';
import { dinero, fecha } from '../../format';
import { useState } from 'react';
import { useAuth } from '../../auth';

const TIPOS = { CASA: 'Casa', DEPTO: 'Depto', LOCAL: 'Local', PH: 'PH' };
const ESTADOS = { DISPONIBLE: 'Disponible', ALQUILADA: 'Alquilada', EN_REPARACION: 'En reparación' };

export default function PropiedadDetalle({ id, onCerrar, onEditar, onCambio }) {
  const { puede } = useAuth();
  const { datos: p, cargando, error } = useCarga(() => propiedadesApi.obtener(id), [id]);
  const [errorAccion, setErrorAccion] = useState(null);

  async function eliminar() {
    if (!window.confirm(`¿Eliminar ${p.direccion}?`)) return;
    try {
      await propiedadesApi.eliminar(id);
      onCambio();
      onCerrar();
    } catch (e) {
      setErrorAccion(e.message);
    }
  }

  const caracteristicas = p && [
    p.ambientes != null && `${p.ambientes} amb.`,
    p.dormitorios != null && `${p.dormitorios} dorm.`,
    p.banos != null && `${p.banos} baño${p.banos === 1 ? '' : 's'}`,
    p.superficie_m2 != null && `${p.superficie_m2} m²`,
  ].filter(Boolean).join(' · ');

  return (
    <Modal titulo={p ? p.direccion : 'Propiedad'} onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="p-6 text-sm space-y-5">
        {cargando && !p && <div className="text-stone-400 text-center py-6">Cargando…</div>}
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

        {p && (
          <>
            <div className="flex items-center gap-2 text-[13px] font-bold">
              <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600">{TIPOS[p.tipo]}</span>
              <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">{ESTADOS[p.estado]}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
              <Dato label="Propietario" valor={p.propietario_nombre} />
              <Dato label="Barrio / zona" valor={p.barrio} />
              <Dato label="Características" valor={caracteristicas} />
              <Dato label="Partida inmobiliaria" valor={p.partida} />
              <Dato label="Alquiler sugerido" valor={p.alquiler_sugerido != null ? dinero(p.alquiler_sugerido) : null} />
              <Dato label="Expensas" valor={p.expensas != null ? dinero(p.expensas) : null} />
              <Dato label="Servicios" valor={p.servicios} />
            </div>
            {p.descripcion && <p className="text-xs text-stone-600">{p.descripcion}</p>}
            {p.notas && <p className="text-xs text-stone-500 bg-warm-50 border border-stone-100 rounded-lg px-3 py-2">{p.notas}</p>}

            {errorAccion && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorAccion}</div>}

            <div>
              <h4 className="text-xs font-bold text-stone-700 mb-2">Historial de contratos ({p.contratos.length})</h4>
              <div className="border border-stone-200 rounded-xl divide-y divide-stone-100">
                {p.contratos.length === 0 && <div className="px-3 py-3 text-xs text-stone-400 text-center">Nunca fue alquilada.</div>}
                {p.contratos.map(c => (
                  <div key={c.id} className="px-3 py-2 text-xs flex items-center justify-between gap-3">
                    <span className="font-semibold text-stone-700">{c.inquilino_nombre}</span>
                    <span className="text-stone-400">{dinero(c.monto_actual)} · {fecha(c.fecha_inicio)} → {fecha(c.fecha_fin)} · {c.estado.toLowerCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              {puede('eliminar') && <Boton variante="peligro" onClick={eliminar}>Eliminar</Boton>}
              {puede('escribir') && <Boton onClick={() => onEditar(p)}>Editar</Boton>}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

const Dato = ({ label, valor }) => (
  <div>
    <div className="text-stone-400 text-[13px] mb-0.5">{label}</div>
    <div className="font-medium text-stone-700">{valor || '—'}</div>
  </div>
);
