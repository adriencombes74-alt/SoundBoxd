'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Données pour les sections
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [friendReviews, setFriendReviews] = useState<any[]>([]);
  const [myLikes, setMyLikes] = useState<Set<number>>(new Set());

  // Pagination spécifique pour les Top Albums
  const [limitTopAlbums, setLimitTopAlbums] = useState(5);

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
    
    // 1. CALCUL DES "TOP RATED ALBUMS"
    // On en charge 50 pour avoir de la réserve pour le bouton "Voir plus"
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('*')
      .not('rating', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (allReviews) {
        const albumMap = new Map();
        allReviews.forEach((review) => {
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
        });

        const sortedAlbums = Array.from(albumMap.values())
            .map((a: any) => ({ ...a, average: a.totalRating / a.count }))
            .sort((a, b) => b.average - a.average)
            .slice(0, 20); // On garde les 20 meilleurs en mémoire

        setTopAlbums(sortedAlbums);
    }

    // 2. RÉCENT
    const { data: recData } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
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
      .limit(5);
    
    setFriendReviews(friendsData || []);
  };

  // Composant Carte de Critique
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
            <h3 className="font-bold text-white text-sm truncate mb-1">{review.album_name}</h3>
            <div className="mt-auto flex justify-between items-center pt-3 border-t border-white/5">
                <Link href={`/user/${review.user_name}`} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-[8px] text-white">
                        {review.user_name[0].toUpperCase()}
                    </div>
                    {review.user_name}
                </Link>
            </div>
        </div>
    </div>
  );

  // Composant Carte Album
  const AlbumCard = ({ album, rank }: { album: any, rank: number }) => (
    <Link href={`/album/${album.id}`} className="group relative block animate-in fade-in zoom-in duration-500">
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl shadow-lg bg-[#121212] mb-3 border border-white/5 group-hover:border-[#00e054]/50 transition-all duration-300 hover:-translate-y-2">
            <img 
                src={album.image?.replace('100x100', '600x600')} 
                alt={album.name} 
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-500 group-hover:scale-110"
            />
            <div className="absolute top-2 left-2 w-8 h-8 bg-[#00e054] text-black font-black flex items-center justify-center rounded-full shadow-lg z-10">
                #{rank}
            </div>
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent pt-10">
                <div className="flex items-center gap-1 text-[#00e054] font-bold text-lg">
                    <span>★</span> {album.average.toFixed(1)}
                </div>
            </div>
        </div>
        <h3 className="font-bold text-white truncate group-hover:text-[#00e054] transition">{album.name}</h3>
        <p className="text-xs text-gray-500 truncate">{album.artist}</p>
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
        
        {/* LA PHRASE D'ACCROCHE EST DE RETOUR ICI */}
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
        
        {/* 1. GENRES */}
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

        {/* 2. LES MIEUX NOTÉS (AVEC BOUTON VOIR PLUS) */}
        <section>
            <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                <h2 className="text-3xl font-black text-white tracking-tight">🏆 Les Mieux Notés</h2>
                <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Top Albums</span>
            </div>
            {topAlbums.length > 0 ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {/* On coupe la liste selon la limite choisie */}
                        {topAlbums.slice(0, limitTopAlbums).map((album, index) => (
                            <AlbumCard key={album.id} album={album} rank={index + 1} />
                        ))}
                    </div>
                    
                    {/* LE BOUTON VOIR PLUS */}
                    {limitTopAlbums < topAlbums.length && (
                        <div className="mt-8 text-center">
                            <button 
                                onClick={() => setLimitTopAlbums(prev => prev + 5)}
                                className="px-8 py-3 rounded-full border border-white/10 hover:bg-white hover:text-black transition text-xs font-bold uppercase tracking-widest"
                            >
                                + Voir les {Math.min(5, topAlbums.length - limitTopAlbums)} suivants
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-gray-500 italic">Pas encore assez de notes pour le classement.</div>
            )}
        </section>

        {/* 3. RÉCENT */}
        <section>
            <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                <h2 className="text-2xl font-black text-white tracking-tight">✨ Derniers Avis</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {loading ? [1,2,3,4,5].map(i => <div key={i} className="h-64 bg-white/5 rounded-2xl animate-pulse"/>) : recentReviews.map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
        </section>

        {/* 4. AMIS */}
        {user && (
            <section>
                <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                    <h2 className="text-2xl font-black text-white tracking-tight">👥 Activité des Amis</h2>
                </div>
                {friendReviews.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {friendReviews.map(r => <ReviewCard key={r.id} review={r} />)}
                    </div>
                ) : (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                        <p className="text-gray-500 mb-2">Vos amis n'ont rien posté récemment.</p>
                        <Link href="/community" className="text-[#00e054] hover:underline font-bold text-sm">Trouver des gens à suivre →</Link>
                    </div>
                )}
            </section>
        )}

      </main>
    </div>
  );
}