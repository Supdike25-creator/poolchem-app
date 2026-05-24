import { cookies } from 'next/headers';

type AppRole = 'manager' | 'guard' | 'dev';

export type ServerAppSession = {
  id?: string;
  name?: string;
  username?: string;
  token?: string;
  role?: AppRole;
  email?: string;
};

const appSessionCookie = 'chemdeck_app_session';

export const getServerAppSession = async (): Promise<ServerAppSession | null> => {
  const rawSession = (await cookies()).get(appSessionCookie)?.value;
  if (!rawSession) return null;

  try {
    return JSON.parse(decodeURIComponent(rawSession)) as ServerAppSession;
  } catch {
    return null;
  }
};
