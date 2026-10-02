import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await register(email, password, fullName);
    setMessage('Registration successful. Please check your email for confirmation.');
    setTimeout(() => navigate('/login'), 1200);
  };

  return (
    <div className="mx-auto mt-16 max-w-md rounded border bg-white p-6">
      <h1 className="mb-4 text-xl font-semibold">Register</h1>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <input className="w-full rounded border p-2" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <input className="w-full rounded border p-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded border p-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full rounded bg-emerald-700 p-2 text-white" type="submit">Create account</button>
      </form>
      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      <p className="mt-3 text-sm">Already have account? <Link className="text-emerald-700" to="/login">Login</Link></p>
    </div>
  );
};
