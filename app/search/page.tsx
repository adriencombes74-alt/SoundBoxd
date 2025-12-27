'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ProfileMenu from '@/components/ui/profile-menu';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// Variants d'animation
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  }
};

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20
    }
  }
};

// 1. ON CRÉE UN COMPOSANT INTERNE POUR LE CONTENU
function SearchContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, []);
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'album' | 'artist' | 'song'>('album');

  // États Exploration
  const [popularItems, setPopularItems] = useState<any[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  const genres = ["Pop", "Hip-Hop", "Rock", "Alternative", "Indie", "Electronic", "Jazz", "R&B", "Metal", "Classical", "Reggae"];

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

  // Chargement des données Explore
  useEffect(() => {
    const loadExplore = async () => {
        setLoadingExplore(true);
        
        // Récupérer plus d'avis pour filtrer les doublons
        const { data: pop } = await supabase
          .from('reviews')
          .select('*')
          .order('like_count', { ascending: false })
          .limit(20);
        
        // Filtrer pour obtenir des albums uniques (par album_id)
        const uniqueAlbums = new Map();
        pop?.forEach(review => {
          if (!uniqueAlbums.has(review.album_id)) {
            uniqueAlbums.set(review.album_id, review);
          }
        });
        
        // Prendre les 5 premiers albums uniques
        const uniquePopularItems = Array.from(uniqueAlbums.values()).slice(0, 5);
        setPopularItems(uniquePopularItems);
        
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
      
      {/* GLOWS ANIMÉS */}
      <motion.div 
        className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-900/20 blur-[120px] rounded-full pointer-events-none z-0"
        animate={{
          scale: [1, 1.1, 1, 0.95, 1],
          opacity: [0.2, 0.3, 0.2, 0.15, 0.2],
          x: [0, 20, 0, -15, 0],
          y: [0, -15, 0, 20, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div 
        className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none z-0"
        animate={{
          scale: [1, 0.95, 1.1, 1, 1],
          opacity: [0.1, 0.2, 0.15, 0.25, 0.1],
          x: [0, -20, 0, 25, 0],
          y: [0, 20, 0, -10, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* NAVBAR */}
      <motion.div 
        className="hidden md:flex fixed top-4 left-0 right-0 justify-center z-50 px-2 md:px-4"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
      >
        <nav className="flex items-center justify-between px-4 md:px-8 py-2 md:py-3 w-full max-w-5xl rounded-full transition-all duration-300 bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 border border-white/10 border-t-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
            <Link href="/" className="text-lg md:text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">
                Music<span className="text-[#00e054]">Boxd</span>
            </Link>
            <div className="hidden md:flex items-center gap-2 md:gap-4 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                <AnimatePresence>
                {hasSearched && (
                    <motion.button 
                      onClick={clearSearch} 
                      className="text-gray-400 hover:text-white transition"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                        ✕ Fermer
                    </motion.button>
                )}
                </AnimatePresence>
                <Link href="/" className="hover:text-[#00e054] transition hidden sm:inline">
                    Accueil
                </Link>
                {user ? (
                    <ProfileMenu user={user} />
                ) : (
                    <Link href="/login" className="bg-white text-black px-3 md:px-4 py-1.5 md:py-2 rounded-full hover:bg-[#00e054] transition text-[10px] md:text-sm">Connexion</Link>
                )}
            </div>
        </nav>
      </motion.div>

      <main className="relative z-10 pt-16 md:pt-40 px-6 max-w-7xl mx-auto">
        
        {/* BARRE DE RECHERCHE */}
        <motion.div 
          className="max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
        >
            <form onSubmit={handleFormSubmit} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#00e054] to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center">
                    <input
                        type="text"
                        placeholder={searchType === 'album' ? "Album..." : searchType === 'song' ? "Titre..." : "Artiste..."}
                        className="w-full bg-[#0a0a0a] border border-white/10 text-white px-5 md:px-8 py-4 md:py-5 rounded-full focus:outline-none focus:border-[#00e054] text-base md:text-lg placeholder-gray-600 shadow-2xl transition-all"
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
                        <motion.button 
                            type="submit"
                            disabled={loading}
                            className="bg-[#00e054] text-black font-bold p-3 rounded-full hover:bg-[#00c04b] transition disabled:opacity-50 shadow-lg"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {loading ? '...' : '🔎'}
                        </motion.button>
                    </div>
                </div>
            </form>
        </motion.div>

        {/* CONTENU */}
        <AnimatePresence mode="wait">
        {!hasSearched ? (
            <motion.div 
              key="explore"
              className="space-y-20"
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              variants={fadeInUp}
            >
                
                {/* GENRES */}
                <motion.section variants={fadeInUp}>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <motion.span 
                          className="w-2 h-2 bg-[#00e054] rounded-full"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        Parcourir par Genre
                    </h2>
                    <motion.div 
                      className="flex flex-wrap gap-3 items-center"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                        {genres.map((genre) => (
                            <motion.button 
                                key={genre}
                                onClick={() => handleGenreClick(genre)}
                                className="px-6 py-3 bg-[#1a1a1a] border border-white/5 hover:border-[#00e054] hover:text-[#00e054] rounded-full text-sm font-bold transition-all hover:shadow-lg hover:shadow-[#00e054]/10 hover:bg-[#202020] whitespace-nowrap"
                                variants={itemVariants}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {genre}
                            </motion.button>
                        ))}
                    </motion.div>
                </motion.section>

                {/* POPULAIRE */}
                <motion.section variants={fadeInUp}>
                    <h2 className="text-2xl font-black text-white mb-8 tracking-tight">🔥 Populaire sur MusicBoxd</h2>
                    {loadingExplore ? (
                        <motion.div 
                          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {[1,2,3,4,5].map(i => (
                            <motion.div 
                              key={i} 
                              className="aspect-square bg-white/5 rounded-2xl animate-pulse"
                              variants={itemVariants}
                            />
                          ))}
                        </motion.div>
                    ) : popularItems.length === 0 ? (
                        <motion.div 
                          className="text-center py-12 text-gray-500"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          Aucun album populaire pour le moment
                        </motion.div>
                    ) : (
                        <motion.div 
                          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                            {popularItems.map((item, index) => (
                                <motion.div 
                                  key={item.id} 
                                  variants={itemVariants}
                                  className="relative"
                                >
                                  <Link href={`/album-view?id=${item.album_id}`} className="group block">
                                    <motion.div 
                                      className="relative aspect-square overflow-hidden rounded-2xl shadow-lg bg-[#121212] mb-3 border border-white/5 group-hover:border-[#00e054]/50 transition-all duration-300"
                                      whileHover={{ y: -8, scale: 1.02 }}
                                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    >
                                        <img 
                                            src={item.album_image?.replace('100x100', '400x400')} 
                                            alt={item.album_name} 
                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur px-2 py-1 rounded-lg text-xs font-black text-white">
                                            #{index + 1}
                                        </div>
                                        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-[#00e054] flex items-center gap-1">
                                            <span>★</span> {item.rating}
                                        </div>
                                    </motion.div>
                                    <h3 className="font-bold text-sm text-white truncate group-hover:text-[#00e054] transition mb-1">{item.album_name}</h3>
                                    <p className="text-xs text-gray-400 truncate">{item.artist_name}</p>
                                  </Link>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </motion.section>
            </motion.div>
        ) : (
            // RÉSULTATS
            <motion.div 
              key="results"
              className="space-y-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
                <motion.div 
                  className="flex justify-between items-end border-b border-white/10 pb-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                    <h2 className="text-xl font-bold text-white">Résultats pour &ldquo;{query}&rdquo;</h2>
                </motion.div>

                {loading ? (
                    <motion.div 
                      className="text-center py-20"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        className="inline-block text-4xl"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        🔍
                      </motion.div>
                      <p className="mt-4 text-gray-400">Recherche en cours...</p>
                    </motion.div>
                ) : results.length === 0 ? (
                    <motion.div 
                      className="text-center py-20"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <motion.div
                        className="text-5xl mb-4"
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        😕
                      </motion.div>
                      <p className="text-gray-400">Aucun résultat trouvé</p>
                    </motion.div>
                ) : (
                    <motion.div 
                      className={`grid gap-8 ${searchType === 'artist' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5'}`}
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                        {results.map((item) => {
                            if (searchType === 'artist') {
                                return (
                                    <motion.div key={item.artistId} variants={itemVariants}>
                                      <Link href={`/artist-view?id=${item.artistId}`} className="group block">
                                        <motion.div 
                                          className="bg-[#121212] hover:bg-[#1a1a1a] p-8 rounded-3xl border border-white/5 hover:border-[#00e054]/50 transition-all duration-300 flex flex-col items-center text-center h-full shadow-lg"
                                          whileHover={{ y: -8, scale: 1.02 }}
                                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        >
                                            <motion.div 
                                              className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-3xl font-black text-white/20 mb-4 shadow-inner border border-white/5 group-hover:text-[#00e054]"
                                              whileHover={{ scale: 1.1, rotate: 5 }}
                                            >
                                                {item.artistName ? item.artistName[0].toUpperCase() : '?'}
                                            </motion.div>
                                            <h3 className="font-bold text-white text-base leading-tight group-hover:text-[#00e054] transition">{item.artistName}</h3>
                                        </motion.div>
                                      </Link>
                                    </motion.div>
                                );
                            }
                            const targetId = item.collectionId || item.trackId;
                            const title = item.trackName || item.collectionName;
                            const isSong = searchType === 'song';
                            return (
                                <motion.div key={item.trackId || item.collectionId} variants={itemVariants}>
                                  <Link href={`/album-view?id=${targetId}`} className="group cursor-pointer block">
                                    <motion.div 
                                      className="relative aspect-square overflow-hidden rounded-3xl shadow-2xl bg-[#121212] mb-4 border border-white/5 group-hover:border-[#00e054]/50 transition-all duration-300"
                                      whileHover={{ y: -8, scale: 1.02 }}
                                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    >
                                        <img 
                                            src={item.artworkUrl100?.replace('100x100', '400x400')} 
                                            alt={title} 
                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-500 group-hover:scale-110"
                                        />
                                        {isSong && (
                                          <motion.div 
                                            className="absolute bottom-3 right-3 bg-black/80 text-[#00e054] text-[10px] font-black px-2 py-1 rounded-full border border-[#00e054]/30 backdrop-blur-sm shadow-lg"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.2, type: "spring" }}
                                          >
                                            ♫ TITRE
                                          </motion.div>
                                        )}
                                    </motion.div>
                                    <h3 className="font-bold text-sm truncate text-white group-hover:text-[#00e054] transition">{title}</h3>
                                    <p className="text-xs text-gray-400 truncate">{item.artistName}</p>
                                  </Link>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </motion.div>
        )}
        </AnimatePresence>
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