'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AlbumPage({ params }: { params: any }) {
  const router = useRouter();
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [album, setAlbum] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  
  // États Critiques
  const [reviews, setReviews] = useState<any[]>([]);
  const [displayedReviews, setDisplayedReviews] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // États Modale Notation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<any>(null); // 'album' ou objet Track
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // État pour la lecture audio
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (params instanceof Promise) {
      params.then((unwrappedParams: any) => setAlbumId(unwrappedParams.id));
    } else {
      setAlbumId(params.id);
    }
  }, [params]);

  useEffect(() => {
    if (albumId) {
      fetchAlbumDetails(albumId);
      fetchReviewsAndUser(albumId);
    }
  }, [albumId]);

  const fetchAlbumDetails = async (id: string) => {
    try {
      const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setAlbum(data.results[0]);
        setTracks(data.results.filter((item: any) => item.wrapperType === 'track'));
      }
    } catch (error) {
      console.error("Erreur iTunes:", error);
    }
    setLoading(false);
  };

  const fetchReviewsAndUser = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    let followingIds: string[] = [];
    if (user) {
        const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
        followingIds = follows?.map((f:any) => f.following_id) || [];
    }

    // 1. Récupération (Jointure simple pour robustesse)
    let { data, error } = await supabase
      .from('reviews')
      .select('*, profiles(id, username, avatar_url)') 
      .eq('album_id', id);

    if (error || !data) {
        const simpleRes = await supabase.from('reviews').select('*').eq('album_id', id);
        data = simpleRes.data;
    }

    const allReviews = data || [];

    // 2. Tri : Amis en premier
    const friendsReviews = allReviews.filter((r: any) => r.profiles && followingIds.includes(r.profiles.id));
    let otherReviews = allReviews.filter((r: any) => !r.profiles || !followingIds.includes(r.profiles.id));
    
    otherReviews.sort(() => Math.random() - 0.5);
    const sortedReviews = [...friendsReviews, ...otherReviews];

    setReviews(sortedReviews);
    
    // 3. Filtre et Limite
    const albumOnlyReviews = sortedReviews.filter((r:any) => !r.track_id);
    setDisplayedReviews(albumOnlyReviews.slice(0, 3));
  };

  const handleShowAll = () => {
    setShowAll(true);
    setDisplayedReviews(reviews.filter((r:any) => !r.track_id));
  };

  // --- CALCUL DES MOYENNES ---
  const getAverageRating = (trackId: string | null = null) => {
    const targetReviews = reviews.filter((r: any) => 
        trackId ? r.track_id === String(trackId) : (!r.track_id)
    );
    if (targetReviews.length === 0) return null;
    const sum = targetReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / targetReviews.length).toFixed(1);
  };

  const openRatingModal = (target: 'album' | any) => {
    setRatingTarget(target);
    setUserRating(0);
    setReviewText("");
    setIsModalOpen(true);
  };

  const handleSaveReview = async () => {
    if (userRating === 0) return alert("Notez !");
    setIsSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setIsSaving(false);
        if(confirm("Connectez-vous pour noter !")) window.location.href='/login';
        return;
    }

    const pseudo = user.email?.split('@')[0] || 'Utilisateur';
    const isTrackReview = ratingTarget !== 'album';

    const newReview = {
        album_id: albumId,
        album_name: album.collectionName,
        artist_name: album.artistName,
        album_image: album.artworkUrl100.replace('100x100', '1000x1000'), // HD
        rating: userRating,
        review_text: reviewText,
        user_name: pseudo,
        user_id: user.id,
        track_id: isTrackReview ? String(ratingTarget.trackId) : null,
        track_name: isTrackReview ? ratingTarget.trackName : null
    };

    const { error } = await supabase.from('reviews').insert(newReview);

    setIsSaving(false);
    if (error) {
        alert("Erreur : " + error.message);
    } else {
        setIsModalOpen(false);
        fetchReviewsAndUser(albumId!);
    }
  };

  const handlePlayTrack = async (track: any) => {
    try {
      // Arrêter la piste en cours si différente
      if (playingTrack && playingTrack !== track.trackId.toString()) {
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }
        setPlayingTrack(null);
        setAudioElement(null);
      }

      // Si on clique sur la même piste, arrêter
      if (playingTrack === track.trackId.toString()) {
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }
        setPlayingTrack(null);
        setAudioElement(null);
        return;
      }

      // Démarrer la nouvelle piste
      console.log(`🎵 Lecture de "${track.trackName}"`);

      // Essayer de récupérer le preview URL depuis iTunes
      const response = await fetch(`https://itunes.apple.com/lookup?id=${track.trackId}&entity=song`);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const trackData = data.results[0];
        if (trackData.previewUrl) {
          const audio = new Audio(trackData.previewUrl);
          audio.volume = 0.6; // Volume un peu plus bas pour les previews

          audio.addEventListener('ended', () => {
            setPlayingTrack(null);
            setAudioElement(null);
          });

          audio.addEventListener('error', () => {
            console.error('Erreur de lecture audio');
            setPlayingTrack(null);
            setAudioElement(null);
          });

          await audio.play();
          setPlayingTrack(track.trackId.toString());
          setAudioElement(audio);
        } else {
          console.log('Aucun preview disponible pour cette piste');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la lecture:', error);
      setPlayingTrack(null);
      setAudioElement(null);
    }
  };

  if (loading || !albumId) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Chargement...</div>;
  if (!album) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Erreur.</div>;

  const highResImage = album.artworkUrl100.replace('100x100', '1000x1000');
  const albumAvg = getAverageRating(null);

  // Liens Streaming
  const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(album.collectionName + " " + album.artistName)}`;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(album.collectionName + " " + album.artistName)}`;
  const appleMusicUrl = album.collectionViewUrl;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black pb-20 overflow-x-hidden">
      
      {/* GLOWS */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* NAVBAR */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-4">
        <nav className="flex items-center justify-between px-8 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl w-full max-w-5xl">
            <Link href="/" className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>
            <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
                <Link href="/search" className="text-white hover:text-[#00e054] transition">← Retour</Link>
                <Link href="/community" className="hover:text-[#00e054] transition hidden sm:inline">Communauté</Link>
                {playingTrack && (
                    <div className="flex items-center gap-2 text-[#00e054] animate-pulse">
                        <span className="text-lg">🎵</span>
                        <span className="hidden sm:inline">Lecture en cours</span>
                    </div>
                )}
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

      {/* HEADER ALBUM */}
      <header className="relative w-full h-[500px] flex items-end overflow-hidden border-b border-white/5 bg-[#0a0a0a]">
        <img src={highResImage} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-3xl scale-110 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>

        <div className="relative z-10 max-w-6xl mx-auto w-full px-6 py-12 flex flex-col md:flex-row gap-10 items-end">
            <div className="relative w-64 h-64 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden bg-black flex-shrink-0 group">
                <img src={highResImage} className="w-full h-full object-cover" />
                {albumAvg && (
                    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md text-[#00e054] px-3 py-1 rounded-full font-black text-2xl border border-[#00e054]/30 shadow-lg flex items-center gap-1">
                        <span>★</span> {albumAvg}
                    </div>
                )}
            </div>
            
            <div className="flex-1 mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-[#00e054] text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Album</span>
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded">{album.primaryGenreName}</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white mb-4 leading-none tracking-tight drop-shadow-2xl">{album.collectionName}</h1>
                <div className="text-gray-300 text-xl font-light flex items-center gap-4">
                    <Link href={`/artist/${album.artistId}`} className="text-white font-bold hover:text-[#00e054] transition hover:underline decoration-2 underline-offset-4">{album.artistName}</Link>
                    <span className="text-gray-600">•</span>
                    <span>{new Date(album.releaseDate).getFullYear()}</span>
                </div>
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-16 relative z-10">
        
        {/* GAUCHE : ACTIONS */}
        <div className="lg:col-span-4 space-y-8">
            <button onClick={() => openRatingModal('album')} className="w-full bg-[#00e054] hover:bg-[#00c04b] hover:scale-[1.02] text-black font-black py-4 rounded-2xl transition uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(0,224,84,0.2)] flex items-center justify-center gap-3">
                <span className="text-xl">★</span> Noter l'Album
            </button>

            <div className="bg-[#121212] p-6 rounded-3xl border border-white/5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 text-center">Écouter sur</h3>
                <div className="space-y-3">
                    {appleMusicUrl && <a href={appleMusicUrl} target="_blank" className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition text-gray-300 hover:text-white">🎵 Apple Music</a>}
                    <a href={spotifySearchUrl} target="_blank" className="flex items-center justify-center gap-2 w-full py-3 bg-[#1DB954]/10 text-[#1DB954] hover:bg-[#1DB954]/20 rounded-xl text-sm font-bold transition border border-[#1DB954]/20">Spotify</a>
                    <a href={youtubeSearchUrl} target="_blank" className="flex items-center justify-center gap-2 w-full py-3 bg-[#FF0000]/10 text-[#FF0000] hover:bg-[#FF0000]/20 rounded-xl text-sm font-bold transition border border-[#FF0000]/20">YouTube</a>
                </div>
            </div>

            {/* SECTION AVIS */}
            <div className="bg-[#121212] p-6 rounded-3xl border border-white/5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 pb-2 border-b border-white/5 flex justify-between">
                    <span>Avis Album</span>
                    <span className="text-white">{reviews.filter((r:any) => !r.track_id).length}</span>
                </h3>
                
                {displayedReviews.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-600 text-sm italic">Aucun avis pour l'instant.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayedReviews.map((review) => (
                            <div key={review.id} className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-[10px] font-bold text-white border border-white/10 overflow-hidden">
                                            {review.profiles?.avatar_url ? <img src={review.profiles.avatar_url} className="w-full h-full object-cover rounded-full" /> : (review.user_name?.[0] || '?')}
                                        </div>
                                        <Link href={`/user/${review.user_name}`} className="font-bold text-xs text-gray-300 hover:text-white transition">{review.user_name}</Link>
                                    </div>
                                    <div className="text-[#00e054] text-xs tracking-widest">{"★".repeat(review.rating)}</div>
                                </div>
                                <p className="text-gray-400 text-xs leading-relaxed italic">"{review.review_text}"</p>
                            </div>
                        ))}
                        {!showAll && reviews.filter((r:any) => !r.track_id).length > 3 && (
                            <button onClick={handleShowAll} className="w-full py-2 mt-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition border border-dashed border-white/10 rounded hover:border-white/30">
                                + Voir la suite
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* COLONNE DROITE : PISTES */}
        <div className="lg:col-span-8">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8 border-b border-white/10 pb-4 flex justify-between items-center">
                <span>Pistes de l'album</span>
                <span className="text-[10px] text-[#00e054] bg-[#00e054]/10 px-2 py-1 rounded">Cliquez sur ★ pour noter une piste</span>
            </h2>
            
            <div className="space-y-2">
                {tracks.map((track, index) => {
                    const trackAvg = getAverageRating(track.trackId);
                    return (
                        <div key={track.trackId} className={`flex items-center p-4 rounded-2xl transition group border ${
                            playingTrack === track.trackId.toString()
                                ? 'bg-[#00e054]/10 border-[#00e054]/30'
                                : 'hover:bg-white/5 border-transparent hover:border-white/5'
                        }`}>
                            <span className={`w-8 font-mono text-sm font-bold ${
                                playingTrack === track.trackId.toString()
                                    ? 'text-[#00e054]'
                                    : 'text-gray-600 group-hover:text-[#00e054]'
                            }`}>{index + 1}</span>
                            
                            <div className="flex-1 min-w-0 pr-4">
                                <button
                                    onClick={() => handlePlayTrack(track)}
                                    className={`font-bold truncate text-lg text-left hover:cursor-pointer ${
                                        playingTrack === track.trackId.toString()
                                            ? 'text-[#00e054]'
                                            : 'text-gray-300 group-hover:text-white'
                                    }`}
                                    title={playingTrack === track.trackId.toString() ? "Arrêter" : "Écouter un extrait"}
                                >
                                    {track.trackName}
                                    {playingTrack === track.trackId.toString() && (
                                        <span className="ml-2 text-xs opacity-70">🎵</span>
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center gap-6">
                                {trackAvg && (
                                    <div className="flex items-center gap-1 text-sm font-black text-[#00e054] bg-[#00e054]/10 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(0,224,84,0.1)]">
                                        <span className="text-xs opacity-70">★</span> {trackAvg}
                                    </div>
                                )}

                                {/* BOUTON PLAY/PAUSE */}
                                <button
                                    onClick={() => handlePlayTrack(track)}
                                    className="text-gray-600 hover:text-[#00e054] text-xl opacity-0 group-hover:opacity-100 transition transform hover:scale-110 focus:opacity-100 flex items-center justify-center"
                                    title={playingTrack === track.trackId.toString() ? "Arrêter" : "Écouter un extrait"}
                                >
                                    {playingTrack === track.trackId.toString() ? (
                                        <span className="text-[#00e054]">⏸️</span>
                                    ) : (
                                        <span>▶️</span>
                                    )}
                                </button>

                                <button onClick={() => openRatingModal(track)} className="text-gray-700 hover:text-white text-2xl opacity-0 group-hover:opacity-100 transition transform hover:scale-110 focus:opacity-100" title="Noter ce titre">★</button>
                                <span className="text-xs text-gray-600 font-mono w-10 text-right">{Math.floor(track.trackTimeMillis / 60000)}:{((track.trackTimeMillis % 60000) / 1000).toFixed(0).padStart(2, '0')}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

      </main>

      {/* MODALE DE NOTATION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a1a1a] p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-black text-white">
                        Noter {ratingTarget === 'album' ? "l'album" : "le titre"}
                    </h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white text-2xl transition">×</button>
                </div>
                
                {ratingTarget !== 'album' && (
                    <p className="text-[#00e054] text-sm font-bold mb-8 uppercase tracking-wide border-l-2 border-[#00e054] pl-3">{ratingTarget.trackName}</p>
                )}

                <div className="flex justify-center mb-8 gap-2 bg-black/50 p-4 rounded-2xl">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setUserRating(star)} onMouseEnter={() => setUserRating(star)} className={`text-5xl transition transform hover:scale-110 focus:outline-none ${star <= userRating ? 'text-[#00e054] drop-shadow-[0_0_10px_rgba(0,224,84,0.5)]' : 'text-gray-800'}`}>★</button>
                    ))}
                </div>

                <textarea
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-2xl p-4 text-white focus:border-[#00e054] focus:outline-none mb-6 h-32 resize-none text-sm placeholder-gray-600"
                    placeholder="Votre avis (optionnel)..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                />

                <div className="flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-500 hover:text-white text-sm font-bold transition">Annuler</button>
                    <button onClick={handleSaveReview} disabled={isSaving} className="flex-1 py-3 bg-[#00e054] text-black font-black rounded-xl hover:bg-[#00c04b] transition uppercase tracking-widest shadow-lg shadow-green-900/20">
                        {isSaving ? '...' : 'Publier'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}