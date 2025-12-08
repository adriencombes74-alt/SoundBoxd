# iTunes Matcher Utility

Utilitaire pour matcher automatiquement des pistes musicales avec l'API iTunes.

## Fonction principale : `matchTracksToItunes`

### Signature
```typescript
matchTracksToItunes(tracks: TrackInput[], delayMs?: number): Promise<MatchedTrack[]>
```

### Paramètres
- `tracks`: Tableau d'objets `{ artist: string, title: string }`
- `delayMs`: Délai entre les requêtes (défaut: 1000ms) pour éviter la limitation de l'API

### Retour
Tableau d'objets `MatchedTrack` avec :
- `id`: ID unique iTunes
- `name`: Nom de la piste
- `artist`: Nom de l'artiste
- `image`: URL de l'image HD (1000x1000)
- `previewUrl`: URL du preview audio (optionnel)
- `year`: Année de sortie
- `matchFound`: `true` si match réussi, `false` sinon
- `originalTitle`/`originalArtist`: Valeurs d'entrée originales

## Utilisation de base

```typescript
import { matchTracksToItunes } from '@/lib/itunesMatcher';

const tracksToMatch = [
  { artist: 'The Beatles', title: 'Hey Jude' },
  { artist: 'Queen', title: 'Bohemian Rhapsody' }
];

const results = await matchTracksToItunes(tracksToMatch, 1500);

results.forEach(track => {
  if (track.matchFound) {
    console.log(`✅ Trouvé: ${track.name} par ${track.artist}`);
  } else {
    console.log(`❌ Non trouvé: ${track.originalTitle}`);
  }
});
```

## Fonctions disponibles

- `matchTracksToItunes()`: Version complète avec tous les résultats
- `matchTracksToItunesSuccessOnly()`: Retourne seulement les succès
- `createSearchTerm()`: Utilitaire pour créer des termes de recherche optimisés

## Gestion des erreurs

- **Rate limiting**: Délai configurable entre les requêtes
- **Échecs de matching**: Objets avec `matchFound: false`
- **Erreurs réseau**: Gestion gracieuse avec retry implicite
- **Logs détaillés**: Suivi en console de chaque étape

## Format compatible

Les objets retournés sont compatibles avec le format utilisé dans `CreateListPage` de MusicBoxd, avec l'ajout du champ `previewUrl` pour la lecture audio.
