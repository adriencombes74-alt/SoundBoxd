'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ListDetailsPage({ params }: { params: any }) {
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

  useEffect(() => {
    if (listId) fetchListData();
  }, [listId]);

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
          row.map(field =>
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
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black pb-20 overflow-x-hidden">
      
      {/* GLOWS */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* NAVBAR */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-4">
        <nav className="flex items-center justify-between px-8 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl w-full max-w-5xl">
            <Link href="/" className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:to-[#00e054] transition-all">Music<span className="text-[#00e054]">Boxd</span></Link>
            <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
                <Link href="/search" className="text-gray-300 hover:text-[#00e054] transition">Albums</Link>
                <Link href="/profile" className="text-gray-300 hover:text-white transition">Mon Profil</Link>
            </div>
        </nav>
      </div>

      {/* HEADER */}
      <header className="relative w-full pt-40 pb-20 overflow-hidden border-b border-white/5 bg-[#0a0a0a]">
        <div className="absolute inset-0 grid grid-cols-4 md:grid-cols-6 opacity-20 blur-sm pointer-events-none scale-110">
            {mosaicAlbums.map((item: any, i: number) => (
                <img key={i} src={item.image} className="w-full h-full object-cover grayscale mix-blend-screen" />
            ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-[#050505]/60"></div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 flex flex-col items-center text-center">
            <div className="mb-6">
                <span className="bg-[#00e054] text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(0,224,84,0.4)]">Liste Curatée</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight tracking-tight drop-shadow-2xl">{list.title}</h1>
            <p className="text-xl text-gray-300 max-w-2xl font-light leading-relaxed mb-8">{list.description}</p>

            <div className="flex items-center gap-3 text-sm text-gray-500 font-medium border border-white/10 bg-black/40 px-6 py-2 rounded-full backdrop-blur-sm">
                <span>Par <strong className="text-white">{owner.username}</strong></span>
                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                <span>{list.albums?.length || 0} éléments</span>
                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                <span>{new Date(list.created_at).toLocaleDateString()}</span>
            </div>

            <div className="flex gap-4 mt-10">
                <button onClick={handleShare} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105">Partager 🔗</button>
                <button onClick={handleExportCSV} className="px-6 py-3 bg-[#00e054]/10 hover:bg-[#00e054]/20 text-[#00e054] rounded-xl border border-[#00e054]/20 transition text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105">Exporter CSV 📄</button>
                {currentUser && currentUser.id === list.user_id && (
                    <>
                        <button onClick={handleEdit} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105">Modifier ✎</button>
                        <button onClick={handleDelete} className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:scale-105">Supprimer 🗑️</button>
                    </>
                )}
            </div>
        </div>
      </header>

      {/* CONTENU */}
      <main className="max-w-4xl mx-auto px-6 py-16 relative z-10">
        <div className="space-y-3">
            {list.albums?.map((item: any, index: number) => (
                // Lien intelligent : targetId (AlbumID) ou id (pour compatibilité)
                <Link key={index} href={`/album/${item.targetId || item.id}`} className="block group">
                    <div className="flex items-center gap-6 p-4 rounded-2xl bg-[#121212] border border-white/5 hover:border-[#00e054]/50 hover:bg-[#181818] transition-all duration-300 hover:translate-x-2 shadow-lg">
                        <div className="text-gray-600 font-mono text-xl w-8 text-center font-bold group-hover:text-[#00e054] transition">{index + 1}</div>
                        <div className="w-20 h-20 flex-shrink-0 shadow-2xl group-hover:scale-105 transition transform duration-500 relative">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                            {item.type === 'song' && (
                                <div className="absolute -bottom-2 -right-2 bg-black border border-white/10 text-[#00e054] text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg">SONG</div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-white group-hover:text-[#00e054] transition truncate">{item.name}</h3>
                            <div className="flex items-center gap-3 text-gray-400 mt-1 text-sm font-medium">
                                <span className="text-gray-300">{item.artist}</span>
                                {item.year && <><span className="w-1 h-1 bg-gray-600 rounded-full"></span><span className="text-gray-500 font-mono">{item.year}</span></>}
                            </div>
                        </div>
                        <div className="text-gray-600 opacity-0 group-hover:opacity-100 transition pr-4 transform group-hover:translate-x-2">➜</div>
                    </div>
                </Link>
            ))}

            {(!list.albums || list.albums.length === 0) && (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                    <p className="text-gray-500 text-lg">Cette liste est vide.</p>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}