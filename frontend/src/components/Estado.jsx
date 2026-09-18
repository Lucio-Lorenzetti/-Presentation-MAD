// Mensajes de carga / error / vacío para las tablas de cada módulo.
export default function Estado({ cargando, error, vacio, mensajeVacio }) {
  const base = 'border border-stone-200 rounded-xl p-8 text-center text-sm';
  if (cargando) return <div className={`${base} text-stone-400`}>Cargando…</div>;
  if (error) return <div className={`${base} text-red-500 bg-red-50 border-red-100`}>{error}</div>;
  if (vacio) return <div className={`${base} text-stone-400`}>{mensajeVacio}</div>;
  return null;
}
