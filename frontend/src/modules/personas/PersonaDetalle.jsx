import { useState } from 'react';
import Modal from '../../components/Modal';
import Boton from '../../components/Boton';
import { personasApi } from '../../api/recursos';
import { useCarga } from '../../hooks';
import { useAuth } from '../../auth';
import { dinero, fecha, formatCuit, formatDni } from '../../format';

export default function PersonaDetalle({ id, onCerrar, onEditar, onCambio }) {
  const { puede } = useAuth();
  const { datos: p, cargando, error, recargar } = useCarga(() => personasApi.obtener(id), [id]);
  const [nuevo, setNuevo] = useState(null); // { nombre, dni, telefono } | null
  const [errorAccion, setErrorAccion] = useState(null);

  async function accion(fn, cierra = false) {
    setErrorAccion(null);
    try {
      await fn();
      onCambio();
      if (cierra) onCerrar();
      else await recargar();
    } catch (e) {
      setErrorAccion(e.message);
    }
  }

  const eliminar = () => {
    if (window.confirm(`¿Eliminar a ${p.nombre}?`)) accion(() => personasApi.eliminar(id), true);
  };
  const agregarGarante = async e => {
    e.preventDefault();
    await accion(async () => { await personasApi.agregarGarante(id, nuevo); setNuevo(null); });
  };
  const quitarGarante = g => {
    if (window.confirm(`¿Quitar a ${g.nombre} como garante?`)) accion(() => personasApi.eliminarGarante(id, g.id));
  };

  const esProp = p?.tipo === 'PROPIETARIO';

  return (
    <Modal titulo={p ? p.nombre : 'Ficha'} onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="p-6 text-sm space-y-5">
        {cargando && !p && <div className="text-stone-400 text-center py-6">Cargando…</div>}
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

        {p && (
          <>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${esProp ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>{esProp ? 'Propietario' : 'Inquilino'}</span>
              {p.lista_negra === 1 && <span className="px-2 py-0.5 rounded bg-red-50 text-red-500 text-[10px] font-bold">Lista negra</span>}
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
              <Dato label="DNI" valor={formatDni(p.dni)} />
              <Dato label="CUIT / CUIL" valor={formatCuit(p.cuit)} />
              <Dato label="Email" valor={p.email} />
              <Dato label="Teléfono" valor={p.telefono} />
              <Dato label="Domicilio" valor={p.domicilio} />
              <Dato label={esProp ? 'Método de cobro' : 'Método de pago'} valor={p.metodo_cobro} />
              {esProp && <Dato label="CBU" valor={p.cbu} />}
              {esProp && <Dato label="Alias" valor={p.alias} />}
              {esProp && <Dato label="Comisión" valor={p.comision_pct != null ? `${p.comision_pct} %` : null} />}
            </div>
            {p.notas && <p className="text-xs text-stone-500 bg-warm-50 border border-stone-100 rounded-lg px-3 py-2">{p.notas}</p>}

            {errorAccion && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorAccion}</div>}

            {esProp ? (
              <Seccion titulo={`Propiedades (${p.propiedades.length})`}>
                {p.propiedades.length === 0 && <Vacio>Sin propiedades asignadas.</Vacio>}
                {p.propiedades.map(x => (
                  <Fila key={x.id}>
                    <span className="font-semibold text-stone-700">{x.direccion}</span>
                    <span className="text-stone-400">{x.estado === 'ALQUILADA' ? `Alquilada · ${dinero(x.alquiler_actual)}` : x.estado === 'DISPONIBLE' ? 'Disponible' : 'En reparación'}</span>
                  </Fila>
                ))}
              </Seccion>
            ) : (
              <>
                <Seccion titulo={`Contratos (${p.contratos.length})`}>
                  {p.contratos.length === 0 && <Vacio>Sin contratos.</Vacio>}
                  {p.contratos.map(c => (
                    <Fila key={c.id}>
                      <span className="font-semibold text-stone-700">{c.propiedad_direccion}</span>
                      <span className="text-stone-400">
                        {dinero(c.monto_actual)} · {fecha(c.fecha_inicio)} → {fecha(c.fecha_fin)} · {c.estado.toLowerCase()}
                        {c.cuotas_vencidas > 0 && <span className="text-red-500 font-semibold"> · {c.cuotas_vencidas} vencida(s)</span>}
                      </span>
                    </Fila>
                  ))}
                </Seccion>

                <Seccion
                  titulo={`Garantes (${p.garantes.length})`}
                  accion={!nuevo && puede('escribir') && <button className="text-xs text-brand-600 hover:underline" onClick={() => setNuevo({ nombre: '', dni: '', telefono: '' })}>+ Agregar</button>}
                >
                  {p.garantes.length === 0 && !nuevo && <Vacio>Sin garantes cargados.</Vacio>}
                  {p.garantes.map(g => (
                    <Fila key={g.id}>
                      <span className="font-semibold text-stone-700">{g.nombre}</span>
                      <span className="text-stone-400">
                        {[g.dni && `DNI ${formatDni(g.dni)}`, g.tipo_garantia, g.telefono].filter(Boolean).join(' · ')}
                        {puede('escribir') && <button className="ml-3 text-stone-300 hover:text-red-500" onClick={() => quitarGarante(g)} title="Quitar"><i className="fa-solid fa-xmark"></i></button>}
                      </span>
                    </Fila>
                  ))}
                  {nuevo && (
                    <form onSubmit={agregarGarante} className="grid grid-cols-4 gap-2 p-2">
                      <input className="input" required placeholder="Nombre" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
                      <input className="input" placeholder="DNI" value={nuevo.dni} onChange={e => setNuevo({ ...nuevo, dni: e.target.value })} />
                      <input className="input" placeholder="Teléfono" value={nuevo.telefono} onChange={e => setNuevo({ ...nuevo, telefono: e.target.value })} />
                      <div className="flex gap-1">
                        <Boton type="submit">Guardar</Boton>
                        <Boton type="button" variante="secundario" onClick={() => setNuevo(null)}>✕</Boton>
                      </div>
                    </form>
                  )}
                </Seccion>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              {puede('eliminar') && <Boton variante="peligro" onClick={eliminar}>Eliminar</Boton>}
              {puede('escribir') && <Boton onClick={() => onEditar(p)}>Editar</Boton>}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

const Dato = ({ label, valor }) => (
  <div>
    <div className="text-stone-400 text-[10px] mb-0.5">{label}</div>
    <div className="font-medium text-stone-700 break-all">{valor || '—'}</div>
  </div>
);

const Seccion = ({ titulo, accion, children }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-xs font-bold text-stone-700">{titulo}</h4>
      {accion}
    </div>
    <div className="border border-stone-200 rounded-xl divide-y divide-stone-100">{children}</div>
  </div>
);

const Fila = ({ children }) => <div className="px-3 py-2 text-xs flex items-center justify-between gap-3">{children}</div>;
const Vacio = ({ children }) => <div className="px-3 py-3 text-xs text-stone-400 text-center">{children}</div>;
