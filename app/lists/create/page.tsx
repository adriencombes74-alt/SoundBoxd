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
  
  // États Import Spotify
  const [spotifyUrl, setSpotifyUrl] = useState("");
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

  // --- IMPORT SPOTIFY ---
  const handleSpotifyImport = async () => {
    if (!spotifyUrl.trim()) {
      return alert("Veuillez entrer un lien Spotify.");
    }

    if (!spotifyUrl.includes('open.spotify.com/playlist')) {
      return alert("Lien invalide. Utilisez un lien de playlist Spotify publique.");
    }

    setIsImporting(true);
    try {
      const res = await fetch('/api/spotify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: spotifyUrl.trim() }),
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
              ) // Type guard pour affiner le type
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
          alert(`${newItems.length} titre(s) importé(s) avec succès ! (${data.imported}/${data.totalSpotify})`);
          setSpotifyUrl("");
        }
      } else {
        alert("Réponse inattendue du serveur.");
      }
    } catch (error) {
      console.error('Erreur lors de l\'import Spotify:', error);
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
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=${searchType}&limit=5`);
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
    <div className="min-h-screen bg-[#050505] text-white font-sans p-2 md:p-6 selection:bg-[#00e054] selection:text-black">

      {/* Background Glow */}
      <div className="fixed top-[-20%] right-[-10%] w-[60%] md:w-[50%] h-[50%] bg-green-900/20 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* NAVBAR */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-2 md:px-4">
        <nav className="flex items-center justify-between px-4 md:px-8 py-2 md:py-3 bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 border border-white/10 border-t-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),inset_0_1px_0_0_rgba(255,255,255,0.15)] rounded-full w-full max-w-5xl transition-all duration-300">
            <Link href="/" className="text-lg md:text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>
            <div className="flex items-center gap-2 md:gap-8 text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/70">
                <Link href="/search" className="hover:text-white transition hidden sm:inline">Albums</Link>
                <Link href="/discover" className="hover:text-white transition flex items-center gap-1 md:gap-2">
                    <span className="text-sm md:text-base opacity-70">⚡</span> <span className="hidden sm:inline">Découvrir</span>
                </Link>
                <Link href="/lists/import" className="hover:text-white transition flex items-center gap-1 md:gap-2">
                    <span className="text-sm md:text-base opacity-70">📥</span> <span className="hidden sm:inline">Importer</span>
                </Link>
                <Link href="/community" className="hover:text-white transition hidden md:inline">Membres</Link>
                {currentUser ? (
                    <ProfileMenu user={currentUser} />
                ) : (
                    <Link href="/login" className="bg-white text-black px-3 md:px-4 py-1.5 md:py-2 rounded-full hover:bg-[#00e054] transition text-[10px] md:text-sm">Connexion</Link>
                )}
            </div>
        </nav>
      </div>

      <div className="max-w-2xl mx-auto mt-8 md:mt-10 pt-16 md:pt-0 relative z-10 space-y-4 md:space-y-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 md:mb-8 gap-2">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-center sm:text-left">Nouvelle Liste</h1>
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm md:text-base transition-colors">Annuler</button>
        </div>
        {/* --- Import Spotify --- */}
        <div className="bg-white/10 backdrop-blur-xl p-4 md:p-6 rounded-2xl border border-white/15 shadow-lg mb-4 md:mb-8">
          <h2 className="text-xs md:text-sm font-bold text-[#1DB954] uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="text-lg">🟢</span> Importer depuis Spotify
          </h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text"
              placeholder="Collez le lien de la playlist ici..."
              className="flex-1 bg-white/10 backdrop-blur-lg border border-white/15 rounded-xl p-3 text-white focus:border-[#1DB954] outline-none text-sm transition"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
            />
            <button 
              onClick={handleSpotifyImport}
              disabled={isImporting}
              className="bg-[#1DB954] text-black font-bold px-4 py-2 rounded-xl md:px-6 hover:bg-[#1ed760] transition disabled:opacity-50 text-sm shadow-xl shadow-[#1DB954]/20 whitespace-nowrap"
            >
              {isImporting ? 'Import...' : 'Importer'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Collez un lien public. Nous trouverons les correspondances sur MusicBoxd.</p>
        </div>
        {/* --- Formulaire classique --- */}
        <div className="bg-white/10 backdrop-blur-xl p-4 md:p-6 rounded-2xl border border-white/15 shadow-lg mb-4 md:mb-8 space-y-4">
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Détails</label>
          <input type="text" className="w-full bg-white/10 backdrop-blur-lg border border-white/15 rounded-xl p-4 text-white focus:border-[#00e054] outline-none text-lg font-bold mb-2" placeholder="Titre de la liste..." value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="w-full bg-white/10 backdrop-blur-lg border border-white/15 rounded-xl p-4 text-white focus:border-[#00e054] outline-none h-24 text-sm" placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {/* --- Ajout Manuel --- */}
        <div className="bg-white/10 backdrop-blur-xl p-4 md:p-6 rounded-2xl border border-white/15 shadow-lg mb-4 md:mb-8">
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Ajout Manuel</label>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setSearchType('album')} className={`px-3 py-2 rounded-full text-xs font-bold uppercase transition-all duration-300 ${searchType === 'album' ? 'bg-[#00e054] text-black shadow-lg shadow-[#00e054]/20' : 'bg-white/10 backdrop-blur-lg text-gray-400 hover:bg-white/20 hover:text-white'}`}>Albums</button>
            <button onClick={() => setSearchType('song')} className={`px-3 py-2 rounded-full text-xs font-bold uppercase transition-all duration-300 ${searchType === 'song' ? 'bg-[#00e054] text-black shadow-lg shadow-[#00e054]/20' : 'bg-white/10 backdrop-blur-lg text-gray-400 hover:bg-white/20 hover:text-white'}`}>Titres</button>
          </div>
          <form onSubmit={searchItems} className="flex gap-2 relative">
            <input type="text" className="w-full bg-white/10 backdrop-blur-lg border border-white/15 rounded-xl p-4 text-white focus:border-[#00e054] outline-none" placeholder={`Chercher un ${searchType === 'album' ? 'album' : 'titre'}...`} value={query} onChange={(e) => setQuery(e.target.value)} />
            <button type="submit" disabled={isSearching} className="bg-white/10 backdrop-blur-lg px-4 md:px-6 rounded-xl font-bold text-gray-300 hover:bg-white/20 hover:text-white transition-all duration-300 shadow-md">{isSearching ? '...' : '🔍'}</button>
            {/* Dropdown résultats */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white/20 backdrop-blur-xl border border-white/15 mt-2 rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto">
                {searchResults.map((item) => (
                  <div key={item.collectionId || item.trackId} onClick={() => addItem(item)} className="flex items-center gap-3 p-3 hover:bg-[#00e054] hover:text-black cursor-pointer transition border-b border-white/5 last:border-0">
                    <img src={item.artworkUrl100} className="w-10 h-10 rounded bg-black" alt="cover"/>
                    <div>
                      <div className="font-bold text-sm">{item.trackName || item.collectionName}</div>
                      <div className="text-xs opacity-70">{item.artistName}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>
        {/* --- Liste Items, horizontale sur mobile si > 4 --- */}
        <div className={`overflow-x-auto ${selectedItems.length > 4 ? 'pb-4' : ''}` + " " + "space-y-2 mb-24"}>
          <div className={`flex flex-col gap-2 min-w-[290px]" + (selectedItems.length > 4 ? ' sm:flex-row sm:gap-3' : '')}`}>
            {selectedItems.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-800 rounded-xl text-gray-600 bg-white/5 backdrop-blur-xl">Liste vide. Importez ou ajoutez des titres.</div>
            ) : (
              selectedItems.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between bg-white/10 backdrop-blur-lg p-3 rounded-xl border border-white/15 group hover:border-[#00e054]/30 transition shadow-md min-w-[270px]">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600 font-mono w-6 text-center text-sm">{index + 1}</div>
                    <img src={item.image} className="w-12 h-12 rounded-lg bg-black" alt="cover"/>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2 text-sm">
                        {item.name}
                        {item.type === 'song' && <span className="text-[9px] bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-bold">SONG</span>}
                      </div>
                      <div className="text-xs text-gray-400">{item.artist}</div>
                    </div>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-gray-500 hover:text-red-500 p-2 transition">✕</button>
                </div>
              ))
            )}
          </div>
        </div>
        {/* --- Bouton Publier Sticky --- */}
        <div className="fixed bottom-2 left-0 right-0 flex justify-center pointer-events-none z-30 md:static md:pt-0">
          <button onClick={saveList} disabled={isSaving || selectedItems.length === 0} className="pointer-events-auto bg-[#00e054] text-black font-bold px-6 md:px-12 py-3 md:py-4 rounded-full hover:bg-[#00c04b] disabled:opacity-50 transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(0,224,84,0.3)] hover:shadow-[0_0_40px_rgba(0,224,84,0.4)]">
            {isSaving ? 'Création...' : `Publier la liste (${selectedItems.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}