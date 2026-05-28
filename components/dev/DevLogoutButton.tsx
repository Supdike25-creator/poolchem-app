'use client';

import { LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { clearAppSession } from '@/lib/appAccounts';

const clearDevCompanySelection = () => {
  window.localStorage.removeItem('chemdeck.dev.selectedCompanyId');
};

export default function DevLogoutButton({ className = '' }: { className?: string }) {
  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Dev sessions can run without Supabase auth configured.
    }

    clearAppSession();
    clearDevCompanySelection();
    window.location.href = '/login';
  };

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 ${className}`}
    >
      <LogOut className="h-5 w-5 shrink-0" />
      <span className="sidebar-label truncate whitespace-nowrap">Log out</span>
    </button>
  );
}
