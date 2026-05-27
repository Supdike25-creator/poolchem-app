export const getAppBaseUrl = (fallback = '') => {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return fallback.replace(/\/$/, '');
};

export const buildInviteLink = (token: string, baseUrl = '') => {
  const base = getAppBaseUrl(baseUrl);
  return `${base}/invite/${token.trim()}`;
};

/** @deprecated Company codes are no longer used for invites. */
export const buildSignupInviteLink = (_companyCode: string, _role: 'guard' | 'boss' = 'guard', baseUrl = '') =>
  `${getAppBaseUrl(baseUrl)}/create-account`;

/** @deprecated Company codes are no longer used for invites. */
export const buildJoinInviteLink = (_companyCode: string, baseUrl = '') =>
  `${getAppBaseUrl(baseUrl)}/login`;
