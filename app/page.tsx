'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Données
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]); // NOUVEAU : Top Musiques
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [friendReviews, setFriendReviews] = useState<any[]>([]);
  const [myLikes, setMyLikes] = useState<Set<number>>(new Set());

  // Pagination
  const [limitTopAlbums, setLimitTopAlbums] = useState(5);
  const [limitTopSongs, setLimitTopSongs] = useState(5); // Pagination Musiques
  const [limitRecent, setLimitRecent] = useState(5);
  const [limitFriends, setLimitFriends] = useState(5);

  // Modale
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [likers, setLikers] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  const genres = ["Pop", "Hip-Hop", "Rock", "Alternative", "Indie", "Electronic", "Jazz", "R&B", "Metal", "Classical"];

  useEffect(() => {
    checkUser();
    fetchData();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
        fetchMyLikes(user.id);
        fetchFriendReviews(user.id);
    }
  };

  const fetchMyLikes = async (userId: string) => {
    const { data } = await supabase.from('likes').select('review_id').eq('user_id', userId);
    if (data) setMyLikes(new Set(data.map((l: any) => l.review_id)));
  };

  const fetchData = async () => {
    setLoading(true);
    
    // 1. RÉCUPÉRATION DES DONNÉES POUR LES TOPS
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('*')
      .not('rating', 'is', null)
      .order('created_at', { ascending: false })
      .limit(300);

    if (allReviews) {
        const albumMap = new Map();
        const songMap = new Map();

        allReviews.forEach((review) => {
            // Si track_id existe, c'est une chanson
            if (review.track_id) {
                if (!songMap.has(review.track_id)) {
                    songMap.set(review.track_id, {
                        id: review.track_id, 
                        albumId: review.album_id,
                        name: review.track_name,
                        artist: review.artist_name,
                        image: review.album_image,
                        totalRating: 0,
                        count: 0
                    });
                }
                const song = songMap.get(review.track_id);
                song.totalRating += review.rating;
                song.count += 1;
            } 
            // Sinon, c'est un album complet
            else {
                if (!albumMap.has(review.album_id)) {
                    albumMap.set(review.album_id, {
                        id: review.album_id,
                        name: review.album_name,
                        artist: review.artist_name,
                        image: review.album_image,
                        totalRating: 0,
                        count: 0
                    });
                }
                const album = albumMap.get(review.album_id);
                album.totalRating += review.rating;
                album.count += 1;
            }
        });

        // Tri et Stockage Albums
        const sortedAlbums = Array.from(albumMap.values())
            .map((a: any) => ({ ...a, average: a.totalRating / a.count }))
            .sort((a, b) => b.average - a.average)
            .slice(0, 20);
        setTopAlbums(sortedAlbums);

        // Tri et Stockage Chansons
        const sortedSongs = Array.from(songMap.values())
            .map((s: any) => ({ ...s, average: s.totalRating / s.count }))
            .sort((a, b) => b.average - a.average)
            .slice(0, 20);
        setTopSongs(sortedSongs);
    }

    // 2. RÉCENT (Derniers avis globaux)
    const { data: recData } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setRecentReviews(recData || []);

    setLoading(false);
  };

  const fetchFriendReviews = async (userId: string) => {
    const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
    const ids = follows?.map((f: any) => f.following_id) || [];
    if (ids.length === 0) return;

    const { data: profiles } = await supabase.from('profiles').select('username').in('id', ids);
    const usernames = profiles?.map((p: any) => p.username) || [];

    const { data: friendsData } = await supabase
      .from('reviews')
      .select('*')
      .in('user_name', usernames)
      .order('created_at', { ascending: false })
      .limit(20);
    
    setFriendReviews(friendsData || []);
  };

  // --- ACTIONS SOCIALES ---
  const handleLike = async (review: any) => {
    if (!user) return alert("Connectez-vous pour aimer !");
    const isLiked = myLikes.has(review.id);
    
    const updateList = (list: any[]) => list.map(r => r.id === review.id ? { ...r, like_count: isLiked ? r.like_count - 1 : r.like_count + 1 } : r);
    setRecentReviews(updateList(recentReviews));
    setFriendReviews(updateList(friendReviews));

    if (isLiked) {
        setMyLikes(prev => { const n = new Set(prev); n.delete(review.id); return n; });
        await supabase.from('likes').delete().eq('user_id', user.id).eq('review_id', review.id);
    } else {
        setMyLikes(prev => new Set(prev).add(review.id));
        await supabase.from('likes').insert({ user_id: user.id, review_id: review.id });
    }
  };

  const openModal = async (review: any) => {
    setSelectedReview(review);
    const { data: cData } = await supabase.from('comments').select('*, profiles(username, avatar_url)').eq('review_id', review.id).order('created_at', { ascending: true });
    setComments(cData || []);
    const { data: lData } = await supabase.from('likes').select('profiles(username)').eq('review_id', review.id);
    // @ts-ignore
    setLikers(lData?.map((l: any) => l.profiles) || []);
  };

  const postComment = async () => {
    if (!newComment.trim() || !user) return;
    const { error } = await supabase.from('comments').insert({ user_id: user.id, review_id: selectedReview.id, content: newComment });
    if (!error) {
        setNewComment("");
        const { data } = await supabase.from('comments').select('*, profiles(username, avatar_url)').eq('review_id', selectedReview.id).order('created_at', { ascending: true });
        setComments(data || []);
    }
  };

  // Composants UI
  const ReviewCard = ({ review }: { review: any }) => (
    <div className="group relative bg-[#121212] rounded-2xl border border-white/5 hover:border-[#00e054]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col h-full">
        <Link href={`/album/${review.album_id}`} className="relative aspect-square overflow-hidden rounded-t-2xl">
            <img 
                src={review.album_image?.replace('100x100', '400x400')} 
                className="w-full h-full object-cover transition duration-700 group-hover:scale-110" 
            />
            <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-[#00e054]">
                ★ {review.rating}
            </div>
        </Link>
        <div className="p-4 flex flex-col flex-1">
            <h3 className="font-bold text-white text-sm truncate mb-1">{review.track_name || review.album_name}</h3>
            {review.track_name && <span className="text-[10px] text-[#00e054] uppercase font-bold mb-1 block">Chanson</span>}
            
            <div className="mt-auto flex justify-between items-center pt-3 border-t border-white/5">
                <Link href={`/user/${review.user_name}`} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-[8px] text-white">
                        {review.user_name?.[0]?.toUpperCase()}
                    </div>
                    {review.user_name}
                </Link>
                
                {/* BOUTONS AJOUTÉS ICI */}
                <div className="flex gap-3 text-xs text-gray-500">
                    <button 
                        onClick={() => handleLike(review)} 
                        className={`flex items-center gap-1 hover:text-white transition ${myLikes.has(review.id) ? 'text-pink-500' : ''}`}
                    >
                        <span>{myLikes.has(review.id) ? '♥' : '♡'}</span> {review.like_count || 0}
                    </button>
                    <button onClick={() => openModal(review)} className="flex items-center gap-1 hover:text-white transition">
                        💬
                    </button>
                </div>
            </div>
        </div>
    </div>
  );

  // Carte Album / Musique pour les Tops
  const TopItemCard = ({ item, rank, type }: { item: any, rank: number, type: 'album' | 'song' }) => (
    <Link href={`/album/${item.albumId || item.id}`} className="group relative block animate-in fade-in zoom-in duration-500">
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl shadow-lg bg-[#121212] mb-3 border border-white/5 group-hover:border-[#00e054]/50 transition-all duration-300 hover:-translate-y-2">
            <img 
                src={item.image?.replace('100x100', '600x600')} 
                alt={item.name} 
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-500 group-hover:scale-110"
            />
            <div className="absolute top-2 left-2 w-8 h-8 bg-[#00e054] text-black font-black flex items-center justify-center rounded-full shadow-lg z-10">
                #{rank}
            </div>
            {type === 'song' && (
                <div className="absolute top-2 right-2 bg-black/80 text-[#00e054] text-[10px] px-2 py-1 rounded-full font-bold shadow-lg backdrop-blur-sm">
                    ♫
                </div>
            )}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent pt-10">
                <div className="flex items-center gap-1 text-[#00e054] font-bold text-lg">
                    <span>★</span> {item.average.toFixed(1)}
                </div>
            </div>
        </div>
        <h3 className="font-bold text-white truncate group-hover:text-[#00e054] transition">{item.name}</h3>
        <p className="text-xs text-gray-500 truncate">{item.artist}</p>
    </Link>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black pb-20 overflow-x-hidden">
      
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-900/20 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* NAVBAR */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-4">
        <nav className="flex items-center justify-between px-8 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl w-full max-w-5xl">
            <Link href="/" className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">
                Music<span className="text-[#00e054]">Boxd</span>
            </Link>
            <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
                <Link href="/search" className="hover:text-[#00e054] transition flex items-center gap-2">
                    <span className="text-lg">🔍</span> <span className="hidden sm:inline">Chercher</span>
                </Link>
                <Link href="/community" className="hover:text-[#00e054] transition hidden sm:inline">Communauté</Link>
                {user ? (
                    <Link href="/profile" className="flex items-center gap-2 pl-4 border-l border-white/10 hover:opacity-80 transition">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00e054] to-emerald-600 flex items-center justify-center text-black font-black text-xs">
                            {user.email[0].toUpperCase()}
                        </div>
                    </Link>
                ) : (
                    <Link href="/login" className="bg-white text-black px-4 py-2 rounded-full hover:bg-[#00e054] transition">Connexion</Link>
                )}
            </div>
        </nav>
      </div>

      {/* HERO */}
      <header className="relative pt-40 pb-10 px-6 flex flex-col items-center text-center z-10">
        <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-6 leading-none text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600 drop-shadow-2xl">
          VOTRE VIE EN <br/><span className="text-[#00e054]">MUSIQUE.</span>
        </h1>
        
        <p className="text-lg text-gray-400 max-w-xl mb-8 font-light">
            Notez vos albums, écrivez des critiques et découvrez de nouvelles pépites grâce à la communauté.
        </p>
        
        <div className="w-full max-w-md relative group mb-8">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00e054] to-blue-600 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
            <Link href="/search" className="relative flex items-center bg-black rounded-full px-6 py-4 w-full hover:bg-[#111] transition">
                <span className="text-gray-500 mr-3">🔍</span>
                <span className="text-gray-400 text-sm">Chercher un album, un artiste...</span>
            </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10 space-y-20">
        
        {/* 1. PARCOURIR PAR GENRE */}
        <section>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-[#00e054] rounded-full"></span> Parcourir par Genre
            </h2>
            <div className="flex flex-wrap gap-3">
                {genres.map((genre) => (
                    <Link 
                        key={genre}
                        href={`/search?q=${genre}&type=album`} 
                        className="px-6 py-3 bg-[#1a1a1a] border border-white/5 hover:border-[#00e054] hover:text-[#00e054] rounded-full text-sm font-bold transition-all hover:scale-105 hover:shadow-lg hover:bg-[#202020]"
                    >
                        {genre}
                    </Link>
                ))}
            </div>
        </section>

        {/* 2. TOP RATED ALBUMS */}
        <section>
            <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                <h2 className="text-3xl font-black text-white tracking-tight">🏆 Top Albums</h2>
                <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Les Mieux Notés</span>
            </div>
            {topAlbums.length > 0 ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {topAlbums.slice(0, limitTopAlbums).map((album, index) => (
                            <TopItemCard key={album.id} item={album} rank={index + 1} type="album" />
                        ))}
                    </div>
                    {limitTopAlbums < topAlbums.length && (
                        <div className="mt-8 text-center">
                            <button onClick={() => setLimitTopAlbums(p => p + 5)} className="px-8 py-3 rounded-full border border-white/10 hover:bg-white hover:text-black transition text-xs font-bold uppercase tracking-widest">+ Voir plus</button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-gray-500 italic">Pas encore assez de notes.</div>
            )}
        </section>

        {/* 3. TOP RATED SONGS (NOUVEAU) */}
        <section>
            <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                <h2 className="text-3xl font-black text-white tracking-tight">🎵 Top Titres</h2>
                <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Les Mieux Notés</span>
            </div>
            {topSongs.length > 0 ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {topSongs.slice(0, limitTopSongs).map((song, index) => (
                            <TopItemCard key={song.id} item={song} rank={index + 1} type="song" />
                        ))}
                    </div>
                    {limitTopSongs < topSongs.length && (
                        <div className="mt-8 text-center">
                            <button onClick={() => setLimitTopSongs(p => p + 5)} className="px-8 py-3 rounded-full border border-white/10 hover:bg-white hover:text-black transition text-xs font-bold uppercase tracking-widest">+ Voir plus</button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-gray-500 italic">Pas encore assez de notes sur les pistes.</div>
            )}
        </section>

        {/* 4. DERNIERS AVIS */}
        <section>
            <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                <h2 className="text-2xl font-black text-white tracking-tight">✨ Derniers Avis</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {loading ? [1,2,3,4,5].map(i => <div key={i} className="h-64 bg-white/5 rounded-2xl animate-pulse"/>) : recentReviews.slice(0, limitRecent).map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
            {recentReviews.length > limitRecent && (
                <div className="mt-8 text-center">
                    <button onClick={() => setLimitRecent(p => p + 5)} className="px-8 py-3 rounded-full border border-white/10 hover:bg-white hover:text-black transition text-xs font-bold uppercase tracking-widest">
                        + Voir plus
                    </button>
                </div>
            )}
        </section>

        {/* 5. AMIS */}
        {user && (
            <section>
                <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                    <h2 className="text-2xl font-black text-white tracking-tight">👥 Activité des Amis</h2>
                </div>
                {friendReviews.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {friendReviews.slice(0, limitFriends).map(r => <ReviewCard key={r.id} review={r} />)}
                    </div>
                ) : (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                        <p className="text-gray-500 mb-2">Vos amis n'ont rien posté récemment.</p>
                        <Link href="/community" className="text-[#00e054] hover:underline font-bold text-sm">Trouver des gens à suivre →</Link>
                    </div>
                )}
                {friendReviews.length > limitFriends && (
                    <div className="mt-8 text-center">
                        <button onClick={() => setLimitFriends(p => p + 5)} className="px-8 py-3 rounded-full border border-white/10 hover:bg-white hover:text-black transition text-xs font-bold uppercase tracking-widest">
                            + Voir plus
                        </button>
                    </div>
                )}
            </section>
        )}

      </main>

      {/* MODALE */}
      {selectedReview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a1a1a] p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{selectedReview.album_name}</h2>
                    <button onClick={() => setSelectedReview(null)} className="text-gray-500 hover:text-white text-2xl">✕</button>
                </div>
                <p className="text-gray-300 italic mb-8 leading-relaxed">"{selectedReview.review_text}"</p>
                
                <div className="flex-1 overflow-y-auto space-y-4 max-h-60 mb-6">
                     {comments.map(c => (
                        <div key={c.id} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-gray-800 flex-shrink-0 overflow-hidden text-[10px] flex items-center justify-center font-bold border border-white/10 text-gray-400">
                                {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover"/> : c.profiles?.username?.[0]?.toUpperCase()}
                            </div>
                            <div>
                                <span className="text-xs font-bold text-white">{c.profiles?.username}</span>
                                <p className="text-xs text-gray-400">{c.content}</p>
                            </div>
                        </div>
                     ))}
                </div>

                <div className="flex gap-2">
                    <input className="flex-1 bg-black border border-gray-700 rounded-full px-4 py-2 text-white text-sm" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Commenter..." />
                    <button onClick={postComment} className="bg-[#00e054] text-black px-4 rounded-full font-bold">➤</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}