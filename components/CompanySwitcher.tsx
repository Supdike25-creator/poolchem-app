'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { formatTeamRoleLabel } from '@/lib/teamRoles';

type Membership = {
  company_id: string;
  company_name: string;
  role: string;
  is_active: boolean;
};

export default function CompanySwitcher() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/company-membership', { cache: 'no-store', credentials: 'same-origin' });
      const result = await response.json().catch(() => null);
      if (response.ok && result?.ok) {
        setMemberships(result.memberships ?? []);
      }
      setLoading(false);
    };

    void load();
  }, []);

  if (loading || memberships.length <= 1) {
    return null;
  }

  const switchCompany = async (companyId: string) => {
    setSwitching(companyId);
    setMessage('');
    const response = await fetch('/api/company-membership', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ company_id: companyId }),
    });
    const result = await response.json().catch(() => null);
    setSwitching(null);

    if (!response.ok || !result?.ok) {
      setMessage(result?.message || 'Unable to switch company.');
      return;
    }

    window.location.assign(result.redirectTo || '/guard');
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Building2 className="h-4 w-4 text-slate-500" />
        Switch company
      </div>
      <p className="mb-3 text-sm text-slate-600">You belong to more than one company. Choose which workspace to open.</p>
      <div className="space-y-2">
        {memberships.map((membership) => (
          <button
            key={membership.company_id}
            type="button"
            disabled={membership.is_active || switching === membership.company_id}
            onClick={() => void switchCompany(membership.company_id)}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm ${
              membership.is_active
                ? 'border-blue-200 bg-blue-50 text-blue-900'
                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span>
              <span className="block font-semibold">{membership.company_name}</span>
              <span className="text-xs text-slate-500">{formatTeamRoleLabel(membership.role)}</span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide">
              {membership.is_active ? 'Current' : switching === membership.company_id ? 'Switching...' : 'Switch'}
            </span>
          </button>
        ))}
      </div>
      {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}
    </div>
  );
}
