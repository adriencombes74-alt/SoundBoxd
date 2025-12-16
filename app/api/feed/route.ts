import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// On recrée un client Supabase côté serveur pour l'API
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ReviewItem {
  id: number;
  user_id: string;
  artist_name: string;
  // autres champs si nécessaire
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; 
}

export async function POST(request: Request) {
  try {
    console.log('🎯 Feed API appelée');
    const { userId, seenIds } = await request.json();
    console.log(`👤 User: ${userId}, Seen: ${seenIds.length} items`);
    
    // Le tableau des IDs à exclure (ceux déjà vus) pour la syntaxe Supabase
    // Note: .not('id', 'in', `(${seenIds.join(',')})`) est la syntaxe correcte pour une liste brute
    const excludeIdsStr = seenIds.length > 0 ? `(${seenIds.join(',')})` : '(-1)';
    
    let nextItems: ReviewItem[] = [];
    let favoriteArtists: string[] = [];

    // --- ÉTAPE 0 : Analyser les goûts de l'utilisateur (si connecté) ---
    if (userId) {
        // A. Récupérer les artistes des albums likés
        const { data: likedAlbums } = await supabase
            .from('album_likes')
            .select('artist_name')
            .eq('user_id', userId)
            .limit(20);
        
        if (likedAlbums) {
            likedAlbums.forEach((l: { artist_name: string }) => favoriteArtists.push(l.artist_name));
        }

        // B. Récupérer les artistes des reviews likées (Top 20 récents)
        // Note: Cela suppose une relation ou une jointure, faisons-le en deux temps pour être sûr
        const { data: likedReviews } = await supabase
            .from('likes')
            .select('review_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);
            
        if (likedReviews && likedReviews.length > 0) {
            const reviewIds = likedReviews.map((l: { review_id: number }) => l.review_id);
            const { data: artistsFromReviews } = await supabase
                .from('reviews')
                .select('artist_name')
                .in('id', reviewIds);
            
            if (artistsFromReviews) {
                artistsFromReviews.forEach((r: { artist_name: string }) => favoriteArtists.push(r.artist_name));
            }
        }

        // Dédoublonner la liste d'artistes
        favoriteArtists = [...new Set(favoriteArtists)];
    }

    // --- STRATÉGIE "CASCADE" ---

    // 1. PRIORITÉ : Les critiques des AMIS (si connecté)
    if (userId) {
        const { data: follows } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', userId);
        
        const friendIds = follows?.map((f: { following_id: string }) => f.following_id) || [];

        if (friendIds.length > 0) {
            const { data: profiles } = await supabase.from('profiles').select('username').in('id', friendIds);
            const friendUsernames = profiles?.map((p: { username: string }) => p.username) || [];

            // Chercher leurs critiques NON VUES
            const { data: friendReviews } = await supabase
                .from('reviews')
                .select('*, profiles(username, avatar_url)')
                .in('user_name', friendUsernames)
                .not('id', 'in', excludeIdsStr)
                .limit(3); // Max 3 amis par batch pour laisser de la place aux découvertes
            
            if (friendReviews) nextItems = [...nextItems, ...friendReviews];
        }
    }

    // 2. RECOMMANDATION : Critiques sur les artistes favoris (Content-Based)
    let limitNeeded = 5 - nextItems.length;
    
    if (limitNeeded > 0 && favoriteArtists.length > 0) {
        // On cherche des reviews qui parlent des artistes qu'on aime
        // mais écrites par des gens qu'on ne suit pas forcément
        const { data: recommendedReviews } = await supabase
            .from('reviews')
            .select('*, profiles(username, avatar_url)')
            .in('artist_name', favoriteArtists) // Le coeur de la recommandation !
            .not('id', 'in', excludeIdsStr)
            // On exclut les IDs qu'on a déjà ajoutés à l'étape 1 (amis)
            .not('id', 'in', `(${nextItems.map(i => i.id).concat(seenIds).join(',')})`) 
            .order('created_at', { ascending: false })
            .limit(limitNeeded);

        if (recommendedReviews && recommendedReviews.length > 0) {
            nextItems = [...nextItems, ...recommendedReviews];
        }
    }

    // 3. COMPLÉMENT : Contenu POPULAIRE (Discovery)
    // Si on n'a toujours pas 5 items (pas d'amis, pas de goûts connus, ou tout déjà vu)
    limitNeeded = 5 - nextItems.length;
    
    if (limitNeeded > 0) {
        // Au lieu de l'aléatoire pur, on prend les posts avec le plus de likes (Qualité)
        // Ou les plus récents si on veut de la fraîcheur
        const { data: popularReviews } = await supabase
            .from('reviews')
            .select('*, profiles(username, avatar_url)')
            .not('id', 'in', excludeIdsStr)
            .not('id', 'in', `(${nextItems.map(i => i.id).concat(seenIds).join(',')})`)
            .order('like_count', { ascending: false }) // Priorité aux posts populaires
            .limit(20); // On en prend 20 larges

        if (popularReviews) {
            // On mélange un peu ces résultats populaires pour ne pas toujours avoir les mêmes en boucle
            // C'est un "Shuffle pondéré par la popularité"
            const shuffled = popularReviews.sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, limitNeeded);
            nextItems = [...nextItems, ...selected];
        }
    }

    // 4. FALLBACK ULTIME : Tout ce qui traîne (Récents)
    // Si vraiment on n'a rien (base vide ou tout filtré), on prend juste les derniers
    limitNeeded = 5 - nextItems.length;
    if (limitNeeded > 0) {
        console.log('🔄 Fallback: chargement des reviews récentes');
        const { data: recentReviews, error: recentError } = await supabase
            .from('reviews')
            .select('*, profiles(username, avatar_url)')
            .not('id', 'in', excludeIdsStr)
            .order('created_at', { ascending: false })
            .limit(limitNeeded);
            
        if (recentError) {
            console.error('❌ Erreur fallback recent:', recentError);
        }
            
         if (recentReviews && recentReviews.length > 0) {
            console.log(`✅ ${recentReviews.length} reviews récentes chargées`);
            nextItems = [...nextItems, ...recentReviews];
        } else {
            console.log('⚠️ Aucune review récente trouvée');
        }
    }

    console.log(`📤 Retour API: ${nextItems.length} items`);
    return NextResponse.json({ success: true, items: nextItems });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erreur Feed API:", error);
    return NextResponse.json({ error: error?.message || "Une erreur est survenue" }, { status: 500 });
  }
}
