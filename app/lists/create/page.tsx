'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function CreateListPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  
  // Recherche
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<'album' | 'song'>('album'); // NOUVEAU : Choix du type
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) router.push('/login');
  };

  const searchItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);

    try {
      // Recherche iTunes adaptée au type
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=${searchType}&limit=5`);
      const data = await res.json();
      setSearchResults(data.results);
    } catch (err) {
      console.error(err);
    }
    setIsSearching(false);
  };

  const addItem = (item: any) => {
    // L'ID unique dépend du type
    const itemId = item.trackId || item.collectionId;
    if (selectedItems.find(a => a.id === itemId)) return;

    const cleanItem = {
        id: itemId,
        // Si c'est une chanson, on garde l'ID de l'album parent pour la redirection
        targetId: item.collectionId || item.trackId, 
        name: item.trackName || item.collectionName,
        artist: item.artistName,
        // On force la HD
        image: item.artworkUrl100.replace('100x100', '1000x1000'),
        type: searchType,
        year: new Date(item.releaseDate).getFullYear()
    };
    
    setSelectedItems([...selectedItems, cleanItem]);
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
            user_id: user.id,
            title: title,
            description: description,
            albums: selectedItems // On sauvegarde le tableau mixte
        });

        if (error) {
            alert("Erreur lors de la création.");
        } else {
            alert("Liste créée !");
            router.push('/profile');
        }
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6 selection:bg-[#00e054] selection:text-black">
      <div className="max-w-2xl mx-auto mt-20">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black tracking-tight">Nouvelle Liste</h1>
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">Annuler</button>
        </div>

        <div className="space-y-6 mb-12">
            <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Titre</label>
                <input type="text" className="w-full bg-[#121212] border border-gray-800 rounded-xl p-4 text-white focus:border-[#00e054] outline-none text-lg font-bold" placeholder="Titre..." value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Description</label>
                <textarea className="w-full bg-[#121212] border border-gray-800 rounded-xl p-4 text-white focus:border-[#00e054] outline-none h-32" placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
        </div>

        <div className="mb-8">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Ajouter des éléments</label>
            
            {/* SÉLECTEUR TYPE */}
            <div className="flex gap-2 mb-3">
                <button onClick={() => setSearchType('album')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition ${searchType === 'album' ? 'bg-[#00e054] text-black' : 'bg-[#2c3440] text-gray-400'}`}>Albums</button>
                <button onClick={() => setSearchType('song')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition ${searchType === 'song' ? 'bg-[#00e054] text-black' : 'bg-[#2c3440] text-gray-400'}`}>Titres</button>
            </div>

            <form onSubmit={searchItems} className="flex gap-2 relative">
                <input type="text" className="w-full bg-[#121212] border border-gray-800 rounded-xl p-4 text-white focus:border-[#00e054] outline-none" placeholder={`Chercher un ${searchType === 'album' ? 'album' : 'titre'}...`} value={query} onChange={(e) => setQuery(e.target.value)} />
                <button type="submit" disabled={isSearching} className="bg-[#2c3440] px-6 rounded-xl font-bold text-gray-300 hover:bg-[#384252]">{isSearching ? '...' : '🔍'}</button>

                {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-[#1a1a1a] border border-gray-700 mt-2 rounded-xl shadow-2xl z-10 max-h-60 overflow-y-auto">
                        {searchResults.map((item) => (
                            <div key={item.collectionId || item.trackId} onClick={() => addItem(item)} className="flex items-center gap-3 p-3 hover:bg-[#00e054] hover:text-black cursor-pointer transition">
                                <img src={item.artworkUrl100} className="w-10 h-10 rounded" alt="cover"/>
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

        <div className="space-y-2 mb-20">
            {selectedItems.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-800 rounded-xl text-gray-600">Liste vide.</div>
            ) : (
                selectedItems.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between bg-[#121212] p-3 rounded-xl border border-gray-800">
                        <div className="flex items-center gap-4">
                            <div className="text-gray-600 font-mono w-6 text-center">{index + 1}</div>
                            <img src={item.image} className="w-12 h-12 rounded bg-black" alt="cover"/>
                            <div>
                                <div className="font-bold text-white flex items-center gap-2">
                                    {item.name}
                                    {item.type === 'song' && <span className="text-[9px] bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded text-gray-400 font-bold">SONG</span>}
                                </div>
                                <div className="text-xs text-gray-400">{item.artist} • {item.year}</div>
                            </div>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-gray-500 hover:text-red-500 p-2">✕</button>
                    </div>
                ))
            )}
        </div>

        <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none">
            <button onClick={saveList} disabled={isSaving || selectedItems.length === 0} className="pointer-events-auto bg-[#00e054] text-black font-bold px-12 py-4 rounded-full hover:bg-[#00c04b] disabled:opacity-50 transition transform hover:scale-105 shadow-[0_0_30px_rgba(0,224,84,0.3)]">
                {isSaving ? 'Création...' : 'Publier la liste'}
            </button>
        </div>
      </div>
    </div>
  );
}