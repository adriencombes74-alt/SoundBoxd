import { NextResponse } from 'next/server';

// Fonction pour obtenir un token d'accès temporaire Spotify
async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Clés Spotify manquantes dans les variables d'environnement");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Erreur Spotify API: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  if (!data.access_token) {
    throw new Error("Token d'accès non reçu de Spotify");
  }

  return data.access_token;
}

// Fonction de "Matching" : Cherche un titre Spotify sur iTunes
async function matchWithItunes(trackName: string, artistName: string) {
    try {
        // Nettoyer et préparer la requête
        const query = `${trackName.trim()} ${artistName.trim()}`.substring(0, 100);
        const res = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`,
            {
                headers: {
                    'User-Agent': 'MusicBoxd-App/1.0'
                }
            }
        );

        if (!res.ok) {
            console.warn(`Erreur iTunes pour "${trackName}" de ${artistName}: ${res.status}`);
            return null;
        }

        const data = await res.json();

        if (data.results && data.results.length > 0) {
            const item = data.results[0];

            // Vérifier que les champs essentiels sont présents
            if (!item.trackName || !item.artistName) {
                return null;
            }

            return {
                id: item.trackId || item.collectionId,
                targetId: item.collectionId || item.trackId,
                name: item.trackName,
                artist: item.artistName,
                image: item.artworkUrl100 ? item.artworkUrl100.replace('100x100', '600x600') : '',
                type: 'song' as const,
                year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined
            };
        }

        return null;
    } catch (error) {
        console.warn(`Erreur lors du matching "${trackName}" de ${artistName}:`, error);
        return null;
    }
}

// Types pour TypeScript
interface SpotifyTrack {
  track: {
    name: string;
    artists: Array<{ name: string }>;
  };
}

interface MatchedTrack {
  id: number;
  targetId: number;
  name: string;
  artist: string;
  image: string;
  type: 'song';
  year?: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: "URL manquante ou invalide" },
        { status: 400 }
      );
    }

    // 1. Extraire l'ID de la playlist depuis l'URL
    // Ex: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=...
    const playlistIdMatch = url.match(/\/playlist\/([a-zA-Z0-9]+)/);
    const playlistId = playlistIdMatch ? playlistIdMatch[1] : null;

    if (!playlistId) {
      return NextResponse.json(
        { error: "URL Spotify invalide. Format attendu: https://open.spotify.com/playlist/ID" },
        { status: 400 }
      );
    }

    console.log(`Importation de la playlist Spotify: ${playlistId}`);

    // 2. Obtenir le token Spotify
    const token = await getSpotifyToken();

    // 3. Récupérer les tracks de la playlist Spotify
    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&fields=items(track(name,artists(name)))`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!spotifyRes.ok) {
      if (spotifyRes.status === 404) {
        return NextResponse.json(
          { error: "Playlist introuvable ou privée" },
          { status: 404 }
        );
      }
      throw new Error(`Erreur Spotify API: ${spotifyRes.status} ${spotifyRes.statusText}`);
    }

    const spotifyData = await spotifyRes.json();

    if (!spotifyData.items || !Array.isArray(spotifyData.items)) {
      return NextResponse.json(
        { error: "Aucun titre trouvé dans cette playlist" },
        { status: 404 }
      );
    }

    console.log(`${spotifyData.items.length} titres trouvés dans la playlist`);

    // 4. Préparer les tracks à matcher
    const tracksToMatch = spotifyData.items
      .filter((item: SpotifyTrack) =>
        item.track &&
        item.track.name &&
        item.track.artists &&
        item.track.artists.length > 0
      )
      .map((item: SpotifyTrack) => ({
        title: item.track.name.trim(),
        artist: item.track.artists[0].name.trim()
      }));

    if (tracksToMatch.length === 0) {
      return NextResponse.json(
        { error: "Aucun titre valide trouvé dans cette playlist" },
        { status: 400 }
      );
    }

    console.log(`${tracksToMatch.length} titres à matcher avec iTunes`);

    // 5. Faire le matching avec iTunes (par lots pour éviter le rate limiting)
    const foundTracks: MatchedTrack[] = [];

    // Traiter par petits groupes avec délai
    const batchSize = 5;
    for (let i = 0; i < tracksToMatch.length; i += batchSize) {
      const batch = tracksToMatch.slice(i, i + batchSize);

      const promises = batch.map((track: { title: string; artist: string }) =>
        matchWithItunes(track.title, track.artist)
      );

      const batchResults = await Promise.all(promises);
      const validResults = batchResults.filter((result): result is MatchedTrack => result !== null);

      foundTracks.push(...validResults);

      console.log(`Lot ${Math.floor(i/batchSize) + 1}: ${validResults.length}/${batch.length} titres matchés`);

      // Délai entre les lots (sauf le dernier)
      if (i + batchSize < tracksToMatch.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Résultat final: ${foundTracks.length}/${tracksToMatch.length} titres importés avec succès`);

    return NextResponse.json({
      success: true,
      totalSpotify: tracksToMatch.length,
      imported: foundTracks.length,
      successRate: Math.round((foundTracks.length / tracksToMatch.length) * 100),
      tracks: foundTracks
    });

  } catch (error) {
    console.error('Erreur lors de l\'importation Spotify:', error);

    // Message d'erreur plus spécifique selon le type d'erreur
    let errorMessage = "Erreur lors de l'importation";
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (errorMsg.includes("Clés Spotify manquantes")) {
      errorMessage = "Configuration Spotify manquante côté serveur";
    } else if (errorMsg.includes("rate limit")) {
      errorMessage = "Trop de requêtes, veuillez réessayer plus tard";
    }

    return NextResponse.json(
      { error: errorMessage, details: errorMsg },
      { status: 500 }
    );
  }
}