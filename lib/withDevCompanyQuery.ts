export function withDevCompanyQuery(href: string, companyId?: string | null) {
  if (!companyId) return href;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}companyId=${encodeURIComponent(companyId)}`;
}
