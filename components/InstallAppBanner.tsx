'use client';

import { Download, Share, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  type BeforeInstallPromptEvent,
  canShowInstallPrompt,
  dismissInstallPrompt,
  isIosSafari,
} from '@/lib/pwa';

export default function InstallAppBanner() {
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!canShowInstallPrompt()) return;

    if (isIosSafari()) {
      const timer = window.setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const dismiss = () => {
    dismissInstallPrompt();
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      dismissInstallPrompt();
      setVisible(false);
    } finally {
      setInstalling(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="mb-5 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
          {iosHint ? <Share className="h-4 w-4" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-cyan-950">Install ChemDeck</p>
          {iosHint ? (
            <p className="mt-1 leading-6 text-cyan-900">
              Tap <span className="font-semibold">Share</span>, then choose{' '}
              <span className="font-semibold">Add to Home Screen</span> for quick pool-side access.
            </p>
          ) : (
            <p className="mt-1 leading-6 text-cyan-900">
              Install the app for a full-screen home screen shortcut and faster guard logging.
            </p>
          )}
          {!iosHint && deferredPrompt ? (
            <button
              type="button"
              onClick={install}
              disabled={installing}
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {installing ? 'Opening installer...' : 'Install app'}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-md p-1 text-cyan-700 transition hover:bg-cyan-100 hover:text-cyan-950"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
