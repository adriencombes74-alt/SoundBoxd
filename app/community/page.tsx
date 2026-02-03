'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProfileMenu from '@/components/ui/profile-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Check, Plus, Share2 } from 'lucide-react';
import PullToRefresh from '@/components/ui/pull-to-refresh';
import { Skeleton } from '@/components/ui/skeleton';
import { hapticLike, hapticMenu } from '@/lib/haptic';
import { useDoubleTap } from '@/hooks/useDoubleTap';

export default function CommunityPage() {
    const [user, setUser] = useState<any>(null);

    // Feed States
    const [posts, setPosts] = useState<any[]>([]);
    const [feedLoading, setFeedLoading] = useState(true);
    const [userLikes, setUserLikes] = useState<Set<number>>(new Set());

    // Comment Modal
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);

    // Create Post Menu
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const [userLists, setUserLists] = useState<any[]>([]);
    const [showListSelectionModal, setShowListSelectionModal] = useState(false);

    // Charger l'utilisateur
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        checkUser();
    }, []);

    // Charger le feed
    useEffect(() => {
        fetchFeed();
    }, [user]);

    const fetchFeed = async () => {
        setFeedLoading(true);
        try {
            // Récupérer les posts
            const { data: postsData, error: postsError } = await supabase
                .from('list_posts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (postsError) throw postsError;

            if (!postsData || postsData.length === 0) {
                setPosts([]);
                setFeedLoading(false);
                return;
            }

            // Récupérer les profils
            const userIds = [...new Set(postsData.map(p => p.user_id))];
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .in('id', userIds);

            // Récupérer les listes
            const listIds = [...new Set(postsData.map(p => p.list_id))];
            const { data: listsData } = await supabase
                .from('lists')
                .select('id, title, description, albums, created_at')
                .in('id', listIds);

            // Mapper les profils et listes aux posts
            const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
            const listsMap = new Map(listsData?.map(l => [l.id, l]) || []);

            // Charger les compteurs de likes et commentaires
            const postIds = postsData.map(p => p.id);

            const { data: likesData } = await supabase
                .from('list_post_likes')
                .select('post_id')
                .in('post_id', postIds);

            const { data: commentsData } = await supabase
                .from('list_post_comments')
                .select('post_id')
                .in('post_id', postIds);

            // Mapper les counts
            const likesMap = new Map();
            likesData?.forEach(l => {
                likesMap.set(l.post_id, (likesMap.get(l.post_id) || 0) + 1);
            });

            const commentsMap = new Map();
            commentsData?.forEach(c => {
                commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1);
            });

            const enrichedPosts = postsData.map(post => ({
                ...post,
                profiles: profilesMap.get(post.user_id) || { id: post.user_id, username: 'Inconnu', avatar_url: null },
                lists: listsMap.get(post.list_id) || null,
                like_count: likesMap.get(post.id) || 0,
                comment_count: commentsMap.get(post.id) || 0
            }));

            setPosts(enrichedPosts);

            if (user) {
                const { data: userLikesData } = await supabase
                    .from('list_post_likes')
                    .select('post_id')
                    .eq('user_id', user.id);

                if (userLikesData) {
                    setUserLikes(new Set(userLikesData.map((l: any) => l.post_id)));
                }
            }
        } catch (error) {
            console.error('Erreur chargement feed:', error);
        } finally {
            setFeedLoading(false);
        }
    };

    const handleLikePost = async (postId: number) => {
        if (!user) {
            alert("Connectez-vous pour liker !");
            return;
        }

        const isLiked = userLikes.has(postId);

        if (isLiked) {
            const { error } = await supabase
                .from('list_post_likes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', user.id);

            if (!error) {
                setUserLikes(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(postId);
                    return newSet;
                });
                setPosts(prev => prev.map(p =>
                    p.id === postId ? { ...p, like_count: (p.like_count || 1) - 1 } : p
                ));
            }
        } else {
            const { error } = await supabase
                .from('list_post_likes')
                .insert({ post_id: postId, user_id: user.id });

            if (!error) {
                setUserLikes(prev => new Set(prev).add(postId));
                setPosts(prev => prev.map(p =>
                    p.id === postId ? { ...p, like_count: (p.like_count || 0) + 1 } : p
                ));
            }
        }
    };

    const openCommentModal = async (post: any) => {
        setSelectedPost(post);
        setShowCommentModal(true);

        const { data: commentsData } = await supabase
            .from('list_post_comments')
            .select(`
                *,
                profiles:user_id (username, avatar_url)
            `)
            .eq('post_id', post.id)
            .order('created_at', { ascending: true });

        setComments(commentsData || []);
    };

    const handlePostComment = async () => {
        if (!user || !newComment.trim() || !selectedPost) return;

        setIsPostingComment(true);

        const { data, error } = await supabase
            .from('list_post_comments')
            .insert({
                post_id: selectedPost.id,
                user_id: user.id,
                content: newComment.trim()
            })
            .select(`
                *,
                profiles:user_id (username, avatar_url)
            `)
            .single();

        if (!error && data) {
            setComments(prev => [...prev, data]);
            setNewComment('');
            setPosts(prev => prev.map(p =>
                p.id === selectedPost.id ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p
            ));
        }

        setIsPostingComment(false);
    };

    const openCreateMenu = async () => {
        if (!user) {
            alert("Connectez-vous pour créer des posts !");
            return;
        }

        setShowCreateMenu(true);

        const { data: listsData } = await supabase
            .from('lists')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        setUserLists(listsData || []);
    };

    const handleShareExistingList = async (list: any) => {
        const { data: existingPost } = await supabase
            .from('list_posts')
            .select('id')
            .eq('list_id', list.id)
            .maybeSingle();

        if (existingPost) {
            alert("Cette liste est déjà partagée !");
            return;
        }

        const { error } = await supabase
            .from('list_posts')
            .insert({
                user_id: user.id,
                list_id: list.id,
                caption: null
            });

        if (!error) {
            setShowListSelectionModal(false);
            setShowCreateMenu(false);
            fetchFeed();
        } else {
            alert("Erreur lors du partage");
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00e054] selection:text-black pb-20 overflow-x-hidden">

            {/* GLOWS */}
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none z-0" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

            {/* NAVBAR */}
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
                        <Link href="/search?type=members" className="hover:text-white transition hidden md:inline">Membres</Link>
                        {user ? (
                            <ProfileMenu user={user} />
                        ) : (
                            <Link href="/login" className="bg-white text-black px-3 md:px-4 py-1.5 md:py-2 rounded-full hover:bg-[#00e054] transition text-[10px] md:text-sm">Connexion</Link>
                        )}
                    </div>
                </nav>
            </div>

            <PullToRefresh
                onRefresh={fetchFeed}
                className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 pt-20 md:pt-32 lg:pt-40 pb-12 md:pb-20 min-h-screen"
            >
                <div className="text-center mb-8 md:mb-12">
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6 tracking-tight text-white">
                        Feed <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e054] to-emerald-500">Communautaire</span>
                    </h1>
                    <p className="text-gray-400 text-sm md:text-lg max-w-sm md:max-w-2xl mx-auto leading-relaxed mb-6 md:mb-8 px-2">
                        Découvrez les listes musicales partagées par la communauté.
                    </p>
                </div>

                {/* BOUTON FLOTTANT + CRÉER */}
                {user && (
                    <motion.button
                        onClick={openCreateMenu}
                        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-50 w-14 h-14 md:w-16 md:h-16 bg-[#00e054] text-black rounded-full shadow-2xl shadow-green-900/40 flex items-center justify-center hover:scale-110 transition-transform"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Plus className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
                    </motion.button>
                )}

                {/* FEED */}
                <div className="space-y-6">
                    {feedLoading ? (
                        <div className="space-y-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-[#121212] rounded-3xl border border-white/5 p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <Skeleton className="w-12 h-12 rounded-full skeleton-shimmer" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-32 skeleton-shimmer" />
                                            <Skeleton className="h-3 w-20 skeleton-shimmer" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-40 w-full rounded-2xl skeleton-shimmer mb-4" />
                                    <div className="flex gap-4">
                                        <Skeleton className="h-8 w-16 rounded-full skeleton-shimmer" />
                                        <Skeleton className="h-8 w-16 rounded-full skeleton-shimmer" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                            <p className="text-gray-500 mb-4">Aucune liste partagée pour le moment.</p>
                            <p className="text-sm text-gray-600">Soyez le premier à partager votre liste !</p>
                        </div>
                    ) : (
                        posts.map((post) => (
                            <ListPostCard
                                key={post.id}
                                post={post}
                                isLiked={userLikes.has(post.id)}
                                onLike={() => handleLikePost(post.id)}
                                onComment={() => openCommentModal(post)}
                            />
                        ))
                    )}
                </div>
            </PullToRefresh>

            {/* MODALE COMMENTAIRES */}
            <AnimatePresence>
                {showCommentModal && selectedPost && (
                    <motion.div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                            onClick={() => setShowCommentModal(false)}
                        />
                        <motion.div
                            className="relative bg-[#121212] border border-white/10 rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <h3 className="text-xl font-black text-white">Commentaires</h3>
                                <button
                                    onClick={() => setShowCommentModal(false)}
                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition">
                                    ✕
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {comments.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">Aucun commentaire pour le moment.</p>
                                ) : (
                                    comments.map((comment) => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0">
                                                {comment.profiles?.avatar_url ? (
                                                    <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    comment.profiles?.username?.[0]?.toUpperCase() || '?'
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-white text-sm">{comment.profiles?.username || 'Utilisateur'}</div>
                                                <p className="text-gray-300 text-sm mt-1">{comment.content}</p>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    {new Date(comment.created_at).toLocaleDateString('fr-FR', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-4 border-t border-white/10">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Ajouter un commentaire..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handlePostComment();
                                            }
                                        }}
                                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#00e054] outline-none transition"
                                    />
                                    <button
                                        onClick={handlePostComment}
                                        disabled={!newComment.trim() || isPostingComment}
                                        className="bg-[#00e054] text-black px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00c04b] transition"
                                    >
                                        {isPostingComment ? '...' : 'Publier'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MENU CRÉER POST */}
            <AnimatePresence>
                {showCreateMenu && (
                    <motion.div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                            onClick={() => setShowCreateMenu(false)}
                        />
                        <motion.div
                            className="relative bg-[#121212] border border-white/10 rounded-3xl w-full max-w-sm p-6"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <h3 className="text-2xl font-black text-white mb-6">Créer un post</h3>

                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        setShowCreateMenu(false);
                                        setShowListSelectionModal(true);
                                    }}
                                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-xl transition text-left px-5 flex items-center gap-3"
                                >
                                    <Share2 className="w-5 h-5 text-[#00e054]" />
                                    <div>
                                        <div className="font-bold">Partager une liste existante</div>
                                        <div className="text-xs text-gray-500 mt-0.5">Choisissez parmi vos listes</div>
                                    </div>
                                </button>

                                <Link
                                    href="/lists/create"
                                    className="w-full bg-[#00e054]/10 hover:bg-[#00e054]/20 border border-[#00e054]/30 text-white py-4 rounded-xl transition text-left px-5 flex items-center gap-3 block"
                                    onClick={() => setShowCreateMenu(false)}
                                >
                                    <Plus className="w-5 h-5 text-[#00e054]" />
                                    <div>
                                        <div className="font-bold">Créer une nouvelle liste</div>
                                        <div className="text-xs text-gray-500 mt-0.5">Commencez dès maintenant</div>
                                    </div>
                                </Link>
                            </div>

                            <button
                                onClick={() => setShowCreateMenu(false)}
                                className="w-full mt-4 text-gray-500 hover:text-white py-2 text-sm transition"
                            >
                                Annuler
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODALE SÉLECTION DE LISTE */}
            <AnimatePresence>
                {showListSelectionModal && (
                    <motion.div
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                            onClick={() => setShowListSelectionModal(false)}
                        />
                        <motion.div
                            className="relative bg-[#121212] border border-white/10 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <h3 className="text-xl font-black text-white">Choisir une liste</h3>
                                <button
                                    onClick={() => setShowListSelectionModal(false)}
                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {userLists.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 mb-4">Vous n'avez pas encore de liste.</p>
                                        <Link
                                            href="/lists/create"
                                            className="inline-block bg-[#00e054] text-black px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#00c04b] transition"
                                            onClick={() => setShowListSelectionModal(false)}
                                        >
                                            Créer ma première liste
                                        </Link>
                                    </div>
                                ) : (
                                    userLists.map((list) => (
                                        <button
                                            key={list.id}
                                            onClick={() => handleShareExistingList(list)}
                                            className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition text-left group"
                                        >
                                            {list.albums?.[0]?.image && (
                                                <img
                                                    src={list.albums[0].image}
                                                    className="w-12 h-12 rounded object-cover"
                                                    alt={list.title}
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-white text-sm truncate group-hover:text-[#00e054]">{list.title}</div>
                                                <div className="text-xs text-gray-500">{list.albums?.length || 0} titres</div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Composant ListPostCard
function ListPostCard({ post, isLiked, onLike, onComment }: any) {
    const list = post.lists;
    const author = post.profiles;
    const router = useRouter();

    const albumCovers = list?.albums?.slice(0, 9).map((album: any) => album.image) || [];

    const [showHeartAnimation, setShowHeartAnimation] = useState(false);

    const [likeCount, setLikeCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);

    useEffect(() => {
        const fetchCounts = async () => {
            const { count: likes } = await supabase
                .from('list_post_likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);
            setLikeCount(likes || 0);

            const { count: comments } = await supabase
                .from('list_post_comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);
            setCommentCount(comments || 0);
        };

        fetchCounts();
    }, [post.id]);

    // Synchroniser avec les props quand elles changent
    useEffect(() => {
        if (post.like_count !== undefined) {
            setLikeCount(post.like_count);
        }
        if (post.comment_count !== undefined) {
            setCommentCount(post.comment_count);
        }
    }, [post.like_count, post.comment_count]);

    const handleDoubleTapLike = () => {
        hapticLike();
        if (!isLiked) {
            onLike();
        }
        // Show heart animation
        setShowHeartAnimation(true);
        setTimeout(() => setShowHeartAnimation(false), 800);
    };

    const handleTap = useDoubleTap({
        onSingleTap: () => router.push(`/list-view?id=${list?.id}`),
        onDoubleTap: handleDoubleTapLike,
        delay: 250
    });

    return (
        <motion.div
            className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="p-4 flex items-center gap-3 border-b border-white/5">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold overflow-hidden">
                    {author?.avatar_url ? (
                        <img src={author.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                        author?.username?.[0]?.toUpperCase() || '?'
                    )}
                </div>
                <div className="flex-1">
                    <Link href={`/profile-view?u=${author?.username}`} className="font-bold text-white hover:text-[#00e054] transition">
                        @{author?.username || 'Utilisateur'}
                    </Link>
                    <p className="text-xs text-gray-500">
                        {new Date(post.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>
            </div>

            <div
                onClick={handleTap}
                className="block cursor-pointer relative"
            >
                <div className={`grid gap-0.5 p-4 bg-gradient-to-br from-purple-900/20 to-green-900/10 ${albumCovers.length === 1 ? 'grid-cols-1' :
                    albumCovers.length <= 4 ? 'grid-cols-2' :
                        'grid-cols-3'
                    } aspect-square`}>
                    {albumCovers.map((cover: string, i: number) => (
                        <div key={i} className="relative overflow-hidden rounded-lg bg-gray-900">
                            <img
                                src={cover}
                                className="w-full h-full object-cover hover:scale-105 transition duration-300"
                                alt=""
                            />
                        </div>
                    ))}
                </div>

                {/* Double-tap heart animation */}
                <AnimatePresence>
                    {showHeartAnimation && (
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                            <Heart className="w-24 h-24 fill-red-500 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="p-4 border-t border-white/5">
                <Link href={`/list-view?id=${list?.id}`}>
                    <h3 className="font-black text-white text-lg mb-1 hover:text-[#00e054] transition">{list?.title}</h3>
                </Link>
                {post.caption && (
                    <p className="text-gray-400 text-sm mb-3">{post.caption}</p>
                )}
                <p className="text-xs text-gray-600">{list?.albums?.length || 0} titres</p>
            </div>

            <div className="p-4 border-t border-white/5 flex items-center gap-6">
                <button
                    onClick={() => {
                        hapticLike();
                        onLike();
                    }}
                    className="flex items-center gap-2 group"
                >
                    <Heart
                        className={`w-5 h-5 transition ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover:text-red-500'}`}
                    />
                    <span className={`text-sm font-bold ${isLiked ? 'text-red-500' : 'text-gray-400 group-hover:text-white'}`}>
                        {likeCount}
                    </span>
                </button>

                <button
                    onClick={onComment}
                    className="flex items-center gap-2 group"
                >
                    <MessageCircle className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition" />
                    <span className="text-sm font-bold text-gray-400 group-hover:text-white">
                        {commentCount}
                    </span>
                </button>
            </div>
        </motion.div>
    );
}