import { useState } from 'react';
import Modal from '../../components/Modal';
import Campo from '../../components/Campo';
import Boton from '../../components/Boton';
import { contratosApi, personasApi, propiedadesApi } from '../../api/recursos';
import { useCarga } from '../../hooks';
import { hoyISO } from '../../format';

function masAnios(iso, n) {
  const [y, m, d] = iso.split('-');
  return `${Number(y) + n}-${m}-${d}`;
}

export default function NuevoContratoForm({ onCerrar, onCreado }) {
  const { datos: propiedades } = useCarga(() => propiedadesApi.listar({ estado: 'DISPONIBLE' }), []);
  const { datos: inquilinos } = useCarga(() => personasApi.listar({ tipo: 'INQUILINO' }), []);

  const [form, setForm] = useState({
    propiedadId: '', inquilinoId: '', fechaInicio: hoyISO(), fechaFin: masAnios(hoyISO(), 2),
    montoInicial: '', indice: 'ICL', periodicidadMeses: 3, diaVencimiento: 10,
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function elegirPropiedad(id) {
    set('propiedadId', id);
    const p = (propiedades || []).find(x => String(x.id) === id);
    if (p?.alquiler_sugerido && !form.montoInicial) set('montoInicial', p.alquiler_sugerido);
  }

  async function submit(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await contratosApi.crear({
        ...form,
        propiedadId: Number(form.propiedadId),
        inquilinoId: Number(form.inquilinoId),
        montoInicial: Number(form.montoInicial),
        periodicidadMeses: Number(form.periodicidadMeses),
        diaVencimiento: Number(form.diaVencimiento),
      });
      onCreado();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  const sinPropiedades = propiedades && propiedades.length === 0;

  return (
    <Modal titulo="Nuevo contrato de alquiler" onCerrar={onCerrar}>
      <form onSubmit={submit} className="p-6 space-y-4 text-sm">
        {sinPropiedades && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            No hay propiedades disponibles. Cargá una en Propiedades primero.
          </div>
        )}
        <Campo label="Propiedad (disponibles)">
          <select className="input" required value={form.propiedadId} onChange={e => elegirPropiedad(e.target.value)}>
            <option value="">Elegir…</option>
            {(propiedades || []).map(p => <option key={p.id} value={p.id}>{p.direccion}</option>)}
          </select>
        </Campo>
        <Campo label="Inquilino">
          <select className="input" required value={form.inquilinoId} onChange={e => set('inquilinoId', e.target.value)}>
            <option value="">Elegir…</option>
            {(inquilinos || []).filter(i => !i.lista_negra).map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Inicio"><input className="input" type="date" required value={form.fechaInicio} onChange={e => set('fechaInicio', e.target.value)} /></Campo>
          <Campo label="Fin"><input className="input" type="date" required value={form.fechaFin} onChange={e => set('fechaFin', e.target.value)} /></Campo>
          <Campo label="Alquiler inicial ($)"><input className="input" type="number" min="1" required value={form.montoInicial} onChange={e => set('montoInicial', e.target.value)} /></Campo>
          <Campo label="Día de vencimiento (1-28)"><input className="input" type="number" min="1" max="28" required value={form.diaVencimiento} onChange={e => set('diaVencimiento', e.target.value)} /></Campo>
          <Campo label="Índice de actualización">
            <select className="input" value={form.indice} onChange={e => set('indice', e.target.value)}>
              <option value="ICL">ICL</option><option value="IPC">IPC</option><option value="NINGUNO">Sin índice</option>
            </select>
          </Campo>
          <Campo label="Actualiza cada (meses)">
            <input className="input" type="number" min="1" disabled={form.indice === 'NINGUNO'} value={form.periodicidadMeses} onChange={e => set('periodicidadMeses', e.target.value)} />
          </Campo>
        </div>
        <p className="text-[14px] text-stone-400">Se generan automáticamente todas las cuotas mensuales del contrato.</p>

        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <Boton type="button" variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" disabled={enviando}>{enviando ? 'Creando…' : 'Crear contrato'}</Boton>
        </div>
      </form>
    </Modal>
  );
}
