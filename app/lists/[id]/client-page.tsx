'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProfileMenu from '@/components/ui/profile-menu';

export default function ListDetailsClientPage({ params }: { params: any }) {
  const router = useRouter();
  const [listId, setListId] = useState<string>("");
  const [list, setList] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params instanceof Promise) {
      params.then((p: any) => setListId(p.id));
    } else {
      setListId(params.id);
    }
  }, [params]);

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
      // Créer les en-têtes CSV
      const headers = ['Artist', 'Track Name', 'Album'];

      // Créer les lignes de données
      const rows = list.albums.map((item: any) => [
        item.artist || '',
        item.name || '',
        // Pour les albums, on peut utiliser le nom de l'album si disponible, sinon une valeur par défaut
        item.album || item.collectionName || (item.type === 'album' ? item.name : 'Album inconnu')
      ]);

      // Combiner en-têtes et données
      const csvContent = [headers, ...rows]
        .map(row =>
          row.map((field: string) =>
            // Échapper les guillemets et entourer de guillemets si nécessaire
            `"${String(field).replace(/"/g, '""')}"`
          ).join(',')
        )
        .join('\n');

      // Créer le blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      // Créer l'URL du blob
      const url = URL.createObjectURL(blob);

      // Créer un élément <a> temporaire pour le téléchargement
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${list.title || 'playlist'}.csv`);
      link.style.visibility = 'hidden';

      // Ajouter à la page, cliquer et supprimer
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Libérer l'URL
      URL.revokeObjectURL(url);

      // Notification de succès
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

  if (loading) return <div className="min-h-screen bg-[#050505] text-white p-10 flex items-center justify-center">Chargement...</div>;
  if (!list) return <div className="min-h-screen bg-[#050505] text-white p-10 flex items-center justify-center">Liste introuvable.</div>;

  const mosaicAlbums = list.albums?.slice(0, 12) || [];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black pb-20 overflow-x-hidden p-2 md:p-0">
      
      {/* GLOWS */}
      <div className="fixed top-[-20%] right-[-10%] w-[60%] md:w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[60%] md:w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* NAVBAR */}
      <div className="fixed top-4 left-2 right-2 flex justify-center z-50 px-2 md:px-4">
        <nav className="flex items-center justify-between px-4 md:px-8 py-2 md:py-3 w-full max-w-5xl rounded-full transition-all duration-300 bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 border border-white/10 border-t-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),inset_0_1px_0_0_rgba(255,255,255,0.15)] ">
            <Link href="/" className="text-base md:text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>
            <div className="flex items-center gap-2 md:gap-8 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                <Link href="/search" className="text-gray-300 hover:text-[#00e054] transition">Albums</Link>
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
                <button onClick={handleShare} className="px-4 md:px-6 py-2 md:py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 glassy">Partager 🔗</button>
                <button onClick={handleExportCSV} className="px-4 md:px-6 py-2 md:py-3 bg-[#00e054]/10 hover:bg-[#00e054]/20 text-[#00e054] rounded-xl border border-[#00e054]/20 transition text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 glassy">Exporter CSV 📄</button>
                {currentUser && currentUser.id === list.user_id && (
                    <>
                        <button onClick={handleEdit} className="px-4 md:px-6 py-2 md:py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 glassy">Modifier ✎</button>
                        <button onClick={handleDelete} className="px-4 md:px-6 py-2 md:py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105 glassy">Supprimer 🗑️</button>
                    </>
                )}
            </div>
        </div>
      </header>

      {/* CONTENU */}
      <main className="max-w-4xl mx-auto px-2 md:px-6 py-8 md:py-16 relative z-10">
        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-hide">
            {list.albums?.map((item: any, index: number) => (
                // Lien intelligent : targetId (AlbumID) ou id (pour compatibilité)
                <Link key={index} href={`/album/${item.targetId || item.id}`} className="block group">
                    <div className="flex items-center gap-3 md:gap-6 p-3 md:p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10 hover:border-[#00e054]/50 hover:bg-white/20 transition-all duration-300 hover:translate-x-1 shadow-lg min-w-[220px]">
                        <div className="text-gray-600 font-mono text-base md:text-xl w-8 text-center font-bold group-hover:text-[#00e054] transition">{index + 1}</div>
                        <div className="w-14 h-14 md:w-20 md:h-20 flex-shrink-0 shadow-2xl group-hover:scale-105 transition transform duration-500 relative">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                            {item.type === 'song' && (
                                <div className="absolute -bottom-2 -right-2 bg-black border border-white/10 text-[#00e054] text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg">SONG</div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base md:text-xl font-bold text-white group-hover:text-[#00e054] transition truncate mb-1 md:mb-0">{item.name}</h3>
                            <div className="flex items-center gap-2 md:gap-3 text-gray-400 mt-1 text-xs md:text-sm font-medium">
                                <span className="text-gray-300">{item.artist}</span>
                                {item.year && <><span className="w-1 h-1 bg-gray-600 rounded-full"></span><span className="text-gray-500 font-mono">{item.year}</span></>}
                            </div>
                        </div>
                        <div className="text-gray-600 opacity-0 group-hover:opacity-100 transition pr-2 md:pr-4 transform group-hover:translate-x-2">➜</div>
                    </div>
                </Link>
            ))}

            {(!list.albums || list.albums.length === 0) && (
                <div className="text-center py-16 md:py-20 border border-dashed border-white/10 rounded-3xl bg-white/10 backdrop-blur-lg">
                    <p className="text-gray-500 text-base md:text-lg">Cette liste est vide.</p>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}
