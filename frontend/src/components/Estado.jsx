// Mensajes de carga / error / vacío para las tablas de cada módulo.
export default function Estado({ cargando, error, vacio, mensajeVacio, icono = 'fa-inbox' }) {
  const base = 'border border-stone-200 rounded-xl p-10 text-center text-sm';
  if (cargando) {
    return (
      <div className={`${base} text-stone-400`}>
        <i className="fa-solid fa-circle-notch fa-spin text-lg mb-2 block"></i>
        Cargando…
      </div>
    );
  }
  if (error) {
    return (
      <div className={`${base} text-red-500 bg-red-50 border-red-100`}>
        <i className="fa-solid fa-triangle-exclamation text-lg mb-2 block"></i>
        {error}
      </div>
    );
  }
  if (vacio) {
    return (
      <div className={`${base} text-stone-400`}>
        <i className={`fa-solid ${icono} text-2xl mb-2 block text-stone-300`}></i>
        {mensajeVacio}
      </div>
    );
  }
  return null;
}
