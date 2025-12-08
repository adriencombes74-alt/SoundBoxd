'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { matchTracksToItunes, type TrackInput, type MatchedTrack } from '@/lib/itunesMatcher';

export default function ImportPlaylistPage() {
  const router = useRouter();

  // États principaux
  const [playlistText, setPlaylistText] = useState('');
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [matchedTracks, setMatchedTracks] = useState<MatchedTrack[]>([]);

  // États utilisateur
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
  } | null>(null);

  // Vérifier l'utilisateur au chargement
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);
    };
    checkUser();
  }, [router]);

  // Analyser le texte collé
  const analyzePlaylist = async () => {
    if (!playlistText.trim()) {
      alert('Veuillez coller du texte de playlist !');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setMatchedTracks([]);

    try {
      // Parser le texte (format "Artiste - Titre" par ligne)
      const lines = playlistText.split('\n').filter(line => line.trim());
      const tracksToMatch: TrackInput[] = [];

      lines.forEach((line) => {
        // Essayer différents formats courants
        let artist = '';
        let title = '';

        // Format "Artiste - Titre"
        if (line.includes(' - ')) {
          const parts = line.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }
        // Format "Titre - Artiste" (moins commun mais possible)
        else if (line.includes(' – ')) {
          const parts = line.split(' – ');
          title = parts[0].trim();
          artist = parts.slice(1).join(' – ').trim();
        }
        // Si pas de séparateur, considérer comme titre seulement
        else {
          title = line.trim();
          artist = 'Artiste inconnu';
        }

        if (title) {
          tracksToMatch.push({ artist, title });
        }
      });

      if (tracksToMatch.length === 0) {
        alert('Aucune piste valide trouvée dans le texte !');
        setIsAnalyzing(false);
        return;
      }

      console.log(`🎵 Analyse de ${tracksToMatch.length} pistes...`);

      // Utiliser matchTracksToItunes avec progression
      const results = await matchTracksToItunes(tracksToMatch, 800);

      // Simuler une progression pour l'UX
      for (let i = 0; i <= results.length; i++) {
        setTimeout(() => {
          setAnalysisProgress((i / results.length) * 100);
          if (i === results.length) {
            setMatchedTracks(results);
            setIsAnalyzing(false);
          }
        }, i * 50);
      }

    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
      alert('Erreur lors de l\'analyse de la playlist.');
      setIsAnalyzing(false);
    }
  };

  // Sauvegarder la liste
  const savePlaylist = async () => {
    if (!playlistTitle.trim()) {
      alert('Veuillez donner un titre à votre liste !');
      return;
    }

    if (matchedTracks.length === 0) {
      alert('Aucune piste à sauvegarder !');
      return;
    }

    setIsSaving(true);

    if (!currentUser) {
      alert('Utilisateur non connecté !');
      setIsSaving(false);
      return;
    }

    try {
      // Préparer les données pour Supabase (seulement les tracks matchés)
      const successTracks = matchedTracks
        .filter(track => track.matchFound)
        .map(track => ({
          id: track.id,
          targetId: track.id,
          name: track.name,
          artist: track.artist,
          image: track.image,
          type: 'song' as const,
          year: track.year
        }));

      if (successTracks.length === 0) {
        alert('Aucune piste valide à sauvegarder !');
        setIsSaving(false);
        return;
      }

      const { error } = await supabase.from('lists').insert({
        user_id: currentUser.id,
        title: playlistTitle.trim(),
        description: `Playlist importée automatiquement (${successTracks.length} pistes)`,
        albums: successTracks
      });

      if (error) throw error;

      alert(`Playlist "${playlistTitle}" créée avec succès ! (${successTracks.length} pistes)`);
      router.push('/profile');

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde de la playlist.');
    } finally {
      setIsSaving(false);
    }
  };

  // Statistiques
  const successCount = matchedTracks.filter(t => t.matchFound).length;
  const totalCount = matchedTracks.length;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black pb-20">

      {/* Background Glow */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* NAVBAR */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-4">
        <nav className="flex items-center justify-between px-8 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl w-full max-w-5xl">
            <Link href="/" className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>
            <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
                <Link href="/search" className="hover:text-[#00e054] transition">Albums</Link>
                <Link href="/discover" className="hover:text-[#00e054] transition">Découvrir</Link>
                <Link href="/lists/import" className="hover:text-[#00e054] transition flex items-center gap-2">📥 Importer</Link>
                <Link href="/community" className="hover:text-[#00e054] transition">Membres</Link>
                {currentUser ? (
                    <Link href="/profile" className="flex items-center gap-3 pl-4 border-l border-white/10 hover:opacity-80 transition group">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00e054] to-emerald-600 flex items-center justify-center text-black font-black text-xs">
                            {currentUser?.email?.[0]?.toUpperCase() || '?'}
                        </div>
                    </Link>
                ) : (
                    <Link href="/login" className="bg-white text-black px-4 py-2 rounded-full hover:bg-[#00e054] transition">Connexion</Link>
                )}
            </div>
        </nav>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-32 pb-16">

        {/* HEADER */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600 drop-shadow-2xl">
            IMPORTER UNE <br/><span className="text-[#00e054]">PLAYLIST</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Collez votre playlist au format texte et laissez MusicBoxd trouver automatiquement les correspondances sur iTunes.
          </p>
        </div>

        {/* ÉTAPE 1: COLLAGE DU TEXTE */}
        <div className="bg-[#121212] p-8 rounded-3xl border border-white/5 mb-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-[#00e054] text-black rounded-full flex items-center justify-center font-black text-sm">1</span>
            Coller votre playlist
          </h2>

          <textarea
            value={playlistText}
            onChange={(e) => setPlaylistText(e.target.value)}
            placeholder={`Exemple de format supporté:

The Beatles - Hey Jude
Queen - Bohemian Rhapsody
Pink Floyd - Comfortably Numb
David Bowie - Heroes

Un titre par ligne, format "Artiste - Titre"`}
            className="w-full h-64 bg-black border border-white/10 rounded-2xl p-6 text-white placeholder-gray-500 focus:border-[#00e054] focus:outline-none resize-none font-mono text-sm"
            disabled={isAnalyzing}
          />

          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-400">
              Format supporté: <code className="bg-gray-800 px-2 py-1 rounded">Artiste - Titre</code>
            </div>
            <button
              onClick={analyzePlaylist}
              disabled={isAnalyzing || !playlistText.trim()}
              className="px-8 py-3 bg-[#00e054] hover:bg-[#00c04b] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black rounded-xl transition uppercase tracking-widest"
            >
              {isAnalyzing ? 'Analyse en cours...' : 'Analyser'}
            </button>
          </div>

          {/* BARRE DE PROGRESSION */}
          {isAnalyzing && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Analyse des pistes...</span>
                <span>{Math.round(analysisProgress)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-[#00e054] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ÉTAPE 2: RÉSULTATS DE L'ANALYSE */}
        {matchedTracks.length > 0 && (
          <div className="bg-[#121212] p-8 rounded-3xl border border-white/5 mb-8">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-[#00e054] text-black rounded-full flex items-center justify-center font-black text-sm">2</span>
              Résultats ({successCount}/{totalCount} trouvés - {successRate}%)
            </h2>

            {/* STATS */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-900/20 border border-green-900/30 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-green-400">{successCount}</div>
                <div className="text-xs text-green-300 uppercase tracking-widest">Trouvés</div>
              </div>
              <div className="bg-red-900/20 border border-red-900/30 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-red-400">{totalCount - successCount}</div>
                <div className="text-xs text-red-300 uppercase tracking-widest">Non trouvés</div>
              </div>
              <div className="bg-blue-900/20 border border-blue-900/30 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-blue-400">{successRate}%</div>
                <div className="text-xs text-blue-300 uppercase tracking-widest">Taux de succès</div>
              </div>
            </div>

            {/* LISTE DES RÉSULTATS */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {matchedTracks.map((track, index) => (
                <div
                  key={track.id || index}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition ${
                    track.matchFound
                      ? 'bg-green-900/10 border-green-900/20'
                      : 'bg-red-900/10 border-red-900/20'
                  }`}
                >
                  {track.matchFound ? (
                    <>
                      <img
                        src={track.image}
                        alt={track.name}
                        className="w-12 h-12 rounded-lg object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-album.png';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white truncate">{track.name}</div>
                        <div className="text-sm text-gray-400 truncate">{track.artist}</div>
                        {track.year && <div className="text-xs text-gray-500">{track.year}</div>}
                      </div>
                      <div className="text-green-400 font-bold">✅ Trouvé</div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center">
                        <span className="text-gray-500 text-xl">?</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-300 truncate">{track.originalTitle}</div>
                        <div className="text-sm text-gray-500 truncate">{track.originalArtist}</div>
                      </div>
                      <div className="text-red-400 font-bold">❌ Non trouvé</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÉTAPE 3: SAUVEGARDE */}
        {matchedTracks.some(t => t.matchFound) && (
          <div className="bg-[#121212] p-8 rounded-3xl border border-white/5">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-[#00e054] text-black rounded-full flex items-center justify-center font-black text-sm">3</span>
              Sauvegarder la liste
            </h2>

            <div className="max-w-md mx-auto">
              <input
                type="text"
                value={playlistTitle}
                onChange={(e) => setPlaylistTitle(e.target.value)}
                placeholder="Nom de votre playlist"
                className="w-full bg-black border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:border-[#00e054] focus:outline-none mb-6"
                disabled={isSaving}
              />

              <button
                onClick={savePlaylist}
                disabled={isSaving || !playlistTitle.trim()}
                className="w-full py-4 bg-[#00e054] hover:bg-[#00c04b] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black rounded-xl transition uppercase tracking-widest flex items-center justify-center gap-3"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    💾 Sauvegarder ({successCount} pistes)
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
