import type { NextRequest } from "next/server";

export const appSessionCookie = "chemdeck_app_session";
export const devLogin = {
  email: "ChemDeckDev",
  password: "DEV",
  id: "chemdeck-dev-account",
  name: "ChemDeck Dev",
  username: "ChemDeckDev",
  token: "chemdeck-dev-session",
} as const;

export type DevSession = {
  id?: string;
  name?: string;
  username?: string;
  token?: string;
  role?: string;
  email?: string | null;
};

export const isDevCredentials = (email: string, password: string) =>
  email.trim() === devLogin.email && password === devLogin.password;

export const createDevSession = (): DevSession => ({
  id: devLogin.id,
  name: devLogin.name,
  username: devLogin.username,
  token: devLogin.token,
  role: "dev",
  email: devLogin.email,
});

export const readDevSessionValue = (rawSession?: string | null): DevSession | null => {
  if (!rawSession) return null;

  try {
    const session = JSON.parse(decodeURIComponent(rawSession)) as DevSession;
    return session?.role === "dev" && session?.username === devLogin.username ? session : null;
  } catch {
    return null;
  }
};

export const getDevSessionFromRequest = (request: NextRequest) =>
  readDevSessionValue(request.cookies.get(appSessionCookie)?.value);

export const isDevRequest = (request: NextRequest) => Boolean(getDevSessionFromRequest(request));
