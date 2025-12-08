'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchUserProfile = async (userId: string, email: string) => {
    let { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profileData) profileData = { id: userId, username: email.split('@')[0], avatar_url: '' };

    setProfile(profileData);
    setNewUsername(profileData.username || '');
    setNewAvatar(profileData.avatar_url || '');
    setTopAlbums(profileData.top_albums || []);
    setTopSongs(profileData.top_songs || []);

    // 2. Critiques (CORRIGÉ : Recherche par ID stable)
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId) // <--- C'EST ICI LE CHANGEMENT IMPORTANT
      .order('created_at', { ascending: false } as any);
    setReviews(reviewsData || []);

    const { data: listsData } = await supabase.from('lists').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setLists(listsData || []);

    // 4. Abonnés (followers - ceux qui me suivent)
    const { data: followersData } = await supabase
      .from('follows')
      .select(`
        follower_id,
        profiles!follows_follower_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .eq('following_id', userId);
    const followersList = followersData?.map(item => item.profiles).filter(Boolean) || [];
    setFollowersList(followersList);

    // 5. Abonnements (following - ceux que je suis)
    const { data: followingData } = await supabase
      .from('follows')
      .select(`
        following_id,
        profiles!follows_following_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .eq('follower_id', userId);
    const followingList = followingData?.map(item => item.profiles).filter(Boolean) || [];
    setFollowingList(followingList);

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

  if (loading) return <div className="min-h-screen bg-[#050505] text-white p-10 flex items-center justify-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black pb-20">
      
      {/* Background Glow */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* NAVBAR FLOTTANTE */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-2 md:px-4">
        <nav className="flex items-center justify-between px-4 md:px-8 py-2 md:py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl w-full max-w-5xl">
            <Link href="/" className="text-lg md:text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>
            <div className="flex items-center gap-3 md:gap-8 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                <Link href="/search" className="hover:text-[#00e054] transition hidden sm:inline">Albums</Link>
                <Link href="/discover" className="hover:text-[#00e054] transition flex items-center gap-1 md:gap-2">
                    <span className="text-base md:text-lg">⚡</span> <span className="hidden sm:inline">Découvrir</span>
                </Link>
                <Link href="/lists/import" className="hover:text-[#00e054] transition flex items-center gap-1 md:gap-2">
                    <span className="text-base md:text-lg">📥</span> <span className="hidden sm:inline">Importer</span>
                </Link>
                <Link href="/community" className="hover:text-[#00e054] transition hidden md:inline">Membres</Link>
                <button onClick={handleSignOut} className="text-red-400 hover:text-red-300 transition border border-red-900/50 px-3 md:px-4 py-1.5 md:py-2 rounded-full hover:bg-red-900/20 text-[10px] md:text-sm">Déconnexion</button>
            </div>
        </nav>
      </div>

      {/* HEADER PROFIL */}
      <header className="relative pt-32 pb-12 px-6 z-10 border-b border-white/5 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center md:items-end gap-8">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#00e054] to-emerald-800 flex items-center justify-center text-5xl font-bold text-black border-4 border-[#14181c] shadow-2xl overflow-hidden hover:scale-105 transition duration-500">
            {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : user.email[0].toUpperCase()}
          </div>
          <div className="flex-1 text-center md:text-left">
             <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">{profile?.username || 'Utilisateur'}</h1>
             <button onClick={() => setIsEditing(true)} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white border border-white/10 hover:border-white/50 px-4 py-2 rounded-full transition mb-6">Modifier le profil</button>
             
             <div className="flex justify-center md:justify-start gap-8">
                <div className="text-center"><span className="block font-black text-2xl text-white">{reviews.length}</span><span className="text-gray-500 uppercase text-[10px] tracking-widest">Avis</span></div>
                <div className="text-center"><span className="block font-black text-2xl text-white">{lists.length}</span><span className="text-gray-500 uppercase text-[10px] tracking-widest">Listes</span></div>
                <button onClick={() => setShowFollowModal('followers')} className="text-center cursor-pointer hover:text-[#00e054] transition">
                  <span className="block font-black text-2xl text-white">{followersList.length}</span>
                  <span className="text-gray-500 uppercase text-[10px] tracking-widest">Abonnés</span>
                </button>
                <button onClick={() => setShowFollowModal('following')} className="text-center cursor-pointer hover:text-[#00e054] transition">
                  <span className="block font-black text-2xl text-white">{followingList.length}</span>
                  <span className="text-gray-500 uppercase text-[10px] tracking-widest">Abonnements</span>
                </button>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16 relative z-10">
        
        {/* TOP 5 ALBUMS */}
        <section>
            <h2 className="text-sm font-bold text-[#00e054] uppercase tracking-widest mb-6 flex items-center gap-2"><span className="w-2 h-2 bg-[#00e054] rounded-full"></span> Top 5 Albums</h2>
            <div className="grid grid-cols-5 gap-4">
                {[0, 1, 2, 3, 4].map((i) => {
                    const item = topAlbums[i];
                    return item ? (
                        <div key={i} className="group relative aspect-square bg-black rounded-2xl border border-white/10 overflow-hidden shadow-lg hover:shadow-[#00e054]/20 transition duration-500">
                            <img src={item.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition duration-700" />
                            <button onClick={() => removeFromTop(i, 'album')} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white hover:text-red-500 font-bold text-3xl transition">×</button>
                        </div>
                    ) : (
                        <button key={i} onClick={() => setSearchMode('album')} className="aspect-square bg-white/5 rounded-2xl border border-white/10 border-dashed flex items-center justify-center hover:bg-white/10 hover:border-[#00e054] group transition">
                            <span className="text-gray-600 group-hover:text-[#00e054] text-3xl font-light transition">+</span>
                        </button>
                    );
                })}
            </div>
        </section>

        {/* TOP 5 CHANSONS */}
        <section>
            <h2 className="text-sm font-bold text-[#00e054] uppercase tracking-widest mb-6 flex items-center gap-2"><span className="w-2 h-2 bg-[#00e054] rounded-full"></span> Top 5 Titres</h2>
            <div className="grid grid-cols-5 gap-4">
                {[0, 1, 2, 3, 4].map((i) => {
                    const item = topSongs[i];
                    return item ? (
                        <div key={i} className="group relative aspect-square bg-black rounded-full border border-white/10 overflow-hidden shadow-lg hover:shadow-[#00e054]/20 transition duration-500">
                            <img src={item.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition duration-700" />
                            <button onClick={() => removeFromTop(i, 'song')} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white hover:text-red-500 font-bold text-3xl transition">×</button>
                        </div>
                    ) : (
                        <button key={i} onClick={() => setSearchMode('song')} className="aspect-square bg-white/5 rounded-full border border-white/10 border-dashed flex items-center justify-center hover:bg-white/10 hover:border-[#00e054] group transition">
                            <span className="text-gray-600 group-hover:text-[#00e054] text-3xl font-light transition">+</span>
                        </button>
                    );
                })}
            </div>
        </section>

        {/* LISTES */}
        <section>
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Mes Listes</h2>
                <Link href="/lists/create" className="text-xs bg-[#00e054] text-black font-bold px-4 py-2 rounded-full hover:bg-[#00c04b] transition">+ Créer</Link>
            </div>
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

        {/* JOURNAL */}
        <section>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-2">Journal Récent</h2>
            <div className="space-y-4">
                {reviews.map((review) => (
                <div key={review.id} className="relative flex gap-6 bg-[#121212] p-6 rounded-2xl border border-white/5 group hover:bg-[#181818] transition">
                    <button onClick={() => handleDeleteReview(review.id)} disabled={deletingId === review.id} className="absolute top-6 right-6 text-gray-600 hover:text-red-500 transition opacity-0 group-hover:opacity-100">🗑️</button>
                    <Link href={`/album/${review.album_id}`} className="flex-shrink-0 w-20 h-20 bg-black rounded-lg overflow-hidden shadow-lg">
                        <img src={review.album_image} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    </Link>
                    <div className="flex-1 py-1">
                        <div className="font-bold text-white text-lg">{review.album_name}</div>
                        <div className="text-[#00e054] text-sm mb-2 tracking-widest">{"★".repeat(review.rating)}</div>
                        <p className="text-gray-400 text-sm italic font-light">"{review.review_text}"</p>
                    </div>
                </div>
                ))}
            </div>
        </section>
      </main>

      {/* MODALES (Recherche & Édition) */}
      {(searchMode || isEditing) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#1a1a1a] p-8 rounded-3xl w-full max-w-lg border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">{isEditing ? 'Profil' : 'Ajouter'}</h2>
                    <button onClick={() => {setSearchMode(null); setIsEditing(false)}} className="text-gray-500 hover:text-white text-2xl">×</button>
                </div>

                {isEditing ? (
                    <div className="space-y-4">
                        <input type="text" placeholder="Pseudo" className="w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:border-[#00e054] outline-none" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                        <input type="text" placeholder="URL Avatar" className="w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:border-[#00e054] outline-none" value={newAvatar} onChange={(e) => setNewAvatar(e.target.value)} />
                        <button onClick={handleUpdateProfile} className="w-full bg-[#00e054] text-black font-bold py-4 rounded-xl hover:bg-[#00c04b]">Sauvegarder</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex gap-2 mb-4">
                            <input autoFocus type="text" placeholder="Rechercher..." className="flex-1 bg-black border border-white/10 rounded-xl p-4 text-white focus:border-[#00e054] outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            <button onClick={handleSearchTop} className="bg-[#00e054] text-black font-bold px-6 rounded-xl">Go</button>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                            {searchResults.map((item: any) => (
                                <div key={item.collectionId || item.trackId} onClick={() => addToTop(item)} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer border border-transparent hover:border-white/10 transition">
                                    <img src={item.artworkUrl100} className="w-12 h-12 rounded-lg bg-black" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-white text-sm truncate">{searchMode === 'album' ? item.collectionName : item.trackName}</div>
                                        <div className="text-xs text-gray-500 truncate">{item.artistName}</div>
                                    </div>
                                    <div className="text-[#00e054] font-bold text-xl">+</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* MODALE SUIVI */}
      {showFollowModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#1a1a1a] p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">
                      {showFollowModal === 'followers' ? 'Abonnés' : 'Abonnements'}
                    </h2>
                    <button onClick={() => setShowFollowModal(null)} className="text-gray-500 hover:text-white text-2xl">×</button>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                    {(showFollowModal === 'followers' ? followersList : followingList).map((user: any) => (
                        <Link
                          key={user.id}
                          href={`/user/${user.username}`}
                          onClick={() => setShowFollowModal(null)}
                          className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition group"
                        >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00e054] to-emerald-800 flex items-center justify-center text-lg font-bold text-black border-2 border-[#14181c] overflow-hidden group-hover:scale-105 transition">
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                  user.username[0].toUpperCase()
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-white text-base group-hover:text-[#00e054] transition">{user.username}</div>
                            </div>
                        </Link>
                    ))}

                    {(showFollowModal === 'followers' ? followersList : followingList).length === 0 && (
                        <div className="text-center py-8">
                            <div className="text-gray-500 text-sm">
                              {showFollowModal === 'followers' ? 'Aucun abonné pour le moment' : 'Aucun abonnement pour le moment'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}