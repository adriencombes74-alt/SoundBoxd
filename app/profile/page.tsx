'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProfileMenu from '@/components/ui/profile-menu';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [likedAlbums, setLikedAlbums] = useState<any[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // États pour la recherche, l'édition, les modales (inchangés)
  const [searchMode, setSearchMode] = useState<'album' | 'song' | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newAvatar, setNewAvatar] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null);
  const [activeTab, setActiveTab] = useState<'reviews' | 'lists' | 'likes'>('reviews');

  // --- LOGIQUE (Identique à l'original) ---
  const fetchUserProfile = async (userId: string, email: string) => {
    let { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profileData) profileData = { id: userId, username: email.split('@')[0], avatar_url: '' };

    setProfile(profileData);
    setNewUsername(profileData.username || '');
    setNewAvatar(profileData.avatar_url || '');
    setTopAlbums(profileData.top_albums || []);
    setTopSongs(profileData.top_songs || []);

    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false } as any);
    setReviews(reviewsData || []);

    const { data: listsData } = await supabase.from('lists').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setLists(listsData || []);

    const { data: likedAlbumsData } = await supabase.from('album_likes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setLikedAlbums(likedAlbumsData || []);

    const { data: followersData } = await supabase
      .from('follows')
      .select(`follower_id, profiles!follows_follower_id_fkey (id, username, avatar_url)`)
      .eq('following_id', userId);
    // @ts-ignore
    setFollowersList(followersData?.map(item => item.profiles).filter(Boolean) || []);

    const { data: followingData } = await supabase
      .from('follows')
      .select(`following_id, profiles!follows_following_id_fkey (id, username, avatar_url)`)
      .eq('follower_id', userId);
    // @ts-ignore
    setFollowingList(followingData?.map(item => item.profiles).filter(Boolean) || []);

    setLoading(false);
  };

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) router.push('/login');
    else { setUser(user); fetchUserProfile(user.id, user.email || ''); }
  };

  useEffect(() => { checkUser(); }, []);

  const handleSearchTop = async (e: any) => { e.preventDefault(); if(!searchQuery.trim()) return; setIsSearching(true); try { const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=${searchMode === 'album' ? 'album' : 'song'}&limit=10`); const d = await res.json(); setSearchResults(d.results); } catch(e){console.error(e)} setIsSearching(false); };
  const addToTop = async (item: any) => { if(!user) return; const clean = { id: item.collectionId||item.trackId, name: item.collectionName||item.trackName, artist: item.artistName, image: item.artworkUrl100?.replace('100x100','400x400') }; const col = searchMode==='album'?'top_albums':'top_songs'; const list = searchMode==='album'?[...topAlbums,clean]:[...topSongs,clean]; if(list.length>5) return alert('Top 5 complet'); if(searchMode==='album') setTopAlbums(list); else setTopSongs(list); await supabase.from('profiles').update({[col]:list}).eq('id', user.id); setSearchMode(null); setSearchQuery(""); setSearchResults([]); };
  const removeFromTop = async (idx: number, type: 'album'|'song') => { if(!confirm("Retirer ?")) return; const col = type==='album'?'top_albums':'top_songs'; const list = type==='album'?topAlbums.filter((_,i)=>i!==idx):topSongs.filter((_,i)=>i!==idx); if(type==='album') setTopAlbums(list); else setTopSongs(list); await supabase.from('profiles').update({[col]:list}).eq('id', user.id); };
  const handleUpdateProfile = async () => { const { error } = await supabase.from('profiles').upsert({ id: user.id, username: newUsername, avatar_url: newAvatar, updated_at: new Date() }); if(!error) { setIsEditing(false); fetchUserProfile(user.id, user.email); } };
  const handleDeleteReview = async (id: number) => { if(!confirm("Supprimer ?")) return; setDeletingId(id); await supabase.from('reviews').delete().eq('id', id); setReviews(reviews.filter(r => r.id !== id)); setDeletingId(null); };
  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/'); };

  if (loading) return <div className="min-h-screen bg-[#080808] text-white p-10 flex items-center justify-center">Chargement...</div>;

  // L'image de fond est le 1er album du top, ou une image par défaut
  const bannerImage = topAlbums.length > 0 ? topAlbums[0].image?.replace('400x400', '1000x1000') : null;

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

      {/* --- NAVBAR FLOTTANTE --- */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-2 md:px-4">
        <nav className=" flex items-center justify-between px-4 md:px-8 py-2 md:py-3 w-full max-w-5xl rounded-full transition-all duration-300 bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 border border-white/10 border-t-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),inset_0_1px_0_0_rgba(255,255,255,0.15)] 
        ">
            <Link href="/" className="text-lg md:text-xl font-black tracking-tighter uppercase text-white flex items-center gap-0">
                Music<span className="text-[#00e054]">Boxd</span>
            </Link>
            <div className="flex items-center gap-2 md:gap-6 text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/70">
                <Link href="/search" className="hover:text-white transition hidden sm:inline">Albums</Link>
                <Link href="/discover" className="hover:text-white transition flex items-center gap-1 md:gap-2">
                    <span className="text-sm md:text-base opacity-70">⚡</span> <span className="hidden sm:inline">Découvrir</span>
                </Link>
                <Link href="/lists/create" className="hover:text-white transition flex items-center gap-1 md:gap-2">
                    <span className="text-sm md:text-base opacity-70">📥</span> <span className="hidden sm:inline">Importer</span>
                </Link>
                <Link href="/community" className="hover:text-white transition hidden md:inline">Membres</Link>
                {user && <ProfileMenu user={user} />}
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
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#222] to-black flex items-center justify-center text-3xl md:text-4xl text-white font-bold">
                            {user.email[0].toUpperCase()}
                        </div>
                    )}
                </div>
              </div>
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left space-y-3 md:space-y-4">
             <div className="flex flex-col items-center md:flex-row md:items-center gap-3 md:gap-4">
                 <h1 className="text-3xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-tight drop-shadow-sm">
                    {profile?.username || 'Utilisateur'}
                 </h1>
                 <button onClick={() => setIsEditing(true)} className="px-3 md:px-4 py-1 md:py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md text-[10px] md:text-xs font-bold uppercase tracking-widest transition text-white/60 hover:text-white">
                    Modifier
                 </button>
             </div>

             {/* Stats Cards (Glass Pills) */}
             <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-4">
                <div className="bg-white/5 backdrop-blur-md border border-white/5 px-4 md:px-6 py-2 md:py-3 rounded-2xl flex flex-col items-center min-w-[70px] md:min-w-[90px]">
                    <span className="font-black text-xl md:text-2xl text-white leading-none">{reviews.length}</span>
                    <span className="text-white/40 uppercase text-[8px] md:text-[9px] font-bold tracking-[0.2em] mt-1">Avis</span>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/5 px-4 md:px-6 py-2 md:py-3 rounded-2xl flex flex-col items-center min-w-[70px] md:min-w-[90px]">
                    <span className="font-black text-xl md:text-2xl text-white leading-none">{lists.length}</span>
                    <span className="text-white/40 uppercase text-[8px] md:text-[9px] font-bold tracking-[0.2em] mt-1">Listes</span>
                </div>
                <button onClick={() => setShowFollowModal('followers')} className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/5 px-4 md:px-6 py-2 md:py-3 rounded-2xl flex flex-col items-center min-w-[70px] md:min-w-[90px] transition cursor-pointer group">
                    <span className="font-black text-xl md:text-2xl text-white leading-none group-hover:text-[#00e054] transition-colors">{followersList.length}</span>
                    <span className="text-white/40 uppercase text-[8px] md:text-[9px] font-bold tracking-[0.2em] mt-1">Abonnés</span>
                </button>
                <button onClick={() => setShowFollowModal('following')} className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/5 px-4 md:px-6 py-2 md:py-3 rounded-2xl flex flex-col items-center min-w-[70px] md:min-w-[90px] transition cursor-pointer group">
                    <span className="font-black text-xl md:text-2xl text-white leading-none group-hover:text-[#00e054] transition-colors">{followingList.length}</span>
                    <span className="text-white/40 uppercase text-[8px] md:text-[9px] font-bold tracking-[0.2em] mt-1">Suivis</span>
                </button>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 relative z-10">

        {/* --- TOP 5 ALBUMS --- */}
        <section className="mb-12 md:mb-20">
            <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
                <h2 className="text-xs md:text-sm font-bold text-white/50 uppercase tracking-[0.3em]">Top Albums</h2>
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
            </div>

            <div className="flex gap-3 md:gap-6 overflow-x-auto pb-2 scrollbar-hide">
                {[0, 1, 2, 3, 4].map((i) => {
                    const item = topAlbums[i];
                    return item ? (
                        <div key={i} className="group relative flex-shrink-0 w-32 md:w-40 aspect-[2/3] md:aspect-square bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[#00e054]/20">
                            <img src={item.image} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition duration-700" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                <button onClick={() => removeFromTop(i, 'album')} className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white hover:bg-red-500/80 hover:border-red-500 flex items-center justify-center transition">✕</button>
                            </div>
                            <div className="absolute top-2 left-2 w-8 h-8 bg-[#00e054] text-black font-black flex items-center justify-center rounded-full shadow-lg z-10">
                                #{i + 1}
                            </div>
                        </div>
                    ) : (
                        <button key={i} onClick={() => setSearchMode('album')} className="flex-shrink-0 w-32 md:w-40 aspect-[2/3] md:aspect-square bg-white/[0.03] rounded-3xl border border-white/5 border-dashed flex flex-col items-center justify-center hover:bg-white/[0.08] hover:border-white/20 group transition-all duration-300">
                            <span className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/10 flex items-center justify-center text-white/30 group-hover:text-[#00e054] group-hover:border-[#00e054] transition text-lg md:text-xl">+</span>
                        </button>
                    );
                })}
            </div>
        </section>

        {/* --- TOP 5 CHANSONS --- */}
        <section className="mb-12 md:mb-20">
            <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
                <h2 className="text-xs md:text-sm font-bold text-white/50 uppercase tracking-[0.3em]">Top Titres</h2>
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1" />
            </div>

            <div className="flex gap-3 md:gap-6 overflow-x-auto pb-2 scrollbar-hide">
                {[0, 1, 2, 3, 4].map((i) => {
                    const item = topSongs[i];
                    return item ? (
                        <div key={i} className="group relative flex-shrink-0 w-32 md:w-40 aspect-square bg-white/5 rounded-full border border-white/10 overflow-hidden shadow-2xl transition-all duration-500 hover:scale-105 hover:shadow-[#00e054]/20">
                            <img src={item.image} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-700" />
                            {/* Vinyle effect center */}
                            <div className="absolute inset-0 m-auto w-3 h-3 md:w-4 md:h-4 bg-[#121212] rounded-full border border-white/20 z-10" />

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center backdrop-blur-[2px] z-20">
                                <button onClick={() => removeFromTop(i, 'song')} className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white hover:bg-red-500/80 hover:border-red-500 flex items-center justify-center transition">✕</button>
                            </div>
                        </div>
                    ) : (
                        <button key={i} onClick={() => setSearchMode('song')} className="flex-shrink-0 w-32 md:w-40 aspect-square bg-white/[0.03] rounded-full border border-white/5 border-dashed flex items-center justify-center hover:bg-white/[0.08] hover:border-white/20 group transition-all duration-300">
                            <span className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/10 flex items-center justify-center text-white/30 group-hover:text-[#00e054] group-hover:border-[#00e054] transition text-lg md:text-xl">+</span>
                        </button>
                    );
                })}
            </div>
        </section>

        {/* --- ONGLETS NAVIGATION (Style Instagram) --- */}
        <div className="border-t border-white/10 mb-8 md:mb-12">
            <div className="flex justify-center gap-8 md:gap-12">
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
                <button
                    onClick={() => setActiveTab('likes')}
                    className={`flex items-center gap-2 py-4 px-2 border-t-2 -mt-px transition-all ${
                        activeTab === 'likes'
                            ? 'border-[#00e054] text-white'
                            : 'border-transparent text-white/40 hover:text-white/70'
                    }`}
                >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span className="text-xs md:text-sm font-bold uppercase tracking-widest">Likes</span>
                </button>
            </div>
        </div>

        {/* --- CONTENU CONDITIONNEL --- */}
        {activeTab === 'lists' && (
            <section>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 md:mb-8">
                    <h2 className="text-xl md:text-2xl font-black text-white">Mes Listes</h2>
                    <Link href="/lists/create" className="text-[10px] md:text-xs bg-white/10 hover:bg-[#00e054] hover:text-black border border-white/10 text-white font-bold px-4 md:px-5 py-2 md:py-2.5 rounded-full transition duration-300 backdrop-blur-md text-center">+ Créer une liste</Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {lists.length > 0 ? lists.map((list) => (
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
                    )) : (
                        <div className="col-span-2 md:col-span-3 lg:col-span-4 p-12 md:p-16 border border-dashed border-white/10 rounded-3xl text-center text-white/30 text-sm">
                            <div className="text-4xl mb-4 opacity-50">📚</div>
                            <p>Aucune liste créée.</p>
                            <Link href="/lists/create" className="inline-block mt-4 text-[#00e054] hover:underline text-xs">Créer ma première liste</Link>
                        </div>
                    )}
                </div>
            </section>
        )}

        {activeTab === 'reviews' && (
            <section>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 md:mb-8">
                    <h2 className="text-xl md:text-2xl font-black text-white">Mes Critiques</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {reviews.length > 0 ? reviews.map((review) => (
                    <div key={review.id} className="relative flex gap-4 md:gap-5 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 group hover:bg-white/10 hover:border-white/20 transition duration-300">
                        <Link href={`/album/${review.album_id}`} className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden shadow-lg border border-white/10">
                            <img src={review.album_image} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                        </Link>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex justify-between items-start gap-2">
                                <h4 className="font-bold text-white text-sm md:text-base line-clamp-1">{review.album_name}</h4>
                                <button onClick={() => handleDeleteReview(review.id)} disabled={deletingId === review.id} className="text-white/20 hover:text-red-400 transition flex-shrink-0">✕</button>
                            </div>
                            <p className="text-gray-500 text-xs mb-1">{review.artist_name}</p>
                            <div className="text-[#00e054] text-xs tracking-wider my-1">{"★".repeat(review.rating)}</div>
                            <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed italic">"{review.review_text}"</p>
                        </div>
                    </div>
                    )) : (
                        <div className="col-span-1 md:col-span-2 p-12 md:p-16 border border-dashed border-white/10 rounded-3xl text-center text-white/30 text-sm">
                            <div className="text-4xl mb-4 opacity-50">✍️</div>
                            <p>Aucune critique publiée.</p>
                            <Link href="/search" className="inline-block mt-4 text-[#00e054] hover:underline text-xs">Découvrir des albums</Link>
                        </div>
                    )}
                </div>
            </section>
        )}

        {activeTab === 'likes' && (
            <section>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 md:mb-8">
                    <h2 className="text-xl md:text-2xl font-black text-white">Mes Likes</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {likedAlbums.length > 0 ? likedAlbums.map((like) => (
                        <Link key={like.id} href={`/album/${like.album_id}`} className="group block">
                            <div className="relative aspect-square overflow-hidden rounded-2xl shadow-lg bg-[#121212] mb-3 border border-white/5 group-hover:border-[#00e054]/50 transition-all duration-300">
                                <img 
                                    src={like.album_image?.replace('100x100', '400x400')} 
                                    alt={like.album_name} 
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-500 group-hover:scale-110"
                                />
                                <div className="absolute top-2 right-2 w-8 h-8 bg-[#00e054]/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
                                    <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                    </svg>
                                </div>
                            </div>
                            <h3 className="font-bold text-xs text-white truncate group-hover:text-[#00e054] transition">{like.album_name}</h3>
                            <p className="text-[10px] text-gray-400 truncate uppercase tracking-wide">{like.artist_name}</p>
                        </Link>
                    )) : (
                        <div className="col-span-2 md:col-span-4 lg:col-span-5 p-12 md:p-16 border border-dashed border-white/10 rounded-3xl text-center text-white/30 text-sm">
                            <div className="text-4xl mb-4 opacity-50">❤️</div>
                            <p>Aucun album liké.</p>
                            <Link href="/discover" className="inline-block mt-4 text-[#00e054] hover:underline text-xs">Découvrir de la musique</Link>
                        </div>
                    )}
                </div>
            </section>
        )}

      </main>

      {/* --- MODALES (Glass style) --- */}
      {(searchMode || isEditing) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/5 backdrop-blur xl p-2 md:p-4 animate-in fade-in duration-300">
            <div className="bg-[#121212]/30 backdrop-blur-2xl p-4 md:p-8 rounded-[2rem] w-full max-w-sm md:max-w-lg border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black text-white tracking-tight">{isEditing ? 'Éditer le Profil' : 'Ajouter au Top'}</h2>
                    <button onClick={() => {setSearchMode(null); setIsEditing(false)}} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white hover:text-black flex items-center justify-center transition">✕</button>
                </div>

                {isEditing ? (
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-3">Pseudo</label>
                            <input type="text" className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-[#00e054] outline-none transition" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-3">URL Avatar</label>
                            <input type="text" className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-[#00e054] outline-none transition" value={newAvatar} onChange={(e) => setNewAvatar(e.target.value)} />
                        </div>
                        <button onClick={handleUpdateProfile} className="w-full bg-[#00e054] text-black font-black py-4 rounded-2xl hover:scale-[1.02] transition transform shadow-[0_0_20px_rgba(0,224,84,0.3)] mt-2">Enregistrer</button>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="flex gap-3">
                            <input autoFocus type="text" placeholder="Rechercher..." className="flex-1 bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-[#00e054] outline-none transition" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            <button onClick={handleSearchTop} className="bg-[#00e054] text-black font-bold px-6 rounded-2xl hover:bg-[#00c549] transition">Go</button>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
                            {searchResults.map((item: any) => (
                                <div key={item.collectionId || item.trackId} onClick={() => addToTop(item)} className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-2xl cursor-pointer border border-transparent hover:border-white/10 transition group">
                                    <img src={item.artworkUrl100} className="w-12 h-12 rounded-lg bg-black object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-white text-sm truncate">{searchMode === 'album' ? item.collectionName : item.trackName}</div>
                                        <div className="text-xs text-gray-400 truncate">{item.artistName}</div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[#00e054] opacity-0 group-hover:opacity-100 transition transform group-hover:scale-110">+</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* --- MODALE SUIVI (Glass Style) --- */}
      {showFollowModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-2 md:p-4 animate-in fade-in duration-300">
            <div className="bg-[#121212]/90 backdrop-blur-2xl p-4 md:p-8 rounded-[2rem] w-full max-w-sm md:max-w-md border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-white tracking-tight">
                      {showFollowModal === 'followers' ? 'Abonnés' : 'Abonnements'}
                    </h2>
                    <button onClick={() => setShowFollowModal(null)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white hover:text-black flex items-center justify-center transition">✕</button>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
                    {(showFollowModal === 'followers' ? followersList : followingList).map((user: any) => (
                        <Link
                          key={user.id}
                          href={`/user/${user.username}`}
                          onClick={() => setShowFollowModal(null)}
                          className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-2xl border border-transparent hover:border-white/10 transition group"
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00e054] to-emerald-800 flex items-center justify-center text-sm font-bold text-black border border-white/10 overflow-hidden">
                                {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.username[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-white text-base group-hover:text-[#00e054] transition">{user.username}</div>
                            </div>
                        </Link>
                    ))}

                    {(showFollowModal === 'followers' ? followersList : followingList).length === 0 && (
                        <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
                            <div className="text-white/30 text-sm">C'est bien vide ici...</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
