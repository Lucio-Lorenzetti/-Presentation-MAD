import { useCallback, useEffect, useState } from 'react';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import Boton from '../../components/Boton';
import EstadoArcaBanner from './EstadoArcaBanner';
import FacturasTable from './FacturasTable';
import NuevaFacturaForm from './NuevaFacturaForm';
import { facturasApi } from '../../api/facturas';
import { ApiError } from '../../api/client';
import { descargarExcel } from '../../excel';

const LETRA_POR_TIPO = { 1: 'A', 6: 'B', 11: 'C' };
const formatFecha = yyyymmdd => yyyymmdd ? `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}` : '—';

export default function FacturacionPage() {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    facturasApi.listar()
      .then(data => { setFacturas(data); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'No se pudo conectar con el backend.'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const aprobadas = facturas.filter(f => f.resultado === 'A');
  const rechazadas = facturas.filter(f => f.resultado === 'R');
  const totalFacturado = aprobadas.reduce((acc, f) => acc + f.importe_total, 0);

  function exportar() {
    descargarExcel('facturas.xlsx', [
      { titulo: 'Fecha', valor: f => formatFecha(f.fecha) },
      { titulo: 'Tipo', valor: f => LETRA_POR_TIPO[f.cbte_tipo] || '?' },
      { titulo: 'Número', valor: f => `${String(f.pto_vta).padStart(5, '0')}-${String(f.numero).padStart(8, '0')}` },
      { titulo: 'Cliente', valor: f => f.receptor_razon_social },
      { titulo: 'Importe neto', valor: f => f.importe_neto },
      { titulo: 'IVA', valor: f => f.importe_iva },
      { titulo: 'Importe total', valor: f => f.importe_total },
      { titulo: 'Resultado', valor: f => f.resultado === 'A' ? 'Aprobada' : 'Rechazada' },
    ], facturas, 'Facturas');
  }

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Facturación y Recibos" subtitle="Integración real con ARCA (WSFEv1) — Facturas A/B/C">
        <Boton variante="secundario" disabled={!facturas.length} onClick={exportar}><i className="fa-solid fa-download mr-1.5"></i>Exportar</Boton>
        <button
          onClick={cargar}
          className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition"
        >
          <i className="fa-solid fa-rotate mr-1.5"></i>Actualizar
        </button>
        <button
          onClick={() => setMostrarForm(true)}
          className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition font-semibold"
        >
          <i className="fa-solid fa-plus mr-1.5"></i>Emitir factura
        </button>
      </Topbar>

      <EstadoArcaBanner />

      <div className="px-6 py-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="Facturas emitidas" value={facturas.length} hint="Total histórico" />
          <StatCard label="Aprobadas" value={aprobadas.length} tone="success" />
          <StatCard label="Rechazadas" value={rechazadas.length} tone={rechazadas.length ? 'danger' : 'default'} />
          <StatCard label="Total facturado" value={`$ ${totalFacturado.toFixed(2)}`} hint="Sobre aprobadas" />
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        ) : (
          <FacturasTable facturas={facturas} cargando={cargando} />
        )}
      </div>

      {mostrarForm && (
        <NuevaFacturaForm
          onCerrar={() => setMostrarForm(false)}
          onEmitida={cargar}
        />
      )}
    </div>
  );
}
