import { useState } from 'react';
import { useAuth } from '../auth';
import Campo from './Campo';
import Boton from './Boton';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-50 via-warm-100 to-brand-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl border border-stone-100 w-full max-w-sm p-8 pt-10 space-y-5 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600"></div>
        <div className="text-center">
          <h1 className="font-script text-8xl leading-none text-brand-600">MAD</h1>
          <p className="text-[11px] font-semibold text-stone-500 tracking-[0.25em] uppercase mt-1">Servicios Inmobiliarios</p>
          <p className="text-sm text-stone-400 italic mt-0.5">Alejandra Domínguez</p>
          <div className="w-10 h-px bg-stone-200 mx-auto my-4"></div>
          <p className="text-xs text-stone-400">Iniciá sesión para continuar</p>
        </div>
        <Campo label="Email">
          <input className="input" type="email" required autoFocus autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} />
        </Campo>
        <Campo label="Contraseña">
          <input className="input" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
        </Campo>
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        <Boton type="submit" disabled={enviando} className="w-full !py-2.5 !text-sm">{enviando ? 'Ingresando…' : 'Ingresar'}</Boton>
      </form>
    </div>
  );
}
