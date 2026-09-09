const LETRA_POR_TIPO = { 1: 'A', 6: 'B', 11: 'C' };

export default function FacturasTable({ facturas, cargando }) {
  if (cargando) {
    return <div className="border border-stone-200 rounded-xl p-8 text-center text-sm text-stone-400">Cargando facturas…</div>;
  }

  if (facturas.length === 0) {
    return (
      <div className="border border-stone-200 rounded-xl p-8 text-center text-sm text-stone-400">
        Todavía no emitiste ninguna factura.
      </div>
    );
  }

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-stone-50 text-stone-400 uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Fecha</th>
              <th className="text-left px-4 py-2.5 font-semibold">Tipo</th>
              <th className="text-left px-4 py-2.5 font-semibold">Número</th>
              <th className="text-left px-4 py-2.5 font-semibold">Cliente</th>
              <th className="text-left px-4 py-2.5 font-semibold">Importe</th>
              <th className="text-left px-4 py-2.5 font-semibold">Resultado</th>
              <th className="text-left px-4 py-2.5 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {facturas.map(f => (
              <tr key={f.id} className="hover:bg-warm-50 transition">
                <td className="px-4 py-3 text-stone-500">{formatFecha(f.fecha)}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full text-[10px] font-semibold">
                    {LETRA_POR_TIPO[f.cbte_tipo] || '?'}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-stone-700">
                  {String(f.pto_vta).padStart(5, '0')}-{String(f.numero).padStart(8, '0')}
                </td>
                <td className="px-4 py-3 text-stone-500">{f.receptor_razon_social || '—'}</td>
                <td className="px-4 py-3 font-semibold text-stone-700">$ {f.importe_total.toFixed(2)}</td>
                <td className="px-4 py-3">
                  {f.resultado === 'A' ? (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-semibold">Aprobada</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[10px] font-semibold">Rechazada</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {f.resultado === 'A' && (
                    <a
                      href={`/api/facturas/${f.id}/pdf`} target="_blank" rel="noreferrer"
                      className="w-6 h-6 rounded bg-stone-100 text-stone-400 hover:bg-brand-50 hover:text-brand-600 flex items-center justify-center transition"
                      title="Ver PDF"
                    >
                      <i className="fa-solid fa-file-pdf text-[10px]"></i>
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatFecha(yyyymmdd) {
  if (!yyyymmdd) return '-';
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}
