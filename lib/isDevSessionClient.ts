import { getStoredSession } from '@/lib/appAccounts';

export const isDevSessionActive = () => {
  if (typeof window === 'undefined') return false;
  return getStoredSession()?.role === 'dev';
};
