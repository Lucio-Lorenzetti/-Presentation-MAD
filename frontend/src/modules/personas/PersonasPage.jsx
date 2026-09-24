import { useState } from 'react';
import Topbar from '../../components/Topbar';
import Boton from '../../components/Boton';
import Estado from '../../components/Estado';
import PersonaForm from './PersonaForm';
import PersonaDetalle from './PersonaDetalle';
import { descargarExcel } from '../../excel';
import { formatDni } from '../../format';
import { personasApi } from '../../api/recursos';
import { useCarga } from '../../hooks';
import { useAuth } from '../../auth';

const tipoTono = {
  PROPIETARIO: 'bg-amber-50 text-amber-700',
  INQUILINO: 'bg-sky-50 text-sky-700',
};
const tipoLabel = { PROPIETARIO: 'Propietario', INQUILINO: 'Inquilino' };

const filtros = [
  { id: 'todos', label: 'Todos', params: {} },
  { id: 'propietarios', label: 'Propietarios', params: { tipo: 'PROPIETARIO' } },
  { id: 'inquilinos', label: 'Inquilinos', params: { tipo: 'INQUILINO' } },
  { id: 'negra', label: 'Lista negra', params: { listaNegra: 'true' } },
];

export default function PersonasPage() {
  const { puede } = useAuth();
  const [filtro, setFiltro] = useState('todos');
  const [q, setQ] = useState('');
  const [editando, setEditando] = useState(null); // null | 'nueva' | persona
  const [detalleId, setDetalleId] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const params = { ...filtros.find(f => f.id === filtro).params, q };
  const { datos: personas, cargando, error, recargar } = useCarga(() => personasApi.listar(params), [filtro, q]);

  function exportar() {
    descargarExcel('personas.xlsx', [
      { titulo: 'Nombre', valor: p => p.nombre },
      { titulo: 'Tipo', valor: p => tipoLabel[p.tipo] },
      { titulo: 'DNI', valor: p => p.dni },
      { titulo: 'CUIT', valor: p => p.cuit },
      { titulo: 'Email', valor: p => p.email },
      { titulo: 'Teléfono', valor: p => p.telefono },
      { titulo: 'Domicilio', valor: p => p.domicilio },
      { titulo: 'Método cobro/pago', valor: p => p.metodo_cobro },
      { titulo: 'Lista negra', valor: p => (p.lista_negra ? 'Sí' : 'No') },
    ], personas, 'Personas');
  }

  async function eliminar(p) {
    if (!window.confirm(`¿Eliminar a ${p.nombre}?`)) return;
    try {
      await personasApi.eliminar(p.id);
      setErrorAccion(null);
      recargar();
    } catch (e) {
      setErrorAccion(e.message);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Propietarios e Inquilinos" subtitle="Gestor de fichas con datos de contacto, garantías y métodos de pago">
        <Boton variante="secundario" disabled={!personas?.length} onClick={exportar}><i className="fa-solid fa-download mr-1.5"></i>Exportar</Boton>
        {puede('escribir') && <Boton onClick={() => setEditando('nueva')}><i className="fa-solid fa-plus mr-1.5"></i>Nueva persona</Boton>}
      </Topbar>

      <div className="px-6 py-5">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {filtros.map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                filtro === f.id
                  ? 'bg-brand-500 text-white font-semibold'
                  : f.id === 'negra'
                    ? 'bg-red-50 text-red-500 hover:bg-red-100'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {f.label}
            </button>
          ))}
          <input
            type="text" placeholder="Buscar nombre, DNI o email…" value={q} onChange={e => setQ(e.target.value)}
            className="w-full sm:w-64 sm:ml-auto text-xs px-3 py-1.5 border border-stone-200 rounded-lg bg-white placeholder:text-stone-300 focus:outline-none focus:border-brand-300"
          />
        </div>

        {errorAccion && <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorAccion}</div>}

        <Estado cargando={cargando && !personas} error={error} vacio={personas && personas.length === 0} mensajeVacio="No hay personas para este filtro." />

        {personas && personas.length > 0 && (
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-50 text-stone-400 uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Nombre</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Tipo</th>
                    <th className="text-left px-4 py-2.5 font-semibold">DNI</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Email</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Método cobro/pago</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Propiedades / Garantes</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {personas.map(p => (
                    <tr key={p.id} className="hover:bg-warm-50 transition cursor-pointer" onClick={() => setDetalleId(p.id)}>
                      <td className="px-4 py-3 font-semibold text-stone-700">
                        {p.nombre}
                        {p.lista_negra === 1 && <span className="ml-2 px-1.5 py-0.5 rounded bg-red-50 text-red-500 text-[13px] font-bold">Lista negra</span>}
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[13px] font-bold ${tipoTono[p.tipo]}`}>{tipoLabel[p.tipo]}</span></td>
                      <td className="px-4 py-3 font-mono text-stone-500">{formatDni(p.dni)}</td>
                      <td className="px-4 py-3 text-stone-500">{p.email || '—'}</td>
                      <td className="px-4 py-3">
                        {p.metodo_cobro
                          ? <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[13px] font-semibold">{p.metodo_cobro}</span>
                          : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-stone-400">{p.tipo === 'PROPIETARIO'
                        ? `${p.cant_propiedades} propiedad${p.cant_propiedades === 1 ? '' : 'es'}`
                        : p.cant_garantes > 0 ? `${p.cant_garantes} garante${p.cant_garantes > 1 ? 's' : ''} ✓` : '—'}</td>
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
        <PersonaDetalle
          id={detalleId}
          onCerrar={() => setDetalleId(null)}
          onEditar={p => { setDetalleId(null); setEditando(p); }}
          onCambio={recargar}
        />
      )}

      {editando && (
        <PersonaForm
          persona={editando === 'nueva' ? null : editando}
          tipoInicial={filtro === 'propietarios' ? 'PROPIETARIO' : 'INQUILINO'}
          onCerrar={() => setEditando(null)}
          onGuardada={() => { setEditando(null); recargar(); }}
        />
      )}
    </div>
  );
}
