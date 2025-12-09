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

interface ItunesTrack {
  trackId: number;
  collectionId: number;
  collectionName: string;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
}

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

  // Déterminer le contenu de l'overlay selon le type de review
  const overlayContent = review.review_text ? (
    <div className="flex items-start justify-between gap-6">
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
  ) : (
    <div className="text-center">
      <Link href={`/album/${review.album_id}`} className="block group">
        <h3 className="text-xl font-bold text-white group-hover:text-[#00e054] transition mb-2">
          {review.album_name}
        </h3>
        <p className="text-base text-gray-300 group-hover:text-white transition">
          {review.artist_name}
        </p>
        <p className="text-xs text-gray-500 mt-1 opacity-75">
          🎵 Musique découverte
        </p>
      </Link>
    </div>
  );

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
          {overlayContent}
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
                      {new Date(c.created_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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

export default function DiscoverPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [friendReviews, setFriendReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendLoading, setFriendLoading] = useState(false);
  const [audioStates, setAudioStates] = useState<AudioState>({});
  const [currentVisibleCard, setCurrentVisibleCard] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'friends'>('discover');
  const [user, setUser] = useState<{
    id: string;
    email?: string;
  } | null>(null);
  const lastCardChangeRef = useRef<number>(0);
  const lastAudioStartRef = useRef<number>(0);
  const previewCacheRef = useRef<Map<string, string | null>>(new Map());

  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isUserScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 0. AUTHENTIFICATION
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // 1. RÉCUPÉRATION DES CRITIQUES ALÉATOIRES (UNIQUEMENT LES SONGS)
  const fetchRandomReviews = useCallback(async () => {
    const DISCOVERY_GENRES = [
      "pop", "rock", "hip hop", "jazz", "classical", "electronic",
      "r&b", "indie", "alternative", "metal", "rap", "folk", "soul"
    ];

    setLoading(true);
    try {
      // Choisir un genre aléatoire
      const randomGenre = DISCOVERY_GENRES[Math.floor(Math.random() * DISCOVERY_GENRES.length)];
      console.log(`⚡ Découverte mode: Genre "${randomGenre}"`);

      // Appel API iTunes
      const response = await fetch(`https://itunes.apple.com/search?term=${randomGenre}&entity=song&limit=50&attribute=genreIndex`);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // Transformer les résultats iTunes en format "Review" compatible avec l'affichage
        const discoveryTracks = data.results.map((track: ItunesTrack) => ({
          id: track.trackId,
          user_id: 'system',
          album_id: track.collectionId,
          album_name: track.trackName, // Afficher le titre de la musique
          album_image: track.artworkUrl100?.replace('100x100', '600x600') || '',
          artist_name: track.artistName,
          rating: 0,
          review_text: "",
          created_at: new Date().toISOString(),
          profiles: {
            username: "MusicBoxd Bot",
            avatar_url: null
          },
          preview_url_cache: track.previewUrl
        }));

        // Mélanger et garder 20 titres
        const shuffled = discoveryTracks.sort(() => 0.5 - Math.random());
        setReviews(shuffled.slice(0, 20));
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des découvertes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 1B. RÉCUPÉRATION DES CRITIQUES DES AMIS (TOUTES LES PUBLICATIONS, PLUS RÉCENTES D'ABORD)
  const fetchFriendReviews = useCallback(async () => {
    if (!user) return;

    setFriendLoading(true);
    try {
      // Récupérer les amis
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const friendIds = follows?.map(f => f.following_id) || [];
      if (friendIds.length === 0) {
        setFriendReviews([]);
        return;
      }

      // Récupérer TOUTES les critiques des amis (albums + songs), triées par date décroissante
      const { data: friendReviewsData, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles!reviews_user_id_fkey (
            username,
            avatar_url
          )
        `)
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setFriendReviews(friendReviewsData || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des critiques des amis:', error);
    } finally {
      setFriendLoading(false);
    }
  }, [user]);

  // 2. RÉCUPÉRATION DU PREVIEW AUDIO
  const fetchAudioPreview = useCallback(async (albumId: string, albumName?: string, artistName?: string) => {
    const cacheKey = `${albumId}-${albumName}-${artistName}`;

    try {
      // Vérifier le cache d'abord
      if (previewCacheRef.current.has(cacheKey)) {
        const cached = previewCacheRef.current.get(cacheKey);
        console.log(`💾 Cache hit pour "${albumName}": ${cached ? 'trouvé' : 'null'}`);
        return cached || null;
      }

      console.log(`🎵 Recherche preview pour "${albumName}" de ${artistName} (ID: ${albumId})`);

      let tracks;

      // Pour les amis : essayer d'abord une recherche directe par titre + artiste
      if (albumName && artistName) {
        try {
          console.log(`🔍 Recherche directe: "${albumName}" par ${artistName}`);
          const searchTerm = `${albumName} ${artistName}`.replace(/[^\w\s]/g, '').substring(0, 50);
          const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=10`);
          const data = await response.json();

          if (data.results && data.results.length > 0) {
            // Prendre le premier résultat qui correspond
            const bestMatch = data.results[0];
            if (bestMatch.previewUrl) {
              console.log(`✅ Trouvé directement: "${bestMatch.trackName}"`);
              previewCacheRef.current.set(cacheKey, bestMatch.previewUrl);
              return bestMatch.previewUrl;
            }
          }
        } catch (error) {
          console.log('⚠️ Échec recherche directe:', error);
        }

        // Si la recherche titre + artiste échoue, essayer seulement avec l'artiste
        try {
          console.log(`🔍 Recherche par artiste: ${artistName}`);
          const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=song&limit=10`);
          const data = await response.json();

          if (data.results && data.results.length > 0) {
            // Prendre le premier résultat de cet artiste
            const artistTrack = data.results[0];
            if (artistTrack.previewUrl) {
              console.log(`✅ Trouvé par artiste: "${artistTrack.trackName}"`);
              previewCacheRef.current.set(cacheKey, artistTrack.previewUrl);
              return artistTrack.previewUrl;
            }
          }
        } catch (error) {
          console.log('⚠️ Échec recherche par artiste:', error);
        }
      }

      // Essayer avec l'ID iTunes (pour les découvertes qui ont des vrais IDs)
      try {
        console.log(`🔍 Recherche par ID: ${albumId}`);
        const response = await fetch(`https://itunes.apple.com/lookup?id=${albumId}&entity=song&limit=20`);
        const data = await response.json();

        if (data.results && data.results.length > 1) {
          tracks = data.results.slice(1);
          console.log(`📀 Trouvé ${tracks.length} pistes par ID`);
        }
      } catch (error) {
        console.log('⚠️ Échec avec ID iTunes:', error);
      }

      // Si ça n'a pas marché, essayer par recherche album
      if (!tracks && albumName && artistName) {
        try {
          console.log(`🔍 Recherche album: "${albumName}"`);
          const searchTerm = `${albumName} ${artistName}`.replace(/[^\w\s]/g, '').substring(0, 50);
          const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=album&limit=5`);
          const searchData = await response.json();

          if (searchData.results && searchData.results.length > 0) {
            const foundAlbum = searchData.results[0];
            console.log(`💿 Album trouvé: "${foundAlbum.collectionName}"`);
            const trackResponse = await fetch(`https://itunes.apple.com/lookup?id=${foundAlbum.collectionId}&entity=song&limit=20`);
            const trackData = await trackResponse.json();

            if (trackData.results && trackData.results.length > 1) {
              tracks = trackData.results.slice(1);
              console.log(`🎵 ${tracks.length} pistes trouvées dans l'album`);
            }
          }
        } catch (error) {
          console.log('⚠️ Échec recherche album:', error);
        }
      }

      if (tracks && tracks.length > 0) {
        const validTracks = tracks.filter((track: { previewUrl?: string }) => track.previewUrl && track.previewUrl.trim() !== '');

        if (validTracks.length > 0) {
          const selectedTrack = validTracks[0];
          console.log(`✅ Trouvé: "${selectedTrack.trackName}"`);
          previewCacheRef.current.set(cacheKey, selectedTrack.previewUrl);
          return selectedTrack.previewUrl;
        }
      }

      console.log('❌ Aucun preview trouvé');
      previewCacheRef.current.set(cacheKey, null);
      return null;
    } catch (error) {
      console.error('❌ Erreur preview:', error);
      previewCacheRef.current.set(cacheKey, null);
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
      lastAudioStartRef.current = Date.now();

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
  }, [audioStates, fetchAudioPreview]);

  const pauseAudio = useCallback((albumId: string) => {
    const state = audioStates[albumId];
    if (state?.audio && state.isPlaying) {
      // Protection : ne pas arrêter un audio qui vient de commencer (minimum 2 secondes)
      const now = Date.now();
      if (now - lastAudioStartRef.current < 2000) {
        console.log('⏳ Audio trop récent, pas d\'arrêt');
        return;
      }

      try {
        console.log('🛑 Arrêt de l\'audio:', albumId);
        state.audio.pause();
        state.audio.currentTime = 0;
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
        // Trouver la carte la plus visible (celle avec le ratio d'intersection le plus élevé)
        let maxRatio = 0;
        let mostVisibleCard: string | null = null;

        entries.forEach((entry) => {
          const albumId = entry.target.getAttribute('data-album-id');
          if (!albumId) return;

          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleCard = albumId;
          }
        });

        // Changer si une carte devient suffisamment visible et différente de l'actuelle
        if (mostVisibleCard && mostVisibleCard !== currentVisibleCard && maxRatio > 0.8) {
          const now = Date.now();
          // Éviter les changements trop fréquents (minimum 1500ms entre les changements)
          // Et éviter d'interrompre un audio qui vient de commencer (minimum 2000ms depuis le dernier démarrage)
          if (now - lastCardChangeRef.current > 1500 && now - lastAudioStartRef.current > 2000) {
            console.log(`🎯 Nouvelle carte active: ${mostVisibleCard} (ratio: ${maxRatio})`);

            // Arrêter l'ancienne carte
            if (currentVisibleCard) {
              pauseAudio(currentVisibleCard);
            }

            setCurrentVisibleCard(mostVisibleCard);
            lastCardChangeRef.current = now;

            // Activer l'audio seulement si c'est activé
            if (isAudioEnabled && mostVisibleCard) {
              const currentReviews = activeTab === 'discover' ? reviews : friendReviews;
              const review = currentReviews.find(r => r.album_id === mostVisibleCard);
              setTimeout(() => {
                playAudio(mostVisibleCard!, review?.album_name, review?.artist_name);
              }, 300);
            }
          }
        }
      },
      {
        root: containerRef.current,
        threshold: 0.8, // Seuil unique plus élevé pour éviter les oscillations
        rootMargin: '0px 0px 0px 0px' // Pas de marges pour une détection plus précise
      }
    );

    // Observer toutes les cartes
    const cards = containerRef.current?.querySelectorAll('[data-album-id]');
    console.log(`🎪 Observation de ${cards?.length || 0} cartes`);
    cards?.forEach(card => {
      observerRef.current?.observe(card);
    });
  }, [playAudio, pauseAudio, currentVisibleCard, reviews, friendReviews, isAudioEnabled, activeTab]);


  // 6. EFFETS
  useEffect(() => {
    fetchRandomReviews();
  }, [fetchRandomReviews]);

  // Détecter le scroll utilisateur
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      isUserScrollingRef.current = true;

      // Réinitialiser le flag après un délai
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Charger les critiques des amis quand on change vers l'onglet amis
  useEffect(() => {
    if (activeTab === 'friends' && user && friendReviews.length === 0) {
      fetchFriendReviews();
    }

    // Arrêter l'audio quand on change d'onglet
    if (currentVisibleCard) {
      pauseAudio(currentVisibleCard);
      setCurrentVisibleCard(null);
    }
  }, [activeTab, user, friendReviews.length, fetchFriendReviews, currentVisibleCard, pauseAudio]);

  useEffect(() => {
    const currentReviews = activeTab === 'discover' ? reviews : friendReviews;
    const currentLoading = activeTab === 'discover' ? loading : friendLoading;

    if (currentReviews.length > 0 && !currentLoading) {
      // Délai plus long pour éviter les problèmes au montage
      setTimeout(setupIntersectionObserver, 500);
    }
  }, [reviews, friendReviews, loading, friendLoading, activeTab, setupIntersectionObserver]);

  // Gérer l'activation/désactivation de l'audio automatique
  useEffect(() => {
    if (isAudioEnabled && currentVisibleCard) {
      console.log('🔄 Audio activé pour la carte actuelle:', currentVisibleCard);
      const currentReviews = activeTab === 'discover' ? reviews : friendReviews;
      const review = currentReviews.find(r => r.album_id === currentVisibleCard);
      setTimeout(() => {
        playAudio(currentVisibleCard, review?.album_name, review?.artist_name);
      }, 300);
    } else if (!isAudioEnabled && currentVisibleCard) {
      console.log('🛑 Audio désactivé, arrêt de la lecture');
      pauseAudio(currentVisibleCard);
    }
  }, [isAudioEnabled, currentVisibleCard, reviews, friendReviews, activeTab, playAudio, pauseAudio]);

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

  const currentReviews = activeTab === 'discover' ? reviews : friendReviews;

  if (loading && activeTab === 'discover') {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-white text-xl">Chargement des découvertes...</div>
      </div>
    );
  }

  if (friendLoading && activeTab === 'friends') {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-white text-xl">Chargement des amis...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#050505] text-white overflow-hidden">
      {/* Background Glow */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* NAVBAR FLOTTANTE */}
      <div className="fixed top-2 left-0 right-0 flex justify-center z-50 px-4">
        <nav className="flex items-center justify-between px-4 md:px-8 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl w-full max-w-5xl">
            {/* Bouton MusicBoxd sur mobile */}
            <Link href="/" className="md:hidden text-lg font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>

            {/* Logo desktop - masqué sur mobile */}
            <Link href="/" className="hidden md:block text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>

            {/* Navigation desktop */}
            <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
                <Link href="/search" className="hover:text-[#00e054] transition">Albums</Link>
                <Link href="/discover" className={`transition flex items-center gap-2 ${isAudioEnabled ? 'text-[#00e054]' : 'hover:text-[#00e054] text-white'}`}>⚡ Découvrir</Link>
                <Link href="/community" className="hover:text-[#00e054] transition">Membres</Link>
            </div>

            {/* Bouton audio - toujours visible */}
            <button
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className={`transition text-2xl md:text-lg p-2 rounded-full hover:bg-white/10 ${isAudioEnabled ? 'text-[#00e054]' : 'text-gray-400 hover:text-white'}`}
              title={isAudioEnabled ? "Désactiver l'audio automatique" : "Activer l'audio automatique"}
            >
              {isAudioEnabled ? "🔊" : "🔇"}
            </button>
        </nav>
      </div>

      {/* ONGLETS AMIS/DÉCOUVRIR */}
      <div className="fixed top-16 md:top-24 left-0 right-0 flex justify-center z-40 px-4">
        <div className="flex bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-widest rounded-full transition ${
              activeTab === 'friends'
                ? 'bg-[#00e054] text-black'
                : 'text-white hover:text-[#00e054]'
            }`}
          >
            👥 Amis
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-widest rounded-full transition ${
              activeTab === 'discover'
                ? 'bg-[#00e054] text-black'
                : 'text-white hover:text-[#00e054]'
            }`}
          >
            ⚡ Découvrir
          </button>
        </div>
      </div>

      {/* CONTENEUR PRINCIPAL AVEC SCROLL SNAP */}
      <div
        ref={containerRef}
        className="h-screen overflow-y-auto snap-y snap-mandatory pt-24 md:pt-28"
      >
        {currentReviews.length > 0 ? (
          currentReviews.map((review) => (
            <DiscoverCard
              key={`${activeTab}-${review.id}`}
              review={review}
              isActive={currentVisibleCard === review.album_id}
              audioState={audioStates[review.album_id]}
              isAudioEnabled={isAudioEnabled}
              currentUser={user || null}
            />
          ))
        ) : (
          <div className="h-screen flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">
                {activeTab === 'friends' ? '👥' : '🎵'}
              </div>
              <div className="text-xl font-bold mb-2">
                {activeTab === 'friends'
                  ? 'Aucune critique d\'amis trouvée'
                  : 'Aucune découverte trouvée'
                }
              </div>
              <div className="text-gray-400">
                {activeTab === 'friends'
                  ? 'Suivez des amis pour voir leurs critiques !'
                  : 'Les découvertes apparaîtront bientôt.'
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}