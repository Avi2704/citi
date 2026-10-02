import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login(email, password);
      if (email.includes('admin')) navigate('/admin/dashboard');
      else if (email.includes('staff')) navigate('/staff/dashboard');
      else navigate('/citizen/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login');
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-md rounded border bg-white p-6">
      <h1 className="mb-4 text-xl font-semibold">Login</h1>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <input className="w-full rounded border p-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded border p-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-emerald-700 p-2 text-white" type="submit">Sign in</button>
      </form>
      <p className="mt-3 text-sm">Need account? <Link className="text-emerald-700" to="/register">Register</Link></p>
    </div>
  );
};
