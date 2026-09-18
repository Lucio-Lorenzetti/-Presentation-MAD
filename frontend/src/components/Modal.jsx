export default function Modal({ titulo, onCerrar, ancho = 'max-w-lg', children }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-20 p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${ancho} max-h-[90vh] overflow-y-auto`}>
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-bold text-stone-800">{titulo}</h3>
          <button onClick={onCerrar} className="text-stone-400 hover:text-stone-600">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
