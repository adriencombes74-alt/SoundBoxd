'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, LogOut, Music, AlertCircle } from 'lucide-react';
import { Toast, ToastType } from '@/components/ui/toast';

export default function ConnectionsClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{ msg: string, type: ToastType, visible: boolean }>({ msg: '', type: 'info', visible: false });

  const showToast = (msg: string, type: ToastType) => {
    setToast({ msg, type, visible: true });
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Check URL params for feedback from callback
      const error = searchParams.get('error');
      const success = searchParams.get('success');

      if (success === 'spotify_linked') {
        showToast('Compte Spotify connecté avec succès !', 'success');
        // Clean URL
        window.history.replaceState(null, '', '/settings/connections');
      } else if (error) {
        let msg = "Une erreur est survenue.";
        if (error === 'spotify_access_denied') msg = "Connexion refusée par l'utilisateur.";
        if (error === 'token_exchange_failed') msg = "Échec de l'échange de token.";
        if (error === 'database_error') msg = "Erreur de sauvegarde en base.";
        
        showToast(msg, 'error');
        window.history.replaceState(null, '', '/settings/connections');
      }

      // Check current status
      const { data } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'spotify')
        .single();
      
      if (data) setSpotifyConnected(true);
      
      setLoading(false);
    };

    init();
  }, [router, searchParams]);

  const handleConnectSpotify = () => {
    if (!user) return;
    // Redirect to our login API route
    window.location.href = `/api/auth/spotify/login?userId=${user.id}`;
  };

  const handleDisconnectSpotify = async () => {
    if (!confirm("Voulez-vous vraiment déconnecter votre compte Spotify ?")) return;
    
    setDisconnecting(true);
    try {
      const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', 'spotify');

      if (error) throw error;

      setSpotifyConnected(false);
      showToast("Compte Spotify déconnecté.", 'success');
    } catch (error) {
      console.error(error);
      showToast("Erreur lors de la déconnexion.", 'error');
    }
    setDisconnecting(false);
  };

  if (loading) return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-24">
       <Toast 
        message={toast.msg} 
        type={toast.type} 
        isVisible={toast.visible} 
        onClose={() => setToast(prev => ({ ...prev, visible: false }))} 
      />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center gap-4">
        <Link href="/profile" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-black uppercase tracking-widest">Connexions</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-8 mt-6">
        <div className="bg-[#121212] rounded-3xl border border-white/5 p-6 md:p-8 overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#1DB954]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
             
             <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#1DB954] flex items-center justify-center shadow-lg shadow-[#1DB954]/20">
                        <svg className="w-10 h-10 text-black" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 4.2-1.32 9.6-1.32 13.38.96.479.239.6.84.36 1.141zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 14.82 1.02.54.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">Spotify</h2>
                        <p className="text-sm text-gray-400">Synchronisez vos likes et écoutes.</p>
                    </div>
                </div>
                {spotifyConnected && (
                    <div className="bg-[#1DB954]/20 text-[#1DB954] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                        <Check className="w-3 h-3" /> Connecté
                    </div>
                )}
             </div>

             <div className="space-y-4 relative z-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                        <Check className="w-4 h-4 text-[#1DB954]" />
                        <span>Afficher votre titre en cours d'écoute</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                        <Check className="w-4 h-4 text-[#1DB954]" />
                        <span>Ajouter des titres à vos playlists</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                        <Check className="w-4 h-4 text-[#1DB954]" />
                        <span>Synchroniser les "J'aime"</span>
                    </div>
                </div>

                <div className="pt-4">
                    {spotifyConnected ? (
                        <button 
                            onClick={handleDisconnectSpotify}
                            disabled={disconnecting}
                            className="w-full py-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 border border-white/10 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            {disconnecting ? 'Déconnexion...' : 'Déconnecter le compte'}
                        </button>
                    ) : (
                        <button 
                            onClick={handleConnectSpotify}
                            className="w-full py-3 bg-[#1DB954] hover:bg-[#1ed760] text-black rounded-xl font-black uppercase tracking-widest transition shadow-lg shadow-[#1DB954]/20 hover:shadow-[#1DB954]/40 hover:scale-[1.02]"
                        >
                            Connecter Spotify
                        </button>
                    )}
                </div>
             </div>
        </div>

        {/* Apple Music Placeholder */}
        <div className="bg-[#121212] rounded-3xl border border-white/5 p-6 md:p-8 opacity-60 grayscale relative overflow-hidden">
             <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center shadow-lg">
                    <Music className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Apple Music</h2>
                    <p className="text-sm text-gray-400">Bientôt disponible</p>
                </div>
             </div>
             <div className="bg-black/40 backdrop-blur absolute inset-0 flex items-center justify-center z-20">
                <span className="bg-white/10 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">Prochainement</span>
             </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-4 flex gap-4 items-start">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200/80 leading-relaxed">
                <p className="mb-2"><strong className="text-blue-200">Note de confidentialité :</strong></p>
                MusicBoxd utilise uniquement les permissions nécessaires pour synchroniser votre bibliothèque à votre demande. Vos données ne sont jamais partagées avec des tiers.
            </div>
        </div>
      </div>
    </div>
  );
}

