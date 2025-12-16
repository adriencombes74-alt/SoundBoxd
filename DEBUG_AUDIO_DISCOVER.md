# Debug Audio - Page Découvrir

## Changements effectués

### 1. ✅ Audio activé par défaut
- **Avant** : `isAudioEnabled = false` (l'utilisateur devait cliquer sur 🔇)
- **Maintenant** : `isAudioEnabled = true` (expérience type Reels/TikTok)

### 2. ✅ Utilisation du cache preview
- Les reviews iTunes ont un champ `preview_url_cache` avec l'URL audio
- La fonction `playAudio` utilise maintenant ce cache en priorité
- Évite les appels API inutiles

### 3. ✅ Logs de débogage améliorés
- Ajout de logs clairs à chaque étape :
  - `🎵 Lecture: "titre" - artiste`
  - `💾 Utilisation du preview caché`
  - `✅ Lecture démarrée avec succès`
  - `❌ Pas de preview disponible`
  - `🎯 Carte active: albumId`

### 4. ✅ Gestion d'erreur robuste
- Capture des erreurs audio avec logs détaillés
- État `isLoading` pour feedback visuel
- Fallback gracieux si pas de preview

## Comment tester

1. **Ouvrir la console du navigateur** (F12)
2. **Aller sur `/discover`**
3. **Observer les logs** :
   ```
   🎬 Chargement initial du feed...
   ✅ X items initiaux chargés
   📊 Reviews: X, Loading: false, Tab: discover
   🎪 Configuration de l'observer...
   🎪 Observer X cartes
   ✅ Observer configuré
   🎯 Carte active: 123456
   🎵 Lecture: "Titre" - Artiste
   💾 Utilisation du preview caché (si iTunes)
   ✅ Lecture démarrée avec succès
   ```

4. **Scroller** et vérifier que :
   - La musique change automatiquement
   - Les logs `🎯 Carte active` apparaissent
   - Les logs `✅ Lecture démarrée` suivent

## Problèmes possibles et solutions

### Si la musique ne se lance toujours pas :

1. **Vérifier dans la console** :
   - Y a-t-il des logs `🎯 Carte active` ? 
     - ❌ Non → L'observer ne détecte pas les cartes (problème DOM)
     - ✅ Oui → Continuer
   
   - Y a-t-il des logs `🎵 Lecture` ?
     - ❌ Non → `isAudioEnabled` est peut-être false
     - ✅ Oui → Continuer
   
   - Y a-t-il des logs `❌` ?
     - Lire l'erreur pour comprendre le problème

2. **Vérifier le bouton audio** :
   - Le bouton doit afficher `🔊` (audio activé)
   - Si c'est `🔇`, cliquer dessus

3. **Vérifier les autoplay policies** :
   - Certains navigateurs bloquent l'autoplay
   - Solution : Cliquer une fois sur la page avant de scroller

4. **Vérifier les reviews** :
   - Les reviews iTunes ont-elles un `preview_url_cache` ?
   - Les reviews d'amis ont-elles un `album_name` et `artist_name` valides ?

## Architecture audio simplifiée

```
┌─────────────────────────────────────────┐
│  IntersectionObserver                   │
│  - Détecte la carte visible (>50%)      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  setCurrentVisibleCard(albumId)         │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  playAudio(albumId, name, artist, cache)│
│  1. Stop audio précédent                │
│  2. Utiliser cache OU fetch preview     │
│  3. Créer Audio()                        │
│  4. audio.play()                         │
└─────────────────────────────────────────┘
```

## Points clés de la simplification

1. **Un seul audio actif** : `currentAudioRef.current`
2. **Pas de délais artificiels** : Juste 200ms pour stabiliser le scroll
3. **Cache intelligent** : Utilise `preview_url_cache` des reviews iTunes
4. **Seuil réaliste** : 50% de visibilité (au lieu de 80%)
5. **Logs clairs** : Chaque étape est tracée

## Si tout échoue

Vérifier que :
- Le navigateur autorise l'autoplay (Chrome/Safari peuvent bloquer)
- Les URLs iTunes sont accessibles (pas de CORS)
- Le composant `DiscoverCard` a bien l'attribut `data-album-id`

