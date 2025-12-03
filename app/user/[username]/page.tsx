'use client';

import { useEffect, useState } from 'react';

// --- INSTRUCTIONS POUR VS CODE (LOCAL) ---
// 1. Décommentez la ligne ci-dessous :
import { supabase } from '@/lib/supabaseClient';

// 2. Commentez ou supprimez tout le BLOC DE SIMULATION ci-dessous.

// --- DÉBUT BLOC SIMULATION (Pour l'aperçu uniquement) ---
export default function PublicProfilePage({ params }: { params: any }) {
  // Gestion de la compatibilité Next.js 15 pour les params
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    if (params instanceof Promise) {
      params.then((p: any) => setUsername(decodeURIComponent(p.username)));
    } else {
      setUsername(decodeURIComponent(params.username));
    }
  }, [params]);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Charger les données dès qu'on a le username
  useEffect(() => {
    if (username) fetchData();
  }, [username]);

  const fetchData = async () => {
    // 1. Qui visite ?
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // 2. Qui est visité ? (Récupérer l'ID via le username)
    // Note: ilike est insensible à la casse (DemoUser = demouser)
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username) 
      .single();

    if (error || !profileData) {
      console.log("Profil introuvable ou erreur:", error);
      setLoading(false);
      return; 
    }

    setProfile(profileData);

    // 3. Récupérer ses critiques
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_name', profileData.username)
      .order('created_at', { ascending: false } as any);
    
    setReviews(reviewsData || []);

    // 4. Est-ce que je le suis déjà ?
    if (user && user.id !== profileData.id) {
      const { data: followData } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', profileData.id)
        .single();
      
      setIsFollowing(!!followData);
    }

    setLoading(false);
  };

  // --- ACTION SUIVRE / NE PLUS SUIVRE ---
  const handleFollowToggle = async () => {
    if (!currentUser) return alert("Connectez-vous pour suivre ce membre !");
    
    // Optimisme : on change l'état visuel tout de suite
    const previousState = isFollowing;
    setIsFollowing(!isFollowing);

    if (previousState) {
      // Désabonnement
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', profile.id);
        
      if (error) {
          setIsFollowing(previousState); // On annule si erreur
          console.error(error);
      }
    } else {
      // Abonnement
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: currentUser.id,
          following_id: profile.id
        });

      if (error) {
          setIsFollowing(previousState);
          console.error(error);
      }
    }
  };

  if (loading) return <div className="min-h-screen bg-[#14181c] text-white p-10 flex items-center justify-center">Chargement...</div>;
  if (!profile) return <div className="min-h-screen bg-[#14181c] text-white p-10 flex items-center justify-center">Utilisateur introuvable.</div>;

  return (
    <div className="min-h-screen bg-[#14181c] text-white font-sans">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-6 py-4 bg-[#2c3440] border-b border-gray-700">
        <a href="/" className="text-2xl font-bold tracking-tighter uppercase">Music<span className="text-[#00e054]">Boxd</span></a>
        <div className="flex space-x-6 text-sm font-semibold uppercase tracking-widest items-center">
          <a href="/search" className="text-gray-300 hover:text-white transition">Albums</a>
          <a href="/community" className="text-gray-300 hover:text-white transition">Communauté</a>
          <a href="/profile" className="text-gray-300 hover:text-white transition">Mon Profil</a>
        </div>
      </nav>

      {/* EN-TÊTE PROFIL PUBLIC */}
      <header className="bg-[#101317] border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-12 flex items-center gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-4xl font-bold text-white border-4 border-[#14181c] overflow-hidden">
            {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
                (profile.username && profile.username[0]) ? profile.username[0].toUpperCase() : '?'
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">{profile.username}</h1>
                    <p className="text-gray-400 text-sm mb-4">Membre de la communauté</p>
                </div>
                
                {/* BOUTON SUIVRE (Caché si c'est mon propre profil) */}
                {currentUser && currentUser.id !== profile.id && (
                    <button 
                        onClick={handleFollowToggle}
                        className={`px-6 py-2 rounded font-bold text-sm transition uppercase tracking-widest ${
                            isFollowing 
                            ? 'bg-transparent border border-gray-500 text-gray-400 hover:border-red-500 hover:text-red-500' 
                            : 'bg-[#00e054] text-black hover:bg-[#00c04b]'
                        }`}
                    >
                        {isFollowing ? 'Abonné' : 'Suivre +'}
                    </button>
                )}
            </div>
            
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <span className="block font-bold text-white text-lg">{reviews.length}</span>
                <span className="text-gray-500 uppercase text-xs">Avis</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-12">
        
        {/* TOP 5 ALBUMS (Lecture seule) */}
        {profile.top_albums && profile.top_albums.length > 0 && (
            <section>
                <div className="flex justify-between items-end mb-4 border-b border-gray-700 pb-2">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Ses Albums Favoris</h2>
                </div>
                <div className="grid grid-cols-5 gap-4">
                    {profile.top_albums.map((item: any, i: number) => (
                        <div key={i} className="relative aspect-square bg-black rounded border border-gray-800" title={item.name}>
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded opacity-90 hover:opacity-100 transition" />
                        </div>
                    ))}
                </div>
            </section>
        )}

        {/* TOP 5 CHANSONS (Lecture seule) */}
        {profile.top_songs && profile.top_songs.length > 0 && (
            <section>
                <div className="flex justify-between items-end mb-4 border-b border-gray-700 pb-2">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Ses Titres Favoris</h2>
                </div>
                <div className="grid grid-cols-5 gap-4">
                    {profile.top_songs.map((item: any, i: number) => (
                        <div key={i} className="relative aspect-square bg-black rounded border border-gray-800" title={item.name}>
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded opacity-90 hover:opacity-100 transition" />
                            <div className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-[10px] text-[#00e054]">♫</div>
                        </div>
                    ))}
                </div>
            </section>
        )}

        {/* LISTE DES CRITIQUES */}
        <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest border-b border-gray-600 pb-2 mb-6">Journal Récent</h2>
            {reviews.length === 0 ? (
                <p className="text-gray-500 italic">Cet utilisateur n'a pas encore posté de critique.</p>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {reviews.map((review) => (
                    <div key={review.id} className="flex gap-4 bg-[#20262d] p-4 rounded-lg border border-gray-800">
                        <a href={`/album/${review.album_id}`} className="flex-shrink-0 w-16 h-16 bg-black rounded overflow-hidden hover:opacity-80 transition">
                            <img src={review.album_image} alt={review.album_name} className="w-full h-full object-cover" />
                        </a>
                        <div className="flex-1">
                            <div className="font-bold text-white">{review.album_name}</div>
                            <div className="text-[#00e054]">{"★".repeat(review.rating)}</div>
                            <div className="text-gray-400 text-sm italic">"{review.review_text}"</div>
                            <div className="mt-2 text-xs text-gray-600">Posté le {new Date(review.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                    ))}
                </div>
            )}
        </section>
      </main>
    </div>
  );
}