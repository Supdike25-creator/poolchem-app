import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest } from '@/lib/devTools';
import { getValidSpotifyAccessToken } from '@/lib/spotifySession';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null) as {
    uri?: string;
    deviceId?: string;
  } | null;

  const uri = body?.uri?.trim();
  const deviceId = body?.deviceId?.trim();

  if (!uri || !deviceId) {
    return NextResponse.json({ ok: false, message: 'Track URI and device id are required.' }, { status: 400 });
  }

  const accessToken = await getValidSpotifyAccessToken(request.nextUrl.origin, request);
  if (!accessToken) {
    return NextResponse.json({ ok: false, message: 'Connect Spotify first.' }, { status: 401 });
  }

  const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ uris: [uri] }),
  });

  if (response.status === 204) {
    return NextResponse.json({ ok: true });
  }

  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  return NextResponse.json(
    { ok: false, message: payload?.error?.message || 'Unable to start playback.' },
    { status: response.status },
  );
}
