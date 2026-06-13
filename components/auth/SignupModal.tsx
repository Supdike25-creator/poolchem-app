'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import CreateManagerAccountForm from '@/components/auth/CreateManagerAccountForm';

type SignupModalProps = {
  closeHref?: string;
};

export default function SignupModal({ closeHref = '/' }: SignupModalProps) {
  const router = useRouter();

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(closeHref);
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [closeHref]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 sm:px-6">
      <button
        type="button"
        aria-label="Close signup"
        className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm"
        onClick={handleClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-modal-title"
        className="relative z-10 max-h-[min(90vh,820px)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-[0_8px_40px_rgba(15,23,42,0.12)] sm:px-8"
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pt-2">
          <CreateManagerAccountForm />
        </div>
      </section>
    </div>
  );
}
