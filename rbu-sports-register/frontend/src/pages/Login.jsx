import React, { useState } from 'react';
import api from '../api';
import { ShieldCheck, LogIn, Mail, Lock, Sparkles } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      onLoginSuccess(user);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Invalid email or password credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0F1115] items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative backdrop gradients */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-red-900/10 blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-amber-900/15 blur-3xl"></div>

      <div className="w-full max-w-md bg-[#161920] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden relative z-10">
        <div className="p-8 text-center border-b border-gray-800/60 bg-gradient-to-b from-red-950/20 to-transparent">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 mb-4 shadow-lg shadow-red-900/30">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">RBU Sports Registry</h1>
          <p className="text-gray-400 text-sm mt-1">Ramdeobaba University Gymkhana & Issuance Register</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-950/40 border border-red-800/50 text-red-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Authorized Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-10 pr-3 py-2.5 bg-[#0F1115] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm transition"
                placeholder="admin@rbu.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Security Password</label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-10 pr-3 py-2.5 bg-[#0F1115] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm transition"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold text-sm shadow-lg shadow-red-950 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Validating Credentials...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Authenticate Login
              </>
            )}
          </button>
        </form>

        <div className="px-8 pb-8 text-center text-xs text-gray-600">
          <p>Seeded super-admin defaults is: <strong className="text-gray-400">admin@rbu.edu.in</strong> / password <strong className="text-gray-400">rbuadmin123</strong></p>
        </div>
      </div>
    </div>
  );
}
