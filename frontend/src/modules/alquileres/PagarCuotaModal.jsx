import { useState } from 'react';
import Boton from '../../components/Boton';
import { dinero } from '../../format';

export default function PagarCuotaModal({ cuota, error, procesando, onCerrar, onConfirmar }) {
  const [notas, setNotas] = useState('');
  const [archivo, setArchivo] = useState(null);

  const total = cuota.totalConMora ?? cuota.monto;

  function submit(e) {
    e.preventDefault();
    onConfirmar({ notas: notas.trim(), archivo });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-bold text-stone-800">Registrar pago — {cuota.periodo}</h3>
          <button type="button" onClick={onCerrar} className="text-stone-400 hover:text-stone-600">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm">
          <div className="bg-warm-50 border border-stone-100 rounded-xl px-4 py-3">
            <div className="flex justify-between text-stone-600">
              <span>Cuota {cuota.periodo}</span><span>{dinero(cuota.monto)}</span>
            </div>
            {cuota.mora > 0 && (
              <div className="flex justify-between text-red-600 text-xs mt-1">
                <span>Mora ({cuota.diasMora} días)</span><span>+{dinero(cuota.mora)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-stone-800 border-t border-stone-200 mt-2 pt-2">
              <span>Total a registrar</span><span>{dinero(total)}</span>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-stone-500 mb-1 block">Observaciones (opcional)</span>
            <textarea
              className="input" rows={3}
              placeholder="Ej: pagó en efectivo, adelantó parte del mes que viene, etc."
              value={notas} onChange={e => setNotas(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-stone-500 mb-1 block">Comprobante del inquilino (opcional)</span>
            <div className="flex items-center gap-2">
              <label className="flex-1 border border-dashed border-stone-300 rounded-lg px-3 py-2.5 text-xs text-stone-500 cursor-pointer hover:border-brand-300 hover:text-brand-600 transition text-center truncate">
                <i className="fa-solid fa-paperclip mr-1.5"></i>
                {archivo ? archivo.name : 'JPG, PNG, WEBP o PDF (máx. 8 MB)'}
                <input
                  type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                  onChange={e => setArchivo(e.target.files[0] || null)}
                />
              </label>
              {archivo && (
                <button type="button" onClick={() => setArchivo(null)} className="text-stone-400 hover:text-red-500 shrink-0" title="Quitar archivo">
                  <i className="fa-solid fa-circle-xmark"></i>
                </button>
              )}
            </div>
          </label>

          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={onCerrar} disabled={procesando}>Cancelar</Boton>
          <Boton type="submit" disabled={procesando}>{procesando ? 'Registrando…' : 'Registrar pago'}</Boton>
        </div>
      </form>
    </div>
  );
}
