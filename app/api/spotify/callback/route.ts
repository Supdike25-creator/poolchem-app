import { NextRequest, NextResponse } from 'next/server';
import {
  clearSpotifyTokenCookie,
  exchangeSpotifyCode,
  saveSpotifyTokens,
  spotifyOAuthStateCookie,
  verifySpotifyOAuthState,
} from '@/lib/spotifySession';

export const dynamic = 'force-dynamic';

const oauthCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const error = request.nextUrl.searchParams.get('error');
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const savedState = request.cookies.get(spotifyOAuthStateCookie)?.value;
  const returnCompanyId = request.nextUrl.searchParams.get('companyId');

  const redirectWithMessage = (spotify: string, detail?: string) => {
    const params = new URLSearchParams({ spotify });
    if (detail) params.set('spotify_detail', detail.slice(0, 180));
    if (returnCompanyId) params.set('companyId', returnCompanyId);

    const response = NextResponse.redirect(new URL(`/dev-dashboard?${params.toString()}`, origin));
    response.cookies.set({
      name: spotifyOAuthStateCookie,
      value: '',
      ...oauthCookieOptions,
      maxAge: 0,
    });
    return response;
  };

  if (error) {
    return redirectWithMessage('denied');
  }

  const stateValid = Boolean(state && verifySpotifyOAuthState(state));
  const cookieStateValid = Boolean(state && savedState && state === savedState);

  if (!code || !state || (!stateValid && !cookieStateValid)) {
    return redirectWithMessage('invalid_state', 'Login session expired during Spotify redirect. Try again.');
  }

  try {
    const tokens = await exchangeSpotifyCode(code, origin);
    const response = redirectWithMessage('connected');
    const tokenCookie = saveSpotifyTokens(tokens);
    response.cookies.set({
      name: tokenCookie.name,
      value: tokenCookie.value,
      httpOnly: tokenCookie.httpOnly,
      sameSite: tokenCookie.sameSite,
      secure: tokenCookie.secure,
      path: tokenCookie.path,
      maxAge: tokenCookie.maxAge,
    });
    return response;
  } catch (caughtError) {
    const detail = caughtError instanceof Error ? caughtError.message : 'Spotify token exchange failed.';
    const response = redirectWithMessage('error', detail);
    response.cookies.set(clearSpotifyTokenCookie());
    console.error('Spotify callback failed:', caughtError);
    return response;
  }
}
