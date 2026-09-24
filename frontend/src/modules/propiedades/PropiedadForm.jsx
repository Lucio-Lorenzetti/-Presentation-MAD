import { useState } from 'react';
import Modal from '../../components/Modal';
import Campo from '../../components/Campo';
import Boton from '../../components/Boton';
import InputDinero from '../../components/InputDinero';
import { propiedadesApi, personasApi } from '../../api/recursos';
import { useCarga } from '../../hooks';

const num = v => (v === '' || v === null || v === undefined ? null : Number(v));

export default function PropiedadForm({ propiedad, onCerrar, onGuardada }) {
  const { datos: propietarios } = useCarga(() => personasApi.listar({ tipo: 'PROPIETARIO' }), []);
  const alquilada = propiedad?.estado === 'ALQUILADA';
  const [form, setForm] = useState({
    direccion: propiedad?.direccion || '',
    tipo: propiedad?.tipo || 'DEPTO',
    estado: propiedad?.estado || 'DISPONIBLE',
    propietarioId: propiedad?.propietario_id ?? '',
    barrio: propiedad?.barrio || '',
    ambientes: propiedad?.ambientes ?? '',
    dormitorios: propiedad?.dormitorios ?? '',
    banos: propiedad?.banos ?? '',
    superficieM2: propiedad?.superficie_m2 ?? '',
    servicios: propiedad?.servicios || '',
    expensas: propiedad?.expensas ?? '',
    alquilerSugerido: propiedad?.alquiler_sugerido ?? '',
    partida: propiedad?.partida || '',
    descripcion: propiedad?.descripcion || '',
    notas: propiedad?.notas || '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const data = {
      ...form,
      propietarioId: num(form.propietarioId),
      ambientes: num(form.ambientes), dormitorios: num(form.dormitorios), banos: num(form.banos),
      superficieM2: num(form.superficieM2), expensas: num(form.expensas), alquilerSugerido: num(form.alquilerSugerido),
    };
    if (!propiedad) delete data.estado; // el estado inicial lo decide el backend
    try {
      if (propiedad) await propiedadesApi.actualizar(propiedad.id, data);
      else await propiedadesApi.crear(data);
      onGuardada();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  const n = (k, label, extra = {}) => (
    <Campo label={label}>
      <input className="input" type="number" min="0" value={form[k]} onChange={e => set(k, e.target.value)} {...extra} />
    </Campo>
  );

  return (
    <Modal titulo={propiedad ? 'Editar propiedad' : 'Nueva propiedad'} onCerrar={onCerrar} ancho="max-w-2xl">
      <form onSubmit={submit} className="p-6 space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Dirección">
            <input className="input" required value={form.direccion} onChange={e => set('direccion', e.target.value)} />
          </Campo>
          <Campo label="Barrio / zona">
            <input className="input" value={form.barrio} onChange={e => set('barrio', e.target.value)} />
          </Campo>
          <Campo label="Tipo">
            <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              <option value="CASA">Casa</option><option value="DEPTO">Depto</option>
              <option value="LOCAL">Local</option><option value="PH">PH</option>
            </select>
          </Campo>
          <Campo label="Estado">
            <select className="input" value={form.estado} onChange={e => set('estado', e.target.value)} disabled={alquilada || !propiedad}
              title={alquilada ? 'Se libera al finalizar el contrato' : !propiedad ? 'Las propiedades nuevas se crean disponibles' : ''}>
              <option value="DISPONIBLE">Disponible</option>
              <option value="ALQUILADA" disabled>Alquilada (según contrato)</option>
              <option value="EN_REPARACION">En reparación</option>
            </select>
          </Campo>
        </div>

        <Campo label="Propietario">
          <select className="input" value={form.propietarioId} onChange={e => set('propietarioId', e.target.value)}>
            <option value="">—</option>
            {(propietarios || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Campo>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {n('ambientes', 'Ambientes')}
          {n('dormitorios', 'Dormitorios')}
          {n('banos', 'Baños')}
          {n('superficieM2', 'Superficie (m²)', { step: '0.1' })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Campo label="Alquiler sugerido">
            <InputDinero value={form.alquilerSugerido} onChange={v => set('alquilerSugerido', v)} />
          </Campo>
          <Campo label="Expensas">
            <InputDinero value={form.expensas} onChange={v => set('expensas', v)} />
          </Campo>
          <Campo label="Partida inmobiliaria">
            <input className="input" value={form.partida} onChange={e => set('partida', e.target.value)} />
          </Campo>
        </div>

        <Campo label="Servicios (luz, gas, agua…)">
          <input className="input" value={form.servicios} onChange={e => set('servicios', e.target.value)} />
        </Campo>
        <Campo label="Descripción">
          <textarea className="input" rows={2} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
        </Campo>
        <Campo label="Notas internas">
          <textarea className="input" rows={2} value={form.notas} onChange={e => set('notas', e.target.value)} />
        </Campo>

        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <Boton type="button" variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</Boton>
        </div>
      </form>
    </Modal>
  );
}
