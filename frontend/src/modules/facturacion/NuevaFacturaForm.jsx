import { useState } from 'react';
import { facturasApi } from '../../api/facturas';
import { ApiError } from '../../api/client';

const DOC_TIPOS = [
  { value: 'CUIT', label: 'CUIT' },
  { value: 'CUIL', label: 'CUIL' },
  { value: 'DNI', label: 'DNI' },
  { value: 'CONSUMIDOR_FINAL', label: 'Sin identificar (consumidor final)' },
];

const CONDICIONES_IVA = [
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTO', label: 'Monotributo' },
  { value: 'CONSUMIDOR_FINAL', label: 'Consumidor Final' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'NO_CATEGORIZADO', label: 'No categorizado' },
];

const hoy = () => new Date().toISOString().slice(0, 10);
const finDeMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
};

const initialForm = {
  docTipo: 'DNI',
  docNro: '',
  razonSocial: '',
  condicionIva: 'CONSUMIDOR_FINAL',
  importeNeto: '',
  descripcion: 'Honorarios por intermediación en alquiler',
  periodoDesde: hoy(),
  periodoHasta: finDeMes(),
  fchVtoPago: hoy(),
};

export default function NuevaFacturaForm({ onEmitida, onCerrar }) {
  const [form, setForm] = useState(initialForm);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok: bool, factura } | { ok: false, error }

  function setCampo(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    setResultado(null);
    try {
      const factura = await facturasApi.crear({
        receptor: {
          docTipo: form.docTipo,
          docNro: form.docTipo === 'CONSUMIDOR_FINAL' ? 0 : Number(form.docNro),
          razonSocial: form.razonSocial || undefined,
          condicionIva: form.condicionIva,
        },
        importeNeto: Number(form.importeNeto),
        descripcion: form.descripcion,
        periodo: { desde: form.periodoDesde, hasta: form.periodoHasta },
        fchVtoPago: form.fchVtoPago,
      });
      setResultado({ ok: factura.resultado === 'A', factura });
      if (factura.resultado === 'A') onEmitida?.();
    } catch (e) {
      setResultado({ ok: false, error: e instanceof ApiError ? e.message : 'Error de red al contactar el backend.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-20 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-bold text-stone-800">Emitir factura de honorarios</h3>
          <button onClick={onCerrar} className="text-stone-400 hover:text-stone-600">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {resultado ? (
          <ResultadoEmision resultado={resultado} onNueva={() => setResultado(null)} onCerrar={onCerrar} />
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Tipo de documento">
                <select className="input" value={form.docTipo} onChange={e => setCampo('docTipo', e.target.value)}>
                  {DOC_TIPOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Campo>
              <Campo label="Número de documento">
                <input
                  className="input" type="number" required={form.docTipo !== 'CONSUMIDOR_FINAL'}
                  disabled={form.docTipo === 'CONSUMIDOR_FINAL'}
                  value={form.docTipo === 'CONSUMIDOR_FINAL' ? '' : form.docNro}
                  onChange={e => setCampo('docNro', e.target.value)}
                />
              </Campo>
            </div>

            <Campo label="Nombre / Razón social">
              <input className="input" value={form.razonSocial} onChange={e => setCampo('razonSocial', e.target.value)} />
            </Campo>

            <Campo label="Condición frente al IVA">
              <select className="input" value={form.condicionIva} onChange={e => setCampo('condicionIva', e.target.value)}>
                {CONDICIONES_IVA.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Campo>

            <Campo label="Descripción">
              <input className="input" value={form.descripcion} onChange={e => setCampo('descripcion', e.target.value)} />
            </Campo>

            <div className="grid grid-cols-2 gap-3">
              <Campo label="Período desde">
                <input className="input" type="date" value={form.periodoDesde} onChange={e => setCampo('periodoDesde', e.target.value)} />
              </Campo>
              <Campo label="Período hasta">
                <input className="input" type="date" value={form.periodoHasta} onChange={e => setCampo('periodoHasta', e.target.value)} />
              </Campo>
            </div>

            <Campo label="Importe (sin IVA, si corresponde discriminarlo)">
              <input
                className="input" type="number" min="0" step="0.01" required
                value={form.importeNeto} onChange={e => setCampo('importeNeto', e.target.value)}
              />
            </Campo>

            <button
              type="submit" disabled={enviando}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg py-2.5 font-semibold transition"
            >
              {enviando ? 'Emitiendo...' : 'Solicitar CAE a ARCA'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-stone-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function ResultadoEmision({ resultado, onNueva, onCerrar }) {
  if (!resultado.ok && resultado.error) {
    return (
      <div className="p-6 space-y-4 text-sm">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
          <strong>No se pudo emitir la factura.</strong>
          <p className="mt-1">{resultado.error}</p>
        </div>
        <button onClick={onNueva} className="w-full border border-stone-200 rounded-lg py-2.5 font-semibold text-stone-600 hover:bg-stone-50">
          Volver a intentar
        </button>
      </div>
    );
  }

  const f = resultado.factura;
  const observaciones = safeParse(f.observaciones);

  return (
    <div className="p-6 space-y-4 text-sm">
      {f.resultado === 'A' ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3">
          <strong>Factura aprobada por ARCA.</strong>
          <p className="mt-1">CAE: {f.cae} — vence {formatFecha(f.cae_vencimiento)}</p>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
          <strong>ARCA rechazó el comprobante.</strong>
          {observaciones?.length > 0 && (
            <ul className="mt-1 list-disc list-inside">
              {observaciones.map((o, i) => <li key={i}>{o.msg || o.Msg}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {f.resultado === 'A' && (
          <a
            href={`/api/facturas/${f.id}/pdf`} target="_blank" rel="noreferrer"
            className="flex-1 text-center bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2.5 font-semibold transition"
          >
            <i className="fa-solid fa-file-pdf mr-1.5"></i>Ver PDF
          </a>
        )}
        <button onClick={onCerrar} className="flex-1 border border-stone-200 rounded-lg py-2.5 font-semibold text-stone-600 hover:bg-stone-50">
          Cerrar
        </button>
      </div>
    </div>
  );
}

function safeParse(json) {
  try { return JSON.parse(json); } catch { return []; }
}

function formatFecha(yyyymmdd) {
  if (!yyyymmdd) return '-';
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}
