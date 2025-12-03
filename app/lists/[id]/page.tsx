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
    if (!confirm("Supprimer cette liste ?")) return;
    const { error } = await supabase.from('lists').delete().eq('id', listId);
    if (!error) { router.push('/profile'); router.refresh(); }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Lien copié !");
  };

  const handleEdit = async () => {
    const newTitle = prompt("Nouveau titre :", list.title);
    if (newTitle) {
        const { error } = await supabase.from('lists').update({ title: newTitle }).eq('id', listId);
        if (!error) setList({ ...list, title: newTitle });
    }
  };

  if (loading) return <div className="min-h-screen bg-[#14181c] text-white p-10 flex items-center justify-center">Chargement...</div>;
  if (!list) return <div className="min-h-screen bg-[#14181c] text-white p-10 flex items-center justify-center">Liste introuvable.</div>;

  const mosaicAlbums = list.albums?.slice(0, 6) || [];

  return (
    <div className="min-h-screen bg-[#14181c] text-white font-sans pb-20">
      <nav className="flex items-center justify-between px-6 py-4 bg-[#2c3440] border-b border-gray-700 relative z-20">
        <a href="/" className="text-2xl font-bold tracking-tighter uppercase">Music<span className="text-[#00e054]">Boxd</span></a>
        <div className="flex space-x-6 text-sm font-semibold uppercase tracking-widest items-center">
          <a href="/search" className="text-gray-300 hover:text-white transition">Albums</a>
          <a href="/profile" className="text-gray-300 hover:text-white transition">Mon Profil</a>
        </div>
      </nav>

      <header className="relative w-full overflow-hidden bg-[#101317] border-b border-gray-800">
        <div className="absolute inset-0 grid grid-cols-3 md:grid-cols-6 opacity-30 blur-sm pointer-events-none">
            {mosaicAlbums.map((item: any, i: number) => (
                <img key={i} src={item.image} className="w-full h-full object-cover" />
            ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#14181c] via-[#14181c]/80 to-transparent"></div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-8 items-end">
            <div className="flex-1">
                <h4 className="text-gray-400 uppercase tracking-widest text-xs mb-2">Liste par <span className="text-white font-bold">{owner.username}</span></h4>
                <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight">{list.title}</h1>
                <p className="text-gray-300 text-lg max-w-2xl">{list.description}</p>
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                    <span>{list.albums?.length || 0} éléments</span>
                    <span>•</span>
                    <span>{new Date(list.created_at).toLocaleDateString()}</span>
                </div>
            </div>

            <div className="flex gap-3">
                <button onClick={handleShare} className="px-4 py-2 bg-[#2c3440] hover:bg-[#384252] text-white rounded border border-gray-600 transition text-xs font-bold uppercase">Partager</button>
                {currentUser && currentUser.id === list.user_id && (
                    <>
                        <button onClick={handleEdit} className="px-4 py-2 bg-[#2c3440] hover:bg-[#384252] text-white rounded border border-gray-600 transition text-xs font-bold uppercase">Modifier</button>
                        <button onClick={handleDelete} className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded border border-red-900/50 transition text-xs font-bold uppercase">Supprimer</button>
                    </>
                )}
            </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-4">
            {list.albums?.map((item: any, index: number) => (
                <Link key={index} href={`/album/${item.targetId || item.id}`} className="block group">
                    <div className="flex items-center gap-6 p-4 rounded-lg hover:bg-[#20262d] border border-transparent hover:border-gray-700 transition">
                        <div className="text-gray-600 font-mono text-xl w-8 text-center">{index + 1}</div>
                        <div className="w-20 h-20 flex-shrink-0 shadow-lg group-hover:scale-105 transition transform relative">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded" />
                            {item.type === 'song' && <div className="absolute bottom-1 right-1 bg-black/80 text-[#00e054] text-[10px] px-1 rounded">♫</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-white group-hover:text-[#00e054] transition truncate">{item.name}</h3>
                            <div className="flex items-center gap-2 text-gray-400 mt-1">
                                <span>{item.artist}</span>
                                {item.year && <><span className="text-gray-600">•</span><span className="text-gray-500">{item.year}</span></>}
                            </div>
                        </div>
                        <div className="text-gray-600 opacity-0 group-hover:opacity-100 transition pr-4">→</div>
                    </div>
                </Link>
            ))}
        </div>
      </main>
    </div>
  );
}