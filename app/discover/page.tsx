'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface Review {
  id: number;
  user_id: string;
  album_id: string;
  album_name: string;
  album_image: string;
  artist_name: string;
  rating: number;
  review_text: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
}

interface AudioState {
  [key: string]: {
    audio: HTMLAudioElement | null;
    isPlaying: boolean;
    previewUrl: string | null;
    isLoading: boolean;
    lastPlayAttempt: number;
  };
}

export default function DiscoverPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioStates, setAudioStates] = useState<AudioState>({});
  const [isMuted, setIsMuted] = useState(false);
  const [currentVisibleCard, setCurrentVisibleCard] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [user, setUser] = useState<{
    id: string;
    email?: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 0. AUTHENTIFICATION
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // 1. RÉCUPÉRATION DES CRITIQUES ALÉATOIRES
  const fetchRandomReviews = useCallback(async () => {
    setLoading(true);
    try {
      // Récupérer toutes les critiques avec jointure sur profiles
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles!reviews_user_id_fkey (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Récupérer plus pour avoir de la variété

      if (error) throw error;

      // Mélanger aléatoirement et prendre les 20 premières
      const shuffled = reviewsData?.sort(() => 0.5 - Math.random()) || [];
      const randomReviews = shuffled.slice(0, 20);

      setReviews(randomReviews);
    } catch (error) {
      console.error('Erreur lors de la récupération des critiques:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. RÉCUPÉRATION DU PREVIEW AUDIO
  const fetchAudioPreview = useCallback(async (albumId: string, albumName?: string, artistName?: string) => {
    try {
      console.log(`🎵 Recherche preview pour "${albumName}" de ${artistName}`);

      let tracks;

      // Essayer d'abord avec l'ID iTunes
      try {
        const response = await fetch(`https://itunes.apple.com/lookup?id=${albumId}&entity=song&limit=20`);
        const data = await response.json();

        if (data.results && data.results.length > 1) {
          tracks = data.results.slice(1);
        }
      } catch {
        console.log('⚠️ Échec avec ID');
      }

      // Si ça n'a pas marché, essayer par recherche nom/album
      if (!tracks && albumName && artistName) {
        try {
          const searchTerm = `${albumName} ${artistName}`.replace(/[^\w\s]/g, '').substring(0, 50);
          const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=album&limit=5`);
          const searchData = await response.json();

          if (searchData.results && searchData.results.length > 0) {
            const foundAlbum = searchData.results[0];
            const trackResponse = await fetch(`https://itunes.apple.com/lookup?id=${foundAlbum.collectionId}&entity=song&limit=20`);
            const trackData = await trackResponse.json();

            if (trackData.results && trackData.results.length > 1) {
              tracks = trackData.results.slice(1);
            }
          }
        } catch {
          console.log('⚠️ Échec recherche');
        }
      }

      if (tracks && tracks.length > 0) {
        // Filtrer les pistes qui ont un previewUrl valide
        const validTracks = tracks.filter((track: { previewUrl?: string }) => track.previewUrl && track.previewUrl.trim() !== '');

        if (validTracks.length > 0) {
          // Sélectionner la première piste disponible
          const selectedTrack = validTracks[0];
          console.log(`✅ Trouvé: "${selectedTrack.trackName}" (première piste)`);
          return selectedTrack.previewUrl;
        }
      }

      console.log('❌ Aucun preview trouvé');
      return null;
    } catch (error) {
      console.error('❌ Erreur preview:', error);
      return null;
    }
  }, []);

  // 3. GESTION AUDIO
  const playAudio = useCallback(async (albumId: string, albumName?: string, artistName?: string) => {
    console.log(`🎵 Lecture demandée pour "${albumName}"`);

    const currentState = audioStates[albumId];

    // Si déjà en cours de lecture ou de chargement, ne rien faire
    if (currentState?.isPlaying || currentState?.isLoading) {
      console.log('⏸️ Déjà actif');
      return;
    }

    // Protection contre les appels multiples trop rapprochés
    const now = Date.now();
    if (currentState?.lastPlayAttempt && (now - currentState.lastPlayAttempt) < 1000) {
      console.log('⏳ Trop récent');
      return;
    }

    // Marquer comme en chargement
    setAudioStates(prev => ({
      ...prev,
      [albumId]: {
        ...prev[albumId],
        isLoading: true,
        lastPlayAttempt: now
      }
    }));

    try {
      // Arrêter tous les autres audios d'abord
      await Promise.all(
        Object.entries(audioStates).map(async ([id, state]) => {
          if (id !== albumId && state.audio && state.isPlaying) {
            console.log('🛑 Arrêt de l\'audio:', id);
            state.audio.pause();
            state.audio.currentTime = 0;
            setAudioStates(prev => ({
              ...prev,
              [id]: { ...state, isPlaying: false }
            }));
          }
        })
      );

      let audio: HTMLAudioElement;
      let previewUrl: string | null = null;

      // Si pas de preview, essayer de le récupérer
      if (!currentState?.previewUrl) {
        previewUrl = await fetchAudioPreview(albumId, albumName, artistName);
        if (!previewUrl) {
          console.log('❌ Aucun preview');
          setAudioStates(prev => ({
            ...prev,
            [albumId]: { ...prev[albumId], isLoading: false }
          }));
          return;
        }
        audio = new Audio(previewUrl);
      } else {
        audio = currentState.audio!;
        previewUrl = currentState.previewUrl;
      }
      // Configuration audio
      audio.muted = isMuted;
      audio.volume = 0.8;
      audio.loop = false;

      // Événements audio
      audio.addEventListener('ended', () => {
        console.log('🏁 Terminé');
        setAudioStates(prev => ({
          ...prev,
          [albumId]: { ...prev[albumId], isPlaying: false }
        }));
      });

      audio.addEventListener('error', (e) => {
        console.error('❌ Erreur audio:', e);
        setAudioStates(prev => ({
          ...prev,
          [albumId]: { ...prev[albumId], isPlaying: false, isLoading: false }
        }));
      });

      // Jouer l'audio
      await audio.play();
      console.log('✅ Lecture démarrée');

      // Mettre à jour l'état
      setAudioStates(prev => ({
        ...prev,
        [albumId]: {
          audio,
          isPlaying: true,
          previewUrl,
          isLoading: false,
          lastPlayAttempt: now
        }
      }));

    } catch (error) {
      console.error('❌ Erreur de lecture audio:', error);
      setAudioStates(prev => ({
        ...prev,
        [albumId]: { ...prev[albumId], isPlaying: false, isLoading: false }
      }));
    }
  }, [audioStates, isMuted, fetchAudioPreview]);

  const pauseAudio = useCallback((albumId: string) => {
    const state = audioStates[albumId];
    if (state?.audio && state.isPlaying) {
      try {
        state.audio.pause();
        setAudioStates(prev => ({
          ...prev,
          [albumId]: { ...state, isPlaying: false }
        }));
      } catch (error) {
        console.error('Erreur lors de la pause audio:', error);
      }
    }
  }, [audioStates]);

  // 4. INTERSECTION OBSERVER SIMPLIFIÉ
  const setupIntersectionObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const albumId = entry.target.getAttribute('data-album-id');

          if (!albumId) return;

          const isVisible = entry.isIntersecting && entry.intersectionRatio > 0.5;

          if (isVisible) {
            // Cette carte devient visible
            if (currentVisibleCard !== albumId) {
              console.log(`🎯 Nouvelle carte active: ${albumId}`);

              // Arrêter l'ancienne carte
              if (currentVisibleCard) {
                pauseAudio(currentVisibleCard);
              }

              setCurrentVisibleCard(albumId);

              // Activer l'audio seulement si c'est activé
              if (isAudioEnabled) {
                const review = reviews.find(r => r.album_id === albumId);
                setTimeout(() => {
                  playAudio(albumId, review?.album_name, review?.artist_name);
                }, 300);
              }
            }
          } else {
            // Cette carte n'est plus visible
            if (currentVisibleCard === albumId) {
              setCurrentVisibleCard(null);
              pauseAudio(albumId);
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.5, // Seuil simple à 50%
        rootMargin: '0px'
      }
    );

    // Observer toutes les cartes
    const cards = containerRef.current?.querySelectorAll('[data-album-id]');
    console.log(`🎪 Observation de ${cards?.length || 0} cartes`);
    cards?.forEach(card => {
      observerRef.current?.observe(card);
    });
  }, [playAudio, pauseAudio, currentVisibleCard, reviews, isAudioEnabled]);

  // 5. GESTION DU MUTE GLOBAL
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;

      // Appliquer le mute à tous les audios en cours
      Object.values(audioStates).forEach(state => {
        if (state.audio) {
          state.audio.muted = newMuted;
        }
      });

      return newMuted;
    });
  }, [audioStates]);

  // 6. EFFETS
  useEffect(() => {
    fetchRandomReviews();
  }, [fetchRandomReviews]);

  useEffect(() => {
    if (reviews.length > 0 && !loading) {
      // Petit délai pour s'assurer que le DOM est rendu
      setTimeout(setupIntersectionObserver, 100);
    }
  }, [reviews, loading, setupIntersectionObserver]);

  // Gérer l'activation/désactivation de l'audio automatique
  useEffect(() => {
    if (isAudioEnabled && currentVisibleCard) {
      console.log('🔄 Audio activé pour la carte actuelle:', currentVisibleCard);
      const review = reviews.find(r => r.album_id === currentVisibleCard);
      setTimeout(() => {
        playAudio(currentVisibleCard, review?.album_name, review?.artist_name);
      }, 300);
    } else if (!isAudioEnabled && currentVisibleCard) {
      console.log('🛑 Audio désactivé, arrêt de la lecture');
      pauseAudio(currentVisibleCard);
    }
  }, [isAudioEnabled, currentVisibleCard, reviews, playAudio, pauseAudio]);

  // 7. CLEANUP
  useEffect(() => {
    return () => {
      // Arrêter tous les audios et nettoyer l'observer
      Object.values(audioStates).forEach(state => {
        if (state.audio) {
          state.audio.pause();
          state.audio.currentTime = 0;
        }
      });

      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [audioStates]);

  if (loading) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-white text-xl">Chargement des découvertes...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#050505] text-white overflow-hidden">
      {/* Background Glow */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* NAVBAR FLOTTANTE */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-4">
        <nav className="flex items-center justify-between px-8 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl w-full max-w-5xl">
            <Link href="/" className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>
            <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
                <Link href="/search" className="hover:text-[#00e054] transition">Albums</Link>
                <Link href="/discover" className={`transition flex items-center gap-2 ${isAudioEnabled ? 'text-[#00e054]' : 'hover:text-[#00e054] text-white'}`}>⚡ Découvrir</Link>
                <Link href="/community" className="hover:text-[#00e054] transition">Membres</Link>
                <button
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                  className={`transition text-lg ${isAudioEnabled ? 'text-[#00e054]' : 'text-gray-500 hover:text-white'}`}
                  title={isAudioEnabled ? "Désactiver l'audio automatique" : "Activer l'audio automatique"}
                >
                  {isAudioEnabled ? "🎵" : "🔇"}
                </button>
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-[#00e054] transition text-lg"
                  title={isMuted ? "Activer le son" : "Couper le son"}
                >
                  {isMuted ? "🔇" : "🔊"}
                </button>
                <button
                  onClick={() => {
                    // Test manuel - forcer la lecture de la carte active
                    if (currentVisibleCard) {
                      const review = reviews.find(r => r.album_id === currentVisibleCard);
                      playAudio(currentVisibleCard, review?.album_name, review?.artist_name);
                    }
                  }}
                  className="text-white hover:text-[#00e054] transition text-lg"
                  title="Test audio manuel"
                >
                  ▶️
                </button>
            </div>
        </nav>
      </div>

      {/* CONTENEUR PRINCIPAL AVEC SCROLL SNAP */}
      <div
        ref={containerRef}
        className="h-screen overflow-y-auto snap-y snap-mandatory"
        style={{ scrollBehavior: 'smooth' }}
      >
        {reviews.map((review) => (
          <DiscoverCard
            key={review.id}
            review={review}
            isActive={currentVisibleCard === review.album_id}
            audioState={audioStates[review.album_id]}
            isAudioEnabled={isAudioEnabled}
            currentUser={user || null}
          />
        ))}
      </div>
    </div>
  );
}

// COMPOSANT CARTE DE DÉCOUVERTE
interface DiscoverCardProps {
  review: Review;
  isActive: boolean;
  audioState?: AudioState[string];
  isAudioEnabled: boolean;
  currentUser: {
    id: string;
    email?: string;
  } | null;
}

function DiscoverCard({ review, isActive, audioState, isAudioEnabled, currentUser }: DiscoverCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [comments, setComments] = useState<{
    id: number;
    content: string;
    created_at: string;
    profiles: {
      username: string;
      avatar_url?: string;
    };
  }[]>([]);
  const [newComment, setNewComment] = useState("");

  // Charger les données sociales au montage
  useEffect(() => {
    const fetchSocialData = async () => {
      try {
        // Charger le nombre de likes
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('review_id', review.id);

        setLikesCount(likesCount || 0);

        // Vérifier si l'utilisateur actuel a liké (si connecté)
        if (currentUser) {
          const { data: userLike } = await supabase
            .from('likes')
            .select('id')
            .eq('review_id', review.id)
            .eq('user_id', currentUser.id)
            .single();

          setHasLiked(!!userLike);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données sociales:', error);
      }
    };

    fetchSocialData();
  }, [review.id, currentUser]);

  // Charger les commentaires quand on ouvre la modale
  useEffect(() => {
    if (showComments) {
      const fetchComments = async () => {
        try {
        const { data } = await supabase
          .from('comments')
          .select('*, profiles(username, avatar_url)')
          .eq('review_id', review.id)
          .order('created_at', { ascending: true });

        setComments((data || []) as typeof comments);
        } catch (error) {
          console.error('Erreur lors du chargement des commentaires:', error);
        }
      };

      fetchComments();
    }
  }, [showComments, review.id]);

  const handleLike = async () => {
    if (!currentUser) {
      alert("Connectez-vous pour aimer une critique !");
      return;
    }

    // Optimistic UI update
    const previousHasLiked = hasLiked;
    const previousCount = likesCount;

    setHasLiked(!hasLiked);
    setLikesCount(prev => hasLiked ? prev - 1 : prev + 1);

    try {
      if (previousHasLiked) {
        // Supprimer le like
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('review_id', review.id);

        if (error) throw error;
      } else {
        // Ajouter le like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: currentUser.id,
            review_id: review.id
          });

        if (error) throw error;
      }
    } catch (error) {
      // Rollback en cas d'erreur
      console.error('Erreur lors du like:', error);
      setHasLiked(previousHasLiked);
      setLikesCount(previousCount);
      alert("Une erreur est survenue. Veuillez réessayer.");
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    if (!currentUser) {
      alert("Connectez-vous pour commenter !");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: currentUser.id,
          review_id: review.id,
          content: newComment.trim()
        })
        .select('*, profiles(username, avatar_url)')
        .single();

      if (error) throw error;

      // Ajouter le commentaire à la liste locale
      setComments(prev => [...prev, data]);
      setNewComment("");

    } catch (error) {
      console.error('Erreur lors du commentaire:', error);
      alert("Impossible de poster le commentaire. Veuillez réessayer.");
    }
  };

  return (
    <div
      data-album-id={review.album_id}
      className="relative h-screen snap-start flex items-center justify-center"
    >
      {/* FOND : POCHETTE FLOUTÉE ET ASSOMBRI */}
      <div className="absolute inset-0">
        <img
          src={review.album_image}
          alt={`${review.album_name} - fond flouté`}
          className="w-full h-full object-cover filter brightness-50 blur-sm scale-110"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="relative z-10 flex items-center justify-center w-full h-full px-6">

        {/* CENTRAGE : POCHETTE QUI TOURNE */}
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="relative">
            <img
              src={review.album_image}
              alt={`Pochette de l'album ${review.album_name}`}
              className={`w-80 h-80 object-cover rounded-2xl shadow-2xl border-4 border-white/20 ${
                isActive ? 'animate-spin' : ''
              }`}
              style={{
                animationDuration: '20s',
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite'
              }}
            />

            {/* INDICATEUR DE LECTURE AUDIO */}
            {isActive && (
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {isAudioEnabled && (
                  <div className={`w-3 h-3 rounded-full ${
                    audioState?.isPlaying ? 'bg-[#00e054] animate-pulse' :
                    audioState?.isLoading ? 'bg-yellow-500 animate-pulse' :
                    'bg-gray-500'
                  }`} />
                )}
                {!isAudioEnabled && (
                  <div className="text-white/50 text-sm">🔇</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* OVERLAY BAS : INFOS DE LA CRITIQUE */}
        <div className="absolute bottom-8 left-6 right-6 bg-black/60 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
          <div className="flex items-start justify-between gap-6">

            {/* TEXTE DE LA CRITIQUE */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Link href={`/user/${review.profiles.username}`} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00e054] to-emerald-800 flex items-center justify-center text-lg font-bold text-black overflow-hidden">
                    {review.profiles.avatar_url ? (
                      <img src={review.profiles.avatar_url} alt={`Avatar de ${review.profiles.username}`} className="w-full h-full object-cover" />
                    ) : (
                      review.profiles.username[0].toUpperCase()
                    )}
                  </div>
                  <span className="font-bold text-white group-hover:text-[#00e054] transition">
                    {review.profiles.username}
                  </span>
                </Link>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">
                {review.album_name} - {review.artist_name}
              </h3>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-[#00e054] font-bold text-lg">
                  {"★".repeat(review.rating)}
                </span>
                <span className="text-gray-400 text-sm">
                  {new Date(review.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>

              <p className="text-gray-300 text-sm leading-relaxed italic max-w-2xl">
                &ldquo;{review.review_text}&rdquo;
              </p>
            </div>

            {/* ACTIONS DROITE */}
            <div className="flex flex-col items-center gap-6">
              <button
                onClick={handleLike}
                className={`p-4 rounded-full border-2 transition-all ${
                  hasLiked
                    ? 'bg-[#00e054] border-[#00e054] text-black'
                    : 'border-white/20 text-white hover:border-[#00e054] hover:text-[#00e054]'
                }`}
              >
                <div className="flex flex-col items-center">
                  <span className="text-2xl">{hasLiked ? '♥' : '♡'}</span>
                  <span className="text-xs mt-1 font-bold">{likesCount}</span>
                </div>
              </button>

              <button
                onClick={() => setShowComments(true)}
                className="p-4 rounded-full border-2 border-white/20 text-white hover:border-[#00e054] hover:text-[#00e054] transition-all"
              >
                <span className="text-2xl">💬</span>
              </button>

              <Link
                href={`/album/${review.album_id}`}
                className="p-4 rounded-full border-2 border-white/20 text-white hover:border-[#00e054] hover:text-[#00e054] transition-all"
              >
                <span className="text-2xl">👁️</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* MODALE COMMENTAIRES FONCTIONNELLE */}
      {showComments && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Commentaires</h2>
              <button onClick={() => setShowComments(false)} className="text-gray-500 hover:text-white text-2xl">×</button>
            </div>

            {/* Liste des commentaires */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
               {comments.length > 0 ? comments.map(c => (
                  <div key={c.id} className="flex gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 overflow-hidden text-xs flex items-center justify-center font-bold border border-white/10 text-gray-400">
                          {c.profiles?.avatar_url ? (
                            <img src={c.profiles.avatar_url} alt={c.profiles.username} className="w-full h-full object-cover"/>
                          ) : (
                            c.profiles?.username?.[0]?.toUpperCase()
                          )}
                      </div>
                      <div className="flex-1">
                          <span className="text-xs font-bold text-[#00e054] block mb-1">{c.profiles?.username}</span>
                          <p className="text-sm text-gray-300 leading-relaxed">{c.content}</p>
                          <span className="text-xs text-gray-500 mt-1 block">
                            {new Date(c.created_at).toLocaleDateString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                      </div>
                  </div>
               )) : (
                 <div className="text-center text-gray-500 py-10 italic">
                   <div className="text-4xl mb-4">💬</div>
                   Soyez le premier à commenter cette critique !
                 </div>
               )}
            </div>

            {/* Formulaire de commentaire */}
            <div className="flex gap-2 pt-4 border-t border-white/10">
                <input
                  className="flex-1 bg-black border border-white/20 rounded-full px-4 py-3 text-white text-sm placeholder-gray-500 focus:border-[#00e054] focus:outline-none transition"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder={currentUser ? "Écrire un commentaire..." : "Connectez-vous pour commenter"}
                  disabled={!currentUser}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handlePostComment();
                    }
                  }}
                />
                <button
                  onClick={handlePostComment}
                  disabled={!newComment.trim() || !currentUser}
                  className="bg-[#00e054] text-black w-12 h-12 rounded-full font-bold flex items-center justify-center hover:bg-[#00c04b] disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  ➤
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
