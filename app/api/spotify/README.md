# API Spotify - Importation de playlists

Cette API permet d'importer des playlists Spotify publiques vers MusicBoxd en les convertissant automatiquement vers le format iTunes.

## Endpoint

```
POST /api/spotify
```

## Requête

```json
{
  "url": "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
}
```

## Réponse de succès

```json
{
  "success": true,
  "totalSpotify": 25,
  "imported": 22,
  "successRate": 88,
  "tracks": [
    {
      "id": 123456789,
      "targetId": 987654321,
      "name": "Hey Jude",
      "artist": "The Beatles",
      "image": "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/.../600x600.jpg",
      "type": "song",
      "year": 1968
    }
  ]
}
```

## Configuration requise

Ajoutez ces variables dans votre fichier `.env.local` :

```env
SPOTIFY_CLIENT_ID=votre_client_id_spotify
SPOTIFY_CLIENT_SECRET=votre_client_secret_spotify
```

## Fonctionnalités

- ✅ **Extraction d'ID** : Support des URLs Spotify avec paramètres
- ✅ **Matching intelligent** : Conversion Spotify → iTunes
- ✅ **Rate limiting** : Traitement par lots avec délais
- ✅ **Gestion d'erreur** : Messages spécifiques selon le problème
- ✅ **Types TypeScript** : Interface complète et sécurisée

## Limitations

- **Playlists privées** : Non supportées (API Spotify)
- **Rate limiting** : Maximum 50 titres par playlist
- **Matching iTunes** : ~80-90% de taux de succès selon la disponibilité

## Utilisation dans le code

```typescript
const response = await fetch('/api/spotify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://open.spotify.com/playlist/ID_DE_LA_PLAYLIST'
  })
});

const data = await response.json();
if (data.success) {
  console.log(`${data.imported}/${data.totalSpotify} titres importés`);
  // data.tracks contient les pistes converties
}
```
