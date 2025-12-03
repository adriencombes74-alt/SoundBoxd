'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation'; // NOUVEAU : Pour lire l'URL

export default function SearchPage() {
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'album' | 'artist' | 'song'>('album');

  // DÉCLENCHEMENT AUTOMATIQUE (Si l'URL contient ?q=...)
  useEffect(() => {
    const q = searchParams.get('q');
    const type = searchParams.get('type');
    
    if (q) {
        setQuery(q);
        if (type) setSearchType(type as any);
        // On lance la recherche
        performSearch(q, type as any || 'album');
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string, type: string) => {
    setLoading(true);
    setResults([]);

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

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black overflow-x-hidden pb-20">
      
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-900/20 blur-[120px] rounded-full pointer-events-none z-0" />

      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-4">
        <nav className="flex items-center justify-between px-8 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl w-full max-w-5xl">
            <Link href="/" className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">
                Music<span className="text-[#00e054]">Boxd</span>
            </Link>
            <Link href="/" className="text-xs font-bold uppercase tracking-widest hover:text-[#00e054] transition">
                Retour Accueil
            </Link>
        </nav>
      </div>

      <main className="relative z-10 pt-40 px-6 max-w-7xl mx-auto">
        
        <div className="max-w-3xl mx-auto mb-16 text-center">
            <h1 className="text-4xl md:text-5xl font-black mb-8 tracking-tight">
              Explorer <span className="text-[#00e054]">
                {searchType === 'album' ? 'les Albums' : searchType === 'song' ? 'les Titres' : 'les Artistes'}
              </span>
            </h1>

            <div className="bg-white/5 p-1 rounded-full inline-flex backdrop-blur-md border border-white/10 mb-8 gap-1">
                <button onClick={() => setSearchType('album')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${searchType === 'album' ? 'bg-[#2c3440] text-[#00e054] shadow-lg' : 'text-gray-400 hover:text-white'}`}>Albums</button>
                <button onClick={() => setSearchType('song')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${searchType === 'song' ? 'bg-[#2c3440] text-[#00e054] shadow-lg' : 'text-gray-400 hover:text-white'}`}>Titres</button>
                <button onClick={() => setSearchType('artist')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${searchType === 'artist' ? 'bg-[#2c3440] text-[#00e054] shadow-lg' : 'text-gray-400 hover:text-white'}`}>Artistes</button>
            </div>

            <form onSubmit={handleFormSubmit} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#00e054] to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center">
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        className="w-full bg-[#0a0a0a] border border-white/10 text-white px-8 py-5 rounded-full focus:outline-none focus:border-[#00e054] text-lg placeholder-gray-600 shadow-2xl transition-all"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button type="submit" disabled={loading} className="absolute right-2 bg-[#00e054] text-black font-bold px-6 py-3 rounded-full hover:bg-[#00c04b] transition disabled:opacity-50 hover:scale-105">
                        {loading ? '...' : 'Go'}
                    </button>
                </div>
            </form>
        </div>

        {/* RÉSULTATS */}
        {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-pulse">
                {[1,2,3,4,5,6,7,8,9,10].map(i => <div key={i} className="h-64 bg-white/5 rounded-3xl"></div>)}
            </div>
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
                                    <h3 className="font-bold text-white text-lg leading-tight group-hover:text-[#00e054] transition">{item.artistName}</h3>
                                    <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest font-medium">{item.primaryGenreName}</p>
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
                                {isSong && (
                                    <div className="absolute bottom-3 right-3 bg-black/80 text-[#00e054] text-[10px] font-black px-2 py-1 rounded-full border border-[#00e054]/30 backdrop-blur-sm shadow-lg">
                                        ♫ TITRE
                                    </div>
                                )}
                            </div>
                            <h3 className="font-bold text-sm truncate text-white group-hover:text-[#00e054] transition">{title}</h3>
                            <p className="text-xs text-gray-400 truncate">{item.artistName}</p>
                            <p className="text-xs text-gray-600 mt-1 font-mono">{new Date(item.releaseDate).getFullYear()}</p>
                        </Link>
                    );
                })}
            </div>
        )}
        
        {!loading && results.length === 0 && query && (
            <div className="text-center text-gray-500 mt-12">Aucun résultat trouvé.</div>
        )}
      </main>
    </div>
  );
}