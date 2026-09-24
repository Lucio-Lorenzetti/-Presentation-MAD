import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ROLES, useAuth } from '../auth';
import Modal from './Modal';
import Campo from './Campo';
import Boton from './Boton';
import { usuariosApi } from '../api/recursos';

const links = [
  { to: '/inicio', label: 'Inicio', icon: 'fa-calendar-days' },
  { to: '/estadisticas', label: 'Estadísticas', icon: 'fa-chart-line' },
  { to: '/alquileres', label: 'Alquileres', icon: 'fa-file-contract' },
  { to: '/facturacion', label: 'Facturación', icon: 'fa-file-invoice', permiso: 'facturar' },
  { to: '/propiedades', label: 'Propiedades', icon: 'fa-building' },
  { to: '/mapa', label: 'Mapa', icon: 'fa-map-location-dot' },
  { to: '/personas', label: 'Propietarios / Inquilinos', icon: 'fa-users' },
  { to: '/usuarios', label: 'Usuarios', icon: 'fa-user-shield', permiso: 'usuarios' },
];

const CLAVE_COLAPSADO = 'mad_sidebar_colapsado';

export default function Sidebar() {
  const { usuario, logout, puede } = useAuth();
  const [cambiando, setCambiando] = useState(false);
  const [colapsado, setColapsado] = useState(() => {
    try { return localStorage.getItem(CLAVE_COLAPSADO) === '1'; } catch { return false; }
  });
  const iniciales = usuario.nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  function alternarColapsado() {
    setColapsado(v => {
      const nuevo = !v;
      try { localStorage.setItem(CLAVE_COLAPSADO, nuevo ? '1' : '0'); } catch { /* sin storage */ }
      return nuevo;
    });
  }

  return (
    <div className={`${colapsado ? 'w-16' : 'w-56'} bg-stone-50 border-r border-stone-200 flex flex-col shrink-0 h-screen sticky top-0 transition-[width] duration-200`}>
      <div className={`px-3 py-4 border-b border-stone-200 flex items-center gap-2 ${colapsado ? 'flex-col' : ''}`}>
        <div className={`flex items-center gap-2.5 min-w-0 ${colapsado ? '' : 'flex-1'}`}>
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-xs font-extrabold shrink-0">M</div>
          {!colapsado && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-stone-800 leading-none">MAD</div>
              <div className="text-[13px] text-stone-400">Gestión Inmobiliaria</div>
            </div>
          )}
        </div>
        <button
          onClick={alternarColapsado}
          title={colapsado ? 'Expandir menú' : 'Fijar menú angosto'}
          className={`w-6 h-6 shrink-0 rounded-full text-stone-400 hover:bg-stone-200 hover:text-brand-600 transition flex items-center justify-center ${colapsado ? 'mt-1' : ''}`}
        >
          <i className={`fa-solid ${colapsado ? 'fa-chevron-right' : 'fa-chevron-left'} text-[10px]`}></i>
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {links.filter(l => !l.permiso || puede(l.permiso)).map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            title={colapsado ? link.label : undefined}
            className={({ isActive }) =>
              `w-full flex items-center gap-2.5 rounded-lg text-sm transition-all text-left ${colapsado ? 'justify-center px-0 py-2.5' : 'px-3 py-2'} ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-stone-500 hover:bg-stone-100'
              }`
            }
          >
            <i className={`fa-solid ${link.icon} text-xs w-4 text-center shrink-0`}></i>
            {!colapsado && link.label}
          </NavLink>
        ))}
      </nav>

      <div className={`py-3 border-t border-stone-200 ${colapsado ? 'px-2 flex flex-col items-center gap-2' : 'px-4'}`}>
        <div className={`flex items-center gap-2.5 ${colapsado ? 'flex-col' : ''}`} title={colapsado ? `${usuario.nombre} — ${ROLES[usuario.rol]}` : undefined}>
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">{iniciales}</div>
          {!colapsado && (
            <div className="min-w-0">
              <div className="text-xs font-semibold text-stone-700 truncate">{usuario.nombre}</div>
              <div className="text-[13px] text-stone-400">{ROLES[usuario.rol]}</div>
            </div>
          )}
        </div>
        {colapsado ? (
          <div className="flex flex-col items-center gap-2">
            <button onClick={() => setCambiando(true)} title="Cambiar contraseña" className="w-7 h-7 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-brand-600 transition flex items-center justify-center">
              <i className="fa-solid fa-key text-xs"></i>
            </button>
            <button onClick={logout} title="Cerrar sesión" className="w-7 h-7 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-red-500 transition flex items-center justify-center">
              <i className="fa-solid fa-right-from-bracket text-xs"></i>
            </button>
          </div>
        ) : (
          <div className="flex gap-3 mt-2 text-[14px]">
            <button onClick={() => setCambiando(true)} className="text-stone-400 hover:text-brand-600">Contraseña</button>
            <button onClick={logout} className="text-stone-400 hover:text-red-500">Cerrar sesión</button>
          </div>
        )}
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
