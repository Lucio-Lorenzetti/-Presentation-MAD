const estilos = {
  primario: 'bg-brand-500 text-white hover:bg-brand-600 font-semibold',
  secundario: 'border border-stone-200 text-stone-500 hover:bg-stone-50',
  peligro: 'border border-red-200 text-red-500 hover:bg-red-50',
};

export default function Boton({ variante = 'primario', className = '', ...props }) {
  return (
    <button
      {...props}
      className={`text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${estilos[variante]} ${className}`}
    />
  );
}
