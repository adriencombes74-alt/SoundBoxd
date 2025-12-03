'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// 1. ON CRÉE UN COMPOSANT INTERNE POUR LE CONTENU
function SearchContent() {
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'album' | 'artist' | 'song'>('album');

  // États Exploration
  const [popularItems, setPopularItems] = useState<any[]>([]);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  const genres = ["Pop", "Hip-Hop", "Rock", "Alternative", "Indie", "Electronic", "Jazz", "R&B", "Metal", "Classical", "Reggae"];

  // Chargement des données Explore
  useEffect(() => {
    const loadExplore = async () => {
        setLoadingExplore(true);
        const { data: pop } = await supabase.from('reviews').select('*').order('like_count', { ascending: false }).limit(6);
        setPopularItems(pop || []);
        const { data: rec } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(6);
        setRecentItems(rec || []);
        setLoadingExplore(false);
    };
    loadExplore();
  }, []);

  // Déclenchement automatique via URL
  useEffect(() => {
    const q = searchParams.get('q');
    const type = searchParams.get('type');
    
    if (q) {
        setQuery(q);
        if (type) setSearchType(type as any);
        performSearch(q, type as any || 'album');
        setHasSearched(true);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string, type: string) => {
    setLoading(true);
    setResults([]);
    setHasSearched(true);

    try {
      let entity = 'album';
      if (type === 'artist') entity = 'musicArtist';
      if (type === 'song') entity = 'song';

      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=${entity}&limit=24`);
      const data = await res.json();
      setResults(data.results);
    } catch (error) {
      console.error("Erreur de recherche:", error);
    }
    setLoading(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    performSearch(query, searchType);
  };

  const handleGenreClick = (genre: string) => {
    setQuery(genre);
    setSearchType('album');
    performSearch(genre, 'album');
  };

  const clearSearch = () => {
    setQuery('');
    setHasSearched(false);
    setResults([]);
    // Optionnel: Nettoyer l'URL sans recharger
    window.history.pushState({}, '', '/search');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black overflow-x-hidden pb-20">
      
      {/* GLOWS */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-900/20 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* NAVBAR */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-4">
        <nav className="flex items-center justify-between px-8 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl w-full max-w-5xl">
            <Link href="/" className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">
                Music<span className="text-[#00e054]">Boxd</span>
            </Link>
            <div className="flex items-center gap-4">
                {hasSearched && (
                    <button onClick={clearSearch} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition mr-4">
                        ✕ Fermer
                    </button>
                )}
                <Link href="/" className="text-xs font-bold uppercase tracking-widest hover:text-[#00e054] transition">
                    Retour Accueil
                </Link>
            </div>
        </nav>
      </div>

      <main className="relative z-10 pt-40 px-6 max-w-7xl mx-auto">
        
        {/* BARRE DE RECHERCHE */}
        <div className="max-w-3xl mx-auto mb-16">
            <form onSubmit={handleFormSubmit} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#00e054] to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center">
                    <input
                        type="text"
                        placeholder={searchType === 'album' ? "Rechercher un album..." : searchType === 'song' ? "Rechercher un titre..." : "Rechercher un artiste..."}
                        className="w-full bg-[#0a0a0a] border border-white/10 text-white px-8 py-5 rounded-full focus:outline-none focus:border-[#00e054] text-lg placeholder-gray-600 shadow-2xl transition-all"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="absolute right-2 flex items-center gap-2">
                        <select 
                            value={searchType} 
                            onChange={(e) => setSearchType(e.target.value as any)}
                            className="bg-[#1a1a1a] text-white text-xs font-bold uppercase py-2 px-3 rounded-lg border border-white/10 outline-none hover:border-[#00e054] cursor-pointer mr-2"
                        >
                            <option value="album">Album</option>
                            <option value="artist">Artiste</option>
                            <option value="song">Titre</option>
                        </select>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="bg-[#00e054] text-black font-bold p-3 rounded-full hover:bg-[#00c04b] transition disabled:opacity-50 hover:scale-105 shadow-lg"
                        >
                            {loading ? '...' : '🔎'}
                        </button>
                    </div>
                </div>
            </form>
        </div>

        {/* CONTENU */}
        {!hasSearched ? (
            <div className="space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* GENRES */}
                <section>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#00e054] rounded-full"></span> Parcourir par Genre
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        {genres.map((genre) => (
                            <button 
                                key={genre}
                                onClick={() => handleGenreClick(genre)}
                                className="px-6 py-3 bg-[#1a1a1a] border border-white/5 hover:border-[#00e054] hover:text-[#00e054] rounded-full text-sm font-bold transition-all hover:scale-105 hover:shadow-lg hover:bg-[#202020]"
                            >
                                {genre}
                            </button>
                        ))}
                    </div>
                </section>

                {/* POPULAIRE */}
                <section>
                    <h2 className="text-2xl font-black text-white mb-8 tracking-tight">🔥 Populaire sur MusicBoxd</h2>
                    {loadingExplore ? (
                        <div className="text-gray-500">Chargement...</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                            {popularItems.map((item) => (
                                <Link key={item.id} href={`/album/${item.album_id}`} className="group block">
                                    <div className="relative aspect-square overflow-hidden rounded-2xl shadow-lg bg-[#121212] mb-3 border border-white/5 group-hover:border-[#00e054]/50 transition-all duration-300">
                                        <img 
                                            src={item.album_image?.replace('100x100', '400x400')} 
                                            alt={item.album_name} 
                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-[#00e054] flex items-center gap-1">
                                            <span>★</span> {item.rating}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-xs text-white truncate group-hover:text-[#00e054] transition">{item.album_name}</h3>
                                    <p className="text-[10px] text-gray-400 truncate uppercase tracking-wide">{item.artist_name}</p>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        ) : (
            // RÉSULTATS
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                    <h2 className="text-xl font-bold text-white">Résultats pour "{query}"</h2>
                </div>

                {loading ? (
                    <div className="text-center py-20">Recherche...</div>
                ) : (
                    <div className={`grid gap-8 ${searchType === 'artist' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5'}`}>
                        {results.map((item) => {
                            if (searchType === 'artist') {
                                return (
                                    <Link href={`/artist/${item.artistId}`} key={item.artistId} className="group block">
                                        <div className="bg-[#121212] hover:bg-[#1a1a1a] p-8 rounded-3xl border border-white/5 hover:border-[#00e054]/50 transition-all duration-300 flex flex-col items-center text-center h-full shadow-lg hover:-translate-y-2">
                                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-3xl font-black text-white/20 mb-4 shadow-inner border border-white/5 group-hover:scale-110 transition transform group-hover:text-[#00e054]">
                                                {item.artistName ? item.artistName[0].toUpperCase() : '?'}
                                            </div>
                                            <h3 className="font-bold text-white text-base leading-tight group-hover:text-[#00e054] transition">{item.artistName}</h3>
                                        </div>
                                    </Link>
                                );
                            }
                            const targetId = item.collectionId || item.trackId;
                            const title = item.trackName || item.collectionName;
                            const isSong = searchType === 'song';
                            return (
                                <Link href={`/album/${targetId}`} key={item.trackId || item.collectionId} className="group cursor-pointer block">
                                    <div className="relative aspect-square overflow-hidden rounded-3xl shadow-2xl bg-[#121212] mb-4 border border-white/5 group-hover:border-[#00e054]/50 transition-all duration-300">
                                        <img 
                                            src={item.artworkUrl100?.replace('100x100', '400x400')} 
                                            alt={title} 
                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-500 group-hover:scale-110"
                                        />
                                        {isSong && <div className="absolute bottom-3 right-3 bg-black/80 text-[#00e054] text-[10px] font-black px-2 py-1 rounded-full border border-[#00e054]/30 backdrop-blur-sm shadow-lg">♫ TITRE</div>}
                                    </div>
                                    <h3 className="font-bold text-sm truncate text-white group-hover:text-[#00e054] transition">{title}</h3>
                                    <p className="text-xs text-gray-400 truncate">{item.artistName}</p>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
}

// 2. ON EXPORTE LA PAGE PRINCIPALE AVEC LE SUSPENSE
export default function SearchPagePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] text-white p-10 flex items-center justify-center">Chargement...</div>}>
      <SearchContent />
    </Suspense>
  );
}
```


    git add .
    git commit -m "Fix build error search page"
    git push origin main