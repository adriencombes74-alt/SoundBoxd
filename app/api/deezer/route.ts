import { NextResponse } from 'next/server';

// Fonction de matching (Simplifiée ou importée si vous avez itunesMatcher)
async function matchWithItunes(trackName: string, artistName: string) {
    try {
        const query = `${trackName} ${artistName}`;
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`);
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
            const item = data.results[0];
            return {
                id: item.trackId,
                targetId: item.collectionId,
                name: item.trackName,
                artist: item.artistName,
                image: item.artworkUrl100.replace('100x100', '600x600'),
                type: 'song',
                year: new Date(item.releaseDate).getFullYear()
            };
        }
        return null;
    } catch (e) {
        return null;
    }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    // 1. Extraction Robuste de l'ID (Format: /playlist/12345)
    // Accepte: deezer.com/fr/playlist/12345 ou deezer.com/playlist/12345
    const regex = /playlist\/(\d+)/;
    const match = url.match(regex);
    const playlistId = match ? match[1] : null;
    
    if (!playlistId) {
        return NextResponse.json({ error: "Lien Deezer invalide. Utilisez un lien complet (ex: deezer.com/playlist/...)" }, { status: 400 });
    }

    // 2. Appel API Deezer (Public)
    const deezerRes = await fetch(`https://api.deezer.com/playlist/${playlistId}/tracks?limit=50`);
    const deezerData = await deezerRes.json();
    
    if (deezerData.error) {
        return NextResponse.json({ error: "Playlist introuvable ou privée." }, { status: 404 });
    }

    // 3. Matching
    const tracksToMatch = deezerData.data.map((item: any) => ({
        title: item.title,
        artist: item.artist.name
    }));

    const promises = tracksToMatch.map((t: any) => matchWithItunes(t.title, t.artist));
    const results = await Promise.all(promises);
    const foundTracks = results.filter(r => r !== null);

    return NextResponse.json({ 
        success: true, 
        count: foundTracks.length, 
        tracks: foundTracks 
    });

  } catch (error: any) {
    console.error("Erreur serveur:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
