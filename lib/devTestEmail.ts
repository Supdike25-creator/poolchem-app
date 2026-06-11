const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidDevTestEmail = (value?: string | null) =>
  emailPattern.test((value ?? '').trim().toLowerCase());

export const resolveDevTestEmail = (value?: string | null) => {
  const normalized = (value ?? '').trim().toLowerCase();
  return isValidDevTestEmail(normalized) ? normalized : '';
};

type SessionEmailSource = {
  email?: string | null;
};

const readEmailFromSessionJson = (raw?: string | null) => {
  if (!raw) return '';
  try {
    const session = JSON.parse(raw) as SessionEmailSource;
    return resolveDevTestEmail(session.email);
  } catch {
    return '';
  }
};

/** Client-only: use logged-in session email when it looks like a real address. */
export const readClientDevTestEmail = () => {
  if (typeof window === 'undefined') return '';

  const fromStorage = readEmailFromSessionJson(window.localStorage.getItem('chemdeck.session'));
  if (fromStorage) return fromStorage;

  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('chemdeck_app_session='));
  if (!cookie) return '';

  const raw = decodeURIComponent(cookie.slice('chemdeck_app_session='.length));
  return readEmailFromSessionJson(raw);
};
