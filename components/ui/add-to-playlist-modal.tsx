'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

interface AddToPlaylistModalProps {
    track: any;
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export default function AddToPlaylistModal({ track, isOpen, onClose, userId }: AddToPlaylistModalProps) {
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState<string | null>(null); // ID of playlist being added to

    useEffect(() => {
        if (isOpen && userId) {
            fetchPlaylists();
        }
    }, [isOpen, userId]);

    const fetchPlaylists = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('lists')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        setPlaylists(data || []);
        setLoading(false);
    };

    const addToPlaylist = async (playlist: any) => {
        setAdding(playlist.id);

        // Create new track object
        const newTrack = {
            targetId: track.collectionId || track.trackId,
            name: track.trackName || track.collectionName,
            artist: track.artistName,
            image: track.artworkUrl100?.replace('100x100', '400x400'),
            type: track.kind === 'song' ? 'song' : 'album',
            year: track.releaseDate ? new Date(track.releaseDate).getFullYear() : null,
            addedAt: new Date().toISOString()
        };

        const currentAlbums = playlist.albums || [];
        const updatedAlbums = [newTrack, ...currentAlbums];

        const { error } = await supabase
            .from('lists')
            .update({ albums: updatedAlbums })
            .eq('id', playlist.id);

        if (!error) {
            alert(`Ajouté à ${playlist.title} !`);
            onClose();
        } else {
            console.error(error);
            alert("Erreur lors de l'ajout.");
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
                        className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-hidden"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Ajouter à une liste</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {loading ? (
                                <div className="text-center py-8 text-gray-500">Chargement...</div>
                            ) : playlists.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Aucune liste trouvée. Créez-en une d'abord !
                                </div>
                            ) : (
                                playlists.map(playlist => (
                                    <button
                                        key={playlist.id}
                                        disabled={!!adding}
                                        onClick={() => addToPlaylist(playlist)}
                                        className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 hover:border-[#00e054]/50 border border-transparent transition flex items-center gap-4 group"
                                    >
                                        <div className="w-12 h-12 bg-[#222] rounded-lg flex items-center justify-center text-xl font-bold text-gray-500 group-hover:text-[#00e054]">
                                            {playlist.title[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white group-hover:text-[#00e054] transition">{playlist.title}</h4>
                                            <p className="text-xs text-gray-500">{playlist.albums?.length || 0} titres</p>
                                        </div>
                                        {adding === playlist.id && (
                                            <div className="ml-auto text-[#00e054] animate-spin">↻</div>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
