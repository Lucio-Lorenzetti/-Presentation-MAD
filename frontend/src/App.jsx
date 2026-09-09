import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AlquileresPage from './modules/alquileres/AlquileresPage';
import FacturacionPage from './modules/facturacion/FacturacionPage';
import PropiedadesPage from './modules/propiedades/PropiedadesPage';
import PersonasPage from './modules/personas/PersonasPage';

export default function App() {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Routes>
          <Route path="/" element={<Navigate to="/facturacion" replace />} />
          <Route path="/alquileres" element={<AlquileresPage />} />
          <Route path="/facturacion" element={<FacturacionPage />} />
          <Route path="/propiedades" element={<PropiedadesPage />} />
          <Route path="/personas" element={<PersonasPage />} />
        </Routes>
      </div>
    </div>
  );
}
