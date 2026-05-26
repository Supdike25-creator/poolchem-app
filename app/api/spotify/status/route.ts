import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest } from '@/lib/devTools';
import { getSpotifyConfig, readSpotifyTokensFromRequest, spotifyConfigured } from '@/lib/spotifySession';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const origin = request.nextUrl.origin;
  const { redirectUri } = getSpotifyConfig(origin);
  const configured = spotifyConfigured(origin);
  const connected = Boolean(readSpotifyTokensFromRequest(request)?.access_token);

  return NextResponse.json({
    ok: true,
    configured,
    connected,
    redirectUri,
    requestOrigin: origin,
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || null,
    explicitRedirectUri: process.env.SPOTIFY_REDIRECT_URI?.trim() || null,
  });
}
