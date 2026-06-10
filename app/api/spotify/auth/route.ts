import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest } from '@/lib/devTools';
import {
  buildSpotifyAuthorizeUrl,
  createSpotifyOAuthState,
  spotifyConfigured,
  spotifyOAuthStateCookie,
} from '@/lib/spotifySession';

export const dynamic = 'force-dynamic';

const oauthCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export async function GET(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const origin = request.nextUrl.origin;
  if (!spotifyConfigured(origin)) {
    return NextResponse.json(
      { ok: false, message: 'Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to enable Spotify playback.' },
      { status: 503 },
    );
  }

  const state = createSpotifyOAuthState();
  const response = NextResponse.redirect(buildSpotifyAuthorizeUrl(origin, state));
  response.cookies.set({
    name: spotifyOAuthStateCookie,
    value: state,
    ...oauthCookieOptions,
    maxAge: 600,
  });

  return response;
}
