'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import ProfileMenu from '@/components/ui/profile-menu';
import { syncContactsToBackend } from '@/lib/contacts';
import { Capacitor } from '@capacitor/core';

export default function CommunityPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Suggestion d'amis via Contacts
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [permissionStep, setPermissionStep] = useState<'intro' | 'results'>('intro');
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                // Charger les abonnements existants pour ne pas suggérer ceux qu'on suit déjà
                const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
                if (follows) {
                    setFollowingIds(new Set(follows.map((f: any) => f.following_id)));
                }
            }
        };
        checkUser();
    }, []);

    const searchUsers = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setHasSearched(true);

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', `%${query}%`)
            .limit(20);

        if (error) {
            console.error("Erreur:", error);
        } else {
            setResults(data || []);
        }
        setLoading(false);
    };

    const handleSyncContacts = async () => {
        setIsSyncing(true);
        try {
            const result = await syncContactsToBackend(user.id);
            if (result.success && result.matches) {
                // Filtrer ceux qu'on suit déjà
                const newSuggestions = result.matches.filter((p: any) => !followingIds.has(p.id));
                setSuggestions(newSuggestions);
                setPermissionStep('results');
            } else {
                alert("Aucun contact trouvé sur MusicBoxd pour le moment.");
                setShowSyncModal(false);
            }
        } catch (e) {
            console.error(e);
            alert("Impossible de synchroniser les contacts. Vérifiez les permissions.");
            setShowSyncModal(false);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleFollowSuggestion = async (profileId: string) => {
        if (!user) return;

        const { error } = await supabase.from('follows').insert({
            follower_id: user.id,
            following_id: profileId
        });

        if (!error) {
            // Mettre à jour l'état local
            setFollowingIds(prev => new Set(prev).add(profileId));
            setSuggestions(prev => prev.filter(p => p.id !== profileId));
        } else {
            alert("Erreur lors du suivi.");
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black pb-20 overflow-x-hidden">

            {/* --- GLOWS D'AMBIANCE --- */}
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none z-0" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

            {/* --- FOND ALBUM ICÔNIQUE (THE DARK SIDE OF THE MOON) --- */}
            <div className="absolute top-0 inset-x-0 h-[70vh] w-full z-0 overflow-hidden pointer-events-none">
                <img src="https://upload.wikimedia.org/wikipedia/en/3/3b/Dark_Side_of_the_Moon.png"
                    className="w-full h-full object-cover blur-[10px] scale-125 opacity-70 animate-in fade-in duration-1000"
                    alt="The Dark Side of the Moon cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-[#050505]/60 to-[#050505]" />
            </div>

            {/* --- NAVBAR FLOTTANTE --- */}
            <div className="hidden md:flex fixed top-4 left-0 right-0 justify-center z-50 px-2 md:px-4">
                <nav className="flex items-center justify-between px-4 md:px-8 py-2 md:py-3 w-full max-w-5xl rounded-full transition-all duration-300 bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 border border-white/10 border-t-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
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
                        {user ? (
                            <ProfileMenu user={user} />
                        ) : (
                            <Link href="/login" className="bg-white text-black px-3 md:px-4 py-1.5 md:py-2 rounded-full hover:bg-[#00e054] transition text-[10px] md:text-sm">Connexion</Link>
                        )}
                    </div>
                </nav>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 pt-32 md:pt-40 pb-20 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="text-center mb-16">
                    <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight text-white">
                        La <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e054] to-emerald-500">Communauté</span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed mb-8">
                        Trouvez vos amis, découvrez de nouveaux curateurs musicaux et partagez vos découvertes.
                    </p>

                    {/* BOUTON FIND FRIENDS (Mobile Only ideally, but handled by logic) */}
                    {user && (Capacitor.isNativePlatform() || true) && ( // Enlever '|| true' en prod si on veut strict mobile
                        <button
                            onClick={() => { setShowSyncModal(true); setPermissionStep('intro'); }}
                            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-full font-bold transition flex items-center gap-2 mx-auto backdrop-blur-md"
                        >
                            <span>📱</span> Trouver mes contacts
                        </button>
                    )}
                </div>

                {/* BARRE DE RECHERCHE */}
                <form onSubmit={searchUsers} className="relative group max-w-2xl mx-auto mb-20 w-full">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#00e054] to-blue-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            placeholder="Rechercher un membre par pseudo..."
                            className="w-full px-4 md:px-8 py-4 md:py-5 pr-36 rounded-full transition-all duration-300 bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-200 border border-white/10 border-t-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.36),inset_0_1px_0_0_rgba(255,255,255,0.15)] text-lg focus:outline-none focus:border-[#00e054]/50"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="absolute right-2 bg-[#00e054] text-black font-bold px-6 py-2.5 rounded-full hover:bg-[#00c04b] transition disabled:opacity-50 hover:scale-105 shadow-lg shadow-green-900/20"
                        >
                            {loading ? '...' : 'Chercher'}
                        </button>
                    </div>
                </form>

                {/* RÉSULTATS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    {hasSearched && results.length === 0 && !loading && (
                        <div className="col-span-full text-center py-16 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                            <p className="text-gray-500 text-lg">Aucun membre trouvé avec ce pseudo.</p>
                        </div>
                    )}

                    {results.map((profile) => (
                        <Link key={profile.id} href={`/profile-view?u=${profile.username}`} className="group block">
                            <div className="flex items-center justify-between bg-[#121212] p-6 rounded-2xl border border-white/5 hover:border-[#00e054]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00e054] to-emerald-800 flex items-center justify-center text-2xl font-black text-black overflow-hidden border-2 border-[#14181c] shadow-lg group-hover:scale-110 transition duration-300">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                                        ) : (
                                            (profile.username && profile.username[0]) ? profile.username[0].toUpperCase() : '?'
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-xl group-hover:text-[#00e054] transition mb-1">{profile.username || 'Utilisateur'}</h3>
                                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Membre</p>
                                    </div>
                                </div>

                                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-500 group-hover:border-[#00e054] group-hover:text-[#00e054] group-hover:bg-[#00e054]/10 transition">
                                    ➜
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* --- MODALE DE SYNCHRONISATION --- */}
            {showSyncModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#181818] border border-white/10 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">

                        {permissionStep === 'intro' ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                                    👥
                                </div>
                                <h2 className="text-2xl font-black text-white mb-4">Retrouvez vos amis</h2>
                                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                                    Pour voir qui est déjà sur MusicBoxd, nous avons besoin d'accéder à vos contacts.
                                    <br /><br />
                                    Les numéros seront envoyés de manière sécurisée pour trouver des correspondances et ne seront pas stockés.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleSyncContacts}
                                        disabled={isSyncing}
                                        className="bg-[#00e054] text-black font-bold py-3.5 rounded-xl hover:bg-[#00c549] transition flex items-center justify-center gap-2"
                                    >
                                        {isSyncing ? 'Recherche...' : 'Continuer'}
                                    </button>
                                    <button
                                        onClick={() => setShowSyncModal(false)}
                                        className="text-gray-500 hover:text-white py-2 text-sm font-bold transition"
                                    >
                                        Plus tard
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col max-h-[70vh]">
                                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#181818] z-10">
                                    <h3 className="font-bold text-white text-lg">Amis suggérés ({suggestions.length})</h3>
                                    <button onClick={() => setShowSyncModal(false)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                                </div>

                                <div className="overflow-y-auto p-4 space-y-2 flex-1">
                                    {suggestions.length > 0 ? (
                                        <>
                                            <p className="text-gray-400 text-xs text-center mb-4">Ces contacts sont déjà sur MusicBoxd, voulez-vous les suivre ?</p>
                                            {suggestions.map(suggestion => (
                                                <div key={suggestion.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold overflow-hidden">
                                                            {suggestion.avatar_url ? (
                                                                <img src={suggestion.avatar_url} className="w-full h-full object-cover" />
                                                            ) : (
                                                                suggestion.username[0].toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white text-sm">{suggestion.username}</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleFollowSuggestion(suggestion.id)}
                                                        className="bg-white text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-[#00e054] transition"
                                                    >
                                                        Suivre
                                                    </button>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <div className="py-12 text-center text-gray-500">
                                            <p>Aucun nouvel ami trouvé dans vos contacts.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}