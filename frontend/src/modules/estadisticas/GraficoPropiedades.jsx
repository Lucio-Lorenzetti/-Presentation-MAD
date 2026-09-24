// Distribución de propiedades por estado — barras horizontales (HTML/CSS).
// Paleta validada (dataviz skill): Disponible = emerald #10B981, Alquilada = brand #F97316, En reparación = #2a78d6.
const FILAS = [
  { key: 'disponibles', label: 'Disponible', color: 'bg-emerald-500' },
  { key: 'alquiladas', label: 'Alquilada', color: 'bg-brand-500' },
  { key: 'enReparacion', label: 'En reparación', color: 'bg-[#2a78d6]' },
];

export default function GraficoPropiedades({ propiedades }) {
  const total = Math.max(1, propiedades.total);
  return (
    <div className="space-y-3">
      {FILAS.map(f => {
        const valor = propiedades[f.key] || 0;
        const pct = Math.round((valor / total) * 100);
        return (
          <div key={f.key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-stone-600 font-medium">{f.label}</span>
              <span className="text-stone-800 font-bold">{valor} <span className="text-stone-400 font-normal">({pct}%)</span></span>
            </div>
            <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
              <div className={`h-full rounded-full ${f.color} transition-all`} style={{ width: `${pct}%` }}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
