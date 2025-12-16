'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileMenu from '@/components/ui/profile-menu';
import ListenMenu from '@/components/ui/listen-menu';

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
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-2 md:px-4">
        <nav className="flex items-center justify-between px-4 md:px-8 py-2 md:py-3 w-full max-w-5xl rounded-full transition-all duration-300 bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 border border-white/10 border-t-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
            <Link href="/" className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>
            <div className="flex items-center gap-2 md:gap-8 text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/70">
                <Link href="/search" className="hover:text-white transition flex items-center gap-1 md:gap-2">
                    <span className="text-sm md:text-base opacity-70">←</span> <span className="hidden sm:inline">Albums</span>
                </Link>
                <Link href="/discover" className="hover:text-white transition flex items-center gap-1 md:gap-2">
                    <span className="text-sm md:text-base opacity-70">⚡</span> <span className="hidden sm:inline">Découvrir</span>
                </Link>
                <Link href="/lists/import" className="hover:text-white transition flex items-center gap-1 md:gap-2">
                    <span className="text-sm md:text-base opacity-70">📥</span> <span className="hidden sm:inline">Importer</span>
                </Link>
                <Link href="/community" className="hover:text-white transition hidden md:inline">Membres</Link>
                {playingTrack && (
                    <div className="flex items-center gap-2 text-[#00e054] animate-pulse">
                        <span className="text-lg">🎵</span>
                        <span className="hidden sm:inline">Lecture</span>
                    </div>
                )}
                {currentUser ? (
                    <ProfileMenu user={currentUser} />
                ) : (
                    <Link href="/login" className="bg-white text-black px-3 md:px-4 py-1.5 md:py-2 rounded-full hover:bg-[#00e054] transition text-[10px] md:text-sm">Connexion</Link>
                )}
            </div>
        </nav>
      </div>

      {/* HEADER ALBUM */}
      <header className="relative w-full min-h-[400px] md:h-[500px] flex items-end overflow-hidden border-b border-white/5 bg-[#0a0a0a] pt-20 md:pt-0">
        <img src={highResImage} className="absolute inset-0 w-full h-full object-cover opacity-40 md:opacity-70 blur-2xl scale-110 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-[#050505]/40"></div>

        <div className="relative z-10 max-w-6xl mx-auto w-full px-4 md:px-6 py-8 md:py-12 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-end">
            <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden bg-black flex-shrink-0 group">
                <img src={highResImage} className="w-full h-full object-cover" />
                {albumAvg && (
                    <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/80 backdrop-blur-md text-[#00e054] px-2 py-1 md:px-3 md:py-1 rounded-full font-black text-lg md:text-2xl border border-[#00e054]/30 shadow-lg flex items-center gap-1">
                        <span>★</span> {albumAvg}
                    </div>
                )}
            </div>
            
            <div className="flex-1 mb-4 md:mb-6 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 md:gap-3 mb-2">
                    <span className="bg-[#00e054] text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Album</span>
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded">{album.primaryGenreName}</span>
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-white mb-3 md:mb-4 leading-tight md:leading-none tracking-tight drop-shadow-2xl">{album.collectionName}</h1>
                <div className="text-gray-300 text-base md:text-xl font-light flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-4">
                    <Link href={`/artist/${album.artistId}`} className="text-white font-bold hover:text-[#00e054] transition hover:underline decoration-2 underline-offset-4">{album.artistName}</Link>
                    <span className="text-gray-600">•</span>
                    <span>{new Date(album.releaseDate).getFullYear()}</span>
                </div>
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 relative z-10">
        
        {/* GAUCHE : ACTIONS */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
            <button onClick={() => openRatingModal('album')} className="w-full bg-[#00e054] hover:bg-[#00c04b] hover:scale-[1.02] text-black font-black py-3 md:py-4 rounded-2xl transition uppercase tracking-widest text-xs md:text-sm shadow-[0_0_30px_rgba(0,224,84,0.2)] flex items-center justify-center gap-2 md:gap-3">
                <span className="text-lg md:text-xl">★</span> Noter l'Album
            </button>

            <ListenMenu 
              spotifyUrl={spotifySearchUrl}
              youtubeUrl={youtubeSearchUrl}
              appleMusicUrl={appleMusicUrl}
            />

            {/* SECTION AVIS */}
            <div className="bg-[#121212] p-4 md:p-6 rounded-3xl border border-white/5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 md:mb-6 pb-2 border-b border-white/5 flex justify-between">
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
            <h2 className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 md:mb-8 border-b border-white/10 pb-3 md:pb-4 flex flex-col md:flex-row justify-between md:items-center gap-2">
                <span>Pistes de l'album</span>
                <span className="text-[9px] md:text-[10px] text-[#00e054] bg-[#00e054]/10 px-2 py-1 rounded">Cliquez sur ★ pour noter</span>
            </h2>
            
            <div className="space-y-1 md:space-y-2">
                {tracks.map((track, index) => {
                    const trackAvg = getAverageRating(track.trackId);
                    return (
                        <div key={track.trackId} className={`flex items-center gap-2 md:gap-3 p-2 md:p-4 rounded-xl md:rounded-2xl transition group border ${
                            playingTrack === track.trackId.toString()
                                ? 'bg-[#00e054]/10 border-[#00e054]/30'
                                : 'hover:bg-white/5 border-transparent hover:border-white/5'
                        }`}>
                            <span className={`w-6 md:w-8 font-mono text-xs md:text-sm font-bold flex-shrink-0 ${
                                playingTrack === track.trackId.toString()
                                    ? 'text-[#00e054]'
                                    : 'text-gray-600 group-hover:text-[#00e054]'
                            }`}>{index + 1}</span>
                            
                            <div className="flex-1 min-w-0">
                                <button
                                    onClick={() => handlePlayTrack(track)}
                                    className={`font-bold truncate text-sm md:text-lg text-left hover:cursor-pointer w-full ${
                                        playingTrack === track.trackId.toString()
                                            ? 'text-[#00e054]'
                                            : 'text-gray-300 group-hover:text-white'
                                    }`}
                                    title={playingTrack === track.trackId.toString() ? "Arrêter" : "Écouter un extrait"}
                                >
                                    {track.trackName}
                                    {playingTrack === track.trackId.toString() && (
                                        <span className="ml-1 md:ml-2 text-xs opacity-70">🎵</span>
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
                                {trackAvg && (
                                    <div className="flex items-center gap-0.5 md:gap-1 text-xs md:text-sm font-black text-[#00e054] bg-[#00e054]/10 px-1.5 md:px-3 py-0.5 md:py-1 rounded-full shadow-[0_0_15px_rgba(0,224,84,0.1)]">
                                        <span className="text-[10px] md:text-xs opacity-70">★</span> {trackAvg}
                                    </div>
                                )}

                                {/* BOUTON PLAY/PAUSE - Design moderne */}
                                <motion.button
                                    onClick={() => handlePlayTrack(track)}
                                    className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 ${
                                        playingTrack === track.trackId.toString()
                                            ? 'bg-[#00e054] text-black shadow-[0_0_20px_rgba(0,224,84,0.4)]'
                                            : 'bg-white/10 text-white hover:bg-[#00e054] hover:text-black hover:shadow-[0_0_15px_rgba(0,224,84,0.3)]'
                                    }`}
                                    title={playingTrack === track.trackId.toString() ? "Arrêter" : "Écouter un extrait"}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {playingTrack === track.trackId.toString() ? (
                                        <motion.svg 
                                            className="w-3.5 h-3.5 md:w-4 md:h-4" 
                                            fill="currentColor" 
                                            viewBox="0 0 24 24"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", stiffness: 400 }}
                                        >
                                            <rect x="6" y="4" width="4" height="16" rx="1" />
                                            <rect x="14" y="4" width="4" height="16" rx="1" />
                                        </motion.svg>
                                    ) : (
                                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    )}
                                </motion.button>

                                {/* BOUTON NOTER - Design moderne */}
                                <motion.button 
                                    onClick={() => openRatingModal(track)} 
                                    className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/10 text-amber-400 hover:bg-amber-500 hover:text-black flex items-center justify-center flex-shrink-0 transition-all md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                                    title="Noter ce titre"
                                    whileHover={{ scale: 1.1, rotate: 15 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                </motion.button>
                                
                                {/* DURÉE - Cachée sur très petit écran */}
                                <span className="hidden sm:block text-[10px] md:text-xs text-gray-600 font-mono w-8 md:w-10 text-right flex-shrink-0">{Math.floor(track.trackTimeMillis / 60000)}:{((track.trackTimeMillis % 60000) / 1000).toFixed(0).padStart(2, '0')}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

      </main>

      {/* MODALE DE NOTATION - ANIMATION APP NATIVE */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop avec blur */}
            <motion.div 
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
            />
            
            {/* Contenu de la modale */}
            <motion.div 
              className="relative bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] p-6 md:p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Glow effect derrière */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00e054]/20 rounded-full blur-3xl pointer-events-none" />
              
              {/* Header */}
              <div className="flex justify-between items-center mb-4 relative z-10">
                <motion.h2 
                  className="text-xl md:text-2xl font-black text-white"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  Noter {ratingTarget === 'album' ? "l'album" : "le titre"}
                </motion.h2>
                <motion.button 
                  onClick={() => setIsModalOpen(false)} 
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ✕
                </motion.button>
              </div>
              
              {/* Nom du titre si c'est une piste */}
              {ratingTarget !== 'album' && (
                <motion.p 
                  className="text-[#00e054] text-sm font-bold mb-6 uppercase tracking-wide border-l-2 border-[#00e054] pl-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {ratingTarget.trackName}
                </motion.p>
              )}

              {/* Étoiles avec animation */}
              <motion.div 
                className="flex justify-center mb-6 gap-1 md:gap-2 bg-white/[0.03] backdrop-blur-lg p-4 md:p-5 rounded-2xl border border-white/5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {[1, 2, 3, 4, 5].map((star, index) => (
                  <motion.button 
                    key={star} 
                    onClick={() => setUserRating(star)} 
                    onMouseEnter={() => setUserRating(star)}
                    className={`text-4xl md:text-5xl focus:outline-none ${
                      star <= userRating 
                        ? 'text-[#00e054] drop-shadow-[0_0_15px_rgba(0,224,84,0.6)]' 
                        : 'text-gray-700 hover:text-gray-500'
                    }`}
                    initial={{ opacity: 0, scale: 0, rotate: -180 }}
                    animate={{ 
                      opacity: 1, 
                      scale: star <= userRating ? 1.1 : 1, 
                      rotate: 0 
                    }}
                    transition={{ 
                      delay: 0.25 + index * 0.05,
                      type: "spring",
                      stiffness: 400,
                      damping: 15
                    }}
                    whileHover={{ scale: 1.2, rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    ★
                  </motion.button>
                ))}
              </motion.div>
              
              {/* Indicateur de note */}
              <AnimatePresence>
                {userRating > 0 && (
                  <motion.div 
                    className="text-center mb-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <span className="text-[#00e054] font-black text-lg">{userRating}/5</span>
                    <span className="text-gray-500 text-sm ml-2">
                      {userRating === 1 && "Bof..."}
                      {userRating === 2 && "Pas mal"}
                      {userRating === 3 && "Bien !"}
                      {userRating === 4 && "Très bien !"}
                      {userRating === 5 && "Chef-d'œuvre !"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Textarea */}
              <motion.textarea
                className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white focus:border-[#00e054]/40 focus:bg-black/40 focus:outline-none mb-6 h-28 resize-none text-sm placeholder-gray-600 transition-all duration-300"
                placeholder="Votre avis (optionnel)..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              />

              {/* Boutons */}
              <motion.div 
                className="flex gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <motion.button 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-3 text-gray-400 hover:text-white text-sm font-bold transition rounded-xl hover:bg-white/5"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Annuler
                </motion.button>
                <motion.button 
                  onClick={handleSaveReview} 
                  disabled={isSaving || userRating === 0}
                  className={`flex-1 py-3 font-black rounded-xl uppercase tracking-widest text-sm transition-all ${
                    userRating > 0 
                      ? 'bg-[#00e054] text-black hover:bg-[#00c04b] shadow-lg shadow-[#00e054]/20' 
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                  whileHover={userRating > 0 ? { scale: 1.02 } : {}}
                  whileTap={userRating > 0 ? { scale: 0.98 } : {}}
                >
                  {isSaving ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                    >
                      ⏳
                    </motion.span>
                  ) : 'Publier'}
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}