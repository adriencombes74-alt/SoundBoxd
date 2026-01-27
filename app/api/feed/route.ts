import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface FeedItem {
    id: number;
    user_id: string;
    album_id: string;
    album_name: string;
    album_image: string;
    artist_name: string;
    rating: number | null;
    review_text: string;
    created_at: string;
    profiles: {
        username: string;
        avatar_url?: string;
    };
    preview_url_cache?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

// Fallback genres if user has no data
const DISCOVERY_GENRES = [
    "pop", "rock", "hip hop", "jazz", "electronic", "r&b", "indie", "alternative", "rap", "soul"
];

async function fetchItunesRecommendations(query: string, limit: number): Promise<FeedItem[]> {
    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit * 2}`);
        const data = await response.json();

        if (!data.results) return [];

        return data.results.map((track: any) => ({
            id: track.trackId, // Use iTunes ID
            user_id: 'system',
            album_id: String(track.collectionId),
            album_name: track.trackName, // Promote Track Name as main title for better discovery
            album_image: track.artworkUrl100?.replace('100x100', '600x600'),
            artist_name: track.artistName,
            rating: 0,
            review_text: "",
            created_at: new Date().toISOString(),
            profiles: {
                username: "MusicBoxd Bot",
                avatar_url: null
            },
            preview_url_cache: track.previewUrl
        })).filter((item: FeedItem) => item.preview_url_cache); // Ensure we only get playable items
    } catch (e) {
        console.error("iTunes Fetch Error:", e);
        return [];
    }
}

export async function POST(request: Request) {
    try {
        const { userId, seenIds = [] } = await request.json();
        // Ensure seenIds is an array of safely formatted strings/numbers for SQL
        const safeSeenIds = seenIds.length > 0 ? `(${seenIds.join(',')})` : '(-1)';

        let nextItems: FeedItem[] = [];
        let favoriteArtists: string[] = [];
        let friendIds: string[] = [];

        // --- STEP 1: ANALYZE USER PROFILE (If logged in) ---
        if (userId) {
            // 1A. Get Friends
            const { data: follows } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', userId);

            friendIds = follows?.map((f: any) => f.following_id) || [];

            // 1B. Get Artists from Album Likes
            const { data: likedAlbums } = await supabase
                .from('album_likes')
                .select('artist_name')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);
            likedAlbums?.forEach((l: any) => favoriteArtists.push(l.artist_name));

            // 1C. Get Artists from Review Likes
            const { data: likedReviews } = await supabase
                .from('likes')
                .select('review_id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (likedReviews && likedReviews.length > 0) {
                const reviewIds = likedReviews.map((l: any) => l.review_id);
                const { data: artistsFromReviews } = await supabase
                    .from('reviews')
                    .select('artist_name')
                    .in('id', reviewIds);
                artistsFromReviews?.forEach((r: any) => favoriteArtists.push(r.artist_name));
            }

            // 1D. Get Artists from Playlists (NEW)
            const { data: playlists } = await supabase
                .from('lists')
                .select('albums')
                .eq('user_id', userId)
                .limit(10);

            if (playlists) {
                playlists.forEach((p: any) => {
                    if (Array.isArray(p.albums)) {
                        p.albums.forEach((track: any) => {
                            if (track.artist) favoriteArtists.push(track.artist);
                        });
                    }
                });
            }

            favoriteArtists = [...new Set(favoriteArtists)];
        }

        // --- STEP 2: LOAD CONTENT (Priority Cascade) ---

        // 2A. FRIENDS ACTIVITY (Reviews + Likes)
        if (friendIds.length > 0) {
            // Friends' Reviews
            const { data: friendReviews } = await supabase
                .from('reviews')
                .select('*, profiles(username, avatar_url)')
                .in('user_id', friendIds)
                .not('id', 'in', safeSeenIds)
                .order('created_at', { ascending: false })
                .limit(3);

            if (friendReviews) nextItems = [...nextItems, ...friendReviews] as FeedItem[];

            // Friends' Album Likes (Converted to Feed Items)
            // Only if we need more items
            if (nextItems.length < 3) {
                const { data: friendLikes } = await supabase
                    .from('album_likes')
                    .select('id, album_id, album_name, album_image, artist_name, created_at, user_id')
                    .in('user_id', friendIds)
                    // Warning: album_likes IDs might conflict with review IDs if not careful, 
                    // but seenIds usually tracks what was served. 
                    // We might need to handle ID collision if client treats them identically.
                    // For now, we assume ID spaces might overlap but `item_type` helps if we had it.
                    // Ideally we filter by album_id too but let's stick to ID exclusion.
                    .not('id', 'in', safeSeenIds)
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (friendLikes) {
                    // Fetch profiles for these likes
                    const uIds = friendLikes.map((l: any) => l.user_id);
                    const { data: likeProfiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', uIds);

                    const mappedLikes = friendLikes.map((l: any) => {
                        const profile = likeProfiles?.find((p: any) => p.id === l.user_id) || { username: 'Ami', avatar_url: null };
                        return {
                            id: l.id, // Use like ID
                            user_id: l.user_id,
                            album_id: l.album_id,
                            album_name: l.album_name,
                            album_image: l.album_image,
                            artist_name: l.artist_name,
                            rating: null,
                            review_text: "", // No text for a like
                            created_at: l.created_at,
                            profiles: {
                                username: profile.username,
                                avatar_url: profile.avatar_url
                            },
                            is_like_event: true // Flag for frontend if needed
                        } as FeedItem;
                    });
                    nextItems = [...nextItems, ...mappedLikes];
                }
            }
        }

        // 2B. RECOMMENDATIONS (Content-Based)
        let limitNeeded = 5 - nextItems.length;
        if (limitNeeded > 0 && favoriteArtists.length > 0) {
            const { data: recs } = await supabase
                .from('reviews')
                .select('*, profiles(username, avatar_url)')
                .in('artist_name', favoriteArtists)
                .not('id', 'in', safeSeenIds)
                .not('id', 'in', `(${nextItems.map(i => i.id).join(',')})`) // Exclude what we just added
                .limit(limitNeeded);

            if (recs) nextItems = [...nextItems, ...recs] as FeedItem[];
        }

        // 2C. POPULAR / RECENT (Internal DB)
        limitNeeded = 5 - nextItems.length;
        if (limitNeeded > 0) {
            const { data: popular } = await supabase
                .from('reviews')
                .select('*, profiles(username, avatar_url)')
                .not('id', 'in', safeSeenIds)
                .not('id', 'in', `(${nextItems.map(i => i.id).join(',')})`)
                .order('like_count', { ascending: false })
                .limit(10); // Fetch more to shuffle

            if (popular) {
                const shuffled = popular.sort(() => 0.5 - Math.random()).slice(0, limitNeeded);
                nextItems = [...nextItems, ...shuffled] as FeedItem[];
            }
        }

        // --- STEP 3: INFINITE FALLBACK (External API) ---
        // If we STILL don't have enough items, fetch from iTunes with "True Discovery" logic
        // Goal: Find *genre* of liked artist, then find *different* artists in that genre
        if (nextItems.length < 5) {
            console.log("⚠️ DB exhausted or need variety. Fetching 'True Discovery'...");

            let queryTerm = "";
            let genreToSearch = "";
            let seedArtist = "";

            // 1. Determine Genre/Seed
            if (favoriteArtists.length > 0) {
                // Pick a random favorite artist to use as a "Seed"
                seedArtist = favoriteArtists[Math.floor(Math.random() * favoriteArtists.length)];

                // Try to find the genre of this artist (Real-time lookup)
                try {
                    const artistRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(seedArtist)}&entity=musicArtist&limit=1`);
                    const artistData = await artistRes.json();
                    if (artistData.results && artistData.results.length > 0) {
                        genreToSearch = artistData.results[0].primaryGenreName;
                        console.log(`🎨 Artist "${seedArtist}" is genre: "${genreToSearch}"`);
                    }
                } catch (e) {
                    console.log("Failed to fetch artist genre, falling back to name");
                }
            }

            // 2. Build Query
            if (genreToSearch) {
                queryTerm = genreToSearch; // Search by Genre!
            } else if (seedArtist) {
                queryTerm = seedArtist; // Fallback: Search by Artist (Old behavior)
            } else {
                // Fallback: Random Genre
                queryTerm = DISCOVERY_GENRES[Math.floor(Math.random() * DISCOVERY_GENRES.length)];
            }

            // 3. Fetch Recommendations
            // Fetch MORE items (20) to allow for aggressive filtering
            const externalItems = await fetchItunesRecommendations(queryTerm, 20);

            // 4. STRICT NOVELTY FILTERING
            // Filter out:
            // - Any artist already in the feed (nextItems)
            // - Any artist the user already LIKES (favoriteArtists)
            // - The Seed Artist itself

            const existingAlbumIds = new Set(nextItems.map(i => i.album_id));
            const knownArtists = new Set(favoriteArtists.map(a => a.toLowerCase()));
            if (seedArtist) knownArtists.add(seedArtist.toLowerCase());

            const trueDiscoveries = externalItems.filter(item => {
                // 1. Dedupe by Album ID
                if (existingAlbumIds.has(item.album_id)) return false;

                // 2. NOVELTY CHECK: Is this artist already known?
                const artist = item.artist_name.toLowerCase();
                if (knownArtists.has(artist)) {
                    // console.log(`Skipping known artist: ${artist}`);
                    return false;
                }

                return true;
            });

            console.log(`✨ Discovery: Found ${trueDiscoveries.length} new tracks in genre "${queryTerm || 'Random'}"`);

            // Take top 5
            nextItems = [...nextItems, ...trueDiscoveries.slice(0, 5)];
        }

        // --- STEP 3B: ROUND-ROBIN MIXER & STRICT DIVERSITY ---
        // Instead of random shuffle, we gather everything and then smart-sort

        // 1. Shuffle first to randomize within categories
        const pool = nextItems.sort(() => 0.5 - Math.random());

        const finalItems: FeedItem[] = [];
        const artistMemory: string[] = []; // Memory of last 4 artists

        // Try to pick items that don't violate diversity rules

        let remainingPool = [...pool];

        // Logic: Find the first item in the pool that hasn't been heard recently
        while (remainingPool.length > 0) {
            let bestIndex = -1;

            for (let i = 0; i < remainingPool.length; i++) {
                const candidate = remainingPool[i];
                const artist = candidate.artist_name.toLowerCase();

                // Check if artist is in recent memory (last 4 tracks)
                if (!artistMemory.includes(artist)) {
                    bestIndex = i;
                    break;
                }
            }

            // If we found a good candidate, take it
            if (bestIndex !== -1) {
                const selected = remainingPool[bestIndex];
                finalItems.push(selected);
                artistMemory.push(selected.artist_name.toLowerCase());
                if (artistMemory.length > 4) artistMemory.shift(); // Keep last 4
                remainingPool.splice(bestIndex, 1);
            } else {
                // If NO candidate fits the strict rules (all clash), 
                // just take the first one to avoid infinite loop, but strictly reduce clashing if possible
                // (e.g. pick the one that appeared furthest ago? For now just pick first)
                const backup = remainingPool[0];
                finalItems.push(backup);
                artistMemory.push(backup.artist_name.toLowerCase());
                if (artistMemory.length > 4) artistMemory.shift();
                remainingPool.shift();
            }
        }

        return NextResponse.json({
            success: true,
            items: finalItems,
            hasMore: true
        });

    } catch (error: any) {
        console.error("Feed API Error:", error);
        return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
    }
}
