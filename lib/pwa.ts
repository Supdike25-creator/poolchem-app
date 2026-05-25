const INSTALL_DISMISS_KEY = 'chemdeck.install.dismissed';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export const isStandaloneApp = () => {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

export const isIosSafari = () => {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = isIos && !(window as Window & { MSStream?: unknown }).MSStream;

  return isSafari;
};

export const isInstallDismissed = () => {
  if (typeof window === 'undefined') return true;

  const raw = window.localStorage.getItem(INSTALL_DISMISS_KEY);
  if (!raw) return false;

  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) {
    window.localStorage.removeItem(INSTALL_DISMISS_KEY);
    return false;
  }

  if (Date.now() - dismissedAt > DISMISS_TTL_MS) {
    window.localStorage.removeItem(INSTALL_DISMISS_KEY);
    return false;
  }

  return true;
};

export const dismissInstallPrompt = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
};

export const canShowInstallPrompt = () => {
  if (typeof window === 'undefined') return false;
  return !isStandaloneApp() && !isInstallDismissed();
};
