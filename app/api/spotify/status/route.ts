import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest } from '@/lib/devTools';
import { readSpotifyTokensFromRequest, spotifyConfigured } from '@/lib/spotifySession';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const origin = request.nextUrl.origin;
  const configured = spotifyConfigured(origin);
  const connected = Boolean(readSpotifyTokensFromRequest(request)?.access_token);

  return NextResponse.json({
    ok: true,
    configured,
    connected,
  });
}
