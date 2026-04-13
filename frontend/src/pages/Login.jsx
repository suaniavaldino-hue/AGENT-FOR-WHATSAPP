import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('rafaelbruceblog@gmail.com');
  const [password, setPassword] = useState('casa429');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao entrar');
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <form onSubmit={handleSubmit} className="rounded-3xl bg-slate-900 p-8 shadow-2xl border border-slate-800">
          <h1 className="text-3xl font-bold text-white">Entrar</h1>
          <p className="text-slate-400 mt-2">Acesse o painel com seu e-mail e senha.</p>

          <div className="mt-6 space-y-4">
            <input
              className="w-full rounded-xl bg-slate-800 text-white p-3 outline-none border border-slate-700"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full rounded-xl bg-slate-800 text-white p-3 outline-none border border-slate-700"
              placeholder="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error ? <div className="rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/30 p-3 text-sm">{error}</div> : null}
            <button className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 transition text-slate-950 p-3 font-semibold">
              Acessar painel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
