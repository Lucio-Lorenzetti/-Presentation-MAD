import { useState } from 'react';
import Modal from '../../components/Modal';
import Boton from '../../components/Boton';
import { contratosApi } from '../../api/recursos';
import { useCarga } from '../../hooks';
import { dinero, fecha } from '../../format';
import { useAuth } from '../../auth';

export default function ContratoDetalle({ id, onCerrar, onCambio }) {
  const { puede } = useAuth();
  const { datos: c, cargando, error, recargar } = useCarga(() => contratosApi.obtener(id), [id]);
  const [porcentaje, setPorcentaje] = useState('');
  const [errorAccion, setErrorAccion] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [verTodas, setVerTodas] = useState(false);

  async function accion(fn) {
    setOcupado(true);
    setErrorAccion(null);
    try {
      await fn();
      await recargar();
      onCambio();
    } catch (e) {
      setErrorAccion(e.message);
    } finally {
      setOcupado(false);
    }
  }

  const pagar = q => {
    const total = q.totalConMora ?? q.monto;
    const detalle = q.mora > 0 ? ` (incluye ${dinero(q.mora)} de mora por ${q.diasMora} días)` : '';
    if (!window.confirm(`Registrar pago de ${q.periodo}: ${dinero(total)}${detalle}?`)) return;
    accion(() => contratosApi.pagarCuota(q.id, {}));
  };

  const ajustar = () => {
    const p = Number(porcentaje);
    if (!Number.isFinite(p) || porcentaje === '') return setErrorAccion('Ingresá el porcentaje del ajuste.');
    accion(async () => { await contratosApi.ajustar(id, p); setPorcentaje(''); });
  };

  const cerrar = estado => {
    if (!window.confirm(`¿Marcar el contrato como ${estado.toLowerCase()}? La propiedad quedará disponible.`)) return;
    accion(() => contratosApi.cerrar(id, estado));
  };

  const cuotas = c?.cuotas || [];
  const proximaImpaga = cuotas.filter(q => q.estado === 'PENDIENTE');
  const visibles = verTodas ? cuotas : cuotas.filter(q => q.estado === 'PENDIENTE').slice(0, 6);
  const activo = c?.estado === 'ACTIVO' && puede('escribir');

  return (
    <Modal titulo={c ? `${c.inquilino_nombre} — ${c.propiedad_direccion}` : 'Contrato'} onCerrar={onCerrar} ancho="max-w-3xl">
      <div className="p-6 text-sm space-y-5">
        {cargando && !c && <div className="text-stone-400 text-center py-6">Cargando…</div>}
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

        {c && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Dato label="Alquiler actual" valor={dinero(c.monto_actual)} />
              <Dato label="Vigencia" valor={`${fecha(c.fecha_inicio)} → ${fecha(c.fecha_fin)}`} />
              <Dato label="Índice" valor={c.indice === 'NINGUNO' ? 'Sin índice' : `${c.indice} cada ${c.periodicidad_meses} m`} />
              <Dato label="Próx. actualización" valor={c.proxima_actualizacion ? fecha(c.proxima_actualizacion) : '—'} />
            </div>

            {errorAccion && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorAccion}</div>}

            {activo && c.indice !== 'NINGUNO' && (
              <div className="flex items-end gap-2 p-3 bg-warm-50 border border-stone-100 rounded-xl">
                <label className="flex-1">
                  <span className="text-xs font-medium text-stone-500 mb-1 block">Aplicar ajuste {c.indice} (%)</span>
                  <input className="input" type="number" step="0.01" placeholder="ej. 12.5" value={porcentaje} onChange={e => setPorcentaje(e.target.value)} />
                </label>
                <Boton onClick={ajustar} disabled={ocupado}>Aplicar ajuste</Boton>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-stone-700">Cuotas {verTodas ? '' : '(pendientes)'}</h4>
                <button className="text-xs text-brand-600 hover:underline" onClick={() => setVerTodas(v => !v)}>
                  {verTodas ? 'Ver sólo pendientes' : `Ver todas (${cuotas.length})`}
                </button>
              </div>
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-stone-50 text-stone-400 uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Período</th>
                      <th className="text-left px-3 py-2 font-semibold">Vence</th>
                      <th className="text-left px-3 py-2 font-semibold">Monto</th>
                      <th className="text-left px-3 py-2 font-semibold">Mora (0,5%/día)</th>
                      <th className="text-left px-3 py-2 font-semibold">Estado</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {visibles.map(q => (
                      <tr key={q.id}>
                        <td className="px-3 py-2 font-semibold text-stone-700">{q.periodo}</td>
                        <td className="px-3 py-2 text-stone-500">{fecha(q.vencimiento)}</td>
                        <td className="px-3 py-2 text-stone-700">{dinero(q.monto)}</td>
                        <td className={`px-3 py-2 ${q.mora > 0 ? 'text-red-600 font-semibold' : 'text-stone-300'}`}>{q.mora > 0 ? `${dinero(q.mora)} (${q.diasMora} d)` : '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${q.estado === 'PAGADA' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'}`}>
                            {q.estado === 'PAGADA' ? 'Pagada' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {q.estado === 'PENDIENTE' && activo && (
                            <Boton onClick={() => pagar(q)} disabled={ocupado} className="!py-1">Registrar pago</Boton>
                          )}
                        </td>
                      </tr>
                    ))}
                    {visibles.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-4 text-center text-stone-400">{proximaImpaga.length === 0 ? 'Todas las cuotas están pagadas.' : 'Sin cuotas.'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {c.ajustes.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-stone-700 mb-2">Historial de ajustes</h4>
                <ul className="text-xs text-stone-500 space-y-1">
                  {c.ajustes.map(a => (
                    <li key={a.id}>{fecha(a.fecha)} · {a.indice} {a.porcentaje > 0 ? '+' : ''}{a.porcentaje}% · {dinero(a.monto_anterior)} → <strong className="text-stone-700">{dinero(a.monto_nuevo)}</strong></li>
                  ))}
                </ul>
              </div>
            )}

            {activo && (
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <Boton variante="secundario" onClick={() => cerrar('FINALIZADO')} disabled={ocupado}>Finalizar contrato</Boton>
                <Boton variante="peligro" onClick={() => cerrar('RESCINDIDO')} disabled={ocupado}>Rescindir</Boton>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function Dato({ label, valor }) {
  return (
    <div className="bg-warm-50 border border-stone-100 rounded-lg px-3 py-2">
      <div className="text-stone-400 text-[10px] mb-0.5">{label}</div>
      <div className="font-semibold text-stone-700">{valor}</div>
    </div>
  );
}
