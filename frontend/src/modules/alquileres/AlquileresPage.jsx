import { useState } from 'react';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import Boton from '../../components/Boton';
import Estado from '../../components/Estado';
import NuevoContratoForm from './NuevoContratoForm';
import ContratoDetalle from './ContratoDetalle';
import { contratosApi } from '../../api/recursos';
import { useCarga } from '../../hooks';
import { dinero, fecha } from '../../format';
import { useAuth } from '../../auth';
import { descargarExcel } from '../../excel';

const ESTADO_CUOTA_LABEL = {
  VENCIDA: e => `Vencida hace ${e.diasMora} día${e.diasMora === 1 ? '' : 's'}`,
  AJUSTE_PENDIENTE: e => `Ajuste ${e.indice} pendiente`,
  AL_DIA: () => 'Al día',
};

const indiceTono = { ICL: 'bg-blue-50 text-blue-600', IPC: 'bg-violet-50 text-violet-600', NINGUNO: 'bg-stone-100 text-stone-400' };
const estadoContratoTono = {
  ACTIVO: 'bg-emerald-50 text-emerald-600', FINALIZADO: 'bg-stone-100 text-stone-500', RESCINDIDO: 'bg-red-50 text-red-500',
};

function EstadoCuota({ e }) {
  if (e.tipo === 'VENCIDA') {
    const extra = e.cantVencidas > 1 ? ` (${e.cantVencidas} cuotas)` : '';
    return <span className="px-2 py-0.5 rounded-full text-[13px] font-semibold bg-red-50 text-red-600">Vencida hace {e.diasMora} día{e.diasMora === 1 ? '' : 's'}{extra}</span>;
  }
  if (e.tipo === 'AJUSTE_PENDIENTE') {
    return <span className="px-2 py-0.5 rounded-full text-[13px] font-semibold bg-amber-50 text-amber-600">⚡ Ajuste {e.indice} pendiente</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-[13px] font-semibold bg-emerald-50 text-emerald-600">Al día</span>;
}

export default function AlquileresPage() {
  const { puede } = useAuth();
  const [q, setQ] = useState('');
  const [mostrarSolo, setMostrarSolo] = useState('ACTIVO');
  const [nuevo, setNuevo] = useState(false);
  const [detalleId, setDetalleId] = useState(null);

  const { datos: contratos, cargando, error, recargar } = useCarga(() => contratosApi.listar({ q, estado: mostrarSolo }), [q, mostrarSolo]);
  const { datos: r, recargar: recargarResumen } = useCarga(() => contratosApi.resumen(), []);

  const refrescar = () => { recargar(); recargarResumen(); };
  const pct = r && r.esperadoMes > 0 ? Math.round((r.cobrosMes / r.esperadoMes) * 100) : 0;

  function exportar() {
    descargarExcel('contratos.xlsx', [
      { titulo: 'Inquilino', valor: c => c.inquilino_nombre },
      { titulo: 'Propiedad', valor: c => c.propiedad_direccion },
      { titulo: 'Alquiler actual', valor: c => c.monto_actual },
      { titulo: 'Índice', valor: c => c.indice },
      { titulo: 'Inicio', valor: c => fecha(c.fecha_inicio) },
      { titulo: 'Fin', valor: c => fecha(c.fecha_fin) },
      { titulo: 'Próx. actualización', valor: c => c.proxima_actualizacion ? fecha(c.proxima_actualizacion) : '' },
      { titulo: 'Estado contrato', valor: c => c.estado },
      { titulo: 'Estado cuota', valor: c => c.estado === 'ACTIVO' ? ESTADO_CUOTA_LABEL[c.estadoCuota.tipo](c.estadoCuota) : '' },
    ], contratos, 'Contratos');
  }

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        title="Alquileres y Contratos"
        subtitle={r ? `${r.contratosActivos} contratos activos · ${r.porVencer} por vencer · ${r.cuotasVencidas} cuotas vencidas` : ' '}
      >
        <Boton variante="secundario" disabled={!contratos?.length} onClick={exportar}><i className="fa-solid fa-download mr-1.5"></i>Exportar</Boton>
        {puede('escribir') && <Boton onClick={() => setNuevo(true)}><i className="fa-solid fa-plus mr-1.5"></i>Nuevo contrato</Boton>}
      </Topbar>

      <div className="px-6 py-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="Contratos activos" value={r?.contratosActivos ?? '—'} hint={r ? `${r.porVencer} por vencer (60 días)` : ''} />
          <StatCard label="Cobros del mes" value={r ? dinero(r.cobrosMes) : '—'} hint={r ? `${pct}% de ${dinero(r.esperadoMes)}` : ''} tone="success" />
          <StatCard label="Ajustes pendientes" value={r?.ajustesPendientes ?? '—'} hint="IPC/ICL a aplicar" />
          <StatCard label="Cuotas vencidas" value={r?.cuotasVencidas ?? '—'} hint={r ? `${dinero(r.montoVencidoConMora)} con mora` : ''} tone="danger" />
        </div>

        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-3">
            <select value={mostrarSolo} onChange={e => setMostrarSolo(e.target.value)} className="text-xs px-2 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-500">
              <option value="ACTIVO">Contratos activos</option>
              <option value="FINALIZADO">Finalizados</option>
              <option value="RESCINDIDO">Rescindidos</option>
              <option value="">Todos</option>
            </select>
            <input
              type="text" placeholder="Buscar inquilino o propiedad…" value={q} onChange={e => setQ(e.target.value)}
              className="text-xs px-3 py-1.5 border border-stone-200 rounded-lg w-64 bg-white placeholder:text-stone-300 focus:outline-none focus:border-brand-300"
            />
          </div>

          {(cargando && !contratos) || error || (contratos && contratos.length === 0)
            ? <div className="p-2"><Estado cargando={cargando && !contratos} error={error} vacio={contratos && contratos.length === 0} mensajeVacio="No hay contratos para mostrar." /></div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-stone-50 text-stone-400 uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold">Inquilino</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Propiedad</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Alquiler</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Índice</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Estado cuota</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {contratos.map(c => (
                      <tr key={c.id} className="hover:bg-warm-50 transition cursor-pointer" onClick={() => setDetalleId(c.id)}>
                        <td className="px-4 py-3 font-semibold text-stone-700">{c.inquilino_nombre}</td>
                        <td className="px-4 py-3 text-stone-500">{c.propiedad_direccion}</td>
                        <td className="px-4 py-3 font-semibold text-stone-700">{dinero(c.monto_actual)}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[13px] font-semibold ${indiceTono[c.indice]}`}>{c.indice === 'NINGUNO' ? 'Sin índice' : c.indice}</span></td>
                        <td className="px-4 py-3">
                          {c.estado === 'ACTIVO'
                            ? <EstadoCuota e={c.estadoCuota} />
                            : <span className={`px-2 py-0.5 rounded-full text-[13px] font-semibold ${estadoContratoTono[c.estado]}`}>{c.estado.charAt(0) + c.estado.slice(1).toLowerCase()}</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-stone-300"><i className="fa-solid fa-chevron-right"></i></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>

      {nuevo && <NuevoContratoForm onCerrar={() => setNuevo(false)} onCreado={() => { setNuevo(false); refrescar(); }} />}
      {detalleId && <ContratoDetalle id={detalleId} onCerrar={() => setDetalleId(null)} onCambio={refrescar} />}
    </div>
  );
}
