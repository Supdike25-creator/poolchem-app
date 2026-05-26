import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export const spotifyTokenCookie = 'chemdeck_spotify_tokens';
export const spotifyOAuthStateCookie = 'chemdeck_spotify_oauth_state';

export type SpotifyTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

const spotifyScopes = [
  'streaming',
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-read-email',
].join(' ');

export const getSpotifyConfig = (origin: string) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI?.trim() || `${origin.replace(/\/$/, '')}/api/spotify/callback`;

  return { clientId, clientSecret, redirectUri, scopes: spotifyScopes };
};

export const spotifyConfigured = (origin: string) => {
  const { clientId, clientSecret } = getSpotifyConfig(origin);
  return Boolean(clientId && clientSecret);
};

export const readSpotifyTokens = async (): Promise<SpotifyTokens | null> => {
  const raw = (await cookies()).get(spotifyTokenCookie)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SpotifyTokens;
  } catch {
    return null;
  }
};

export const readSpotifyTokensFromRequest = (request: NextRequest): SpotifyTokens | null => {
  const raw = request.cookies.get(spotifyTokenCookie)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SpotifyTokens;
  } catch {
    return null;
  }
};

export const saveSpotifyTokens = (tokens: SpotifyTokens) => ({
  name: spotifyTokenCookie,
  value: JSON.stringify(tokens),
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
});

export const clearSpotifyTokenCookie = () => ({
  name: spotifyTokenCookie,
  value: '',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 0,
});

const exchangeToken = async (body: URLSearchParams, origin: string) => {
  const { clientId, clientSecret, redirectUri } = getSpotifyConfig(origin);
  if (!clientId || !clientSecret) {
    throw new Error('Spotify is not configured. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body,
  });

  const payload = await response.json().catch(() => null) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  } | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || 'Unable to refresh Spotify session.');
  }

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: payload.expires_in ?? 3600,
  };
};

export const exchangeSpotifyCode = async (code: string, origin: string) => {
  const { redirectUri } = getSpotifyConfig(origin);
  const payload = await exchangeToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
    origin,
  );

  const existing = await readSpotifyTokens();

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || existing?.refresh_token || '',
    expires_at: Date.now() + payload.expires_in * 1000,
  } satisfies SpotifyTokens;
};

export const refreshSpotifyAccessToken = async (tokens: SpotifyTokens, origin: string) => {
  if (!tokens.refresh_token) {
    throw new Error('Spotify refresh token missing. Connect Spotify again.');
  }

  const payload = await exchangeToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
    origin,
  );

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || tokens.refresh_token,
    expires_at: Date.now() + payload.expires_in * 1000,
  } satisfies SpotifyTokens;
};

export const getValidSpotifyAccessToken = async (origin: string, request?: NextRequest) => {
  const tokens = request ? readSpotifyTokensFromRequest(request) : await readSpotifyTokens();
  if (!tokens?.access_token) return null;

  if (tokens.expires_at > Date.now() + 60_000) {
    return tokens.access_token;
  }

  const refreshed = await refreshSpotifyAccessToken(tokens, origin);
  (await cookies()).set(saveSpotifyTokens(refreshed));
  return refreshed.access_token;
};

export const buildSpotifyAuthorizeUrl = (origin: string, state: string) => {
  const { clientId, redirectUri, scopes } = getSpotifyConfig(origin);
  if (!clientId) {
    throw new Error('Spotify is not configured.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    show_dialog: 'true',
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};
