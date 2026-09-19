import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ROLES, useAuth } from '../auth';
import Modal from './Modal';
import Campo from './Campo';
import Boton from './Boton';
import { usuariosApi } from '../api/recursos';

const links = [
  { to: '/alquileres', label: 'Alquileres', icon: 'fa-file-contract' },
  { to: '/facturacion', label: 'Facturación', icon: 'fa-file-invoice', permiso: 'facturar' },
  { to: '/propiedades', label: 'Propiedades', icon: 'fa-building' },
  { to: '/personas', label: 'Propietarios / Inquilinos', icon: 'fa-users' },
  { to: '/usuarios', label: 'Usuarios', icon: 'fa-user-shield', permiso: 'usuarios' },
];

export default function Sidebar() {
  const { usuario, logout, puede } = useAuth();
  const [cambiando, setCambiando] = useState(false);
  const iniciales = usuario.nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="w-56 bg-stone-50 border-r border-stone-200 flex flex-col shrink-0 h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-stone-200 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-xs font-extrabold">M</div>
        <div>
          <div className="text-sm font-bold text-stone-800 leading-none">MAD</div>
          <div className="text-[10px] text-stone-400">Gestión Inmobiliaria</div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {links.filter(l => !l.permiso || puede(l.permiso)).map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-stone-500 hover:bg-stone-100'
              }`
            }
          >
            <i className={`fa-solid ${link.icon} text-xs w-4 text-center`}></i>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-stone-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">{iniciales}</div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-stone-700 truncate">{usuario.nombre}</div>
            <div className="text-[10px] text-stone-400">{ROLES[usuario.rol]}</div>
          </div>
        </div>
        <div className="flex gap-3 mt-2 text-[11px]">
          <button onClick={() => setCambiando(true)} className="text-stone-400 hover:text-brand-600">Contraseña</button>
          <button onClick={logout} className="text-stone-400 hover:text-red-500">Cerrar sesión</button>
        </div>
      </div>

      {cambiando && <CambiarPassword onCerrar={() => setCambiando(false)} />}
    </div>
  );
}

function CambiarPassword({ onCerrar }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    try {
      await usuariosApi.cambiarPassword(actual, nueva);
      setOk(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal titulo="Cambiar contraseña" onCerrar={onCerrar} ancho="max-w-sm">
      {ok ? (
        <div className="p-6 text-sm space-y-4">
          <div className="text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-xs">Contraseña actualizada.</div>
          <div className="flex justify-end"><Boton onClick={onCerrar}>Cerrar</Boton></div>
        </div>
      ) : (
        <form onSubmit={submit} className="p-6 space-y-4 text-sm">
          <Campo label="Contraseña actual"><input className="input" type="password" required autoComplete="current-password" value={actual} onChange={e => setActual(e.target.value)} /></Campo>
          <Campo label="Nueva contraseña (mínimo 8 caracteres)"><input className="input" type="password" required minLength={8} autoComplete="new-password" value={nueva} onChange={e => setNueva(e.target.value)} /></Campo>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-2">
            <Boton type="button" variante="secundario" onClick={onCerrar}>Cancelar</Boton>
            <Boton type="submit">Guardar</Boton>
          </div>
        </form>
      )}
    </Modal>
  );
}
