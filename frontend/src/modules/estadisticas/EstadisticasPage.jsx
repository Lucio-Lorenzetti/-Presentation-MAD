import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import Boton from '../../components/Boton';
import Estado from '../../components/Estado';
import GraficoCobrosFacturado from './GraficoCobrosFacturado';
import GraficoPropiedades from './GraficoPropiedades';
import { estadisticasApi } from '../../api/recursos';
import { useCarga } from '../../hooks';
import { dinero } from '../../format';
import { descargarExcelMultiple } from '../../excel';

export default function EstadisticasPage() {
  const { datos, cargando, error } = useCarga(() => estadisticasApi.panel(), []);

  function exportar() {
    const { resumen, cobrosPorMes, topDeudores } = datos;
    const filasResumen = [
      { indicador: 'Contratos activos', valor: resumen.contratos.contratosActivos },
      { indicador: 'Cobrado este mes', valor: resumen.contratos.cobrosMes },
      { indicador: 'Esperado este mes', valor: resumen.contratos.esperadoMes },
      { indicador: 'Cuotas vencidas', valor: resumen.contratos.cuotasVencidas },
      { indicador: 'Monto vencido con mora', valor: resumen.contratos.montoVencidoConMora },
      { indicador: 'Propiedades totales', valor: resumen.propiedades.total },
      { indicador: 'Propiedades disponibles', valor: resumen.propiedades.disponibles },
      { indicador: 'Propiedades alquiladas', valor: resumen.propiedades.alquiladas },
      { indicador: 'Facturas emitidas', valor: resumen.facturacion.total },
      { indicador: 'Total facturado', valor: resumen.facturacion.totalFacturado },
    ];
    descargarExcelMultiple('estadisticas.xlsx', [
      {
        nombre: 'Resumen',
        columnas: [{ titulo: 'Indicador', valor: r => r.indicador }, { titulo: 'Valor', valor: r => r.valor }],
        filas: filasResumen,
      },
      {
        nombre: 'Cobros por mes',
        columnas: [{ titulo: 'Período', valor: r => r.periodo }, { titulo: 'Cobrado', valor: r => r.total }],
        filas: cobrosPorMes,
      },
      {
        nombre: 'Top deudores',
        columnas: [
          { titulo: 'Inquilino', valor: r => r.inquilinoNombre },
          { titulo: 'Propiedad', valor: r => r.propiedadDireccion },
          { titulo: 'Cuotas vencidas', valor: r => r.cuotasVencidas },
          { titulo: 'Deuda (con mora)', valor: r => r.deuda },
        ],
        filas: topDeudores,
      },
    ]);
  }

  const cobrosVsFacturado = datos
    ? datos.cobrosPorMes.map((c, i) => ({ periodo: c.periodo, cobrado: c.total, facturado: datos.facturadoPorMes[i]?.total || 0 }))
    : [];

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Estadísticas" subtitle="Panorama general de cobros, facturación y propiedades">
        <Boton variante="secundario" disabled={!datos} onClick={exportar}><i className="fa-solid fa-download mr-1.5"></i>Exportar</Boton>
      </Topbar>

      <div className="px-6 py-5">
        <Estado cargando={cargando && !datos} error={error} vacio={false} />

        {datos && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <StatCard icon="fa-file-contract" label="Contratos activos" value={datos.resumen.contratos.contratosActivos} hint={`${datos.resumen.contratos.porVencer} por vencer (60 días)`} />
              <StatCard icon="fa-sack-dollar" label="Cobrado este mes" value={dinero(datos.resumen.contratos.cobrosMes)} tone="success" hint={`de ${dinero(datos.resumen.contratos.esperadoMes)} esperado`} />
              <StatCard icon="fa-file-invoice-dollar" label="Total facturado" value={dinero(datos.resumen.facturacion.totalFacturado)} hint={`${datos.resumen.facturacion.aprobadas} facturas aprobadas`} />
              <StatCard icon="fa-triangle-exclamation" label="Cuotas vencidas" value={datos.resumen.contratos.cuotasVencidas} tone="danger" hint={`${dinero(datos.resumen.contratos.montoVencidoConMora)} con mora`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
              <div className="lg:col-span-2 border border-stone-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-stone-700 mb-3">Cobrado vs Facturado — últimos 12 meses</h3>
                <GraficoCobrosFacturado datos={cobrosVsFacturado} />
              </div>
              <div className="border border-stone-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-stone-700 mb-3">Propiedades por estado</h3>
                <GraficoPropiedades propiedades={datos.resumen.propiedades} />
              </div>
            </div>

            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
                <h3 className="text-xs font-bold text-stone-700">Top deudores</h3>
              </div>
              {datos.topDeudores.length === 0 ? (
                <div className="p-6 text-center text-sm text-stone-400">No hay cuotas vencidas. 🎉</div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-stone-50 text-stone-400 uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold">Inquilino</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Propiedad</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Cuotas vencidas</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Deuda (con mora)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {datos.topDeudores.map(d => (
                      <tr key={d.inquilinoId} className="hover:bg-warm-50 transition">
                        <td className="px-4 py-3 font-semibold text-stone-700">{d.inquilinoNombre}</td>
                        <td className="px-4 py-3 text-stone-500">{d.propiedadDireccion}</td>
                        <td className="px-4 py-3 text-stone-500">{d.cuotasVencidas}</td>
                        <td className="px-4 py-3 font-semibold text-red-600">{dinero(d.deuda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
