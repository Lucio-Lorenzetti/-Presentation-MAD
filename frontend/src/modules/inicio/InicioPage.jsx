import { useMemo, useState } from 'react';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import Estado from '../../components/Estado';
import Calendario from './Calendario';
import ItemAgenda from './ItemAgenda';
import ContratoDetalle from '../alquileres/ContratoDetalle';
import { agendaApi } from '../../api/recursos';
import { useCarga } from '../../hooks';

const hoyISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`; };
const sumarDias = (iso, dias) => {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(y, m - 1, d + dias);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
};

export default function InicioPage() {
  const { datos: items, cargando, error, recargar } = useCarga(() => agendaApi.listar(), []);
  const [mes, setMes] = useState(() => new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [contratoAbiertoId, setContratoAbiertoId] = useState(null);
  const [calendarioExpandido, setCalendarioExpandido] = useState(() => {
    try { return localStorage.getItem('mad_calendario_expandido') === '1'; } catch { return false; }
  });

  function alternarExpandido() {
    setCalendarioExpandido(v => {
      const nuevo = !v;
      try { localStorage.setItem('mad_calendario_expandido', nuevo ? '1' : '0'); } catch { /* sin storage */ }
      return nuevo;
    });
  }

  const hoy = hoyISO();
  const limiteSemana = sumarDias(hoy, 7);

  const itemsPorDia = useMemo(() => {
    const m = new Map();
    for (const it of items || []) {
      if (!m.has(it.fecha)) m.set(it.fecha, []);
      m.get(it.fecha).push(it);
    }
    return m;
  }, [items]);

  const vencidos = (items || []).filter(i => i.vencida);
  const deHoy = (items || []).filter(i => i.fecha === hoy);
  const deLaSemana = (items || []).filter(i => i.fecha > hoy && i.fecha <= limiteSemana);
  const delDiaSeleccionado = diaSeleccionado ? (itemsPorDia.get(diaSeleccionado) || []) : null;

  const abrirContrato = id => { if (id) setContratoAbiertoId(id); };

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Inicio" subtitle="Calendario de vencimientos, ajustes y cobros">
        <button onClick={recargar} className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition">
          <i className="fa-solid fa-rotate mr-1.5"></i>Actualizar
        </button>
      </Topbar>

      <div className="px-6 py-5">
        <Estado cargando={cargando && !items} error={error} vacio={false} />

        {items && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <StatCard icon="fa-triangle-exclamation" label="Vencidos" value={vencidos.length} tone={vencidos.length ? 'danger' : 'default'} hint="Cobros y ajustes atrasados" />
              <StatCard icon="fa-calendar-day" label="Para hoy" value={deHoy.length} hint="Tareas del día" />
              <StatCard icon="fa-calendar-week" label="Próxima semana" value={deLaSemana.length} hint="Próximos 7 días" />
              <StatCard icon="fa-list-check" label="Total en agenda" value={items.length} hint="Próximos 90 días" />
            </div>

            <div className={`grid grid-cols-1 gap-4 ${calendarioExpandido ? '' : 'lg:grid-cols-5'}`}>
              <div className={`border border-stone-200 rounded-xl p-4 h-fit transition-all ${calendarioExpandido ? 'max-w-2xl mx-auto w-full' : 'lg:col-span-2'}`}>
                <Calendario
                  mes={mes}
                  onCambiarMes={setMes}
                  itemsPorDia={itemsPorDia}
                  diaSeleccionado={diaSeleccionado}
                  onSeleccionarDia={setDiaSeleccionado}
                  expandido={calendarioExpandido}
                  onAlternarExpandido={alternarExpandido}
                />
              </div>

              <div className={calendarioExpandido ? 'space-y-4' : 'lg:col-span-3 space-y-4'}>
                {delDiaSeleccionado ? (
                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-stone-700">
                        {new Date(diaSeleccionado + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </h3>
                      <button onClick={() => setDiaSeleccionado(null)} className="text-[14px] text-stone-400 hover:text-stone-600">
                        Volver a hoy / semana <i className="fa-solid fa-xmark ml-1"></i>
                      </button>
                    </div>
                    <div className="p-2">
                      {delDiaSeleccionado.length === 0
                        ? <div className="p-6 text-center text-sm text-stone-400">Sin vencimientos este día.</div>
                        : delDiaSeleccionado.map((it, i) => <ItemAgenda key={i} item={it} onAbrirContrato={abrirContrato} />)}
                    </div>
                  </div>
                ) : (
                  <>
                    <Panel titulo="Tareas para hoy" icono="fa-calendar-day" vacio={deHoy.length === 0} mensajeVacio="No hay vencimientos hoy.">
                      {deHoy.map((it, i) => <ItemAgenda key={i} item={it} onAbrirContrato={abrirContrato} />)}
                    </Panel>
                    <Panel titulo="Próxima semana" icono="fa-calendar-week" vacio={deLaSemana.length === 0} mensajeVacio="Nada pendiente en los próximos 7 días.">
                      {deLaSemana.map((it, i) => <ItemAgenda key={i} item={it} onAbrirContrato={abrirContrato} />)}
                    </Panel>
                    {vencidos.length > 0 && (
                      <Panel titulo="Vencidos" icono="fa-triangle-exclamation" tono="danger">
                        {vencidos.map((it, i) => <ItemAgenda key={i} item={it} onAbrirContrato={abrirContrato} />)}
                      </Panel>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {contratoAbiertoId && (
        <ContratoDetalle id={contratoAbiertoId} onCerrar={() => setContratoAbiertoId(null)} onCambio={recargar} />
      )}
    </div>
  );
}

function Panel({ titulo, icono, vacio, mensajeVacio, tono, children }) {
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <div className={`px-4 py-3 border-b border-stone-200 flex items-center gap-2 ${tono === 'danger' ? 'bg-red-50 border-red-100' : 'bg-stone-50'}`}>
        <i className={`fa-solid ${icono} text-xs ${tono === 'danger' ? 'text-red-500' : 'text-stone-400'}`}></i>
        <h3 className={`text-xs font-bold ${tono === 'danger' ? 'text-red-600' : 'text-stone-700'}`}>{titulo}</h3>
      </div>
      <div className="p-2">
        {vacio ? <div className="p-6 text-center text-sm text-stone-400">{mensajeVacio}</div> : children}
      </div>
    </div>
  );
}
