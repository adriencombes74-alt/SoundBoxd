// EXEMPLE D'UTILISATION DE itunesMatcher.ts

import { matchTracksToItunes, matchTracksToItunesSuccessOnly, type TrackInput, type MatchedTrack } from './itunesMatcher';

// Exemple d'utilisation dans un composant React
export async function exampleUsage() {
  // Liste de pistes à matcher
  const tracksToMatch: TrackInput[] = [
    { artist: 'The Beatles', title: 'Hey Jude' },
    { artist: 'Queen', title: 'Bohemian Rhapsody' },
    { artist: 'Pink Floyd', title: 'Comfortably Numb' },
    { artist: 'Artiste Inconnu', title: 'Chanson Inconnue' } // Celle-ci échouera
  ];

  console.log('🚀 Démarrage du matching...');

  try {
    // Version complète (avec les échecs)
    const allResults: MatchedTrack[] = await matchTracksToItunes(tracksToMatch, 1500);

    console.log('📊 Résultats complets:');
    allResults.forEach((track, index) => {
      if (track.matchFound) {
        console.log(`✅ ${index + 1}. "${track.name}" par ${track.artist} (${track.year})`);
        if (track.previewUrl) {
          console.log(`   🎵 Preview disponible: ${track.previewUrl}`);
        }
      } else {
        console.log(`❌ ${index + 1}. "${track.originalTitle}" par ${track.originalArtist} - AUCUN MATCH`);
      }
    });

    // Version filtrée (seulement les succès)
    const successOnlyResults = await matchTracksToItunesSuccessOnly(tracksToMatch, 1500);
    console.log(`\n🎯 ${successOnlyResults.length} pistes matchées avec succès`);

    return allResults;

  } catch (error) {
    console.error('❌ Erreur lors du matching:', error);
    return [];
  }
}

// Utilisation dans un composant React
/*
import { useState, useEffect } from 'react';
import { matchTracksToItunes } from '@/lib/itunesMatcher';

function MyComponent() {
  const [matchedTracks, setMatchedTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleMatching = async () => {
    setLoading(true);
    try {
      const tracksToMatch = [
        { artist: 'Artist 1', title: 'Song 1' },
        { artist: 'Artist 2', title: 'Song 2' }
      ];

      const results = await matchTracksToItunes(tracksToMatch, 1000);
      setMatchedTracks(results);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleMatching} disabled={loading}>
        {loading ? 'Matching...' : 'Matcher les pistes'}
      </button>

      {matchedTracks.map(track => (
        <div key={track.id}>
          {track.matchFound ? (
            <div>
              <img src={track.image} alt={track.name} width="100" />
              <h3>{track.name}</h3>
              <p>{track.artist} ({track.year})</p>
              {track.previewUrl && <audio controls src={track.previewUrl} />}
            </div>
          ) : (
            <div>❌ {track.originalTitle} - Non trouvé</div>
          )}
        </div>
      ))}
    </div>
  );
}
*/
