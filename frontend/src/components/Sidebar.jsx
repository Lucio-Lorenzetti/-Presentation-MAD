import { NavLink } from 'react-router-dom';

const links = [
  { to: '/alquileres', label: 'Alquileres', icon: 'fa-file-contract' },
  { to: '/facturacion', label: 'Facturación', icon: 'fa-file-invoice' },
  { to: '/propiedades', label: 'Propiedades', icon: 'fa-building' },
  { to: '/personas', label: 'Propietarios / Inquilinos', icon: 'fa-users' },
];

export default function Sidebar() {
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
        {links.map(link => (
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

      {/* TODO: reemplazar por el usuario autenticado cuando exista login/roles */}
      <div className="px-4 py-3 border-t border-stone-200 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">JM</div>
        <div>
          <div className="text-xs font-semibold text-stone-700">Jefa MAD</div>
          <div className="text-[10px] text-stone-400">Administrador</div>
        </div>
      </div>
    </div>
  );
}
