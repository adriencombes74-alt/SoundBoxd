'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import ProfileMenu from '@/components/ui/profile-menu';

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
  const [activeTab, setActiveTab] = useState<'reviews' | 'lists'>('reviews');

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

  // Image de fond : 1er album du top
  const bannerImage = profile?.top_albums?.length > 0 ? profile.top_albums[0].image?.replace('400x400', '1000x1000') : null;

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans selection:bg-[#00e054] selection:text-black pb-20 overflow-x-hidden">

      {/* --- BANNER DYNAMIQUE (GLASS BACKDROP) --- */}
      <div className="absolute top-0 inset-x-0 h-[70vh] w-full z-0 overflow-hidden pointer-events-none">
          {bannerImage ? (
            <div className="relative w-full h-full">
                <img src={bannerImage} className="w-full h-full object-cover blur-[10px] scale-125 opacity-100 animate-in fade-in duration-1000" />
                {/* Overlay dégradé pour fondre l'image dans le noir */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#080808]/60 to-[#080808]" />
            </div>
          ) : (
            // Fallback si pas de top album
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-[#080808]" />
          )}
      </div>

      {/* --- GLOWS --- */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* --- NAVBAR FLOTTANTE --- */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-2 md:px-4">
        <nav className=" flex items-center justify-between px-4 md:px-8 py-2 md:py-3 w-full max-w-5xl rounded-full transition-all duration-300 bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 border border-white/10 border-t-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),inset_0_1px_0_0_rgba(255,255,255,0.15)]
        ">
            <Link href="/" className="text-lg md:text-xl font-black tracking-tighter uppercase text-white flex items-center gap-1">
                Music<span className="text-[#00e054]">Boxd</span>
            </Link>
            <div className="flex items-center gap-2 md:gap-6 text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/70">
                <Link href="/search" className="hover:text-white transition hidden sm:inline">Albums</Link>
                <Link href="/discover" className="hover:text-white transition flex items-center gap-1 md:gap-2">
                    <span className="text-sm md:text-base opacity-70">⚡</span> <span className="hidden sm:inline">Découvrir</span>
                </Link>
                <Link href="/lists/import" className="hover:text-white transition flex items-center gap-1 md:gap-2">
                    <span className="text-sm md:text-base opacity-70">📥</span> <span className="hidden sm:inline">Importer</span>
                </Link>
                <Link href="/community" className="hover:text-white transition hidden md:inline">Membres</Link>
                {currentUser ? (
                    <ProfileMenu user={currentUser} />
                ) : (
                    <Link href="/login" className="bg-white text-black px-3 md:px-4 py-1.5 md:py-2 rounded-full hover:bg-[#00e054] transition text-[10px] md:text-sm">Connexion</Link>
                )}
            </div>
        </nav>
      </div>

      {/* --- HEADER PROFIL --- */}
      <header className="relative pt-32 md:pt-40 pb-12 md:pb-16 px-4 md:px-6 z-10">
        <div className="max-w-4xl mx-auto flex flex-col items-center md:items-end md:flex-row gap-6 md:gap-10">

          {/* Avatar (Glass Container) */}
          <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-br from-[#00e054] to-blue-600 rounded-full blur opacity-40 group-hover:opacity-70 transition duration-1000"></div>
              <div className="relative w-28 h-28 md:w-44 md:h-44 rounded-full p-1 bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl overflow-hidden">
                <div className="w-full h-full rounded-full overflow-hidden bg-black">
                    {profile.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#222] to-black flex items-center justify-center text-3xl md:text-4xl text-white font-bold">
                            {profile.username?.[0]?.toUpperCase() || '?'}
                        </div>
                    )}
                </div>
              </div>
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left space-y-3 md:space-y-4">
             <div className="flex flex-col items-center md:flex-row md:items-center gap-3 md:gap-4">
                 <h1 className="text-3xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-tight drop-shadow-sm">
                    {profile.username}
                 </h1>
                 {/* Bouton Suivre */}
                 {currentUser && currentUser.id !== profile.id && (
                    <button
                        onClick={handleFollowToggle}
                        className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md text-[10px] md:text-xs font-bold uppercase tracking-widest transition text-white/60 hover:text-white ${
                            isFollowing
                            ? 'hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-500'
                            : 'hover:bg-[#00e054] hover:text-black hover:border-[#00e054]'
                        }`}
                    >
                        {isFollowing ? 'Abonné' : 'Suivre'}
                    </button>
                 )}
             </div>

             {/* Stats Cards (Glass Pills) */}
             <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-4">
                <div className="bg-white/5 backdrop-blur-md border border-white/5 px-4 md:px-6 py-2 md:py-3 rounded-2xl flex flex-col items-center min-w-[70px] md:min-w-[90px]">
                    <span className="font-black text-xl md:text-2xl text-white leading-none">{reviewsCount}</span>
                    <span className="text-white/40 uppercase text-[8px] md:text-[9px] font-bold tracking-[0.2em] mt-1">Avis</span>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/5 px-4 md:px-6 py-2 md:py-3 rounded-2xl flex flex-col items-center min-w-[70px] md:min-w-[90px]">
                    <span className="font-black text-xl md:text-2xl text-white leading-none">{followersCount}</span>
                    <span className="text-white/40 uppercase text-[8px] md:text-[9px] font-bold tracking-[0.2em] mt-1">Abonnés</span>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/5 px-4 md:px-6 py-2 md:py-3 rounded-2xl flex flex-col items-center min-w-[70px] md:min-w-[90px]">
                    <span className="font-black text-xl md:text-2xl text-white leading-none">{lists.length}</span>
                    <span className="text-white/40 uppercase text-[8px] md:text-[9px] font-bold tracking-[0.2em] mt-1">Listes</span>
                </div>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 relative z-10">
        
        {/* --- TOP 5 ALBUMS --- */}
        {profile.top_albums && profile.top_albums.length > 0 && (
            <section className="mb-12 md:mb-20">
                <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
                    <h2 className="text-xs md:text-sm font-bold text-white/50 uppercase tracking-[0.3em]">Top Albums</h2>
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
                </div>

                <div className="flex gap-3 md:gap-6 overflow-x-auto pb-2 scrollbar-hide">
                    {profile.top_albums.slice(0, 5).map((item: any, i: number) => (
                        <div key={i} className="group relative flex-shrink-0 w-32 md:w-40 aspect-[2/3] md:aspect-square bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[#00e054]/20">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition duration-700" />
                            <div className="absolute top-2 left-2 w-8 h-8 bg-[#00e054] text-black font-black flex items-center justify-center rounded-full shadow-lg z-10">
                                #{i + 1}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        )}

        {/* --- TOP 5 CHANSONS --- */}
        {profile.top_songs && profile.top_songs.length > 0 && (
            <section className="mb-12 md:mb-20">
                <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
                    <h2 className="text-xs md:text-sm font-bold text-white/50 uppercase tracking-[0.3em]">Top Titres</h2>
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
                </div>

                <div className="flex gap-3 md:gap-6 overflow-x-auto pb-2 scrollbar-hide">
                    {profile.top_songs.slice(0, 5).map((item: any, i: number) => (
                        <div key={i} className="group relative flex-shrink-0 w-32 md:w-40 aspect-square bg-white/5 rounded-full border border-white/10 overflow-hidden shadow-2xl transition-all duration-500 hover:scale-105 hover:shadow-[#00e054]/20">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-700" />
                            {/* Vinyle effect center */}
                            <div className="absolute inset-0 m-auto w-3 h-3 md:w-4 md:h-4 bg-[#121212] rounded-full border border-white/20 z-10" />

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center backdrop-blur-[2px] z-20">
                                <div className="absolute top-2 left-2 w-8 h-8 bg-[#00e054] text-black font-black flex items-center justify-center rounded-full shadow-lg z-30">
                                    #{i + 1}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        )}

        {/* --- ONGLETS NAVIGATION (Style Instagram) --- */}
        <div className="border-t border-white/10 mb-8 md:mb-12">
            <div className="flex justify-center gap-12 md:gap-16">
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={`flex items-center gap-2 py-4 px-2 border-t-2 -mt-px transition-all ${
                        activeTab === 'reviews'
                            ? 'border-[#00e054] text-white'
                            : 'border-transparent text-white/40 hover:text-white/70'
                    }`}
                >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                    </svg>
                    <span className="text-xs md:text-sm font-bold uppercase tracking-widest">Critiques</span>
                </button>
                <button
                    onClick={() => setActiveTab('lists')}
                    className={`flex items-center gap-2 py-4 px-2 border-t-2 -mt-px transition-all ${
                        activeTab === 'lists'
                            ? 'border-[#00e054] text-white'
                            : 'border-transparent text-white/40 hover:text-white/70'
                    }`}
                >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18M9 21V9" />
                    </svg>
                    <span className="text-xs md:text-sm font-bold uppercase tracking-widest">Listes</span>
                </button>
            </div>
        </div>

        {/* --- CONTENU CONDITIONNEL --- */}
        {activeTab === 'lists' && (
            <section>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 md:mb-8">
                    <h2 className="text-xl md:text-2xl font-black text-white">Ses Listes</h2>
                </div>
                {lists.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {lists.map((list) => (
                            <Link key={list.id} href={`/lists/${list.id}`} className="group block">
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden">
                                {/* Mosaïque Carrée style Spotify */}
                                <div className="relative w-full aspect-square overflow-hidden bg-black/20">
                                    {list.albums && list.albums.length > 0 ? (
                                        <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-0.5">
                                            {list.albums.slice(0, 4).map((album: any, i: number) => (
                                                <div key={i} className="relative w-full h-full bg-black/40">
                                                    <img
                                                        src={album.image?.replace('100x100', '300x300')}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        alt={album.name}
                                                    />
                                                    {/* Compteur sur la 4ème image si + de 4 albums */}
                                                    {i === 3 && list.albums.length > 4 && (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                                                            <span className="text-white font-bold text-sm md:text-base">+{list.albums.length - 4}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {/* Cases vides si moins de 4 albums */}
                                            {list.albums.length < 4 && Array.from({ length: 4 - list.albums.length }).map((_, i) => (
                                                <div key={`empty-${i}`} className="bg-white/5 flex items-center justify-center w-full h-full">
                                                    <span className="text-white/10 text-lg">♫</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                            <span className="text-white/20 text-3xl">♪</span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 md:p-4">
                                    <h3 className="font-bold text-white text-sm md:text-base mb-1 group-hover:text-[#00e054] transition-colors line-clamp-1">{list.title}</h3>
                                    <p className="text-[10px] md:text-xs text-gray-400 line-clamp-1">
                                        {list.description || `${list.albums?.length || 0} album${(list.albums?.length || 0) > 1 ? 's' : ''}`}
                                    </p>
                                </div>
                            </div>
                        </Link>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 md:p-16 border border-dashed border-white/10 rounded-3xl text-center text-white/30 text-sm">
                        <div className="text-4xl mb-4 opacity-50">📚</div>
                        <p>Aucune liste créée.</p>
                    </div>
                )}
            </section>
        )}

        {activeTab === 'reviews' && (
            <section>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 md:mb-8">
                    <h2 className="text-xl md:text-2xl font-black text-white">Ses Critiques</h2>
                </div>
                {reviews.length === 0 ? (
                    <div className="p-12 md:p-16 border border-dashed border-white/10 rounded-3xl text-center text-white/30 text-sm">
                        <div className="text-4xl mb-4 opacity-50">✍️</div>
                        <p>Aucune critique pour le moment.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {reviews.slice(0, 10).map((review) => (
                            <div key={review.id} className="relative flex gap-4 md:gap-5 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 group hover:bg-white/10 hover:border-white/20 transition duration-300">
                                <Link href={`/album/${review.album_id}`} className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden shadow-lg border border-white/10">
                                    <img src={review.album_image} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                                </Link>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className="font-bold text-white text-sm md:text-base line-clamp-1">{review.album_name}</h4>
                                    </div>
                                    <p className="text-gray-500 text-xs mb-1">{review.artist_name}</p>
                                    <div className="text-[#00e054] text-xs tracking-wider my-1">{"★".repeat(review.rating)}</div>
                                    <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed italic">"{review.review_text}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        )}

      </main>

      {/* --- MODALES (Glass style) --- */}
      {/* Pas de modales nécessaires pour cette page publique */}
    </div>
  );
}