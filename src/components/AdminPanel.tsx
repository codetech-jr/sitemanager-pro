import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ShieldCheck, UserPlus, Loader2, Users } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'bodeguero';
  user_email: string; // Lo obtendremos de un join
}

export default function AdminPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    async function fetchProfiles() {
      // Esta llamada solo funcionará si el usuario logueado es 'admin'
      // gracias a las políticas RLS que acabamos de crear.
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          role,
          email
        `);

      if (error) {
        alert("Error cargando perfiles. Solo los administradores pueden ver esta sección.");
        console.error(error);
      } else if (data) {
        const formattedData = data.map((p: any) => ({
          ...p,
          user_email: p.email
        }));
        setProfiles(formattedData);
      }
      setLoading(false);
    }
    fetchProfiles();
  }, []);

// En AdminPanel.tsx

const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);

    try {
      // ===> ESTE ES EL CAMBIO <===
      // Ya no llamamos a supabase.auth.admin...
      // Llamamos a nuestra función en la nube por su nombre.
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email: inviteEmail },
      });

      if (error) throw error;

      alert(data.message || `Invitación enviada a ${inviteEmail}`);
      setInviteEmail('');
      // Podrías añadir una función para refrescar la lista de usuarios aquí
    } catch (error: any) {
      // El error de la función viene dentro de 'context', hay que sacarlo.
      const errorMessage = error.context?.error_description || error.message || "Ocurrió un error desconocido.";
      alert("Error al invitar: " + errorMessage);
    } finally {
      setIsInviting(false);
    }
};

  if (loading) return <div className="p-10 text-center text-slate-400">Cargando panel de administración...</div>;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 animate-in fade-in">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
        <ShieldCheck className="text-blue-500" /> Administración de Equipo
      </h2>

      {/* SECCIÓN DE INVITAR */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <UserPlus size={20} /> Invitar Nuevo Miembro
        </h3>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-4">
          <input
            type="email"
            required
            placeholder="correo@ejemplo.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-grow bg-slate-900 text-white p-3 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
          />
          <button 
            type="submit" 
            disabled={isInviting}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isInviting ? <Loader2 className="animate-spin" /> : 'Enviar Invitación'}
          </button>
        </form>
      </div>

      {/* LISTA DE USUARIOS */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
        <div className="p-4 border-b border-slate-700">
           <h3 className="text-white font-bold flex items-center gap-2"><Users size={20}/> Usuarios Activos</h3>
        </div>
        <div className="divide-y divide-slate-700">
          {profiles.map(profile => (
            <div key={profile.id} className="p-4 flex justify-between items-center hover:bg-slate-800">
              <div>
                <p className="font-bold text-slate-100">{profile.user_email}</p>
                <p className="text-xs text-slate-400">{profile.full_name || 'Nombre no especificado'}</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${profile.role === 'admin' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-600/20 text-slate-300'}`}>
                {profile.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}