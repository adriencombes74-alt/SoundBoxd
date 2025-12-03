'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  // --- LOGIQUE (Garde tout ce qui marche) ---
  const [activeTab, setActiveTab] = useState<'popular' | 'recent' | 'following'>('popular');
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [myLikes, setMyLikes] = useState<Set<number>>(new Set());
  const [limits, setLimits] = useState({ popular: 8, recent: 8, following: 8 });

  // Modale
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [likers, setLikers] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => { checkUser(); fetchAllSections(); }, []);

  // Rechargement intelligent quand on change d'onglet
  useEffect(() => {
    const fetchTab = async () => {
        setLoading(true);
        let query = supabase.from('reviews').select('*');

        if (activeTab === 'popular') {
            query = query.order('like_count', { ascending: false });
        } else if (activeTab === 'recent') {
            query = query.order('created_at', { ascending: false });
        } else if (activeTab === 'following' && user) {
            const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
            const ids = follows?.map((f: any) => f.following_id) || [];
            if (ids.length === 0) {
                setReviews([]); setLoading(false); return;
            }
            const { data: profiles } = await supabase.from('profiles').select('username').in('id', ids);
            const usernames = profiles?.map((p: any) => p.username) || [];
            query = query.in('user_name', usernames).order('created_at', { ascending: false });
        }

        const { data } = await query.limit(50);
        setReviews(data || []);
        setLoading(false);
    };
    fetchTab();
  }, [activeTab, user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) fetchMyLikes(user.id);
  };

  const fetchMyLikes = async (userId: string) => {
    const { data } = await supabase.from('likes').select('review_id').eq('user_id', userId);
    if (data) setMyLikes(new Set(data.map((l: any) => l.review_id)));
  };

  const fetchAllSections = async () => {
    // Chargement initial (Populaire par défaut)
    setLoading(true);
    const { data } = await supabase.from('reviews').select('*').order('like_count', { ascending: false }).limit(50);
    setReviews(data || []);
    setLoading(false);
  };

  const handleLike = async (review: any) => {
    if (!user) return alert("Connectez-vous pour aimer !");
    const isLiked = myLikes.has(review.id);
    setReviews(reviews.map(r => r.id === review.id ? { ...r, like_count: isLiked ? (r.like_count - 1) : (r.like_count + 1) } : r));
    
    if (isLiked) {
        setMyLikes(prev => { const next = new Set(prev); next.delete(review.id); return next; });
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

  const loadMore = () => {
    setLimits(prev => ({ ...prev, [activeTab]: prev[activeTab] + 8 }));
  };

  // --- DESIGN CINÉMATIQUE (Option 1) ---
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black overflow-x-hidden">
      
      {/* Background Glow (Lumière d'ambiance) */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-900/20 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* --- NAVBAR FLOTTANTE --- */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-4">
        <nav className="flex items-center justify-between px-8 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl w-full max-w-5xl">
            <Link href="/" className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">
                Music<span className="text-[#00e054]">Boxd</span>
            </Link>
            <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
                {/* Onglet Recherche Explicite */}
                <Link href="/search" className="hover:text-[#00e054] transition flex items-center gap-2 text-white">
                    <span className="text-lg">🔍</span> <span className="hidden sm:inline">Chercher</span>
                </Link>
                <Link href="/community" className="hover:text-[#00e054] transition hidden sm:inline text-gray-300">Communauté</Link>
                
                {user ? (
                    <Link href="/profile" className="flex items-center gap-3 pl-4 border-l border-white/10 hover:opacity-80 transition group">
                        <span className="hidden sm:inline text-gray-300 group-hover:text-white">Mon Profil</span>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00e054] to-emerald-600 flex items-center justify-center text-black font-black text-xs border border-white/20">
                            {user.email[0].toUpperCase()}
                        </div>
                    </Link>
                ) : (
                    <Link href="/login" className="bg-white text-black px-5 py-2 rounded-full hover:bg-[#00e054] transition shadow-lg font-bold">
                        Connexion
                    </Link>
                )}
            </div>
        </nav>
      </div>

      {/* --- HERO SECTION (VISIBLE POUR TOUS) --- */}
      <header className="relative pt-44 pb-20 px-6 flex flex-col items-center text-center z-10">
        <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-6 leading-none text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600 drop-shadow-2xl">
          VOTRE VIE EN <br/><span className="text-[#00e054]">MUSIQUE.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-xl mb-10 font-light leading-relaxed">
            Découvrez ce que vos amis écoutent. Notez vos albums favoris.<br/>Créez la discothèque ultime.
        </p>
        
        {/* Onglets de Navigation (Style iOS) */}
        <div className="bg-white/5 p-1 rounded-full inline-flex backdrop-blur-md border border-white/10 shadow-2xl">
            {[
                {id: 'popular', l: 'Populaire'}, 
                {id: 'recent', l: 'Récent'}, 
                {id: 'following', l: 'Amis', d: !user}
            ].map((t) => (
                (!t.d) && (
                    <button 
                        key={t.id} 
                        onClick={() => setActiveTab(t.id as any)}
                        className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-500 ${activeTab === t.id ? 'bg-[#00e054] text-black shadow-[0_0_30px_rgba(0,224,84,0.4)] scale-105' : 'text-gray-400 hover:text-white'}`}
                    >
                        {t.l}
                    </button>
                )
            ))}
        </div>
      </header>

      {/* --- GRILLE DE CONTENU --- */}
      <main className="max-w-7xl mx-auto px-6 pb-32 z-10 relative">
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-pulse">
                {[1,2,3,4].map(i => <div key={i} className="h-96 bg-white/5 rounded-3xl border border-white/5"></div>)}
            </div>
        ) : reviews.length === 0 ? (
            <div className="text-center py-32 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                <p className="text-2xl text-gray-500 mb-4 font-light">C'est bien calme par ici...</p>
                {activeTab === 'following' && <Link href="/community" className="text-[#00e054] hover:underline text-lg">Trouver des amis à suivre →</Link>}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {reviews.slice(0, limits[activeTab]).map((review) => (
                    <div key={review.id} className="group relative bg-[#0a0a0a] rounded-4xl border border-white/5 hover:border-[#00e054]/30 transition-all duration-600 hover:-translate-y-2 hover:shadow-2xl overflow-hidden flex flex-col h-full">
                        
                        {/* Image Full Bleed avec effet */}
                        <Link href={`/album/${review.album_id}`} className="block relative aspect-square overflow-hidden">
                            <img 
                                src={review.album_image?.replace('100x100', '600x600')} 
                                className="w-full h-full object-cover transition duration-900 group-hover:scale-100 group-hover:brightness-100" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80" />
                            
                            <div className="absolute bottom-4 left-4 text-white flex items-center gap-2">
                                <span className="text-[#00e054] text-2xl drop-shadow-md">★</span>
                                <span className="font-black text-3xl drop-shadow-md">{review.rating}</span>
                            </div>
                        </Link>
                        
                        {/* Infos */}
                        <div className="p-6 flex flex-col flex-1">
                            <div className="mb-4">
                                <h3 className="font-bold text-white text-lg mb-1 truncate leading-tight">{review.album_name}</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">{review.artist_name}</p>
                            </div>
                            
                            <div className="relative flex-1 mb-6">
                                <span className="absolute -top-2 -left-1 text-4xl text-white/10 font-serif">“</span>
                                <p className="text-gray-400 text-sm line-clamp-3 italic font-light pl-4">
                                    {review.review_text}
                                </p>
                            </div>
                            
                            {/* Footer Carte */}
                            <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                                <Link href={`/user/${review.user_name}`} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition group/user">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center text-[9px] border border-white/10 group-hover/user:border-[#00e054] transition">
                                        {review.user_name[0].toUpperCase()}
                                    </div>
                                    {review.user_name}
                                </Link>

                                <div className="flex gap-4 text-xs font-medium">
                                    <button onClick={() => handleLike(review)} className={`flex items-center gap-1 transition ${myLikes.has(review.id) ? 'text-pink-500 scale-110' : 'text-gray-600 hover:text-white'}`}>
                                        <span className="text-lg">{myLikes.has(review.id) ? '♥' : '♡'}</span> {review.like_count || 0}
                                    </button>
                                    <button onClick={() => openModal(review)} className="text-gray-600 hover:text-[#00e054] transition text-lg">
                                        💬
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* BOUTON CHARGER PLUS */}
        {reviews.length > limits[activeTab] && (
            <div className="mt-16 text-center">
                <button 
                    onClick={loadMore}
                    className="px-10 py-4 rounded-full border border-white/10 hover:bg-white hover:text-black transition font-bold text-xs uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] duration-300"
                >
                    Découvrir plus
                </button>
            </div>
        )}
      </main>

      {/* MODALE (Style Moderne) */}
      {selectedReview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedReview(null)} />
            <div className="bg-[#121212] w-full max-w-2xl max-h-[85vh] rounded-[2rem] border border-white/10 relative z-10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                
                <div className="p-8 border-b border-white/5 bg-[#181818] flex justify-between items-start">
                    <div className="flex gap-6">
                        <img src={selectedReview.album_image} className="w-24 h-24 rounded-xl shadow-2xl border border-white/10" />
                        <div className="pt-1">
                            <h2 className="text-2xl font-black text-white mb-1 leading-tight">{selectedReview.album_name}</h2>
                            <p className="text-gray-400 text-sm mb-3 font-medium">Critique par <span className="text-white border-b border-[#00e054]">{selectedReview.user_name}</span></p>
                            <div className="text-[#00e054] text-lg tracking-widest">{"★".repeat(selectedReview.rating)}</div>
                        </div>
                    </div>
                    <button onClick={() => setSelectedReview(null)} className="text-gray-500 hover:text-white text-3xl transition hover:rotate-90 duration-300">×</button>
                </div>

                <div className="p-8 border-b border-white/5 bg-[#121212]">
                    <p className="text-xl text-gray-200 italic leading-relaxed font-light font-serif">"{selectedReview.review_text}"</p>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#0a0a0a]">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Discussion</h4>
                    {comments.length === 0 ? <p className="text-gray-700 italic text-sm">Soyez le premier à réagir.</p> : comments.map(c => (
                        <div key={c.id} className="flex gap-4 group">
                            <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 overflow-hidden text-xs flex items-center justify-center font-bold border border-white/10 text-gray-400">
                                {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover"/> : c.profiles?.username?.[0]?.toUpperCase()}
                            </div>
                            <div className="bg-[#181818] p-4 rounded-2xl rounded-tl-none border border-white/5 flex-1">
                                <div className="flex items-baseline gap-3 mb-1">
                                    <span className="text-sm font-bold text-white group-hover:text-[#00e054] transition">{c.profiles?.username || 'Inconnu'}</span>
                                    <span className="text-[10px] text-gray-600 uppercase tracking-wide">{new Date(c.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed">{c.content}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t border-white/5 bg-[#181818] flex gap-3">
                    <input 
                        type="text" 
                        placeholder="Écrire un commentaire..." 
                        className="flex-1 bg-[#0a0a0a] border border-gray-700 rounded-full px-6 py-4 text-white focus:border-[#00e054] outline-none text-sm transition focus:bg-black placeholder-gray-600"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && postComment()}
                    />
                    <button onClick={postComment} className="bg-[#00e054] text-black w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition shadow-[0_0_20px_rgba(0,224,84,0.3)] text-xl">➤</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}