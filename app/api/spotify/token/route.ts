import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest } from '@/lib/devTools';
import { getValidSpotifyAccessToken, readSpotifyTokensFromRequest } from '@/lib/spotifySession';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const tokens = readSpotifyTokensFromRequest(request);
  if (!tokens) {
    return NextResponse.json({ ok: false, connected: false, message: 'Connect Spotify first.' }, { status: 401 });
  }

  try {
    const accessToken = await getValidSpotifyAccessToken(request.nextUrl.origin, request);
    if (!accessToken) {
      return NextResponse.json({ ok: false, connected: false, message: 'Connect Spotify first.' }, { status: 401 });
    }

    return NextResponse.json({ ok: true, connected: true, access_token: accessToken });
  } catch (error) {
    return NextResponse.json(
      { ok: false, connected: false, message: (error as Error).message || 'Unable to refresh Spotify token.' },
      { status: 401 },
    );
  }
}
