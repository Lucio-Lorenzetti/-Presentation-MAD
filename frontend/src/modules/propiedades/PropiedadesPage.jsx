import Topbar from '../../components/Topbar';
import PreviewBanner from '../../components/PreviewBanner';

const propiedades = [
  { direccion: 'Belgrano 445, Centro', tipo: 'Casa', tipoTono: 'bg-green-50 text-green-700', propietario: 'Ricardo Gutiérrez', estado: 'Disponible', estadoTono: 'bg-emerald-50 text-emerald-600', alquiler: '$280.000' },
  { direccion: 'Alsina 234, 3° B', tipo: 'Depto', tipoTono: 'bg-blue-50 text-blue-700', propietario: 'María Torres', estado: 'Alquilada', estadoTono: 'bg-brand-50 text-brand-700', alquiler: '$185.000' },
  { direccion: 'Av. Colón 1450', tipo: 'Local', tipoTono: 'bg-purple-50 text-purple-700', propietario: 'Inversiones Bahía SA', estado: 'Alquilada', estadoTono: 'bg-brand-50 text-brand-700', alquiler: '$420.000' },
  { direccion: "O'Higgins 567", tipo: 'PH', tipoTono: 'bg-amber-50 text-amber-700', propietario: 'Carlos Peralta', estado: 'Alquilada', estadoTono: 'bg-brand-50 text-brand-700', alquiler: '$240.000' },
];

export default function PropiedadesPage() {
  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Propiedades" subtitle="142 totales · 23 disponibles · 119 alquiladas">
        <button className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition"><i className="fa-solid fa-download mr-1.5"></i>Exportar</button>
        <button className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition font-semibold"><i className="fa-solid fa-plus mr-1.5"></i>Nueva propiedad</button>
      </Topbar>

      <PreviewBanner />

      <div className="px-6 py-5">
        <div className="flex items-center gap-2 mb-5 p-3 bg-stone-50 rounded-xl border border-stone-100">
          <input type="text" placeholder="Buscar dirección…" className="flex-1 text-xs px-3 py-1.5 border border-stone-200 rounded-lg bg-white placeholder:text-stone-300 focus:outline-none focus:border-brand-300" />
          <select className="text-xs px-3 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-500 focus:outline-none">
            <option>Tipo</option><option>Casa</option><option>Depto</option><option>Local</option><option>PH</option>
          </select>
          <select className="text-xs px-3 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-500 focus:outline-none">
            <option>Estado</option><option>Disponible</option><option>Alquilada</option><option>En reparación</option>
          </select>
        </div>

        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-50 text-stone-400 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Dirección</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Tipo</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Propietario</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Estado</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Alquiler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {propiedades.map((p, i) => (
                  <tr key={i} className="hover:bg-warm-50 transition">
                    <td className="px-4 py-3 font-semibold text-stone-700">{p.direccion}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${p.tipoTono}`}>{p.tipo}</span></td>
                    <td className="px-4 py-3 text-stone-500">{p.propietario}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.estadoTono}`}>{p.estado}</span></td>
                    <td className="px-4 py-3 font-semibold text-stone-700">{p.alquiler}</td>
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
