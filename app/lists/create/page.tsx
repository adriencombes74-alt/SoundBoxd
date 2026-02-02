'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import ProfileMenu from '@/components/ui/profile-menu';

export default function CreateListPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  // Type pour les items importés de Spotify
  type ImportedItem = {
    id: number;
    targetId?: number;
    name: string;
    artist: string;
    image: string;
    type?: string;
    year?: number;
  };

  // États Import Spotify/Deezer
  const [importUrl, setImportUrl] = useState("");
  const [importPlatform, setImportPlatform] = useState<'spotify' | 'deezer'>('spotify');
  const [isImporting, setIsImporting] = useState(false);

  // États Recherche Manuelle
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<'album' | 'song'>('album');
  const [searchResults, setSearchResults] = useState<Array<{
    trackId?: number;
    collectionId?: number;
    trackName?: string;
    collectionName?: string;
    artistName: string;
    artworkUrl100: string;
    releaseDate: string;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // États utilisateur
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/login');
      else setCurrentUser(user);
    };
    checkUser();
  }, [router]);

  // --- IMPORT SPOTIFY/DEEZER ---
  const handleImport = async () => {
    if (!importUrl.trim()) {
      return alert("Veuillez entrer un lien de playlist.");
    }

    // Déterminer la plateforme automatiquement si possible
    let platform = importPlatform;
    if (importUrl.includes('spotify.com')) {
      platform = 'spotify';
    } else if (importUrl.includes('deezer.com')) {
      platform = 'deezer';
    }

    // Vérifier le format de l'URL
    if (platform === 'spotify' && !importUrl.includes('open.spotify.com/playlist')) {
      return alert("Lien Spotify invalide. Utilisez un lien de playlist Spotify publique.");
    }
    if (platform === 'deezer' && !importUrl.includes('deezer.com') && !importUrl.includes('link.deezer.com')) {
      return alert("Lien Deezer invalide. Utilisez un lien de playlist Deezer (mobile ou desktop).");
    }

    setIsImporting(true);
    try {
      const endpoint = platform === 'spotify' ? '/api/spotify' : '/api/deezer';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: importUrl.trim() }),
      });

      if (!res.ok) {
        throw new Error(`Erreur HTTP: ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        alert(`Erreur: ${data.error}`);
      } else if (data.tracks && Array.isArray(data.tracks)) {
        // On filtre les doublons basés sur l'ID
        const newItems = data.tracks.filter((newTrack: { id: number }) =>
          !selectedItems.some(existing => existing.id === newTrack.id)
        );

        if (newItems.length === 0) {
          alert("Aucun nouveau titre à importer (déjà présents dans la liste).");
        } else {
          const formattedItems = newItems
            .filter((item: ImportedItem): item is ImportedItem & { name: string; artist: string } =>
              Boolean(item.name && item.artist)
            )
            .map((item: ImportedItem & { name: string; artist: string }) => ({
              id: item.id,
              targetId: item.targetId || item.id,
              name: item.name,
              artist: item.artist,
              image: item.image,
              type: (item.type as 'album' | 'song') || 'song',
              year: item.year
            }));
          setSelectedItems(prev => [...prev, ...formattedItems]);
          const platformName = platform === 'spotify' ? 'Spotify' : 'Deezer';
          const totalKey = platform === 'spotify' ? 'totalSpotify' : 'totalDeezer';
          alert(`${newItems.length} titre(s) importé(s) avec succès depuis ${platformName} ! (${data.imported}/${data[totalKey]})`);
          setImportUrl("");
        }
      } else {
        alert("Réponse inattendue du serveur.");
      }
    } catch (error) {
      console.error(`Erreur lors de l'import ${platform}:`, error);
      alert(`Erreur lors de l'import: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsImporting(false);
    }
  };

  // --- RECHERCHE MANUELLE ---
  const searchItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=${searchType}&limit=50`);
      const data = await res.json();
      setSearchResults(data.results);
    } catch (err) { console.error(err); }
    setIsSearching(false);
  };

  const addItem = (item: {
    trackId?: number;
    collectionId?: number;
    trackName?: string;
    collectionName?: string;
    artistName: string;
    artworkUrl100: string;
    releaseDate: string;
  }) => {
    const itemId = item.trackId || item.collectionId;
    if (!itemId || selectedItems.find(existing => existing.id === itemId)) return;

    const cleanItem = {
      id: itemId,
      targetId: item.collectionId || item.trackId,
      name: item.trackName || item.collectionName,
      artist: item.artistName,
      image: item.artworkUrl100.replace('100x100', '1000x1000'),
      type: searchType,
      year: new Date(item.releaseDate).getFullYear()
    };

    setSelectedItems(prev => [...prev, cleanItem]);
    setQuery("");
    setSearchResults([]);
  };

  const removeItem = (id: number) => {
    setSelectedItems(selectedItems.filter(a => a.id !== id));
  };

  const saveList = async () => {
    if (!title.trim()) return alert("Donnez un titre !");
    if (selectedItems.length === 0) return alert("Ajoutez au moins un élément !");
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('lists').insert({
        user_id: user.id, title, description, albums: selectedItems
      });
      if (error) alert("Erreur."); else { router.push('/profile'); }
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black">

      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00e054]/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[150px]" />
      </div>

      {/* NAVBAR */}
      <div className="fixed top-4 left-0 right-0 justify-center z-50 px-4 hidden md:flex">
        <nav className="flex items-center justify-between px-8 py-3 bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 border border-white/10 border-t-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),inset_0_1px_0_0_rgba(255,255,255,0.15)] rounded-full w-full max-w-5xl transition-all duration-300">
          <Link href="/" className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>
          <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-white/70">
            <Link href="/search" className="hover:text-white transition hidden sm:inline">Albums</Link>
            <Link href="/discover" className="hover:text-white transition flex items-center gap-2">
              <span className="text-base opacity-70">⚡</span> <span className="hidden sm:inline">Découvrir</span>
            </Link>
            <Link href="/lists/import" className="hover:text-white transition flex items-center gap-2">
              <span className="text-base opacity-70">📥</span> <span className="hidden sm:inline">Importer</span>
            </Link>
            <Link href="/community" className="hover:text-white transition hidden md:inline">Membres</Link>
            {currentUser ? (
              <ProfileMenu user={currentUser} />
            ) : (
              <Link href="/login" className="bg-white text-black px-4 py-2 rounded-full hover:bg-[#00e054] transition text-sm">Connexion</Link>
            )}
          </div>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-8 md:pt-28 pb-32">

        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">Nouvelle Liste</h1>
            <p className="text-gray-500 text-sm">Créez votre collection musicale personnalisée</p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition-colors text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/5"
          >
            Annuler
          </button>
        </div>

        {/* Form Section */}
        <div className="space-y-8">

          {/* Details */}
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Nom de la liste"
                className="w-full bg-transparent border-b-2 border-white/10 focus:border-[#00e054] outline-none text-2xl font-bold py-3 transition-colors placeholder:text-white/20"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="relative">
              <textarea
                placeholder="Description (optionnelle)"
                className="w-full bg-white/5 border border-white/10 focus:border-white/20 rounded-2xl outline-none p-4 transition-colors resize-none placeholder:text-white/30"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Import Section */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 hover:border-white/15 transition-all duration-300">
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="text-lg">🎵</span> Importer une playlist
            </h2>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setImportPlatform('spotify')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${importPlatform === 'spotify'
                  ? 'bg-[#1DB954] text-black shadow-lg'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <span>🟢</span> Spotify
              </button>
              <button
                onClick={() => setImportPlatform('deezer')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${importPlatform === 'deezer'
                  ? 'bg-gradient-to-r from-[#a400a4] to-[#8d01f1] text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <span>🎧</span> Deezer
              </button>
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={`URL de la playlist ${importPlatform === 'spotify' ? 'Spotify' : 'Deezer'}...`}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#00e054] rounded-xl px-4 py-3 outline-none transition-colors placeholder:text-white/30"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
              </div>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 whitespace-nowrap ${importPlatform === 'spotify'
                  ? 'bg-[#1DB954] text-black hover:bg-[#1ed760]'
                  : 'bg-gradient-to-r from-[#a400a4] to-[#8d01f1] text-white hover:opacity-90'
                  }`}
              >
                {isImporting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Import...
                  </div>
                ) : 'Importer'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {importPlatform === 'spotify'
                ? 'Lien public Spotify. Les correspondances seront trouvées automatiquement.'
                : 'Lien mobile ou desktop. Les correspondances seront trouvées automatiquement.'}
            </p>
          </div>

          {/* Manual Search */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 hover:border-white/15 transition-all duration-300">
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Recherche manuelle</h2>

            {/* Type Selector */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSearchType('album')}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase transition-all duration-300 ${searchType === 'album'
                  ? 'bg-[#00e054] text-black'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
              >
                Albums
              </button>
              <button
                onClick={() => setSearchType('song')}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase transition-all duration-300 ${searchType === 'song'
                  ? 'bg-[#00e054] text-black'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
              >
                Titres
              </button>
            </div>

            {/* Search Form */}
            <form onSubmit={searchItems} className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Rechercher un ${searchType === 'album' ? 'album' : 'titre'}...`}
                  className="flex-1 bg-white/5 border border-white/10 focus:border-[#00e054] rounded-xl px-4 py-3 outline-none transition-colors placeholder:text-white/30"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all duration-300 font-semibold"
                >
                  {isSearching ? '...' : '🔍'}
                </button>
              </div>

              {/* Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-white/15 rounded-2xl overflow-hidden shadow-2xl z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                  {searchResults.map((item) => (
                    <div
                      key={item.collectionId || item.trackId}
                      onClick={() => addItem(item)}
                      className="flex items-center gap-3 p-3 hover:bg-[#00e054]/10 cursor-pointer transition-colors border-b border-white/5 last:border-0"
                    >
                      <img src={item.artworkUrl100} className="w-12 h-12 rounded-lg bg-black/50" alt="cover" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{item.trackName || item.collectionName}</div>
                        <div className="text-xs text-gray-400 truncate">{item.artistName}</div>
                      </div>
                      <div className="text-[#00e054]">+</div>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>

          {/* Items Grid */}
          <div>
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">
              {selectedItems.length > 0 ? `${selectedItems.length} élément${selectedItems.length > 1 ? 's' : ''}` : 'Aucun élément'}
            </h2>

            {selectedItems.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-3xl">
                <div className="text-4xl mb-3 opacity-30">🎵</div>
                <p className="text-gray-600">Importez ou recherchez pour ajouter des éléments</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="group bg-white/[0.02] border border-white/10 hover:border-white/20 rounded-2xl p-3 transition-all duration-300 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <img
                          src={item.image}
                          className="w-16 h-16 rounded-xl bg-black/50 object-cover"
                          alt="cover"
                        />
                        <div className="absolute -top-1 -left-1 w-5 h-5 bg-[#00e054] rounded-full flex items-center justify-center text-black text-[10px] font-bold">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="font-semibold text-sm mb-0.5 truncate flex items-center gap-2">
                          {item.name}
                          {item.type === 'song' && (
                            <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 font-bold">SONG</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{item.artist}</div>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all duration-300 p-1.5 hover:bg-red-500/10 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Floating Publish Button */}
      <div className="fixed bottom-20 md:bottom-8 left-0 right-0 flex justify-center items-center z-40 px-4">
        <button
          onClick={saveList}
          disabled={isSaving || selectedItems.length === 0}
          className="group relative bg-gradient-to-r from-[#00e054] to-[#00c04b] text-black font-bold px-12 py-4 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(0,224,84,0.4)] shadow-[0_0_30px_rgba(0,224,84,0.2)]"
        >
          <div className="flex items-center gap-3">
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Création en cours...</span>
              </>
            ) : (
              <>
                <span>Publier la liste</span>
                {selectedItems.length > 0 && (
                  <span className="bg-black/20 px-2.5 py-1 rounded-full text-sm font-black">
                    {selectedItems.length}
                  </span>
                )}
              </>
            )}
          </div>
        </button>
      </div>

    </div>
  );
}