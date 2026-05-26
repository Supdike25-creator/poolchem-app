import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest } from '@/lib/devTools';
import { getValidSpotifyAccessToken } from '@/lib/spotifySession';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) {
    return NextResponse.json({ ok: true, tracks: [] });
  }

  const accessToken = await getValidSpotifyAccessToken(request.nextUrl.origin, request);
  if (!accessToken) {
    return NextResponse.json({ ok: false, message: 'Connect Spotify first.' }, { status: 401 });
  }

  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: '12',
  });

  const response = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null) as {
    error?: { message?: string };
    tracks?: {
      items?: Array<{
        id: string;
        uri: string;
        name: string;
        duration_ms: number;
        artists: Array<{ name: string }>;
        album: { name: string; images?: Array<{ url: string }> };
      }>;
    };
  } | null;

  if (!response.ok) {
    return NextResponse.json(
      { ok: false, message: payload?.error?.message || 'Spotify search failed.' },
      { status: response.status },
    );
  }

  const tracks = (payload?.tracks?.items ?? []).map((track) => ({
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: track.artists.map((artist) => artist.name).join(', '),
    album: track.album.name,
    imageUrl: track.album.images?.[0]?.url ?? null,
    durationMs: track.duration_ms,
  }));

  return NextResponse.json({ ok: true, tracks });
}
