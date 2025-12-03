'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function CommunityPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${query}%`)
      .limit(20);

    if (error) {
      console.error("Erreur:", error);
    } else {
      setResults(data || []);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black pb-20 overflow-x-hidden">
      
      {/* --- GLOWS D'AMBIANCE --- */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* --- NAVBAR FLOTTANTE --- */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-4">
        <nav className="flex items-center justify-between px-8 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl w-full max-w-5xl">
            <Link href="/" className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>
            <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
                <Link href="/search" className="text-gray-300 hover:text-[#00e054] transition">Albums</Link>
                <Link href="/profile" className="text-gray-300 hover:text-white transition">Mon Profil</Link>
            </div>
        </nav>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-40">
        <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight text-white">
              La <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e054] to-emerald-500">Communauté</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
                Trouvez vos amis, découvrez de nouveaux curateurs musicaux et partagez vos découvertes.
            </p>
        </div>

        {/* BARRE DE RECHERCHE */}
        <form onSubmit={searchUsers} className="relative group max-w-2xl mx-auto mb-20">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#00e054] to-blue-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center">
                <input
                    type="text"
                    placeholder="Rechercher un membre par pseudo..."
                    className="w-full bg-[#0a0a0a] border border-white/10 text-white px-8 py-5 rounded-full focus:outline-none focus:border-[#00e054] text-lg placeholder-gray-600 shadow-2xl transition-all"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button 
                    type="submit"
                    disabled={loading}
                    className="absolute right-2 bg-[#00e054] text-black font-bold px-8 py-3 rounded-full hover:bg-[#00c04b] transition disabled:opacity-50 hover:scale-105 shadow-lg shadow-green-900/20"
                >
                    {loading ? '...' : 'Chercher'}
                </button>
            </div>
        </form>

        {/* RÉSULTATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hasSearched && results.length === 0 && !loading && (
             <div className="col-span-full text-center py-16 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                <p className="text-gray-500 text-lg">Aucun membre trouvé avec ce pseudo.</p>
             </div>
          )}

          {results.map((profile) => (
            <Link key={profile.id} href={`/user/${profile.username}`} className="group block">
                <div className="flex items-center justify-between bg-[#121212] p-6 rounded-2xl border border-white/5 hover:border-[#00e054]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00e054] to-emerald-800 flex items-center justify-center text-2xl font-black text-black overflow-hidden border-2 border-[#14181c] shadow-lg group-hover:scale-110 transition duration-300">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                            ) : (
                                (profile.username && profile.username[0]) ? profile.username[0].toUpperCase() : '?'
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-xl group-hover:text-[#00e054] transition mb-1">{profile.username || 'Utilisateur'}</h3>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Membre</p>
                        </div>
                    </div>
                    
                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-500 group-hover:border-[#00e054] group-hover:text-[#00e054] group-hover:bg-[#00e054]/10 transition">
                        ➜
                    </div>
                </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}