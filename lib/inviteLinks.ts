export const getAppBaseUrl = (fallback = '') => {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return fallback.replace(/\/$/, '');
};

export const buildSignupInviteLink = (companyCode: string, role: 'guard' | 'boss' = 'guard', baseUrl = '') => {
  const base = getAppBaseUrl(baseUrl);
  const params = new URLSearchParams({
    role,
    code: companyCode.trim().toUpperCase(),
  });
  return `${base}/create-account?${params.toString()}`;
};

export const buildJoinInviteLink = (companyCode: string, baseUrl = '') => {
  const base = getAppBaseUrl(baseUrl);
  const params = new URLSearchParams({
    code: companyCode.trim().toUpperCase(),
  });
  return `${base}/enter-company-code?${params.toString()}`;
};
