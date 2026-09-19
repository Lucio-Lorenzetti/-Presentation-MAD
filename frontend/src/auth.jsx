import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api/client';

export const ROLES = {
  DESARROLLADOR: 'Desarrollador',
  ADMINISTRADOR: 'Administrador',
  GESTOR: 'Gestor',
  CONSULTA: 'Consulta',
};

const AuthContext = createContext(null);

// Refleja la matriz de permisos del backend (middleware/auth.js). El backend es quien realmente
// la aplica; esto sólo evita mostrar botones que darían 403.
const PERMISOS = {
  escribir: ['DESARROLLADOR', 'ADMINISTRADOR', 'GESTOR'],
  eliminar: ['DESARROLLADOR', 'ADMINISTRADOR'],
  facturar: ['DESARROLLADOR', 'ADMINISTRADOR'],
  usuarios: ['DESARROLLADOR', 'ADMINISTRADOR'],
};

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(() => !!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api.get('/api/auth/me').then(setUsuario).catch(() => setToken(null)).finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    const salir = () => setUsuario(null);
    window.addEventListener('mad:sesion-vencida', salir);
    return () => window.removeEventListener('mad:sesion-vencida', salir);
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/api/auth/login', { email, password });
    setToken(r.token);
    setUsuario(r.usuario);
  }, []);

  const logout = useCallback(() => { setToken(null); setUsuario(null); }, []);

  const valor = useMemo(() => ({
    usuario, cargando, login, logout,
    puede: accion => !!usuario && PERMISOS[accion].includes(usuario.rol),
  }), [usuario, cargando, login, logout]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
