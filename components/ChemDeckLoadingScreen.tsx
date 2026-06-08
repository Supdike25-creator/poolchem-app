import ChemDeckLogo from '@/components/ChemDeckLogo';
import { Loader2 } from 'lucide-react';

type ChemDeckLoadingScreenProps = {
  message?: string;
  submessage?: string;
  variant?: 'full' | 'overlay' | 'embedded';
  className?: string;
};

export default function ChemDeckLoadingScreen({
  message = 'Loading…',
  submessage,
  variant = 'full',
  className = '',
}: ChemDeckLoadingScreenProps) {
  const shellClass =
    variant === 'overlay'
      ? 'fixed inset-0 z-[100] flex items-center justify-center bg-[#0A1A2F]/96 px-5 py-10 backdrop-blur-sm'
      : variant === 'embedded'
        ? 'flex min-h-[280px] w-full items-center justify-center bg-[#0A1A2F] px-5 py-10'
        : 'flex min-h-screen w-full items-center justify-center bg-[#0A1A2F] px-5 py-10';

  return (
    <div className={`${shellClass} text-[#D9E1E8] ${className}`} role="status" aria-live="polite" aria-busy="true">
      <div className="flex flex-col items-center text-center">
        <ChemDeckLogo variant="mark" scheme="dark" className="h-14 w-14" />
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[#D9E1E8]/85">
          <Loader2 className="h-5 w-5 animate-spin text-[#3EC6FF]" aria-hidden="true" />
          <span>{message}</span>
        </div>
        {submessage ? <p className="mt-2 max-w-sm text-sm leading-6 text-[#D9E1E8]/60">{submessage}</p> : null}
      </div>
    </div>
  );
}
