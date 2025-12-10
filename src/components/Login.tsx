import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Lock, LogIn, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Intentamos iniciar sesión con Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message === "Invalid login credentials" 
        ? "Correo o contraseña incorrectos" 
        : error.message);
    }
    // NOTA: No necesitamos "redirigir" manualmente. 
    // App.tsx detectará el cambio de sesión automáticamente.
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      
      <div className="w-full max-w-md">
        {/* LOGO */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tighter text-white">
            Site<span className="text-blue-500">Manager</span>
          </h1>
          <p className="text-slate-400 mt-2 font-medium tracking-wide">
            ACCESO RESTRINGIDO
          </p>
        </div>

        {/* TARJETA DE LOGIN */}
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Input Email */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Correo Corporativo
              </label>
              <input 
                type="email"
                required
                placeholder="usuario@constructora.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {/* Input Password */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Contraseña
              </label>
              <input 
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {/* Mensaje de Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-900/50 text-red-500 text-sm p-3 rounded-lg flex items-center gap-2">
                 <Lock size={16} /> {error}
              </div>
            )}

            {/* Botón */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
              INICIAR SESIÓN
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-8">
          &copy; 2025 Sistema de Control de Obra. <br/>
          Si olvidó su clave, contacte al Administrador.
        </p>
      </div>
    </div>
  );
}