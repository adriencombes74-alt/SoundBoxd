export interface UserIntegration {
  id: string;
  user_id: string;
  provider: 'spotify' | 'apple_music';
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null; // ISO string for timestamptz
  created_at: string;
  updated_at: string;
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

