import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-(--color-bg) flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-(--color-surface) rounded-xl border border-(--color-border) p-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-(--color-primary) to-(--color-primary-light) bg-clip-text text-transparent text-center">
          KRATOS v2
        </h1>
        <p className="text-center text-(--color-text-secondary) text-sm mt-2 mb-6">Automação Jurídica com IA</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-(--color-text-secondary) mb-1">Email</label>
            <input
              id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-(--color-bg) border border-(--color-border) rounded-lg text-(--color-text) focus:outline-none focus:border-(--color-primary)"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-(--color-text-secondary) mb-1">Senha</label>
            <input
              id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-(--color-bg) border border-(--color-border) rounded-lg text-(--color-text) focus:outline-none focus:border-(--color-primary)"
            />
          </div>
          {error && <p className="text-sm text-(--color-error)">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2 rounded-lg font-medium text-white bg-gradient-to-r from-(--color-primary) to-(--color-primary-light) hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
