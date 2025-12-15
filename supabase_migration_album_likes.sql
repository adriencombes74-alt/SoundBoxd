-- Migration: Créer la table album_likes pour les likes d'albums/musiques sans review
-- Cette table stocke les likes d'albums découverts par les utilisateurs

CREATE TABLE IF NOT EXISTS album_likes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id TEXT NOT NULL,
  album_name TEXT NOT NULL,
  album_image TEXT,
  artist_name TEXT NOT NULL,
  item_type TEXT DEFAULT 'album' CHECK (item_type IN ('album', 'song')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, album_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_album_likes_user_id ON album_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_album_likes_album_id ON album_likes(album_id);
CREATE INDEX IF NOT EXISTS idx_album_likes_created_at ON album_likes(created_at DESC);

-- RLS (Row Level Security) pour sécuriser l'accès
ALTER TABLE album_likes ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir tous les likes
CREATE POLICY "Les utilisateurs peuvent voir tous les likes"
  ON album_likes FOR SELECT
  USING (true);

-- Politique: Les utilisateurs peuvent créer leurs propres likes
CREATE POLICY "Les utilisateurs peuvent créer leurs propres likes"
  ON album_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent supprimer leurs propres likes
CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres likes"
  ON album_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Commentaires pour documentation
COMMENT ON TABLE album_likes IS 'Stocke les likes d''albums/musiques découverts par les utilisateurs sans créer de review';
COMMENT ON COLUMN album_likes.item_type IS 'Type d''item: album ou song';

