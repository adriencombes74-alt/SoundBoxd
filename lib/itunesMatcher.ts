// Utilitaire pour matcher des pistes avec l'API iTunes
//
// EXEMPLE D'UTILISATION :
// ```typescript
// import { matchTracksToItunes } from '@/lib/itunesMatcher';
//
// const tracksToMatch = [
//   { artist: 'The Beatles', title: 'Hey Jude' },
//   { artist: 'Queen', title: 'Bohemian Rhapsody' },
//   { artist: 'Unknown Artist', title: 'Unknown Song' }
// ];
//
// const matchedTracks = await matchTracksToItunes(tracksToMatch, 1500);
// // matchedTracks contiendra les objets avec id, name, artist, image, previewUrl, etc.
// ```

export interface TrackInput {
  artist: string;
  title: string;
}

export interface MatchedTrack {
  id: number;
  name: string;
  artist: string;
  image: string;
  previewUrl?: string;
  year?: number;
  matchFound: boolean;
  originalTitle: string;
  originalArtist: string;
}

/**
 * Match un tableau de pistes avec l'API iTunes
 * @param tracks Tableau d'objets { artist: string, title: string }
 * @param delayMs Délai entre les requêtes (défaut: 1000ms)
 * @returns Tableau d'objets MatchedTrack
 */
export async function matchTracksToItunes(
  tracks: TrackInput[],
  delayMs: number = 1000
): Promise<MatchedTrack[]> {
  const results: MatchedTrack[] = [];

  console.log(`🎵 Démarrage du matching pour ${tracks.length} pistes...`);

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const { artist, title } = track;

    console.log(`🔍 [${i + 1}/${tracks.length}] Recherche: "${title}" par ${artist}`);

    try {
      // Créer le terme de recherche
      const searchTerm = `${title} ${artist}`.replace(/[^\w\s]/g, '').substring(0, 50);
      const encodedTerm = encodeURIComponent(searchTerm);

      // Requête iTunes
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodedTerm}&entity=song&limit=1`
      );

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const itunesTrack = data.results[0];

        // Formater comme dans CreateListPage
        const matchedTrack: MatchedTrack = {
          id: itunesTrack.trackId || itunesTrack.collectionId,
          name: itunesTrack.trackName || itunesTrack.collectionName,
          artist: itunesTrack.artistName,
          image: itunesTrack.artworkUrl100.replace('100x100', '1000x1000'), // HD
          previewUrl: itunesTrack.previewUrl || undefined,
          year: new Date(itunesTrack.releaseDate).getFullYear(),
          matchFound: true,
          originalTitle: title,
          originalArtist: artist
        };

        results.push(matchedTrack);
        console.log(`✅ Match trouvé: "${matchedTrack.name}"`);

      } else {
        // Aucun résultat trouvé
        const failedTrack: MatchedTrack = {
          id: Date.now() + i, // ID temporaire unique
          name: title,
          artist: artist,
          image: '', // Image par défaut ou vide
          previewUrl: undefined,
          year: undefined,
          matchFound: false,
          originalTitle: title,
          originalArtist: artist
        };

        results.push(failedTrack);
        console.log(`❌ Aucun match trouvé pour "${title}"`);
      }

    } catch (error) {
      console.error(`❌ Erreur pour "${title}":`, error);

      // En cas d'erreur, créer un objet avec matchFound = false
      const errorTrack: MatchedTrack = {
        id: Date.now() + i,
        name: title,
        artist: artist,
        image: '',
        previewUrl: undefined,
        year: undefined,
        matchFound: false,
        originalTitle: title,
        originalArtist: artist
      };

      results.push(errorTrack);
    }

    // Délai entre les requêtes (sauf pour la dernière)
    if (i < tracks.length - 1) {
      console.log(`⏳ Attente de ${delayMs}ms avant la prochaine requête...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const successCount = results.filter(r => r.matchFound).length;
  console.log(`🎉 Matching terminé: ${successCount}/${tracks.length} succès`);

  return results;
}

/**
 * Version simplifiée qui retourne seulement les tracks matchés avec succès
 */
export async function matchTracksToItunesSuccessOnly(
  tracks: TrackInput[],
  delayMs: number = 1000
): Promise<MatchedTrack[]> {
  const allResults = await matchTracksToItunes(tracks, delayMs);
  return allResults.filter(track => track.matchFound);
}

/**
 * Utilitaire pour créer un terme de recherche optimisé
 */
export function createSearchTerm(artist: string, title: string): string {
  // Supprimer les caractères spéciaux et limiter la longueur
  return `${title} ${artist}`.replace(/[^\w\s]/g, '').substring(0, 50);
}
