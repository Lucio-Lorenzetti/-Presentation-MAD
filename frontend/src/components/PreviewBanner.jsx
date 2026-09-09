/** Deja explícito, dentro del sistema real, qué módulos todavía son solo la maqueta de venta. */
export default function PreviewBanner() {
  return (
    <div className="mx-6 mt-5 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-4 py-3 flex items-start gap-2.5">
      <i className="fa-solid fa-flask mt-0.5"></i>
      <div>
        <strong>Vista previa de la maqueta de venta.</strong> Este módulo todavía no está conectado a datos
        reales ni tiene backend — los datos que ves son de ejemplo, iguales a los de la presentación.
      </div>
    </div>
  );
}
