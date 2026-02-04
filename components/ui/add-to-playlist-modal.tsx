'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

interface AddToPlaylistModalProps {
    track: any;
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export default function AddToPlaylistModal({ track, isOpen, onClose, userId }: AddToPlaylistModalProps) {
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState<string | null>(null);
    const [spotifyConnected, setSpotifyConnected] = useState(false);

    useEffect(() => {
        const checkSpotify = async () => {
            const { data } = await supabase
                .from('user_integrations')
                .select('id')
                .eq('user_id', userId)
                .eq('provider', 'spotify')
                .single();
            if (data) setSpotifyConnected(true);
        };
        checkSpotify();
    }, [userId]);

    useEffect(() => {
        if (isOpen && userId) {
            fetchPlaylists();
        }
    }, [isOpen, userId, spotifyConnected]);

    const fetchPlaylists = async () => {
        setLoading(true);

        // 1. Fetch local Supabase playlists
        const { data: localData } = await supabase
            .from('lists')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        const localPlaylists = (localData || []).map(playlist => ({
            ...playlist,
            isSpotify: false
        }));

        // 2. Fetch Spotify playlists if connected
        let spotifyPlaylists: any[] = [];
        if (spotifyConnected) {
            try {
                const res = await fetch('/api/spotify/actions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        action: 'getPlaylists'
                    })
                });
                const data = await res.json();
                if (data.success) {
                    spotifyPlaylists = data.playlists.map((p: any) => ({
                        ...p,
                        isSpotify: true
                    }));
                }
            } catch (error) {
                console.error("Erreur chargement playlists Spotify:", error);
            }
        }

        setPlaylists([...localPlaylists, ...spotifyPlaylists]);
        setLoading(false);
    };

    const addToPlaylist = async (playlist: any) => {
        setAdding(playlist.id);

        try {
            if (playlist.isSpotify) {
                // Add to Spotify playlist
                const res = await fetch('/api/spotify/actions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        action: 'addToPlaylist',
                        playlistId: playlist.id,
                        query: `${track.trackName || track.collectionName} ${track.artistName}`
                    })
                });

                if (res.ok) {
                    alert(`Ajouté à la playlist Spotify "${playlist.name}" !`);
                    onClose();
                } else {
                    throw new Error("Erreur API Spotify");
                }
            } else {
                // Add to local Supabase playlist
                const newTrack = {
                    targetId: track.collectionId || track.trackId,
                    name: track.trackName || track.collectionName,
                    artist: track.artistName,
                    image: track.artworkUrl100?.replace('100x100', '400x400'),
                    type: track.kind === 'song' ? 'song' : 'album',
                    year: track.releaseDate ? new Date(track.releaseDate).getFullYear() : null,
                    addedAt: new Date().toISOString()
                };

                const currentAlbums = Array.isArray(playlist.albums) ? playlist.albums : [];
                const exists = currentAlbums.some((t: any) => String(t.targetId) === String(newTrack.targetId));

                if (exists) {
                    alert('Cette musique est déjà dans la playlist !');
                    setAdding(null);
                    return;
                }

                const updatedAlbums = [newTrack, ...currentAlbums];

                const { error } = await supabase
                    .from('lists')
                    .update({ albums: updatedAlbums })
                    .eq('id', playlist.id);

                if (error) throw error;

                alert(`Ajouté à "${playlist.title}" !`);
                onClose();
            }
        } catch (e) {
            console.error('Erreur ajout playlist:', e);
            alert("Erreur lors de l'ajout à la playlist.");
        }
        setAdding(null);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <motion.div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    >
                        <div className="flex justify-between items-center p-6 border-b border-white/10">
                            <h3 className="text-xl font-bold text-white">Ajouter à une playlist</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
                        </div>

                        <div className="p-2 max-h-[60vh] overflow-y-auto">
                            {loading ? (
                                <div className="text-center py-8 text-gray-500">Chargement...</div>
                            ) : playlists.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Aucune playlist trouvée. Créez-en une ou liez Spotify !
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {playlists.map(playlist => (
                                        <button
                                            key={`${playlist.isSpotify ? 'spotify' : 'local'}-${playlist.id}`}
                                            disabled={!!adding}
                                            onClick={() => addToPlaylist(playlist)}
                                            className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 hover:border-[#00e054]/50 border border-transparent transition flex items-center gap-4 group"
                                        >
                                            {playlist.isSpotify ? (
                                                playlist.images?.[0]?.url ? (
                                                    <img src={playlist.images[0].url} className="w-12 h-12 rounded-lg object-cover" alt="" />
                                                ) : (
                                                    <div className="w-12 h-12 bg-[#222] rounded-lg flex items-center justify-center text-lg">♫</div>
                                                )
                                            ) : (
                                                <div className="w-12 h-12 bg-[#222] rounded-lg flex items-center justify-center text-xl font-bold text-gray-500 group-hover:text-[#00e054]">
                                                    {playlist.title?.[0] || '♫'}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-white group-hover:text-[#00e054] transition truncate">
                                                    {playlist.isSpotify ? playlist.name : playlist.title}
                                                    {playlist.isSpotify && (
                                                        <span className="ml-2 text-[10px] bg-green-600 px-1.5 py-0.5 rounded">Spotify</span>
                                                    )}
                                                </h4>
                                                <p className="text-xs text-gray-500">
                                                    {playlist.isSpotify ? `${playlist.tracks?.total || 0} titres` : `${playlist.albums?.length || 0} titres`}
                                                </p>
                                            </div>
                                            {adding === playlist.id ? (
                                                <div className="ml-auto text-[#00e054] animate-spin">↻</div>
                                            ) : (
                                                <div className="opacity-0 group-hover:opacity-100 text-[#00e054]">
                                                    <Check className="w-5 h-5" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
