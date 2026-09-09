import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import PreviewBanner from '../../components/PreviewBanner';

const contratos = [
  { inquilino: 'Laura Fernández', propiedad: 'Alsina 234, 3° B', alquiler: '$185.000', indice: 'ICL', estado: 'Vencida hace 3 días', tono: 'danger' },
  { inquilino: 'Diego Sosa', propiedad: 'Local · Av. Colón 1450', alquiler: '$420.000', indice: 'IPC', estado: 'Vencida hace 1 día', tono: 'danger' },
  { inquilino: 'Carolina Méndez', propiedad: 'Mitre 891, PB', alquiler: '$195.000', indice: 'ICL', estado: '⚡ Ajuste ICL pendiente', tono: 'warning' },
  { inquilino: 'Pablo Iglesias', propiedad: "PH · O'Higgins 567", alquiler: '$240.000', indice: 'ICL', estado: 'Al día', tono: 'ok' },
  { inquilino: 'Martín Rodríguez', propiedad: 'Soler 678, 2° A', alquiler: '$210.000', indice: 'IPC', estado: 'Al día', tono: 'ok' },
];

const tonos = {
  danger: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-600',
  ok: 'bg-emerald-50 text-emerald-600',
};
const indiceTono = { ICL: 'bg-blue-50 text-blue-600', IPC: 'bg-violet-50 text-violet-600' };

export default function AlquileresPage() {
  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Alquileres y Contratos" subtitle="119 contratos activos · 3 por vencer · 7 cuotas vencidas">
        <button className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition"><i className="fa-solid fa-filter mr-1.5"></i>Filtrar</button>
        <button className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition font-semibold"><i className="fa-solid fa-plus mr-1.5"></i>Nuevo contrato</button>
      </Topbar>

      <PreviewBanner />

      <div className="px-6 py-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="Contratos activos" value="119" hint="3 por vencer" />
          <StatCard label="Cobros del mes" value="$8.4M" hint="82% de $10.2M" tone="success" />
          <StatCard label="Próx. actualización" value="12" hint="ajustes IPC/ICL este mes" />
          <StatCard label="Cuotas vencidas" value="7" hint="$1.2M pendiente + mora" tone="danger" />
        </div>

        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <span className="text-xs font-bold text-stone-700">Contratos activos</span>
            <input type="text" placeholder="Buscar contrato…" className="text-xs px-3 py-1.5 border border-stone-200 rounded-lg w-52 bg-white placeholder:text-stone-300 focus:outline-none focus:border-brand-300" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-50 text-stone-400 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Inquilino</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Propiedad</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Alquiler</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Índice</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Estado cuota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {contratos.map((c, i) => (
                  <tr key={i} className="hover:bg-warm-50 transition">
                    <td className="px-4 py-3 font-semibold text-stone-700">{c.inquilino}</td>
                    <td className="px-4 py-3 text-stone-500">{c.propiedad}</td>
                    <td className="px-4 py-3 font-semibold text-stone-700">{c.alquiler}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${indiceTono[c.indice]}`}>{c.indice}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${tonos[c.tono]}`}>{c.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
