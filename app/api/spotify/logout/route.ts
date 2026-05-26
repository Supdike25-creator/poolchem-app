import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest } from '@/lib/devTools';
import { clearSpotifyTokenCookie } from '@/lib/spotifySession';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearSpotifyTokenCookie());
  return response;
}
