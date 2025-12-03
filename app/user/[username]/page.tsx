'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function PublicProfilePage({ params }: { params: any }) {
  const [username, setUsername] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // Données
  const [reviews, setReviews] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Gestion Next.js 15
  useEffect(() => {
    if (params instanceof Promise) {
      params.then((p: any) => setUsername(decodeURIComponent(p.username)));
    } else {
      setUsername(decodeURIComponent(params.username));
    }
  }, [params]);

  useEffect(() => {
    if (username) fetchData();
  }, [username]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // 1. Récupérer le profil
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username)
      .single();

    if (error || !profileData) {
      setLoading(false);
      return;
    }
    setProfile(profileData);

    // 2. Récupérer les critiques (Journal)
    const { data: reviewsData, count: revCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('user_name', profileData.username) // Ou user_id si la migration est faite
      .order('created_at', { ascending: false });
    
    setReviews(reviewsData || []);
    setReviewsCount(revCount || 0);

    // 3. Récupérer les listes
    const { data: listsData } = await supabase
      .from('lists')
      .select('*')
      .eq('user_id', profileData.id)
      .order('created_at', { ascending: false });
    setLists(listsData || []);

    // 4. Récupérer le nombre d'abonnés
    const { count: followCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileData.id);
    setFollowersCount(followCount || 0);

    // 5. Vérifier si je suis déjà abonné
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

  const handleFollowToggle = async () => {
    if (!currentUser) return alert("Connectez-vous pour suivre ce membre !");
    
    // Optimisme UI
    const newIsFollowing = !isFollowing;
    setIsFollowing(newIsFollowing);
    setFollowersCount(prev => newIsFollowing ? prev + 1 : prev - 1);

    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id);
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id });
    }
  };

  if (loading) return <div className="min-h-screen bg-[#050505] text-white p-10 flex items-center justify-center">Chargement...</div>;
  if (!profile) return <div className="min-h-screen bg-[#050505] text-white p-10 flex items-center justify-center">Utilisateur introuvable.</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black pb-20 overflow-x-hidden">
      
      {/* --- GLOWS --- */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* --- NAVBAR FLOTTANTE --- */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-4">
        <nav className="flex items-center justify-between px-8 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl w-full max-w-5xl">
            <Link href="/" className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>
            <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
                <Link href="/search" className="text-gray-300 hover:text-[#00e054] transition">Albums</Link>
                <Link href="/community" className="text-gray-300 hover:text-[#00e054] transition">Communauté</Link>
                {currentUser ? (
                    <Link href="/profile" className="flex items-center gap-3 pl-4 border-l border-white/10 hover:opacity-80 transition group">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00e054] to-emerald-600 flex items-center justify-center text-black font-black text-xs border border-white/20">
                            {currentUser.email[0].toUpperCase()}
                        </div>
                    </Link>
                ) : (
                    <Link href="/login" className="bg-white text-black px-4 py-2 rounded-full hover:bg-[#00e054] transition">Connexion</Link>
                )}
            </div>
        </nav>
      </div>

      {/* --- HEADER PROFIL --- */}
      <header className="relative pt-32 pb-12 px-6 z-10 border-b border-white/5 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center md:items-end gap-8">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-5xl font-bold text-white border-4 border-[#14181c] shadow-2xl overflow-hidden">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : (profile.username?.[0]?.toUpperCase() || '?')}
          </div>
          
          <div className="flex-1 text-center md:text-left w-full">
             <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">{profile.username}</h1>
                    <p className="text-gray-400 text-sm">Membre de la communauté</p>
                </div>
                
                {/* Bouton Suivre */}
                {currentUser && currentUser.id !== profile.id && (
                    <button 
                        onClick={handleFollowToggle}
                        className={`px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest transition shadow-lg mt-4 md:mt-0 ${
                            isFollowing 
                            ? 'bg-white/10 text-white border border-white/20 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-500' 
                            : 'bg-[#00e054] text-black hover:bg-[#00c04b] hover:scale-105'
                        }`}
                    >
                        {isFollowing ? 'Abonné' : 'Suivre +'}
                    </button>
                )}
             </div>
             
             {/* Stats */}
             <div className="flex justify-center md:justify-start gap-12 border-t border-white/5 pt-6">
                <div className="text-center"><span className="block font-black text-2xl text-white">{reviewsCount}</span><span className="text-gray-500 uppercase text-[10px] tracking-widest font-bold">Critiques</span></div>
                <div className="text-center"><span className="block font-black text-2xl text-white">{followersCount}</span><span className="text-gray-500 uppercase text-[10px] tracking-widest font-bold">Abonnés</span></div>
                <div className="text-center"><span className="block font-black text-2xl text-white">{lists.length}</span><span className="text-gray-500 uppercase text-[10px] tracking-widest font-bold">Listes</span></div>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16 relative z-10">
        
        {/* --- TOP 5 --- */}
        <div className="grid grid-cols-1 gap-12">
            {/* ALBUMS */}
            {profile.top_albums && profile.top_albums.length > 0 && (
                <section>
                    <h2 className="text-sm font-bold text-[#00e054] uppercase tracking-widest mb-6 flex items-center gap-2"><span className="w-2 h-2 bg-[#00e054] rounded-full"></span> Albums Favoris</h2>
                    <div className="grid grid-cols-5 gap-4">
                        {profile.top_albums.map((item: any, i: number) => (
                            <Link key={i} href={`/album/${item.id}`} className="group block relative aspect-square bg-black rounded-2xl border border-white/10 overflow-hidden shadow-lg hover:shadow-[#00e054]/20 transition duration-500">
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition duration-700" />
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* TITRES */}
            {profile.top_songs && profile.top_songs.length > 0 && (
                <section>
                    <h2 className="text-sm font-bold text-[#00e054] uppercase tracking-widest mb-6 flex items-center gap-2"><span className="w-2 h-2 bg-[#00e054] rounded-full"></span> Titres Favoris</h2>
                    <div className="grid grid-cols-5 gap-4">
                        {profile.top_songs.map((item: any, i: number) => (
                            <div key={i} className="group relative aspect-square bg-black rounded-full border border-white/10 overflow-hidden shadow-lg hover:shadow-[#00e054]/20 transition duration-500">
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition duration-700" />
                                <div className="absolute bottom-2 right-2 bg-black/80 text-[#00e054] text-[10px] px-1.5 py-0.5 rounded-full font-bold">♫</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>

        {/* --- LISTES --- */}
        {lists.length > 0 && (
            <section>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-2">Listes Créées</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lists.map((list) => (
                        <Link key={list.id} href={`/lists/${list.id}`} className="group block">
                            <div className="bg-[#121212] p-6 rounded-2xl border border-white/5 hover:border-[#00e054]/50 transition-all duration-300 hover:-translate-y-1">
                                <h3 className="font-bold text-white text-lg mb-1 group-hover:text-[#00e054] transition">{list.title}</h3>
                                <p className="text-xs text-gray-500 mb-4 line-clamp-1">{list.description}</p>
                                <div className="flex gap-2 overflow-hidden">
                                    {list.albums && list.albums.slice(0, 4).map((album: any, i:number) => (
                                        <img key={i} src={album.image} className="w-10 h-10 rounded bg-black object-cover border border-white/10" />
                                    ))}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        )}

        {/* --- JOURNAL --- */}
        <section>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-2">Dernières Critiques</h2>
            {reviews.length === 0 ? (
                <p className="text-gray-600 italic text-sm">Aucune critique pour le moment.</p>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                    <div key={review.id} className="flex gap-6 bg-[#121212] p-6 rounded-2xl border border-white/5 group hover:bg-[#181818] transition">
                        <Link href={`/album/${review.album_id}`} className="flex-shrink-0 w-20 h-20 bg-black rounded-lg overflow-hidden shadow-lg">
                            <img src={review.album_image} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        </Link>
                        <div className="flex-1 py-1">
                            <div className="font-bold text-white text-lg mb-1">{review.album_name}</div>
                            <div className="text-[#00e054] text-sm mb-3 tracking-widest">{"★".repeat(review.rating)}</div>
                            <p className="text-gray-400 text-sm italic font-light">"{review.review_text}"</p>
                            <div className="mt-3 text-xs text-gray-600">{new Date(review.created_at).toLocaleDateString()}</div>
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