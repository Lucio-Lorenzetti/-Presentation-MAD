import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import Boton from '../../components/Boton';
import PagarCuotaModal from './PagarCuotaModal';
import { contratosApi } from '../../api/recursos';
import { abrirReciboPdf, descargarReciboPdf, abrirFichaContratoPdf, abrirVentanaWhatsApp, abrirComprobante, subirComprobante } from '../../api/client';
import { armarLinkWhatsApp, mensajeRecibo } from '../../whatsapp';
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
  const [enviando, setEnviando] = useState(null);
  const [subiendoComprobante, setSubiendoComprobante] = useState(null);
  const [cuotaAPagar, setCuotaAPagar] = useState(null);
  const [sugerencia, setSugerencia] = useState(null);
  const [cargandoSugerencia, setCargandoSugerencia] = useState(false);
  const [errorSugerencia, setErrorSugerencia] = useState(null);
  const [manual, setManual] = useState(false);

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

  const pagar = q => setCuotaAPagar(q);

  const confirmarPago = async ({ notas, archivo }) => {
    setOcupado(true);
    setErrorAccion(null);
    try {
      const pago = await contratosApi.pagarCuota(cuotaAPagar.id, notas ? { notas } : {});
      if (archivo) await subirComprobante(pago.id, archivo);
      await recargar();
      onCambio();
      setCuotaAPagar(null);
    } catch (e) {
      setErrorAccion(e.message);
    } finally {
      setOcupado(false);
    }
  };

  // El valor del ajuste lo resuelve siempre el sistema (BCRA), nunca se
  // tipea a mano — esto sólo dispara el cálculo apenas se abre un contrato
  // activo con índice. Aplicarlo sigue siendo una acción manual (el "aviso"
  // visual + confirmación), pero el número nunca lo carga una persona.
  useEffect(() => {
    if (!c || c.estado !== 'ACTIVO' || c.indice === 'NINGUNO' || !puede('escribir')) return;
    let cancelado = false;
    setCargandoSugerencia(true);
    setErrorSugerencia(null);
    contratosApi.sugerenciaAjuste(id)
      .then(s => { if (!cancelado) setSugerencia(s); })
      .catch(e => { if (!cancelado) setErrorSugerencia(e.message); })
      .finally(() => { if (!cancelado) setCargandoSugerencia(false); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.id, c?.estado, c?.indice]);

  const aplicarAutomatico = () => {
    if (!sugerencia) return;
    if (!window.confirm(`Aplicar ajuste ${sugerencia.indice} de ${sugerencia.porcentaje > 0 ? '+' : ''}${sugerencia.porcentaje}% (${fecha(sugerencia.desde)} a ${fecha(sugerencia.hasta)}, fuente BCRA)?`)) return;
    accion(async () => { await contratosApi.ajustar(id, sugerencia.porcentaje); setSugerencia(null); });
  };

  const ajustar = () => {
    const p = Number(porcentaje);
    if (!Number.isFinite(p) || porcentaje === '') return setErrorAccion('Ingresá el porcentaje del ajuste.');
    accion(async () => { await contratosApi.ajustar(id, p); setPorcentaje(''); setManual(false); });
  };

  const cerrar = estado => {
    if (!window.confirm(`¿Marcar el contrato como ${estado.toLowerCase()}? La propiedad quedará disponible.`)) return;
    accion(() => contratosApi.cerrar(id, estado));
  };

  const verRecibo = p => abrirReciboPdf(p.id).catch(e => setErrorAccion(e.message));
  const verComprobante = p => abrirComprobante(p.id).catch(e => setErrorAccion(e.message));
  const adjuntarComprobante = async (p, archivo) => {
    if (!archivo) return;
    setSubiendoComprobante(p.id);
    setErrorAccion(null);
    try {
      await subirComprobante(p.id, archivo);
      await recargar();
    } catch (e) {
      setErrorAccion(e.message);
    } finally {
      setSubiendoComprobante(null);
    }
  };
  const enviarWhatsapp = async p => {
    const wa = abrirVentanaWhatsApp(); // abrir la pestaña YA, antes de esperar la descarga (si no, el navegador la bloquea como pop-up)
    setEnviando(p.id);
    setErrorAccion(null);
    try {
      await descargarReciboPdf(p.id, `recibo-${c.inquilino_nombre.replace(/\s+/g, '-')}-${p.periodo}.pdf`);
      const mensaje = mensajeRecibo({
        inquilinoNombre: c.inquilino_nombre,
        propiedadDireccion: c.propiedad_direccion,
        periodo: p.periodo,
        total: p.total,
      });
      wa.navegar(armarLinkWhatsApp(mensaje));
    } catch (e) {
      wa.cerrar();
      setErrorAccion(e.message);
    } finally {
      setEnviando(null);
    }
  };

  const cuotas = c?.cuotas || [];
  const pendientes = cuotas.filter(q => q.estado === 'PENDIENTE');
  const proxima = pendientes[0] || null;
  const resto = cuotas.filter(q => q.id !== proxima?.id);
  const visibles = verTodas ? resto : resto.filter(q => q.estado === 'PENDIENTE').slice(0, 6);
  const activo = c?.estado === 'ACTIVO' && puede('escribir');

  return (
    <Modal titulo={c ? `${c.inquilino_nombre} — ${c.propiedad_direccion}` : 'Contrato'} onCerrar={onCerrar} ancho="max-w-3xl">
      <div className="p-6 text-sm space-y-5">
        {cargando && !c && <div className="text-stone-400 text-center py-6">Cargando…</div>}
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

        {c && (
          <>
            <div className="flex justify-end -mb-1">
              <button
                onClick={() => abrirFichaContratoPdf(c.id).catch(e => setErrorAccion(e.message))}
                className="text-xs text-stone-400 hover:text-brand-600 transition"
              >
                <i className="fa-solid fa-file-pdf mr-1.5"></i>Ficha del contrato (PDF)
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Dato label="Alquiler actual" valor={dinero(c.monto_actual)} />
              <Dato label="Vigencia" valor={`${fecha(c.fecha_inicio)} → ${fecha(c.fecha_fin)}`} />
              <Dato label="Índice" valor={c.indice === 'NINGUNO' ? 'Sin índice' : `${c.indice} cada ${c.periodicidad_meses} m`} />
              <Dato label="Próx. actualización" valor={c.proxima_actualizacion ? fecha(c.proxima_actualizacion) : '—'} />
            </div>

            {errorAccion && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorAccion}</div>}

            {activo && c.indice !== 'NINGUNO' && (cargandoSugerencia || sugerencia || errorSugerencia || manual) && (
              <div className="p-3 bg-warm-50 border border-stone-100 rounded-xl space-y-2">
                {cargandoSugerencia && (
                  <p className="text-xs text-stone-400"><i className="fa-solid fa-spinner fa-spin mr-1.5"></i>Calculando el ajuste {c.indice} según el BCRA…</p>
                )}

                {!cargandoSugerencia && sugerencia && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-stone-600">
                      Ajuste {sugerencia.indice} desde {fecha(sugerencia.desde)}: <strong className="text-stone-800">{sugerencia.porcentaje > 0 ? '+' : ''}{sugerencia.porcentaje}%</strong>
                      <span className="block text-[13px] text-stone-400">Resuelto automáticamente — fuente: {sugerencia.fuente}</span>
                    </p>
                    <Boton onClick={aplicarAutomatico} disabled={ocupado}>
                      <i className="fa-solid fa-check mr-1.5"></i>Aplicar ajuste
                    </Boton>
                  </div>
                )}

                {!cargandoSugerencia && errorSugerencia && !manual && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-red-500">No se pudo calcular el ajuste automáticamente ({errorSugerencia}).</p>
                    <button className="text-[13px] text-brand-600 hover:underline shrink-0" onClick={() => setManual(true)}>Cargar manualmente</button>
                  </div>
                )}

                {manual && (
                  <div className="flex items-end gap-2 pt-2 border-t border-stone-200">
                    <label className="flex-1">
                      <span className="text-xs font-medium text-stone-500 mb-1 block">Ajuste {c.indice} manual (%)</span>
                      <input className="input" type="number" step="0.01" placeholder="ej. 12.5" value={porcentaje} onChange={e => setPorcentaje(e.target.value)} />
                    </label>
                    <Boton variante="secundario" onClick={ajustar} disabled={ocupado}>Aplicar manual</Boton>
                  </div>
                )}
              </div>
            )}

            {proxima && (
              <div className="p-4 bg-brand-50 border-2 border-brand-200 rounded-xl">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-[13px] font-bold text-brand-600 uppercase tracking-wide mb-1">
                      <i className="fa-solid fa-circle-exclamation mr-1.5"></i>Próxima cuota a vencer
                    </div>
                    <div className="text-sm font-bold text-stone-800">{proxima.periodo} · vence {fecha(proxima.vencimiento)}</div>
                    <div className="text-xs text-stone-600 mt-0.5">
                      {dinero(proxima.monto)}
                      {proxima.mora > 0 && (
                        <span className="ml-1.5 text-red-600 font-semibold">+ {dinero(proxima.mora)} de mora ({proxima.diasMora} días)</span>
                      )}
                    </div>
                  </div>
                  {activo && (
                    <Boton onClick={() => pagar(proxima)} disabled={ocupado}>Registrar pago</Boton>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-stone-700">{verTodas ? 'Historial de cuotas' : 'Próximas cuotas pendientes'}</h4>
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
                          <span className={`px-2 py-0.5 rounded-full text-[13px] font-semibold ${q.estado === 'PAGADA' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'}`}>
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
                      <tr><td colSpan={6} className="px-3 py-4 text-center text-stone-400">{pendientes.length === 0 ? 'No hay más cuotas pendientes.' : 'Sin cuotas.'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {c.pagos && c.pagos.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-stone-700 mb-2">Pagos registrados</h4>
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-stone-50 text-stone-400 uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Fecha</th>
                        <th className="text-left px-3 py-2 font-semibold">Período</th>
                        <th className="text-left px-3 py-2 font-semibold">Total pagado</th>
                        <th className="text-left px-3 py-2 font-semibold">Método</th>
                        <th className="px-3 py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {c.pagos.map(p => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 text-stone-500">{fecha(p.fecha)}</td>
                          <td className="px-3 py-2 font-semibold text-stone-700">{p.periodo}</td>
                          <td className="px-3 py-2 text-stone-700">
                            {dinero(p.total)}
                            {p.mora > 0 && <span className="ml-1.5 text-[13px] text-red-500">(mora {dinero(p.mora)})</span>}
                          </td>
                          <td className="px-3 py-2 text-stone-500">{p.metodo || '—'}</td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => verRecibo(p)}
                                className="w-6 h-6 rounded bg-stone-100 text-stone-400 hover:bg-brand-50 hover:text-brand-600 flex items-center justify-center transition"
                                title="Ver recibo en PDF"
                              >
                                <i className="fa-solid fa-file-pdf text-[13px]"></i>
                              </button>
                              <button
                                onClick={() => enviarWhatsapp(p)}
                                disabled={enviando === p.id}
                                className="w-6 h-6 rounded bg-stone-100 text-stone-400 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition disabled:opacity-50"
                                title="Descargar recibo y enviar por WhatsApp"
                              >
                                <i className="fa-brands fa-whatsapp text-[14px]"></i>
                              </button>
                              {p.comprobante_path ? (
                                <button
                                  onClick={() => verComprobante(p)}
                                  className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition"
                                  title="Ver comprobante del inquilino"
                                >
                                  <i className="fa-solid fa-paperclip text-[13px]"></i>
                                </button>
                              ) : (
                                <label
                                  className={`w-6 h-6 rounded bg-stone-100 text-stone-400 hover:bg-brand-50 hover:text-brand-600 flex items-center justify-center transition cursor-pointer ${subiendoComprobante === p.id ? 'opacity-50 pointer-events-none' : ''}`}
                                  title="Adjuntar comprobante del inquilino"
                                >
                                  {subiendoComprobante === p.id
                                    ? <i className="fa-solid fa-spinner fa-spin text-[13px]"></i>
                                    : <i className="fa-solid fa-paperclip text-[13px]"></i>}
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    className="hidden"
                                    onChange={e => { adjuntarComprobante(p, e.target.files[0]); e.target.value = ''; }}
                                  />
                                </label>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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

      {cuotaAPagar && (
        <PagarCuotaModal
          cuota={cuotaAPagar}
          error={errorAccion}
          procesando={ocupado}
          onCerrar={() => { setCuotaAPagar(null); setErrorAccion(null); }}
          onConfirmar={confirmarPago}
        />
      )}
    </Modal>
  );
}

function Dato({ label, valor }) {
  return (
    <div className="bg-warm-50 border border-stone-100 rounded-lg px-3 py-2">
      <div className="text-stone-400 text-[13px] mb-0.5">{label}</div>
      <div className="font-semibold text-stone-700">{valor}</div>
    </div>
  );
}
