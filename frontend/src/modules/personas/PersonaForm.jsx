import { useState } from 'react';
import Modal from '../../components/Modal';
import Campo from '../../components/Campo';
import Boton from '../../components/Boton';
import { personasApi } from '../../api/recursos';

const METODOS = ['Transferencia', 'Efectivo', 'Cheque', 'Débito automático'];
const GARANTIAS = ['Propietaria', 'Recibo de sueldo', 'Seguro de caución', 'Otra'];

export default function PersonaForm({ persona, tipoInicial = 'INQUILINO', onCerrar, onGuardada }) {
  const [form, setForm] = useState({
    nombre: persona?.nombre || '',
    tipo: persona?.tipo || tipoInicial,
    dni: persona?.dni || '',
    cuit: persona?.cuit || '',
    email: persona?.email || '',
    telefono: persona?.telefono || '',
    domicilio: persona?.domicilio || '',
    metodoCobro: persona?.metodo_cobro || '',
    cbu: persona?.cbu || '',
    alias: persona?.alias || '',
    comisionPct: persona?.comision_pct ?? '',
    listaNegra: persona?.lista_negra === 1,
    notas: persona?.notas || '',
  });
  const [garantes, setGarantes] = useState([]); // sólo al crear; al editar se gestionan desde la ficha
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const esProp = form.tipo === 'PROPIETARIO';
  const setGarante = (i, k, v) => setGarantes(gs => gs.map((g, j) => (j === i ? { ...g, [k]: v } : g)));

  async function submit(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const data = { ...form, comisionPct: esProp && form.comisionPct !== '' ? Number(form.comisionPct) : null };
    try {
      if (persona) await personasApi.actualizar(persona.id, data);
      else await personasApi.crear({ ...data, garantes: garantes.filter(g => g.nombre.trim()) });
      onGuardada();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={persona ? 'Editar persona' : 'Nueva persona'} onCerrar={onCerrar}>
      <form onSubmit={submit} className="p-6 space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Nombre completo / razón social">
            <input className="input" required value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </Campo>
          <Campo label="Tipo">
            <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              <option value="INQUILINO">Inquilino</option>
              <option value="PROPIETARIO">Propietario</option>
            </select>
          </Campo>
          <Campo label="DNI"><input className="input" inputMode="numeric" placeholder="sin puntos" value={form.dni} onChange={e => set('dni', e.target.value)} /></Campo>
          <Campo label="CUIT / CUIL"><input className="input" inputMode="numeric" placeholder="11 dígitos" value={form.cuit} onChange={e => set('cuit', e.target.value)} /></Campo>
          <Campo label="Email"><input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Campo>
          <Campo label="Teléfono"><input className="input" value={form.telefono} onChange={e => set('telefono', e.target.value)} /></Campo>
        </div>
        <Campo label="Domicilio">
          <input className="input" value={form.domicilio} onChange={e => set('domicilio', e.target.value)} />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo label={esProp ? 'Método de cobro' : 'Método de pago'}>
            <select className="input" value={form.metodoCobro} onChange={e => set('metodoCobro', e.target.value)}>
              <option value="">—</option>
              {METODOS.map(m => <option key={m}>{m}</option>)}
            </select>
          </Campo>
          {esProp && (
            <Campo label="Comisión de la inmobiliaria (%)">
              <input className="input" type="number" min="0" max="100" step="0.1" value={form.comisionPct} onChange={e => set('comisionPct', e.target.value)} />
            </Campo>
          )}
          {esProp && (
            <>
              <Campo label="CBU"><input className="input" inputMode="numeric" placeholder="22 dígitos" value={form.cbu} onChange={e => set('cbu', e.target.value)} /></Campo>
              <Campo label="Alias"><input className="input" value={form.alias} onChange={e => set('alias', e.target.value)} /></Campo>
            </>
          )}
        </div>

        <Campo label="Notas">
          <textarea className="input" rows={2} value={form.notas} onChange={e => set('notas', e.target.value)} />
        </Campo>
        <label className="flex items-center gap-2 text-xs text-stone-500">
          <input type="checkbox" checked={form.listaNegra} onChange={e => set('listaNegra', e.target.checked)} />
          Lista negra (no se le pueden asignar contratos nuevos)
        </label>

        {!persona && form.tipo === 'INQUILINO' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-stone-500">Garantes</span>
              <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => setGarantes(g => [...g, { nombre: '', dni: '', tipoGarantia: GARANTIAS[0] }])}>+ Agregar</button>
            </div>
            {garantes.map((g, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <input className="input" placeholder="Nombre" value={g.nombre} onChange={e => setGarante(i, 'nombre', e.target.value)} />
                <input className="input" placeholder="DNI" value={g.dni} onChange={e => setGarante(i, 'dni', e.target.value)} />
                <select className="input" value={g.tipoGarantia} onChange={e => setGarante(i, 'tipoGarantia', e.target.value)}>
                  {GARANTIAS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <Boton type="button" variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</Boton>
        </div>
      </form>
    </Modal>
  );
}
