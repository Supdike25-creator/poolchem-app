import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest } from '@/lib/devTools';
import {
  buildSpotifyAuthorizeUrl,
  spotifyConfigured,
  spotifyOAuthStateCookie,
} from '@/lib/spotifySession';

export const dynamic = 'force-dynamic';

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

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildSpotifyAuthorizeUrl(origin, state));
  response.cookies.set({
    name: spotifyOAuthStateCookie,
    value: state,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });

  return response;
}
