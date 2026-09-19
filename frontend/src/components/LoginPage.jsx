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
    <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl border border-stone-100 w-full max-w-sm p-8 space-y-5">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center text-white text-lg font-extrabold mx-auto mb-3">M</div>
          <h1 className="text-lg font-bold text-stone-800">MAD</h1>
          <p className="text-xs text-stone-400">Gestión Inmobiliaria — iniciá sesión</p>
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
