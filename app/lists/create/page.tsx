'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

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

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/login');
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
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6 selection:bg-[#00e054] selection:text-black">
      
      {/* Background Glow */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      <div className="max-w-2xl mx-auto mt-10 relative z-10">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black tracking-tight">Nouvelle Liste</h1>
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">Annuler</button>
        </div>

        {/* --- ZONE IMPORT SPOTIFY (NOUVEAU) --- */}
        <div className="bg-[#121212] p-6 rounded-2xl border border-white/10 mb-8 shadow-lg">
            <h2 className="text-sm font-bold text-[#1DB954] uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="text-lg">🟢</span> Importer depuis Spotify
            </h2>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    placeholder="Collez le lien de la playlist ici..." 
                    className="flex-1 bg-black border border-white/10 rounded-xl p-3 text-white focus:border-[#1DB954] outline-none text-sm transition"
                    value={spotifyUrl}
                    onChange={(e) => setSpotifyUrl(e.target.value)}
                />
                <button 
                    onClick={handleSpotifyImport}
                    disabled={isImporting}
                    className="bg-[#1DB954] text-black font-bold px-6 rounded-xl hover:bg-[#1ed760] transition disabled:opacity-50 text-sm whitespace-nowrap"
                >
                    {isImporting ? 'Import...' : 'Importer'}
                </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Collez un lien public. Nous trouverons les correspondances sur MusicBoxd.</p>
        </div>

        {/* --- FORMULAIRE CLASSIQUE --- */}
        <div className="space-y-6 mb-12">
            <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Détails</label>
                <input type="text" className="w-full bg-[#121212] border border-gray-800 rounded-xl p-4 text-white focus:border-[#00e054] outline-none text-lg font-bold mb-2" placeholder="Titre de la liste..." value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea className="w-full bg-[#121212] border border-gray-800 rounded-xl p-4 text-white focus:border-[#00e054] outline-none h-24 text-sm" placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
        </div>

        <div className="mb-8">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Ajout Manuel</label>
            <div className="flex gap-2 mb-3">
                <button onClick={() => setSearchType('album')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition ${searchType === 'album' ? 'bg-[#00e054] text-black' : 'bg-[#2c3440] text-gray-400'}`}>Albums</button>
                <button onClick={() => setSearchType('song')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition ${searchType === 'song' ? 'bg-[#00e054] text-black' : 'bg-[#2c3440] text-gray-400'}`}>Titres</button>
            </div>

            <form onSubmit={searchItems} className="flex gap-2 relative">
                <input type="text" className="w-full bg-[#121212] border border-gray-800 rounded-xl p-4 text-white focus:border-[#00e054] outline-none" placeholder={`Chercher un ${searchType === 'album' ? 'album' : 'titre'}...`} value={query} onChange={(e) => setQuery(e.target.value)} />
                <button type="submit" disabled={isSearching} className="bg-[#2c3440] px-6 rounded-xl font-bold text-gray-300 hover:bg-[#384252]">{isSearching ? '...' : '🔍'}</button>
                
                {/* DROPDOWN RESULTATS */}
                {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-[#1a1a1a] border border-gray-700 mt-2 rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto">
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

        {/* LISTE ITEMS */}
        <div className="space-y-2 mb-24">
            {selectedItems.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-800 rounded-xl text-gray-600">Liste vide. Importez ou ajoutez des titres.</div>
            ) : (
                selectedItems.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between bg-[#121212] p-3 rounded-xl border border-gray-800 group hover:border-white/20 transition">
                        <div className="flex items-center gap-4">
                            <div className="text-gray-600 font-mono w-6 text-center text-sm">{index + 1}</div>
                            <img src={item.image} className="w-12 h-12 rounded bg-black" alt="cover"/>
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

        <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30">
            <button onClick={saveList} disabled={isSaving || selectedItems.length === 0} className="pointer-events-auto bg-[#00e054] text-black font-bold px-12 py-4 rounded-full hover:bg-[#00c04b] disabled:opacity-50 transition transform hover:scale-105 shadow-[0_0_30px_rgba(0,224,84,0.3)]">
                {isSaving ? 'Création...' : `Publier la liste (${selectedItems.length})`}
            </button>
        </div>
      </div>
    </div>
  );
}