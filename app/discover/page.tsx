'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import ProfileMenu from '@/components/ui/profile-menu';
import Vinyl from '@/components/Vinyl';
import { motion, AnimatePresence } from 'framer-motion';

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
  preview_url_cache?: string;
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
        // Pour les découvertes système, vérifier les album_likes
        if (review.user_id === 'system') {
          // Compter les likes d'album pour cet album
          const { count: albumLikesCount } = await supabase
            .from('album_likes')
            .select('*', { count: 'exact', head: true })
            .eq('album_id', review.album_id);

          setLikesCount(albumLikesCount || 0);

          // Vérifier si l'utilisateur actuel a liké cet album
          if (currentUser) {
            const { data: userAlbumLike } = await supabase
              .from('album_likes')
            .select('id')
            .eq('album_id', review.album_id)
            .eq('user_id', currentUser.id)
            .maybeSingle();
          
            setHasLiked(!!userAlbumLike);
          }
          } else {
          // Pour les vraies reviews, utiliser la table likes
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
            .eq('review_id', review.id);

        setLikesCount(likesCount || 0);

          // Vérifier si l'utilisateur actuel a liké
        if (currentUser) {
          const { data: userLike } = await supabase
            .from('likes')
            .select('id')
              .eq('review_id', review.id)
            .eq('user_id', currentUser.id)
            .maybeSingle();

          setHasLiked(!!userLike);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données sociales:', error);
      }
    };

    fetchSocialData();
  }, [review.id, review.album_id, review.user_id, currentUser]);

  // Charger les commentaires quand on ouvre la modale
  useEffect(() => {
    if (showComments) {
      const fetchComments = async () => {
        try {
          // Pour les découvertes système, chercher une review existante
          let reviewId = review.id;
          
          if (review.user_id === 'system' && currentUser) {
            const { data: existingReview } = await supabase
              .from('reviews')
              .select('id')
              .eq('album_id', review.album_id)
              .eq('user_id', currentUser.id)
              .maybeSingle();
            
            if (existingReview) {
              reviewId = existingReview.id;
            } else {
              // Pas de review, donc pas de commentaires
              setComments([]);
              return;
            }
          }

          const { data } = await supabase
            .from('comments')
            .select('*, profiles(username, avatar_url)')
            .eq('review_id', reviewId)
            .order('created_at', { ascending: true });

          setComments((data || []) as typeof comments);
        } catch (error) {
          console.error('Erreur lors du chargement des commentaires:', error);
        }
      };

      fetchComments();
    }
  }, [showComments, review.id, review.album_id, review.user_id, currentUser]);

  // Créer ou récupérer une review pour les découvertes
  const ensureReviewExists = async () => {
    // Si la review a déjà un ID réel (pas system), on retourne directement
    if (review.user_id !== 'system') {
      return review.id;
    }

    // Vérifier si une review existe déjà pour cet album/track
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('album_id', review.album_id)
      .eq('user_id', currentUser!.id)
      .maybeSingle();

    if (existingReview) {
      return existingReview.id;
    }

    // Créer une nouvelle review "découverte" pour cet utilisateur
    // On ne met PAS de rating (null) pour ne pas polluer les notes
    const { data: newReview, error } = await supabase
      .from('reviews')
      .insert({
        user_id: currentUser!.id,
        user_name: currentUser!.email?.split('@')[0] || 'user',
        album_id: review.album_id,
        album_name: review.album_name,
        album_image: review.album_image,
        artist_name: review.artist_name,
        rating: null, // Pas de note - l'utilisateur n'a pas noté, juste commenté
        review_text: '', // Pas de texte pour une découverte
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erreur création review:', error);
      throw error;
    }

    return newReview.id;
  };

  const handleLike = async () => {
    if (!currentUser) {
      alert("Connectez-vous pour aimer une musique !");
      return;
    }

    // Optimistic UI update
    const previousHasLiked = hasLiked;
    const previousCount = likesCount;

    setHasLiked(!hasLiked);
    setLikesCount(prev => hasLiked ? prev - 1 : prev + 1);

    try {
      // Pour les découvertes système, utiliser album_likes
      if (review.user_id === 'system') {
        if (previousHasLiked) {
          // Supprimer le like d'album
          const { error } = await supabase
            .from('album_likes')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('album_id', review.album_id);

          if (error) throw error;
        } else {
          // Ajouter le like d'album (sans créer de review)
          const { error } = await supabase
            .from('album_likes')
            .insert({
              user_id: currentUser.id,
              album_id: review.album_id,
              album_name: review.album_name,
              album_image: review.album_image,
              artist_name: review.artist_name,
              item_type: 'album'
            });

          if (error) throw error;
        }
      } else {
        // Pour les vraies reviews, utiliser la table likes
      if (previousHasLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUser.id)
            .eq('review_id', review.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: currentUser.id,
              review_id: review.id
          });

        if (error) throw error;
        }
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
      // S'assurer qu'une review existe
      const reviewId = await ensureReviewExists();

      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: currentUser.id,
          review_id: reviewId,
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
  const infoContent = review.review_text ? (
    <>
      <div className="flex items-center gap-3 mb-3">
        <Link href={`/profile-view?u=${review.profiles.username}`} className="flex items-center gap-3 group">
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
        {review.rating && review.rating > 0 && (
          <span className="text-[#00e054] font-bold text-lg">
            {"★".repeat(review.rating)}
          </span>
        )}
        <span className="text-gray-400 text-sm">
          {new Date(review.created_at).toLocaleDateString('fr-FR')}
        </span>
      </div>

      <p className="text-gray-300 text-sm leading-relaxed italic max-w-2xl">
        &ldquo;{review.review_text}&rdquo;
      </p>
    </>
  ) : (
    <div className="text-center">
      <Link href={`/album-view?id=${review.album_id}`} className="block group">
        <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-[#00e054] transition mb-2">
          {review.album_name}
        </h3>
        <p className="text-base md:text-lg text-gray-300 group-hover:text-white transition">
          {review.artist_name}
        </p>
        <p className="text-xs text-gray-500 mt-2 opacity-75">
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
      <div className="relative z-10 flex items-center justify-center w-full h-full px-6 pb-32 md:pb-0">

        {/* CENTRAGE : DISQUE VINYLE QUI TOURNE */}
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="relative">
            {/* Composant Vinyl - tourne uniquement quand actif */}
            <div className={isActive ? 'animate-[spin_4s_linear_infinite]' : ''}>
              <Vinyl imageUrl={review.album_image} size="w-72 h-72 md:w-80 md:h-80" />
            </div>

            {/* INDICATEUR DE LECTURE AUDIO */}
            {isActive && (
              <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
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
        <div className="absolute bottom-28 md:bottom-8 left-6 right-6">
          <div className="bg-white/[0.03] backdrop-blur-3xl backdrop-saturate-150 rounded-3xl p-4 md:p-6 border border-white/10 border-t-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
            {infoContent}
          </div>
        </div>

        {/* ACTIONS DROITE (Style Instagram Reels) */}
        <div className="absolute right-4 md:right-6 top-[42%] md:top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 md:gap-5">
          <button
            onClick={handleLike}
            className={`p-3 md:p-4 rounded-full border-2 transition-all backdrop-blur-xl shadow-lg ${
              hasLiked
                ? 'bg-[#00e054] border-[#00e054] text-black'
                : 'bg-black/40 border-white/20 text-white hover:border-[#00e054] hover:text-[#00e054] hover:bg-black/60'
            }`}
            title={hasLiked ? "Retirer le like" : "Aimer"}
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl md:text-3xl">{hasLiked ? '♥' : '♡'}</span>
              <span className="text-xs mt-1 font-bold">{likesCount}</span>
            </div>
          </button>

          <button
            onClick={() => setShowComments(true)}
            className="p-3 md:p-4 rounded-full border-2 bg-black/40 border-white/20 text-white hover:border-[#00e054] hover:text-[#00e054] hover:bg-black/60 transition-all backdrop-blur-xl shadow-lg"
            title="Commenter"
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl md:text-3xl">💬</span>
              {comments.length > 0 && (
                <span className="text-xs mt-1 font-bold">{comments.length}</span>
              )}
            </div>
          </button>

          <Link
            href={`/album-view?id=${review.album_id}`}
            className="p-3 md:p-4 rounded-full border-2 bg-black/40 border-white/20 text-white hover:border-[#00e054] hover:text-[#00e054] hover:bg-black/60 transition-all backdrop-blur-xl shadow-lg"
            title="Voir l'album"
          >
            <span className="text-2xl md:text-3xl">👁️</span>
          </Link>
        </div>
      </div>

      {/* MODALE COMMENTAIRES FONCTIONNELLE */}
      <AnimatePresence>
      {showComments && (
        <motion.div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop avec blur */}
          <motion.div 
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowComments(false)}
          />

          <motion.div 
            className="relative bg-[#1a1a1a] p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl flex flex-col max-h-[80vh]"
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="flex justify-between items-center mb-6">
              <motion.h2 
                className="text-2xl font-bold text-white"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                Commentaires
              </motion.h2>
              <motion.button 
                onClick={() => setShowComments(false)} 
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                ×
              </motion.button>
            </div>

            {/* Liste des commentaires */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
              <AnimatePresence mode="popLayout">
              {comments.length > 0 ? comments.map((c, index) => (
                <motion.div 
                  key={c.id} 
                  className="flex gap-3 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/[0.08] transition-all"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -100, scale: 0.8 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    delay: index * 0.05
                  }}
                  layout
                >
                  <Link href={`/profile-view?u=${c.profiles?.username}`} className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 overflow-hidden text-xs flex items-center justify-center font-bold border border-white/10 text-gray-400 hover:border-[#00e054] transition-all">
                    {c.profiles?.avatar_url ? (
                      <img src={c.profiles.avatar_url} alt={c.profiles.username} className="w-full h-full object-cover"/>
                    ) : (
                      c.profiles?.username?.[0]?.toUpperCase()
                    )}
                  </Link>
                  <div className="flex-1">
                    <Link href={`/profile-view?u=${c.profiles?.username}`} className="text-xs font-bold text-[#00e054] block mb-1 hover:text-[#00c04b] transition">{c.profiles?.username}</Link>
                    <p className="text-sm text-gray-300 leading-relaxed">{c.content}</p>
                    <span className="text-xs text-gray-500 mt-1 block">
                      {new Date(c.created_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              )) : (
                <motion.div 
                  className="text-center text-gray-500 py-10 italic"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.div 
                    className="text-4xl mb-4"
                    animate={{ 
                      rotate: [0, -10, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  >
                    💬
                  </motion.div>
                  Soyez le premier à commenter cette critique !
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            {/* Formulaire de commentaire */}
            <motion.div 
              className="flex gap-2 pt-4 border-t border-white/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
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
              <motion.button
                onClick={handlePostComment}
                disabled={!newComment.trim() || !currentUser}
                className="bg-[#00e054] text-black w-12 h-12 rounded-full font-bold flex items-center justify-center hover:bg-[#00c04b] disabled:opacity-50 disabled:cursor-not-allowed transition"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ➤
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

export default function DiscoverPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [friendReviews, setFriendReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendLoading, setFriendLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false); // Pour le scroll infini
  const [hasMore, setHasMore] = useState(true); // Indicateur de contenu disponible
  const [audioStates, setAudioStates] = useState<AudioState>({});
  const [currentVisibleCard, setCurrentVisibleCard] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true); // Activé par défaut pour une expérience type Reels
  const [activeTab, setActiveTab] = useState<'discover' | 'friends'>('discover');
  const [user, setUser] = useState<{
    id: string;
    email?: string;
  } | null>(null);
  const previewCacheRef = useRef<Map<string, string | null>>(new Map());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreObserverRef = useRef<IntersectionObserver | null>(null); // Observer pour le scroll infini
  const isUserScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef<boolean>(false); // Éviter les appels multiples

  // 0. AUTHENTIFICATION
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // 1. RÉCUPÉRATION INITIALE DES CRITIQUES VIA L'API FEED
  const fetchRandomReviews = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🎬 Chargement initial du feed...');
      
      const response = await fetch('/api/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id || null,
          seenIds: [],
        }),
      });

      const data = await response.json();

      console.log('📦 Réponse API Feed:', data);

      if (data.success && data.items && data.items.length > 0) {
        console.log(`✅ ${data.items.length} items initiaux chargés`);
        console.log('🎵 Premier item:', data.items[0]);
        setReviews(data.items);
        setHasMore(data.hasMore);
      } else {
        console.log('⚠️ Aucun item initial trouvé, chargement iTunes en fallback...');
        console.log('📊 Data reçue:', JSON.stringify(data));
        // Fallback sur iTunes si l'API Feed ne retourne rien
        await fetchItunesDiscovery();
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement initial:', error);
      // Fallback sur iTunes en cas d'erreur
      await fetchItunesDiscovery();
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fallback : Découverte iTunes (ancienne méthode)
  const fetchItunesDiscovery = async () => {
    const DISCOVERY_GENRES = [
      "pop", "rock", "hip hop", "jazz", "classical", "electronic",
      "r&b", "indie", "alternative", "metal", "rap", "folk", "soul"
    ];

    try {
      const randomGenre = DISCOVERY_GENRES[Math.floor(Math.random() * DISCOVERY_GENRES.length)];
      console.log(`⚡ iTunes Discovery: Genre "${randomGenre}"`);

      const response = await fetch(`https://itunes.apple.com/search?term=${randomGenre}&entity=song&limit=50&attribute=genreIndex`);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const discoveryTracks = data.results.map((track: ItunesTrack) => ({
          id: track.trackId,
          user_id: 'system',
          album_id: String(track.collectionId), // Convertir en string pour cohérence
          album_name: track.trackName,
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

        const shuffled = discoveryTracks.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 20);
        console.log(`🎵 ${selected.length} tracks iTunes chargés`);
        console.log('🎧 Premier track:', selected[0]);
        setReviews(selected);
        setHasMore(false); // Pas de scroll infini pour iTunes
      }
    } catch (error) {
      console.error('Erreur lors de la récupération iTunes:', error);
    }
  };

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

  // 1C. FONCTION DE CHARGEMENT INTELLIGENT VIA L'API FEED
  const loadMoreReviews = useCallback(async () => {
    if (isFetchingRef.current || !hasMore || loadingMore) {
      console.log('⏭️ Chargement ignoré (déjà en cours ou plus de contenu)');
      return;
    }

    isFetchingRef.current = true;
    setLoadingMore(true);

    try {
      console.log('📥 Chargement de nouveaux items...');
      
      // Récupérer les IDs déjà vus
      const seenIds = reviews.map(r => r.id);

      const response = await fetch('/api/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id || null,
          seenIds: seenIds,
        }),
      });

      const data = await response.json();

      if (data.success && data.items && data.items.length > 0) {
        console.log(`✅ ${data.items.length} nouveaux items chargés`);
        setReviews(prev => [...prev, ...data.items]);
        setHasMore(data.hasMore);
      } else {
        console.log('⚠️ Pas de nouveaux items disponibles');
        setHasMore(false);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement:', error);
    } finally {
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [reviews, user, hasMore, loadingMore]);

  // 2. RÉCUPÉRATION DU PREVIEW AUDIO - VERSION SIMPLIFIÉE
  const fetchAudioPreview = useCallback(async (albumId: string, albumName?: string, artistName?: string) => {
    const cacheKey = `${albumId}`;

    try {
      // Vérifier le cache d'abord (mais ne pas bloquer sur null)
        const cached = previewCacheRef.current.get(cacheKey);
      if (cached) {
        console.log(`💾 Cache hit: ${albumName}`);
        return cached;
      }

      console.log(`🎵 Recherche preview: "${albumName}" - ${artistName}`);

      // STRATÉGIE SIMPLE : Une seule recherche directe
      const searchTerm = `${albumName} ${artistName}`.replace(/[^\w\s]/g, ' ').trim().substring(0, 60);
      const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=5`);
          const data = await response.json();

          if (data.results && data.results.length > 0) {
        // Prendre le premier résultat avec preview
        const trackWithPreview = data.results.find((t: any) => t.previewUrl);
        if (trackWithPreview?.previewUrl) {
          console.log(`✅ Preview trouvé: "${trackWithPreview.trackName}"`);
          previewCacheRef.current.set(cacheKey, trackWithPreview.previewUrl);
          return trackWithPreview.previewUrl;
        }
      }

      console.log('❌ Aucun preview disponible');
      return null;
    } catch (error) {
      console.error('❌ Erreur preview:', error);
      return null;
    }
  }, []);

  // 3. GESTION AUDIO - VERSION SIMPLIFIÉE ET ROBUSTE
  const playAudio = useCallback(async (albumId: string, albumName?: string, artistName?: string, cachedPreviewUrl?: string) => {
    if (!isAudioEnabled) {
      console.log('🔇 Audio désactivé');
      return;
    }

    console.log(`🎵 Lecture: "${albumName}" - ${artistName}`);

    try {
      // Arrêter l'audio précédent immédiatement
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
    }

    // Marquer comme en chargement
    setAudioStates(prev => ({
      ...prev,
        [albumId]: { audio: null, isPlaying: false, previewUrl: null, isLoading: true, lastPlayAttempt: Date.now() }
    }));

      // Récupérer le preview (utiliser le cache si disponible)
      let previewUrl = cachedPreviewUrl || null;
      
      if (!previewUrl) {
        previewUrl = await fetchAudioPreview(albumId, albumName, artistName);
      } else {
        console.log('💾 Utilisation du preview caché');
      }
      
        if (!previewUrl) {
        console.log('❌ Pas de preview disponible');
          setAudioStates(prev => ({
            ...prev,
            [albumId]: { ...prev[albumId], isLoading: false }
          }));
          return;
        }

      // Créer et configurer l'audio
      const audio = new Audio(previewUrl);
      audio.volume = 0.7;
      audio.preload = 'auto';

      // Événements
      audio.onended = () => {
        console.log('🏁 Fin de lecture');
        setAudioStates(prev => ({
          ...prev,
          [albumId]: { ...prev[albumId], isPlaying: false }
        }));
      };

      audio.onerror = (e) => {
        console.error('❌ Erreur lecture audio:', e);
        setAudioStates(prev => ({
          ...prev,
          [albumId]: { ...prev[albumId], isPlaying: false, isLoading: false }
        }));
      };

      // Lancer la lecture
      await audio.play();
      console.log('✅ Lecture démarrée avec succès');

      currentAudioRef.current = audio;
      setAudioStates(prev => ({
        ...prev,
        [albumId]: {
          audio,
          isPlaying: true,
          previewUrl,
          isLoading: false,
          lastPlayAttempt: Date.now()
        }
      }));

    } catch (error) {
      console.error('❌ Erreur playAudio:', error);
      setAudioStates(prev => ({
        ...prev,
        [albumId]: { ...prev[albumId], isPlaying: false, isLoading: false }
      }));
    }
  }, [fetchAudioPreview, isAudioEnabled]);

  const pauseAudio = useCallback(() => {
    if (currentAudioRef.current) {
      console.log('🛑 Stop audio');
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  // 4. INTERSECTION OBSERVER - VERSION SIMPLIFIÉE SANS BOUCLE
  const setupIntersectionObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Trouver la carte la plus visible
        let maxRatio = 0;
        let mostVisibleCard: string | null = null;

        entries.forEach((entry) => {
          const albumId = entry.target.getAttribute('data-album-id');
          if (!albumId) {
            console.log('⚠️ Carte sans album_id détectée');
            return;
          }

          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleCard = albumId;
            console.log(`👁️ Carte visible: ${albumId} (ratio: ${entry.intersectionRatio.toFixed(2)})`);
          }
        });

        // Changer de carte si suffisamment visible (>50%)
        if (mostVisibleCard && maxRatio > 0.5) {
          setCurrentVisibleCard(prev => {
            // Ne rien faire si c'est déjà la carte active
            if (prev === mostVisibleCard) {
              console.log(`✓ Carte déjà active: ${mostVisibleCard}`);
              return prev;
            }

            console.log(`🎯 Changement de carte: ${prev} → ${mostVisibleCard}`);
            return mostVisibleCard;
          });
        }
      },
      {
        root: containerRef.current,
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
        rootMargin: '0px'
      }
    );

    // Observer toutes les cartes
    const cards = containerRef.current?.querySelectorAll('[data-album-id]');
    console.log(`🎪 Observer ${cards?.length || 0} cartes`);
    cards?.forEach(card => observerRef.current?.observe(card));
  }, []); // Pas de dépendances pour éviter la boucle


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
  const prevTabRef = useRef<'discover' | 'friends'>('discover');
  
  useEffect(() => {
    // Charger les reviews des amis si nécessaire
    if (activeTab === 'friends' && user && friendReviews.length === 0) {
      fetchFriendReviews();
    }

    // Arrêter l'audio et réinitialiser la carte SEULEMENT si l'onglet a changé
    if (prevTabRef.current !== activeTab) {
      console.log(`🔄 Changement d'onglet: ${prevTabRef.current} → ${activeTab}`);
      pauseAudio();
      setCurrentVisibleCard(null);
      prevTabRef.current = activeTab;
    }
  }, [activeTab, user, friendReviews.length, fetchFriendReviews, pauseAudio]);

  // Setup observer une seule fois quand les reviews sont chargées
  useEffect(() => {
    const currentReviews = activeTab === 'discover' ? reviews : friendReviews;
    const currentLoading = activeTab === 'discover' ? loading : friendLoading;

    if (currentReviews.length > 0 && !currentLoading) {
      console.log(`📊 Setup observer pour ${currentReviews.length} reviews`);
      // Délai pour s'assurer que le DOM est prêt
      const timer = setTimeout(() => {
        setupIntersectionObserver();
        console.log('✅ Observer configuré');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [reviews.length, friendReviews.length, loading, friendLoading, activeTab]); // Retiré setupIntersectionObserver

  // Gérer le changement de carte visible et la lecture audio
  useEffect(() => {
    console.log(`🎬 useEffect audio: card=${currentVisibleCard}, enabled=${isAudioEnabled}, tab=${activeTab}`);
    
    if (!currentVisibleCard) {
      console.log('⏭️ Pas de carte visible');
      return;
    }

    // Arrêter l'audio précédent
    pauseAudio();

    // Lancer le nouvel audio si activé
    if (isAudioEnabled) {
      const currentReviews = activeTab === 'discover' ? reviews : friendReviews;
      console.log(`📚 Recherche dans ${currentReviews.length} reviews`);
      
      const review = currentReviews.find(r => {
        const match = String(r.album_id) === String(currentVisibleCard);
        if (!match && currentReviews.length <= 3) {
          console.log(`🔍 Comparaison: "${r.album_id}" (${typeof r.album_id}) vs "${currentVisibleCard}" (${typeof currentVisibleCard})`);
        }
        return match;
      });
      
      if (review) {
        console.log(`✅ Review trouvée: "${review.album_name}" - ${review.artist_name}`);
        console.log('🔄 Lancement de la lecture audio...');
        
        // Petit délai pour laisser le scroll se stabiliser
        const timer = setTimeout(() => {
          playAudio(currentVisibleCard, review.album_name, review.artist_name, review.preview_url_cache);
        }, 200);
        
        return () => clearTimeout(timer);
      } else {
        console.log(`❌ Review non trouvée pour album_id: ${currentVisibleCard}`);
        console.log('📋 IDs disponibles:', currentReviews.map(r => r.album_id).slice(0, 5));
      }
    } else {
      console.log('🔇 Audio désactivé');
    }
  }, [currentVisibleCard, isAudioEnabled, activeTab, reviews, friendReviews, playAudio, pauseAudio]);

  // 6B. INTERSECTION OBSERVER POUR LE SCROLL INFINI
  useEffect(() => {
    if (activeTab !== 'discover' || !hasMore) return;

    const setupLoadMoreObserver = () => {
      if (loadMoreObserverRef.current) {
        loadMoreObserverRef.current.disconnect();
      }

      const loadMoreTrigger = document.getElementById('load-more-trigger');
      if (!loadMoreTrigger) return;

      loadMoreObserverRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !loadingMore && hasMore) {
              console.log('🎯 Trigger de chargement atteint');
              loadMoreReviews();
            }
          });
        },
        {
          root: containerRef.current,
          threshold: 0.5,
          rootMargin: '200px', // Charger avant d'atteindre le bas
        }
      );

      loadMoreObserverRef.current.observe(loadMoreTrigger);
    };

    // Délai pour s'assurer que le DOM est prêt
    const timeout = setTimeout(setupLoadMoreObserver, 500);

    return () => {
      clearTimeout(timeout);
      if (loadMoreObserverRef.current) {
        loadMoreObserverRef.current.disconnect();
      }
    };
  }, [activeTab, loadingMore, hasMore, loadMoreReviews]);

  // 7. CLEANUP
  useEffect(() => {
    return () => {
      // Arrêter l'audio et nettoyer
      pauseAudio();
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [pauseAudio]);

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
      <div className="hidden md:flex fixed top-4 left-0 right-0 justify-center z-50 px-2 md:px-4">
        <nav className="flex items-center justify-between px-4 md:px-8 py-2 md:py-3 w-full max-w-5xl rounded-full transition-all duration-300 bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 border border-white/10 border-t-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
            <Link href="/" className="text-lg md:text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>
            
            <div className="hidden md:flex items-center gap-2 md:gap-8 text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/70">
                <Link href="/search" className="hover:text-white transition hidden sm:inline">Albums</Link>
                <Link href="/discover" className="hover:text-white transition flex items-center gap-1 md:gap-2">
                    <span className="text-sm md:text-base opacity-70">⚡</span> <span className="hidden sm:inline">Découvrir</span>
                </Link>
                <Link href="/lists/import" className="hover:text-white transition flex items-center gap-1 md:gap-2">
                    <span className="text-sm md:text-base opacity-70">📥</span> <span className="hidden sm:inline">Importer</span>
                </Link>
                <Link href="/community" className="hover:text-white transition hidden md:inline">Membres</Link>
                
                {/* Bouton audio */}
                <button
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                  className={`transition text-lg md:text-base p-1.5 rounded-full hover:bg-white/10 ${isAudioEnabled ? 'text-[#00e054]' : 'text-gray-400 hover:text-white'}`}
                  title={isAudioEnabled ? "Désactiver l'audio" : "Activer l'audio"}
                >
                  {isAudioEnabled ? "🔊" : "🔇"}
                </button>
                
                {user ? (
                    <ProfileMenu user={user} />
                ) : (
                    <Link href="/login" className="flex items-center gap-1 md:gap-2 pl-2 md:pl-4 border-l border-white/10 hover:opacity-80 transition">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-[#00e054] to-emerald-600 flex items-center justify-center text-black font-black text-[10px] md:text-xs">?</div>
                    </Link>
                )}
            </div>
        </nav>
      </div>

      {/* ONGLETS AMIS/DÉCOUVRIR */}
      <div className="fixed top-6 md:top-24 left-0 right-0 flex justify-center z-40 px-4">
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
        className="h-screen overflow-y-auto snap-y snap-mandatory pt-0 md:pt-36"
      >
        {currentReviews.length > 0 ? (
          <>
            {currentReviews.map((review) => (
              <DiscoverCard
                key={`${activeTab}-${review.id}`}
                review={review}
                isActive={currentVisibleCard === review.album_id}
                audioState={audioStates[review.album_id]}
                isAudioEnabled={isAudioEnabled}
                currentUser={user || null}
              />
            ))}
            
            {/* Élément trigger pour le scroll infini (seulement pour l'onglet Découvrir) */}
            {activeTab === 'discover' && hasMore && (
              <div
                id="load-more-trigger"
                className="h-screen snap-start flex items-center justify-center"
              >
                <div className="text-white text-center">
                  {loadingMore ? (
                    <>
                      <div className="w-16 h-16 border-4 border-[#00e054] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-lg font-bold">Chargement...</p>
                      <p className="text-sm text-gray-400 mt-2">Nouvelles découvertes en cours</p>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mb-4">🎵</div>
                      <p className="text-lg font-bold">Continuez à scroller</p>
                      <p className="text-sm text-gray-400 mt-2">Plus de contenu arrive</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Message de fin si plus de contenu */}
            {activeTab === 'discover' && !hasMore && !loadingMore && (
              <div className="h-screen snap-start flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-6xl mb-4">🎉</div>
                  <div className="text-xl font-bold mb-2">Vous avez tout vu !</div>
                  <div className="text-gray-400">
                    Revenez plus tard pour de nouvelles découvertes
                  </div>
                </div>
              </div>
            )}
          </>
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