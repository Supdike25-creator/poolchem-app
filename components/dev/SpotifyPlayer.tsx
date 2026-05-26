'use client';

import Script from 'next/script';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoaderCircle, LogOut, Music2, Pause, Play, Search, Volume2, X } from 'lucide-react';

type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: string;
  album: string;
  imageUrl: string | null;
  durationMs: number;
};

type PlayerState = {
  paused: boolean;
  track: {
    name: string;
    artists: Array<{ name: string }>;
    album: { images: Array<{ url: string }> };
  } | null;
};

type SpotifyPlayerInstance = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: (payload: unknown) => void) => void;
  removeListener: (event: string, callback: (payload: unknown) => void) => void;
  getCurrentState: () => Promise<PlayerState | null>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
};

type SpotifySdk = {
  Player: new (options: {
    name: string;
    getOAuthToken: (callback: (token: string) => void) => void;
    volume: number;
  }) => SpotifyPlayerInstance;
};

declare global {
  interface Window {
    Spotify?: SpotifySdk;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`;
};

export default function SpotifyPlayer() {
  const searchParams = useSearchParams();
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const sdkReadyRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [connected, setConnected] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [volume, setVolume] = useState(0.7);
  const [nowPlaying, setNowPlaying] = useState<SpotifyTrack | null>(null);
  const [paused, setPaused] = useState(true);
  const [busyTrackUri, setBusyTrackUri] = useState<string | null>(null);

  const spotifyNotice = useMemo(() => {
    const status = searchParams.get('spotify');
    if (status === 'connected') return 'Spotify connected.';
    if (status === 'denied') return 'Spotify connection was cancelled.';
    if (status === 'invalid_state') return 'Spotify login expired. Try again.';
    if (status === 'error') return 'Spotify connection failed. Check app credentials and redirect URI.';
    return '';
  }, [searchParams]);

  const fetchAccessToken = useCallback(async () => {
    const response = await fetch('/api/spotify/token', { cache: 'no-store', credentials: 'same-origin' });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.access_token) {
      throw new Error(payload?.message || 'Connect Spotify first.');
    }
    return payload.access_token as string;
  }, []);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/spotify/status', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json().catch(() => null);
      setConfigured(Boolean(payload?.configured));
      setConnected(Boolean(payload?.connected));
      setRedirectUri(typeof payload?.redirectUri === 'string' ? payload.redirectUri : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (spotifyNotice) {
      setMessage(spotifyNotice);
    }
  }, [spotifyNotice]);

  const initializePlayer = useCallback(async () => {
    if (!window.Spotify || playerRef.current || !connected) return;

    const player = new window.Spotify.Player({
      name: 'ChemDeck Dev Player',
      volume,
      getOAuthToken: (callback) => {
        void fetchAccessToken()
          .then((token) => callback(token))
          .catch((error: Error) => setMessage(error.message || 'Unable to refresh Spotify token.'));
      },
    });

    player.addListener('ready', (payload) => {
      const { device_id } = payload as { device_id: string };
      deviceIdRef.current = device_id;
      setPlayerReady(true);
      setMessage('');
    });

    player.addListener('not_ready', () => {
      setPlayerReady(false);
    });

    player.addListener('initialization_error', (payload) => {
      const { message: errorMessage } = payload as { message: string };
      setMessage(errorMessage || 'Spotify player failed to initialize.');
    });

    player.addListener('authentication_error', (payload) => {
      const { message: errorMessage } = payload as { message: string };
      setConnected(false);
      setMessage(errorMessage || 'Spotify authentication failed.');
    });

    player.addListener('account_error', (payload) => {
      const { message: errorMessage } = payload as { message: string };
      setMessage(errorMessage || 'Spotify Premium is required for in-browser playback.');
    });

    player.addListener('playback_error', (payload) => {
      const { message: errorMessage } = payload as { message: string };
      setMessage(errorMessage || 'Spotify playback error.');
    });

    player.addListener('player_state_changed', (state) => {
      const playerState = state as PlayerState | null;
      if (!playerState) {
        setPaused(true);
        return;
      }

      setPaused(playerState.paused);
      const track = playerState.track;
      if (track) {
        setNowPlaying((current) => ({
          id: current?.id || track.name || 'now-playing',
          uri: current?.uri || '',
          name: track.name,
          artists: track.artists.map((artist) => artist.name).join(', '),
          album: track.album.images.length ? 'Now playing' : 'Spotify',
          imageUrl: track.album.images[0]?.url ?? null,
          durationMs: current?.durationMs ?? 0,
        }));
      }
    });

    playerRef.current = player;
    const connectedToDevice = await player.connect();
    if (!connectedToDevice) {
      setMessage('Unable to connect Spotify player.');
    }
  }, [connected, fetchAccessToken]);

  useEffect(() => {
    if (!sdkReady || !connected || !open) return;
    void initializePlayer();
  }, [sdkReady, connected, open, initializePlayer]);

  useEffect(() => {
    if (!connected || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query.trim())}`, {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setMessage(payload?.message || 'Spotify search failed.');
          setResults([]);
          return;
        }
        setResults(payload?.tracks ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setMessage('Spotify search failed.');
        }
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [connected, query]);

  const connectSpotify = () => {
    window.location.href = '/api/spotify/auth';
  };

  const disconnectSpotify = async () => {
    playerRef.current?.disconnect();
    playerRef.current = null;
    deviceIdRef.current = null;
    setPlayerReady(false);
    setNowPlaying(null);
    setResults([]);
    await fetch('/api/spotify/logout', { method: 'POST', credentials: 'same-origin' });
    setConnected(false);
    setMessage('Spotify disconnected.');
  };

  const playTrack = async (track: SpotifyTrack) => {
    if (!deviceIdRef.current) {
      setMessage('Spotify player is still connecting. Try again in a moment.');
      return;
    }

    setBusyTrackUri(track.uri);
    setMessage('');
    try {
      const response = await fetch('/api/spotify/play', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          uri: track.uri,
          deviceId: deviceIdRef.current,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || 'Unable to start playback.');
      }
      setNowPlaying(track);
      setPaused(false);
    } catch (error) {
      setMessage((error as Error).message || 'Unable to start playback.');
    } finally {
      setBusyTrackUri(null);
    }
  };

  const togglePlayback = async () => {
    const player = playerRef.current;
    if (!player) return;
    await player.togglePlay();
  };

  const handleVolumeChange = async (nextVolume: number) => {
    setVolume(nextVolume);
    await playerRef.current?.setVolume(nextVolume);
  };

  const handleSdkReady = () => {
    sdkReadyRef.current = true;
    setSdkReady(true);
  };

  return (
    <>
      <Script
        src="https://sdk.scdn.co/spotify-player.js"
        strategy="lazyOnload"
        onLoad={() => {
          window.onSpotifyWebPlaybackSDKReady = handleSdkReady;
          if (window.Spotify) handleSdkReady();
        }}
      />

      <div className="relative z-[80]">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#1DB954]/40 bg-[#121212] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a1a1a]"
        >
          <Music2 className="h-4 w-4 text-[#1DB954]" />
          Spotify
        </button>

        {open ? (
          <div className="absolute right-0 top-12 z-[90] w-[min(92vw,420px)] rounded-xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Dev soundtrack</p>
                <h3 className="text-base font-semibold text-slate-950">Spotify player</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Close Spotify player"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Checking Spotify...
              </div>
            ) : !configured ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in Vercel. Set `NEXT_PUBLIC_APP_URL` to your live app URL and add the same redirect URI in Spotify:
                {' '}
                <code className="rounded bg-white px-1 py-0.5 text-xs">{'{APP_URL}'}/api/spotify/callback</code>
              </p>
            ) : !connected ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Connect your Spotify account to search and play any track from the dev dashboard. Premium is required for in-browser playback.
                </p>
                {redirectUri ? (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    ChemDeck will send this redirect URI to Spotify. It must match your Spotify app exactly:
                    <code className="mt-2 block break-all rounded bg-white px-2 py-1 text-[11px] text-slate-800">{redirectUri}</code>
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={connectSpotify}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#1DB954] px-3 text-sm font-semibold text-black transition hover:bg-[#1ed760]"
                >
                  Connect Spotify
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search any song, artist, or album"
                      className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#1DB954] focus:ring-2 focus:ring-[#1DB954]/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void disconnectSpotify()}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-3 text-slate-600 hover:bg-slate-50"
                    aria-label="Disconnect Spotify"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>

                {nowPlaying ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-3">
                      {nowPlaying.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={nowPlaying.imageUrl} alt="" className="h-12 w-12 rounded object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-200">
                          <Music2 className="h-5 w-5 text-slate-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950">{nowPlaying.name}</p>
                        <p className="truncate text-xs text-slate-500">{nowPlaying.artists}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void togglePlayback()}
                        disabled={!playerReady}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1DB954] text-black disabled:opacity-50"
                      >
                        {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </button>
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <Volume2 className="h-4 w-4" />
                      Volume
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={(event) => void handleVolumeChange(Number(event.target.value))}
                        className="flex-1 accent-[#1DB954]"
                      />
                    </label>
                    {!playerReady ? (
                      <p className="mt-2 text-xs text-slate-500">Connecting Spotify player...</p>
                    ) : null}
                  </div>
                ) : null}

                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {searching ? (
                    <div className="flex items-center gap-2 px-1 py-2 text-sm text-slate-500">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Searching Spotify...
                    </div>
                  ) : results.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-slate-500">
                      {query.trim().length < 2 ? 'Type at least 2 characters to search.' : 'No tracks found.'}
                    </p>
                  ) : (
                    results.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => void playTrack(track)}
                        disabled={busyTrackUri === track.uri}
                        className="flex w-full items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-left transition hover:border-[#1DB954]/40 hover:bg-[#1DB954]/5 disabled:opacity-60"
                      >
                        {track.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={track.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100">
                            <Music2 className="h-4 w-4 text-slate-500" />
                          </div>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-950">{track.name}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {track.artists} · {formatDuration(track.durationMs)}
                          </span>
                        </span>
                        <Play className="h-4 w-4 shrink-0 text-[#1DB954]" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {message ? (
              <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                {message}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
