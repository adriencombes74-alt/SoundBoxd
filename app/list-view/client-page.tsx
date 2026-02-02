'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileMenu from '@/components/ui/profile-menu';
import { Toast, ToastType } from '@/components/ui/toast';
import { Heart, ListPlus, Check } from 'lucide-react';

export default function ListDetailsClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [listId, setListId] = useState<string>("");
  const [list, setList] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // État pour la lecture audio
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Spotify Integration
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: ToastType, visible: boolean }>({ msg: '', type: 'info', visible: false });

  // Playlists
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<any>(null);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  // Rating Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<any>(null);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Share to Feed Modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCaption, setShareCaption] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isAlreadyShared, setIsAlreadyShared] = useState(false);

  const showToast = (msg: string, type: ToastType = 'info') => {
    setToast({ msg, type, visible: true });
  };

  useEffect(() => {
    const checkSpotify = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('user_integrations').select('id').eq('user_id', user.id).eq('provider', 'spotify').single();
        if (data) setSpotifyConnected(true);
      }
    };
    checkSpotify();
  }, []);

  useEffect(() => {
    if (id) {
      setListId(id);
    }
  }, [id]);

  const fetchListData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    const { data: listData, error } = await supabase
      .from('lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (error || !listData) {
      setLoading(false);
      return;
    }
    setList(listData);

    const { data: ownerData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', listData.user_id)
      .single();

    setOwner(ownerData || { username: 'Inconnu' });

    // Vérifier si la liste est déjà partagée
    if (user) {
      const { data: existingPost } = await supabase
        .from('list_posts')
        .select('id')
        .eq('list_id', listId)
        .maybeSingle();

      setIsAlreadyShared(!!existingPost);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (listId) fetchListData();
  }, [listId]);

  const handleDelete = async () => {
    if (!confirm("Voulez-vous vraiment supprimer cette liste ?")) return;
    const { error } = await supabase.from('lists').delete().eq('id', listId);
    if (!error) { router.push('/profile'); router.refresh(); }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Lien copié !");
  };

  const handleExportCSV = () => {
    if (!list || !list.albums || list.albums.length === 0) {
      alert("Aucune donnée à exporter !");
      return;
    }

    try {
      const headers = ['Artist', 'Track Name', 'Album'];
      const rows = list.albums.map((item: any) => [
        item.artist || '',
        item.name || '',
        item.album || item.collectionName || (item.type === 'album' ? item.name : 'Album inconnu')
      ]);

      const csvContent = [headers, ...rows]
        .map(row =>
          row.map((field: string) =>
            `"${String(field).replace(/"/g, '""')}"`
          ).join(',')
        )
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${list.title || 'playlist'}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert(`Fichier CSV "${list.title || 'playlist'}.csv" téléchargé avec succès !`);
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      alert('Erreur lors de l\'exportation du fichier CSV.');
    }
  };

  const handleEdit = async () => {
    const newTitle = prompt("Nouveau titre :", list.title);
    if (newTitle) {
      const { error } = await supabase.from('lists').update({ title: newTitle }).eq('id', listId);
      if (!error) setList({ ...list, title: newTitle });
    }
  };

  const handlePlayTrack = async (item: any) => {
    try {
      const trackId = item.targetId || item.id;

      if (playingTrack && playingTrack !== trackId) {
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }
        setPlayingTrack(null);
        setAudioElement(null);
      }

      if (playingTrack === trackId) {
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }
        setPlayingTrack(null);
        setAudioElement(null);
        return;
      }

      console.log(`🎵 Tentative de lecture: "${item.name}" (ID: ${trackId})`);
      let previewUrl = null;

      // Méthode 1: Recherche stricte par ID avec validation
      try {
        const response = await fetch(`https://itunes.apple.com/lookup?id=${trackId}&entity=song`);

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            // Priorité absolue : Correspondance exacte de l'ID si c'est un track
            const exactMatch = data.results.find((r: any) => String(r.trackId) === String(trackId) && r.previewUrl);

            if (exactMatch) {
              previewUrl = exactMatch.previewUrl;
              console.log('✅ Preview exact trouvé (ID match)');
            } else {
              console.log(`⚠️ Pas de match exact d'ID pour trackId=${trackId}`);

              // ÉTAPE INTERMÉDIAIRE: Chercher par nom de piste dans les résultats
              if (item.name) {
                const nameMatch = data.results.find((r: any) => {
                  if (!r.trackName || !r.previewUrl || r.wrapperType !== 'track') return false;
                  const trackNameLower = r.trackName.toLowerCase();
                  const itemNameLower = item.name.toLowerCase();
                  return trackNameLower.includes(itemNameLower) || itemNameLower.includes(trackNameLower);
                });

                if (nameMatch) {
                  previewUrl = nameMatch.previewUrl;
                  console.log(`✅ Match par NOM trouvé: "${nameMatch.trackName}" (trackId=${nameMatch.trackId})`);
                }
              }

              // Si toujours rien, dernière option: première piste de l'album
              if (!previewUrl) {
                const firstTrack = data.results.find((r: any) => r.wrapperType === 'track' && r.previewUrl);
                if (firstTrack) {
                  previewUrl = firstTrack.previewUrl;
                  console.log(`⚠️ FALLBACK: Première piste "${firstTrack.trackName}" au lieu de "${item.name}"`);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('Erreur lookup ID:', e);
      }

      // Méthode 2: Recherche par nom (uniquement si Méthode 1 échoue complètement)
      if (!previewUrl && item.name && item.artist) {
        console.log(`🔍 Fallback recherche: "${item.name}" ${item.artist}`);
        const searchQuery = encodeURIComponent(`${item.name} ${item.artist}`);
        const searchRes = await fetch(`https://itunes.apple.com/search?term=${searchQuery}&entity=song&limit=1`);

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.results?.[0]?.previewUrl) {
            // Vérification de sécurité base
            const resName = searchData.results[0].trackName.toLowerCase();
            const reqName = item.name.toLowerCase();

            if (resName.includes(reqName) || reqName.includes(resName)) {
              previewUrl = searchData.results[0].previewUrl;
              console.log('✅ Preview trouvé via recherche fallback');
            }
          }
        }
      }

      if (previewUrl) {
        const audio = new Audio(previewUrl);
        audio.volume = 0.6;
        audio.crossOrigin = "anonymous";

        audio.addEventListener('ended', () => {
          setPlayingTrack(null);
          setAudioElement(null);
        });

        audio.addEventListener('error', (e) => {
          console.error('Erreur lecture:', e);
          showToast("Lecture impossible", "error");
          setPlayingTrack(null);
          setAudioElement(null);
        });

        await audio.play();
        setPlayingTrack(trackId);
        setAudioElement(audio);
      } else {
        showToast("Aucun extrait disponible", "info");
      }
    } catch (error) {
      console.error('Erreur play:', error);
      showToast("Erreur lors de la lecture", "error");
      setPlayingTrack(null);
      setAudioElement(null);
    }
  };

  const handleLike = async (item: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) return showToast("Connectez-vous pour utiliser cette fonction !", "error");

    try {
      const { error: sbError } = await supabase.from('likes').insert({
        user_id: currentUser.id,
        review_id: null,
        track_id: String(item.targetId || item.id),
        track_name: item.name,
        artist_name: item.artist,
        album_id: String(item.targetId || item.id),
        album_name: item.name,
        album_image: item.image
      });

      if (sbError) {
        console.error("Supabase Like Error:", sbError);
      }
    } catch (e) {
      console.error(e);
    }

    if (spotifyConnected) {
      try {
        const res = await fetch('/api/spotify/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            action: 'like',
            query: `${item.name} ${item.artist}`
          })
        });

        if (res.ok) {
          showToast(`"${item.name}" liké sur Spotify & MusicBoxd !`, "success");
        } else {
          showToast("Liké sur MusicBoxd, mais erreur Spotify.", "info");
        }
      } catch (error) {
        console.error(error);
        showToast("Liké sur MusicBoxd (Erreur connexion Spotify).", "info");
      }
    } else {
      showToast("Liké sur MusicBoxd !", "success");
    }
  };

  const fetchPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const res = await fetch('/api/spotify/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          action: 'getPlaylists'
        })
      });
      const data = await res.json();
      if (data.success) {
        setPlaylists(data.playlists);
      } else {
        showToast("Impossible de charger les playlists", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erreur lors du chargement des playlists", "error");
    }
    setLoadingPlaylists(false);
  };

  const openPlaylistModal = async (item: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) return showToast("Connectez-vous pour utiliser cette fonction !", "error");
    if (!spotifyConnected) {
      if (confirm("Liez votre compte Spotify pour gérer vos playlists. Aller aux réglages ?")) {
        router.push('/settings/connections');
      }
      return;
    }

    setSelectedTrackForPlaylist(item);
    setShowPlaylistModal(true);
    if (playlists.length === 0) {
      await fetchPlaylists();
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!selectedTrackForPlaylist) return;

    try {
      const res = await fetch('/api/spotify/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          action: 'addToPlaylist',
          playlistId,
          query: `${selectedTrackForPlaylist.name} ${selectedTrackForPlaylist.artist}`
        })
      });

      if (res.ok) {
        showToast("Ajouté à la playlist !", "success");
        setShowPlaylistModal(false);
      } else {
        showToast("Erreur lors de l'ajout", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Erreur de connexion", "error");
    }
  };

  const openRatingModal = (item: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setRatingTarget(item);
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
      if (confirm("Connectez-vous pour noter !")) window.location.href = '/login';
      return;
    }

    const pseudo = user.email?.split('@')[0] || 'Utilisateur';

    const newReview = {
      album_id: String(ratingTarget.targetId || ratingTarget.id),
      album_name: ratingTarget.name,
      artist_name: ratingTarget.artist,
      album_image: ratingTarget.image,
      rating: userRating,
      review_text: reviewText,
      user_name: pseudo,
      user_id: user.id,
      track_id: ratingTarget.type === 'song' ? String(ratingTarget.targetId || ratingTarget.id) : null,
      track_name: ratingTarget.type === 'song' ? ratingTarget.name : null
    };

    const { error } = await supabase.from('reviews').insert(newReview);

    setIsSaving(false);
    if (error) {
      alert("Erreur : " + error.message);
    } else {
      setIsModalOpen(false);
      showToast("Avis publié avec succès !", "success");
    }
  };

  const handleShareToFeed = async () => {
    if (!currentUser) {
      showToast("Connectez-vous pour partager !", "error");
      return;
    }

    if (currentUser.id !== list.user_id) {
      showToast("Seul le propriétaire peut partager cette liste !", "error");
      return;
    }

    setIsSharing(true);

    try {
      // Vérifier si déjà partagée
      const { data: existingPost } = await supabase
        .from('list_posts')
        .select('id')
        .eq('list_id', listId)
        .maybeSingle();

      if (existingPost) {
        showToast("Cette liste est déjà partagée sur la communauté !", "error");
        setIsSharing(false);
        return;
      }

      // Créer le post
      const { error } = await supabase
        .from('list_posts')
        .insert({
          user_id: currentUser.id,
          list_id: listId,
          caption: shareCaption.trim() || null
        });

      if (error) throw error;

      showToast("Liste partagée sur la communauté ! 🎉", "success");
      setShowShareModal(false);
      setShareCaption("");
      setIsAlreadyShared(true);

      // Rediriger vers la communauté
      setTimeout(() => {
        router.push('/community?tab=feed');
      }, 1500);

    } catch (error) {
      console.error('Erreur partage:', error);
      showToast("Erreur lors du partage", "error");
    } finally {
      setIsSharing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#050505] text-white p-10 flex items-center justify-center">Chargement...</div>;
  if (!list) return <div className="min-h-screen bg-[#050505] text-white p-10 flex items-center justify-center">Liste introuvable.</div>;

  const mosaicAlbums = list.albums?.slice(0, 12) || [];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black pb-20 overflow-x-hidden">

      <Toast
        message={toast.msg}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      {/* GLOWS */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* NAVBAR */}
      <div className="hidden md:flex fixed top-4 left-0 right-0 justify-center z-50 px-2 md:px-4">
        <nav className="flex items-center justify-between px-4 md:px-8 py-2 md:py-3 w-full max-w-5xl rounded-full transition-all duration-300 bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 border border-white/10 border-t-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
          <Link href="/" className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>
          <div className="flex items-center gap-2 md:gap-8 text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/70">
            <Link href="/search" className="hover:text-white transition flex items-center gap-1 md:gap-2">
              <span className="text-sm md:text-base opacity-70">←</span> <span className="hidden sm:inline">Albums</span>
            </Link>
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

      {/* HEADER */}
      <header className="relative w-full pt-28 md:pt-40 pb-8 md:pb-20 overflow-hidden border-b border-white/5 bg-white/10 backdrop-blur-xl">
        <div className="absolute inset-0 grid grid-cols-4 md:grid-cols-4 opacity-80 blur-sm pointer-events-none scale-100">
          {mosaicAlbums.map((item: any, i: number) => (
            <img key={i} src={item.image} className="w-full h-full object-cover mix-blend-screen" />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/95 via-[#050505]/80 to-[#050505]/50"></div>

        <div className="relative z-10 max-w-4xl mx-auto px-2 md:px-6 flex flex-col items-center text-center">
          <div className="mb-4 md:mb-6">
            <span className="bg-[#00e054] text-black text-[9px] md:text-[10px] font-black px-2.5 md:px-3 py-1 rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(0,224,84,0.4)]">Liste Curatée</span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-white mb-4 md:mb-6 leading-tight tracking-tight drop-shadow-2xl break-words max-w-full">{list.title}</h1>
          <p className="text-base md:text-xl text-gray-300 max-w-xl font-light leading-relaxed mb-4 md:mb-8 break-words">{list.description}</p>

          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-gray-500 font-medium border border-white/10 bg-black/30 px-4 md:px-6 py-2 rounded backdrop-blur-sm mb-5 md:mb-10">
            <span>Par <strong className="text-white">{owner.username}</strong></span>
            <span className="hidden sm:inline w-1 h-1 bg-gray-600 rounded-full"></span>
            <span>{list.albums?.length || 0} titres</span>
            <span className="hidden sm:inline w-1 h-1 bg-gray-600 rounded-full"></span>
            <span>{new Date(list.created_at).toLocaleDateString()}</span>
          </div>

          <div className="flex flex-wrap gap-2 md:gap-4 justify-center mt-2 md:mt-10 w-full">
            {currentUser && currentUser.id === list.user_id && (
              <button
                onClick={() => setShowShareModal(true)}
                className={`px-4 md:px-6 py-2 md:py-3 rounded-xl border transition text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 ${isAlreadyShared
                  ? 'bg-[#00e054]/20 text-[#00e054] border-[#00e054]/30 cursor-default'
                  : 'bg-[#00e054]/10 hover:bg-[#00e054]/20 text-[#00e054] border-[#00e054]/20'
                  }`}
                disabled={isAlreadyShared}
              >
                {isAlreadyShared ? (
                  <><Check className="w-3 h-3 md:w-4 md:h-4" /> Partagée</>
                ) : (
                  <>Partager sur la Communauté 🌟</>
                )}
              </button>
            )}
            <button onClick={handleShare} className="px-4 md:px-6 py-2 md:py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105">Copier le Lien 🔗</button>
            <button onClick={handleExportCSV} className="px-4 md:px-6 py-2 md:py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105">Exporter CSV 📄</button>
            {currentUser && currentUser.id === list.user_id && (
              <>
                <button onClick={handleEdit} className="px-4 md:px-6 py-2 md:py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105">Modifier ✎</button>
                <button onClick={handleDelete} className="px-4 md:px-6 py-2 md:py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105">Supprimer 🗑️</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* CONTENU */}
      <main className="max-w-4xl mx-auto px-2 md:px-6 py-8 md:py-16 relative z-10">
        <h2 className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 md:mb-8 border-b border-white/10 pb-3 md:pb-4">
          Titres de la liste
        </h2>

        <div className="space-y-2">
          {list.albums?.map((item: any, index: number) => {
            const trackId = item.targetId || item.id;
            const isPlaying = playingTrack === trackId;
            const albumUrl = `/album-view?id=${trackId}`;

            return (
              <div key={index} className={`flex items-center gap-1.5 md:gap-3 p-1.5 md:p-4 rounded-lg md:rounded-2xl transition group border ${isPlaying
                ? 'bg-[#00e054]/10 border-[#00e054]/30'
                : 'hover:bg-white/5 border-transparent hover:border-white/5'
                }`}>
                {/* Index */}
                <span className={`w-5 md:w-8 font-mono text-[10px] md:text-sm font-bold flex-shrink-0 ${isPlaying
                  ? 'text-[#00e054]'
                  : 'text-gray-600 group-hover:text-[#00e054]'
                  }`}>{index + 1}</span>

                {/* Image (Lien vers album-view) */}
                <Link href={albumUrl} className="w-11 h-11 md:w-14 md:h-14 flex-shrink-0 shadow-2xl group-hover:scale-105 transition transform duration-500 relative cursor-pointer block">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-md md:rounded-lg" />
                  {item.type === 'song' && (
                    <div className="absolute -bottom-0.5 -right-0.5 md:-bottom-1 md:-right-1 bg-black border border-white/10 text-[#00e054] text-[7px] md:text-[8px] px-1 md:px-1.5 py-0.5 rounded-full font-bold shadow-lg">SONG</div>
                  )}
                </Link>

                {/* Infos (Lien sur Titre vers album-view) */}
                <div className="flex-1 min-w-0 px-1.5 md:px-3 max-w-[calc(100%-150px)] md:max-w-none">
                  <Link href={albumUrl} className="block">

                    <h3 className={`font-bold truncate text-xs md:text-lg cursor-pointer hover:underline underline-offset-2 ${isPlaying
                      ? 'text-[#00e054]'
                      : 'text-gray-300 hover:text-[#00e054]'
                      }`}>
                      {item.name}
                      {isPlaying && (
                        <span className="ml-1 md:ml-2 text-[10px] md:text-xs opacity-70">🎵</span>
                      )}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-1.5 md:gap-3 text-gray-400 mt-0.5 md:mt-1 text-[10px] md:text-sm font-medium">
                    <span className="text-gray-300 truncate max-w-[120px] md:max-w-none">{item.artist}</span>
                    {item.year && <><span className="hidden md:inline w-1 h-1 bg-gray-600 rounded-full"></span><span className="hidden md:inline text-gray-500 font-mono">{item.year}</span></>}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 md:gap-2 flex-shrink-0">
                  {/* ACTIONS - Always visible */}
                  <div className="flex gap-1 md:gap-2 mr-1 md:mr-2 border-r border-white/10 pr-1 md:pr-4">
                    <motion.button
                      onClick={(e) => handleLike(item, e)}
                      className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/5 text-gray-400 hover:text-[#00e054] hover:bg-white/10 flex items-center justify-center flex-shrink-0 transition-all"
                      title="Liker (MusicBoxd + Spotify)"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Heart className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </motion.button>
                    <motion.button
                      onClick={(e) => openPlaylistModal(item, e)}
                      className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center flex-shrink-0 transition-all"
                      title="Ajouter à une playlist"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ListPlus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </motion.button>
                  </div>

                  {/* BOUTON PLAY/PAUSE - Always visible on mobile, hover on desktop */}
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayTrack(item);
                    }}
                    className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all md:opacity-0 md:group-hover:opacity-100 ${isPlaying
                      ? 'bg-[#00e054] text-black shadow-[0_0_20px_rgba(0,224,84,0.4)] opacity-100'
                      : 'bg-white/10 text-white hover:bg-[#00e054] hover:text-black hover:shadow-[0_0_15px_rgba(0,224,84,0.3)] opacity-100 md:opacity-0'
                      }`}
                    title={isPlaying ? "Arrêter" : "Écouter un extrait"}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isPlaying ? (
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


                  {/* BOUTON NOTER - Always visible */}
                  <motion.button
                    onClick={(e) => openRatingModal(item, e)}
                    className="flex w-7 h-7 md:w-9 md:h-9 rounded-full bg-white/10 text-amber-400 hover:bg-amber-500 hover:text-black items-center justify-center flex-shrink-0 transition-all hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    title="Noter ce titre"
                    whileHover={{ scale: 1.1, rotate: 15 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </motion.button>
                </div>
              </div>
            );
          })}

          {(!list.albums || list.albums.length === 0) && (
            <div className="text-center py-16 md:py-20 border border-dashed border-white/10 rounded-3xl bg-white/10 backdrop-blur-lg">
              <p className="text-gray-500 text-base md:text-lg">Cette liste est vide.</p>
            </div>
          )}
        </div>
      </main>

      {/* MODALE DE NOTATION */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
            />

            <motion.div
              className="relative bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] p-6 md:p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00e054]/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex justify-between items-center mb-4 relative z-10">
                <motion.h2
                  className="text-xl md:text-2xl font-black text-white"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  Noter
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

              {ratingTarget && (
                <motion.p
                  className="text-[#00e054] text-sm font-bold mb-6 uppercase tracking-wide border-l-2 border-[#00e054] pl-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {ratingTarget.name}
                </motion.p>
              )}

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
                    className={`text-4xl md:text-5xl focus:outline-none ${star <= userRating
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

              <motion.textarea
                className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white focus:border-[#00e054]/40 focus:bg-black/40 focus:outline-none mb-6 h-28 resize-none text-sm placeholder-gray-600 transition-all duration-300"
                placeholder="Votre avis (optionnel)..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              />

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
                  className={`flex-1 py-3 font-black rounded-xl uppercase tracking-widest text-sm transition-all ${userRating > 0
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

      {/* MODALE PLAYLIST */}
      <AnimatePresence>
        {showPlaylistModal && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowPlaylistModal(false)} />
            <motion.div
              className="relative bg-[#121212] border border-white/10 rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-bold text-white">Ajouter à une playlist</h3>
                <button onClick={() => setShowPlaylistModal(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {loadingPlaylists ? (
                  <div className="text-center py-8 text-gray-500">Chargement...</div>
                ) : (
                  <div className="space-y-1">
                    {playlists.map(playlist => (
                      <button
                        key={playlist.id}
                        onClick={() => handleAddToPlaylist(playlist.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition text-left group"
                      >
                        {playlist.images?.[0]?.url ? (
                          <img src={playlist.images[0].url} className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center text-xs">♫</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-white truncate group-hover:text-[#00e054]">{playlist.name}</div>
                          <div className="text-xs text-gray-500">{playlist.tracks?.total || 0} titres</div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 text-[#00e054]">
                          <Check className="w-5 h-5" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE PARTAGE SUR LA COMMUNAUTÉ */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
              onClick={() => setShowShareModal(false)}
            />
            <motion.div
              className="relative bg-[#121212] border border-white/10 rounded-3xl w-full max-w-md p-6 md:p-8"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-white">Partager sur la Communauté</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              <p className="text-gray-400 text-sm mb-6">
                Partagez cette liste avec la communauté MusicBoxd. Vos amis pourront la découvrir dans leur feed !
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase ml-3 block mb-2">Légende (optionnel)</label>
                  <textarea
                    className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-white focus:border-[#00e054] outline-none transition resize-none h-24 text-sm placeholder-gray-600"
                    placeholder="Ajoutez un commentaire sur cette liste..."
                    value={shareCaption}
                    onChange={(e) => setShareCaption(e.target.value)}
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-600 mt-1 ml-3">
                    {shareCaption.length}/500 caractères
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl transition font-bold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleShareToFeed}
                  disabled={isSharing}
                  className="flex-1 bg-[#00e054] hover:bg-[#00c04b] text-black py-3 rounded-xl transition font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/20"
                >
                  {isSharing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Partage...
                    </span>
                  ) : (
                    'Partager 🌟'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
