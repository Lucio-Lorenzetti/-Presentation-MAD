import { useState } from 'react';
import Topbar from '../../components/Topbar';
import Boton from '../../components/Boton';
import Modal from '../../components/Modal';
import Campo from '../../components/Campo';
import Estado from '../../components/Estado';
import { usuariosApi } from '../../api/recursos';
import { useCarga } from '../../hooks';
import { ROLES, useAuth } from '../../auth';

const rolTono = {
  DESARROLLADOR: 'bg-violet-50 text-violet-700', ADMINISTRADOR: 'bg-brand-50 text-brand-700',
  GESTOR: 'bg-sky-50 text-sky-700', CONSULTA: 'bg-stone-100 text-stone-500',
};

const DESCRIPCION = {
  DESARROLLADOR: 'Acceso técnico total.',
  ADMINISTRADOR: 'Todo: facturación ARCA, eliminaciones y usuarios.',
  GESTOR: 'Carga y edita contratos, personas, propiedades y pagos. Sin facturación ni eliminaciones.',
  CONSULTA: 'Sólo lectura de alquileres y propiedades.',
};

export default function UsuariosPage() {
  const { usuario: yo } = useAuth();
  const { datos: usuarios, cargando, error, recargar } = useCarga(() => usuariosApi.listar(), []);
  const [editando, setEditando] = useState(null); // null | 'nuevo' | usuario

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Usuarios y permisos" subtitle="Quién puede entrar al sistema y qué puede hacer">
        <Boton onClick={() => setEditando('nuevo')}><i className="fa-solid fa-plus mr-1.5"></i>Nuevo usuario</Boton>
      </Topbar>

      <div className="px-6 py-5 space-y-5">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(ROLES).map(([k, v]) => (
            <div key={k} className="bg-warm-50 border border-stone-100 rounded-xl p-3">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rolTono[k]}`}>{v}</span>
              <p className="text-[11px] text-stone-500 mt-2">{DESCRIPCION[k]}</p>
            </div>
          ))}
        </div>

        <Estado cargando={cargando && !usuarios} error={error} />

        {usuarios && (
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-stone-50 text-stone-400 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Nombre</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Email</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Rol</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Estado</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-warm-50 transition">
                    <td className="px-4 py-3 font-semibold text-stone-700">{u.nombre}{u.id === yo.id && <span className="ml-2 text-[10px] text-stone-400">(vos)</span>}</td>
                    <td className="px-4 py-3 text-stone-500">{u.email}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rolTono[u.rol]}`}>{ROLES[u.rol]}</span></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{u.activo ? 'Activo' : 'Desactivado'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditando(u)} className="text-stone-400 hover:text-brand-600" title="Editar"><i className="fa-solid fa-pen"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editando && <UsuarioForm usuario={editando === 'nuevo' ? null : editando} yo={yo} onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); recargar(); }} />}
    </div>
  );
}

function UsuarioForm({ usuario, yo, onCerrar, onGuardado }) {
  const [form, setForm] = useState({
    nombre: usuario?.nombre || '', email: usuario?.email || '', rol: usuario?.rol || 'GESTOR',
    activo: usuario ? usuario.activo : true, password: '',
  });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const esYo = usuario?.id === yo.id;
  // Un Administrador no puede asignar el rol Desarrollador.
  const rolesDisponibles = Object.entries(ROLES).filter(([k]) => yo.rol === 'DESARROLLADOR' || k !== 'DESARROLLADOR');

  async function submit(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      if (usuario) {
        const data = { nombre: form.nombre, rol: form.rol, activo: form.activo };
        if (form.password) data.password = form.password;
        await usuariosApi.actualizar(usuario.id, data);
      } else {
        await usuariosApi.crear(form);
      }
      onGuardado();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={usuario ? 'Editar usuario' : 'Nuevo usuario'} onCerrar={onCerrar}>
      <form onSubmit={submit} className="p-6 space-y-4 text-sm">
        <Campo label="Nombre"><input className="input" required value={form.nombre} onChange={e => set('nombre', e.target.value)} /></Campo>
        <Campo label="Email"><input className="input" type="email" required disabled={!!usuario} value={form.email} onChange={e => set('email', e.target.value)} /></Campo>
        <Campo label="Rol">
          <select className="input" value={form.rol} onChange={e => set('rol', e.target.value)} disabled={esYo}>
            {rolesDisponibles.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Campo>
        <p className="text-[11px] text-stone-400 -mt-2">{DESCRIPCION[form.rol]}</p>
        <Campo label={usuario ? 'Nueva contraseña (dejar vacío para no cambiarla)' : 'Contraseña (mínimo 8 caracteres)'}>
          <input className="input" type="password" minLength={8} required={!usuario} autoComplete="new-password" value={form.password} onChange={e => set('password', e.target.value)} />
        </Campo>
        {usuario && (
          <label className="flex items-center gap-2 text-xs text-stone-500">
            <input type="checkbox" checked={form.activo} disabled={esYo} onChange={e => set('activo', e.target.checked)} />
            Usuario activo (puede iniciar sesión)
          </label>
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
