import { useState } from 'react';
import Topbar from '../../components/Topbar';
import Boton from '../../components/Boton';
import Estado from '../../components/Estado';
import PropiedadForm from './PropiedadForm';
import PropiedadDetalle from './PropiedadDetalle';
import { descargarCSV } from '../../csv';
import { propiedadesApi } from '../../api/recursos';
import { useCarga } from '../../hooks';
import { dinero } from '../../format';
import { useAuth } from '../../auth';

const TIPOS = { CASA: 'Casa', DEPTO: 'Depto', LOCAL: 'Local', PH: 'PH' };
const ESTADOS = { DISPONIBLE: 'Disponible', ALQUILADA: 'Alquilada', EN_REPARACION: 'En reparación' };
const tipoTono = {
  CASA: 'bg-green-50 text-green-700', DEPTO: 'bg-blue-50 text-blue-700',
  LOCAL: 'bg-purple-50 text-purple-700', PH: 'bg-amber-50 text-amber-700',
};
const estadoTono = {
  DISPONIBLE: 'bg-emerald-50 text-emerald-600', ALQUILADA: 'bg-brand-50 text-brand-700', EN_REPARACION: 'bg-red-50 text-red-600',
};

export default function PropiedadesPage() {
  const { puede } = useAuth();
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [editando, setEditando] = useState(null);
  const [detalleId, setDetalleId] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const { datos: props, cargando, error, recargar } = useCarga(() => propiedadesApi.listar({ q, tipo, estado }), [q, tipo, estado]);
  const { datos: resumen, recargar: recargarResumen } = useCarga(() => propiedadesApi.resumen(), []);

  const refrescar = () => { recargar(); recargarResumen(); };

  function exportar() {
    descargarCSV('propiedades.csv', [
      { titulo: 'Dirección', valor: p => p.direccion },
      { titulo: 'Barrio', valor: p => p.barrio },
      { titulo: 'Tipo', valor: p => TIPOS[p.tipo] },
      { titulo: 'Propietario', valor: p => p.propietario_nombre },
      { titulo: 'Estado', valor: p => ESTADOS[p.estado] },
      { titulo: 'Ambientes', valor: p => p.ambientes },
      { titulo: 'm²', valor: p => p.superficie_m2 },
      { titulo: 'Expensas', valor: p => p.expensas },
      { titulo: 'Alquiler', valor: p => p.alquiler_actual ?? p.alquiler_sugerido },
    ], props);
  }

  async function eliminar(p) {
    if (!window.confirm(`¿Eliminar ${p.direccion}?`)) return;
    try {
      await propiedadesApi.eliminar(p.id);
      setErrorAccion(null);
      refrescar();
    } catch (e) {
      setErrorAccion(e.message);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Propiedades"
        subtitle={resumen ? `${resumen.total} totales · ${resumen.disponibles} disponibles · ${resumen.alquiladas} alquiladas` : ' '}
      >
        <Boton variante="secundario" disabled={!props?.length} onClick={exportar}><i className="fa-solid fa-download mr-1.5"></i>Exportar</Boton>
        {puede('escribir') && <Boton onClick={() => setEditando('nueva')}><i className="fa-solid fa-plus mr-1.5"></i>Nueva propiedad</Boton>}
      </Topbar>

      <div className="px-6 py-5">
        <div className="flex items-center gap-2 mb-5 p-3 bg-stone-50 rounded-xl border border-stone-100">
          <input
            type="text" placeholder="Buscar dirección…" value={q} onChange={e => setQ(e.target.value)}
            className="flex-1 text-xs px-3 py-1.5 border border-stone-200 rounded-lg bg-white placeholder:text-stone-300 focus:outline-none focus:border-brand-300"
          />
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="text-xs px-3 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-500 focus:outline-none">
            <option value="">Tipo</option>
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={estado} onChange={e => setEstado(e.target.value)} className="text-xs px-3 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-500 focus:outline-none">
            <option value="">Estado</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {errorAccion && <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorAccion}</div>}

        <Estado cargando={cargando && !props} error={error} vacio={props && props.length === 0} mensajeVacio="No hay propiedades para este filtro." />

        {props && props.length > 0 && (
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-50 text-stone-400 uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Dirección</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Tipo</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Propietario</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Estado</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Servicios</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Alquiler</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {props.map(p => (
                    <tr key={p.id} className="hover:bg-warm-50 transition cursor-pointer" onClick={() => setDetalleId(p.id)}>
                      <td className="px-4 py-3 font-semibold text-stone-700">{p.direccion}{p.barrio && <span className="block font-normal text-[10px] text-stone-400">{p.barrio}</span>}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${tipoTono[p.tipo]}`}>{TIPOS[p.tipo]}</span></td>
                      <td className="px-4 py-3 text-stone-500">{p.propietario_nombre || '—'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${estadoTono[p.estado]}`}>{ESTADOS[p.estado]}</span></td>
                      <td className="px-4 py-3 text-stone-500">{p.servicios || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-stone-700">{dinero(p.alquiler_actual ?? p.alquiler_sugerido)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {puede('escribir') && <button onClick={e => { e.stopPropagation(); setEditando(p); }} className="text-stone-400 hover:text-brand-600 mr-3" title="Editar"><i className="fa-solid fa-pen"></i></button>}
                        {puede('eliminar') && <button onClick={e => { e.stopPropagation(); eliminar(p); }} className="text-stone-400 hover:text-red-500" title="Eliminar"><i className="fa-solid fa-trash"></i></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {detalleId && (
        <PropiedadDetalle
          id={detalleId}
          onCerrar={() => setDetalleId(null)}
          onEditar={p => { setDetalleId(null); setEditando(p); }}
          onCambio={refrescar}
        />
      )}

      {editando && (
        <PropiedadForm
          propiedad={editando === 'nueva' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardada={() => { setEditando(null); refrescar(); }}
        />
      )}
    </div>
  );
}
