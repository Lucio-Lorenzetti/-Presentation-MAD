import { useState } from 'react';
import Topbar from '../../components/Topbar';
import PreviewBanner from '../../components/PreviewBanner';

const personas = [
  { nombre: 'Ricardo Gutiérrez', tipo: 'Propietario', dni: '24.567.890', email: 'rgutierrez@mail.com', metodo: 'Transferencia', garantes: '—' },
  { nombre: 'Laura Fernández', tipo: 'Inquilino', dni: '35.123.456', email: 'lfernandez@mail.com', metodo: 'Transferencia', garantes: '2 garantes ✓' },
  { nombre: 'María Torres', tipo: 'Propietario', dni: '28.901.234', email: 'mtorres@mail.com', metodo: 'Efectivo', garantes: '—' },
  { nombre: 'Diego Sosa', tipo: 'Inquilino', dni: '32.456.789', email: 'dsosa@empresa.com', metodo: 'Transferencia', garantes: '2 garantes ✓' },
];

const tipoTono = {
  Propietario: 'bg-amber-50 text-amber-700',
  Inquilino: 'bg-sky-50 text-sky-700',
};

const filtros = ['Todos', 'Propietarios', 'Inquilinos', 'Lista negra'];

export default function PersonasPage() {
  const [filtro, setFiltro] = useState('Todos');
  const visibles = personas.filter(p => {
    if (filtro === 'Todos') return true;
    if (filtro === 'Propietarios') return p.tipo === 'Propietario';
    if (filtro === 'Inquilinos') return p.tipo === 'Inquilino';
    return false; // "Lista negra": sin datos de ejemplo todavía
  });

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Propietarios e Inquilinos" subtitle="Gestor de fichas con datos de contacto, garantías y métodos de pago">
        <button className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition"><i className="fa-solid fa-download mr-1.5"></i>Exportar</button>
        <button className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition font-semibold"><i className="fa-solid fa-plus mr-1.5"></i>Nueva persona</button>
      </Topbar>

      <PreviewBanner />

      <div className="px-6 py-5">
        <div className="flex gap-2 mb-5">
          {filtros.map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                filtro === f
                  ? 'bg-brand-500 text-white font-semibold'
                  : f === 'Lista negra'
                    ? 'bg-red-50 text-red-500 hover:bg-red-100'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

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
                  <th className="text-left px-4 py-2.5 font-semibold">Garantes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visibles.map((p, i) => (
                  <tr key={i} className="hover:bg-warm-50 transition">
                    <td className="px-4 py-3 font-semibold text-stone-700">{p.nombre}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tipoTono[p.tipo]}`}>{p.tipo}</span></td>
                    <td className="px-4 py-3 font-mono text-stone-500">{p.dni}</td>
                    <td className="px-4 py-3 text-stone-500">{p.email}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-semibold">{p.metodo}</span></td>
                    <td className="px-4 py-3 text-stone-400">{p.garantes}</td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-stone-400">Sin datos de ejemplo para este filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
