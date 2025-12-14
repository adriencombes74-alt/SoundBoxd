'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ProfileMenu from '@/components/ui/profile-menu';

export default function ArtistPage({ params }: { params: any }) {
  const router = useRouter();
  const [artistId, setArtistId] = useState<string>("");
  const [artistInfo, setArtistInfo] = useState<any>(null);
  const [albums, setAlbums] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Déballage des paramètres (Next.js 15)
  useEffect(() => {
    if (params instanceof Promise) {
      params.then((p: any) => setArtistId(p.id));
    } else {
      setArtistId(params.id);
    }
  }, [params]);

  useEffect(() => {
    checkUser();
    if (artistId) fetchArtistData();
  }, [artistId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchArtistData = async () => {
    try {
      // 1. Infos Artiste
      const artistRes = await fetch(`https://itunes.apple.com/lookup?id=${artistId}`);
      const artistData = await artistRes.json();
      
      if (!artistData.results || artistData.results.length === 0) {
        setLoading(false);
        return;
      }
      setArtistInfo(artistData.results[0]);

      // 2. Albums (HD)
      const albumsRes = await fetch(`https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=50`);
      const albumsData = await albumsRes.json();
      
      const albumsList = albumsData.results
        .filter((item: any) => item.wrapperType === 'collection')
        .sort((a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
      
      setAlbums(albumsList);

      // 3. Top Songs
      const songsRes = await fetch(`https://itunes.apple.com/lookup?id=${artistId}&entity=song&limit=5`);
      const songsData = await songsRes.json();
      
      const songsList = songsData.results.filter((item: any) => item.wrapperType === 'track');
      setTopSongs(songsList);

    } catch (error) {
      console.error("Erreur API:", error);
    }
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-[#050505] text-white p-10 flex items-center justify-center">Chargement de l'artiste...</div>;
  if (!artistInfo) return <div className="min-h-screen bg-[#050505] text-white p-10 flex items-center justify-center">Artiste introuvable.</div>;

  // Image HD pour le fond
  const heroImage = albums.length > 0 ? albums[0].artworkUrl100.replace('100x100', '1000x1000') : '';

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black pb-20 overflow-x-hidden">
      
      {/* --- GLOWS D'AMBIANCE --- */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* --- NAVBAR FLOTTANTE --- */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-4">
        <nav className="flex items-center justify-between px-8 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl w-full max-w-5xl">
            <Link href="/" className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-900 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>
            <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
                <Link href="/search" className="text-white hover:text-[#00e054] transition">← Retour</Link>
                <Link href="/community" className="hover:text-[#00e054] transition hidden sm:inline">Communauté</Link>
                {user ? (
                    <ProfileMenu user={user} />
                ) : (
                    <Link href="/login" className="bg-white text-black px-4 py-2 rounded-full hover:bg-[#00e054] transition">Connexion</Link>
                )}
            </div>
        </nav>
      </div>

      {/* --- HEADER ARTISTE --- */}
      <header className="relative w-full h-[500px] flex items-end overflow-hidden border-b border-white/5 bg-[#0a0a0a]">
        {/* Fond flouté */}
        {heroImage && (
            <>
                <img src={heroImage} className="absolute inset-0 w-full h-full object-cover opacity-40 blur-2xl scale-110 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
            </>
        )}

        <div className="relative z-10 max-w-6xl mx-auto w-full px-6 py-12 flex flex-col md:flex-row gap-10 items-end">
            {/* Image "Avatar" */}
            <div className="w-56 h-56 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-[#14181c] overflow-hidden bg-black flex-shrink-0 z-20 relative">
                {heroImage ? <img src={heroImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-bold">{artistInfo.artistName[0]}</div>}
            </div>
            
            <div className="flex-1 mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-[#00e054] text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Artiste</span>
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded">{artistInfo.primaryGenreName}</span>
                </div>
                <h1 className="text-6xl md:text-8xl font-black text-white mb-4 leading-none tracking-tight drop-shadow-2xl">{artistInfo.artistName}</h1>
                <div className="text-gray-300 text-lg font-light flex items-center gap-2">
                    <span className="text-white font-bold">{albums.length}</span> Albums sortis
                </div>
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-16 relative z-10">
        
        {/* COLONNE GAUCHE : TOP TITRES (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
            <h2 className="text-sm font-bold text-[#00e054] uppercase tracking-widest border-b border-white/10 pb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-[#00e054] rounded-full"></span> Titres Populaires
            </h2>
            <div className="space-y-2">
                {topSongs.map((song, i) => (
                    <div key={song.trackId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition group cursor-default border border-transparent hover:border-white/5">
                        <span className="text-gray-600 font-mono w-6 text-center group-hover:text-[#00e054] font-bold text-lg">{i + 1}</span>
                        <img src={song.artworkUrl100} className="w-12 h-12 rounded-lg bg-black shadow-md" />
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-white truncate group-hover:text-[#00e054] transition">{song.trackName}</div>
                            <div className="text-xs text-gray-500 truncate">{song.collectionName}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* COLONNE DROITE : DISCOGRAPHIE (8 cols) */}
        <div className="lg:col-span-8">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8 border-b border-white/10 pb-4">
                Discographie Complète
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {albums.map((album) => (
                    <Link key={album.collectionId} href={`/album/${album.collectionId}`} className="group block">
                        <div className="relative aspect-square mb-4 overflow-hidden rounded-2xl bg-[#121212] shadow-lg border border-white/5 group-hover:border-[#00e054]/50 transition-all duration-300">
                            <img 
                                src={album.artworkUrl100.replace('100x100', '400x400')} 
                                alt={album.collectionName} 
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition duration-700" 
                            />
                            {/* Overlay au survol */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <span className="bg-[#00e054] text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition duration-300">Voir</span>
                            </div>
                        </div>
                        <h3 className="text-sm font-bold text-white leading-tight truncate group-hover:text-[#00e054] transition">
                            {album.collectionName}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 font-mono tracking-wide">
                            {new Date(album.releaseDate).getFullYear()}
                        </p>
                    </Link>
                ))}
            </div>
        </div>

      </main>
    </div>
  );
}