import { NextRequest, NextResponse } from 'next/server';
import {
  clearSpotifyTokenCookie,
  exchangeSpotifyCode,
  saveSpotifyTokens,
  spotifyOAuthStateCookie,
} from '@/lib/spotifySession';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const error = request.nextUrl.searchParams.get('error');
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const savedState = request.cookies.get(spotifyOAuthStateCookie)?.value;

  const redirectWithMessage = (spotify: string) => {
    const response = NextResponse.redirect(new URL(`/dev-dashboard?spotify=${encodeURIComponent(spotify)}`, origin));
    response.cookies.set({
      name: spotifyOAuthStateCookie,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
    return response;
  };

  if (error) {
    return redirectWithMessage('denied');
  }

  if (!code || !state || !savedState || state !== savedState) {
    return redirectWithMessage('invalid_state');
  }

  try {
    const tokens = await exchangeSpotifyCode(code, origin);
    const response = redirectWithMessage('connected');
    response.cookies.set(saveSpotifyTokens(tokens));
    return response;
  } catch (caughtError) {
    const response = redirectWithMessage('error');
    response.cookies.set(clearSpotifyTokenCookie());
    console.error('Spotify callback failed:', caughtError);
    return response;
  }
}
