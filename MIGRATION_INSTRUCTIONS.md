# Instructions de Migration - Système de Likes d'Albums

## Contexte

Cette migration ajoute un nouveau système de "likes" d'albums/musiques qui permet aux utilisateurs de liker des découvertes **sans créer de review avec une note de 0**. Les albums likés seront visibles dans une nouvelle section "Likes" sur le profil de l'utilisateur.

## Changements Apportés

### 1. Nouvelle Table `album_likes`

Une nouvelle table a été créée pour stocker les likes d'albums indépendamment des reviews.

### 2. Page Découvrir (`app/discover/page.tsx`)

- Modifié pour utiliser la table `album_likes` au lieu de créer des reviews avec `rating: 0`
- Les likes sont maintenant stockés séparément et n'apparaissent pas comme des critiques

### 3. Profil Utilisateur (`app/profile/page.tsx`)

- Ajout d'un nouvel onglet "Likes" à côté de "Critiques" et "Listes"
- Affichage des albums likés dans une grille visuelle

### 4. Profil Public (`app/user/[username]/page.tsx`)

- Ajout d'un onglet "Likes" pour voir les albums likés par les autres utilisateurs

## Instructions pour Appliquer la Migration

### Étape 1: Exécuter le Script SQL dans Supabase

1. Connectez-vous à votre tableau de bord Supabase
2. Allez dans **SQL Editor**
3. Ouvrez le fichier `supabase_migration_album_likes.sql`
4. Copiez tout le contenu du fichier
5. Collez-le dans l'éditeur SQL de Supabase
6. Cliquez sur **Run** pour exécuter la migration

### Étape 2: Vérifier la Migration

Après l'exécution, vérifiez que :

- La table `album_likes` a été créée
- Les index ont été créés correctement
- Les politiques RLS (Row Level Security) sont actives

Vous pouvez vérifier avec cette requête :

```sql
SELECT * FROM information_schema.tables WHERE table_name = 'album_likes';
```

### Étape 3: Tester l'Application

1. Redémarrez votre serveur de développement si nécessaire
2. Allez sur la page Découvrir (`/discover`)
3. Likez un album
4. Vérifiez que :
   - Le like est enregistré (le cœur reste rouge)
   - Aucune review avec note 0 n'est créée
   - L'album apparaît dans l'onglet "Likes" de votre profil

### Étape 4: Migration des Données Existantes (Optionnel)

Si vous avez déjà des reviews avec `rating = 0` créées par l'ancien système, vous pouvez les migrer vers la nouvelle table `album_likes` avec ce script :

```sql
-- Migrer les anciennes reviews avec rating=0 vers album_likes
INSERT INTO album_likes (user_id, album_id, album_name, album_image, artist_name, item_type, created_at)
SELECT
  user_id::uuid,
  album_id,
  album_name,
  album_image,
  artist_name,
  'album' as item_type,
  created_at
FROM reviews
WHERE rating = 0 AND review_text = ''
ON CONFLICT (user_id, album_id) DO NOTHING;

-- Optionnel: Supprimer les anciennes reviews avec rating=0
-- ATTENTION: Vérifiez d'abord que la migration s'est bien passée !
-- DELETE FROM reviews WHERE rating = 0 AND review_text = '';
```

## Structure de la Table `album_likes`

| Colonne       | Type      | Description                                  |
| ------------- | --------- | -------------------------------------------- |
| `id`          | BIGSERIAL | Identifiant unique                           |
| `user_id`     | UUID      | ID de l'utilisateur (référence à auth.users) |
| `album_id`    | TEXT      | ID de l'album (iTunes/Apple Music)           |
| `album_name`  | TEXT      | Nom de l'album                               |
| `album_image` | TEXT      | URL de l'image de l'album                    |
| `artist_name` | TEXT      | Nom de l'artiste                             |
| `item_type`   | TEXT      | Type: 'album' ou 'song'                      |
| `created_at`  | TIMESTAMP | Date de création du like                     |

## Sécurité (RLS)

Les politiques suivantes sont appliquées :

- **SELECT** : Tous les utilisateurs peuvent voir tous les likes (public)
- **INSERT** : Les utilisateurs peuvent uniquement créer leurs propres likes
- **DELETE** : Les utilisateurs peuvent uniquement supprimer leurs propres likes

## Support

Si vous rencontrez des problèmes lors de la migration, vérifiez :

1. Que vous avez les permissions nécessaires dans Supabase
2. Que la table `auth.users` existe (elle devrait déjà exister)
3. Que les extensions PostgreSQL nécessaires sont activées

En cas de problème, vous pouvez supprimer la table et recommencer :

```sql
DROP TABLE IF EXISTS album_likes CASCADE;
```

Puis réexécutez le script de migration.
