import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import AlquileresPage from './modules/alquileres/AlquileresPage';
import FacturacionPage from './modules/facturacion/FacturacionPage';
import PropiedadesPage from './modules/propiedades/PropiedadesPage';
import PersonasPage from './modules/personas/PersonasPage';
import UsuariosPage from './modules/usuarios/UsuariosPage';
import { useAuth } from './auth';

export default function App() {
  const { usuario, cargando, puede } = useAuth();

  if (cargando) return <div className="min-h-screen flex items-center justify-center text-sm text-stone-400">Cargando…</div>;
  if (!usuario) return <LoginPage />;

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Routes>
          <Route path="/" element={<Navigate to={puede('facturar') ? '/facturacion' : '/alquileres'} replace />} />
          <Route path="/alquileres" element={<AlquileresPage />} />
          <Route path="/propiedades" element={<PropiedadesPage />} />
          <Route path="/personas" element={<PersonasPage />} />
          {puede('facturar') && <Route path="/facturacion" element={<FacturacionPage />} />}
          {puede('usuarios') && <Route path="/usuarios" element={<UsuariosPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
