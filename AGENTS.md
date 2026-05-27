<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Dev preview parity

When adding manager-facing features, keep **Dev Dashboard → Manager POV** testable without a real Supabase login:

1. **API routes** — use `resolveApiCompanyScope()` so dev sessions with `?companyId=` work.
2. **Client pages** — use `useDevCompanyScope()` and append `query` to fetches/links.
3. **Server pages** — accept `companyId` search param and use `createAdminClient()` when scoped.
4. **Entry points** — wire the feature in all dev paths: `/management/*`, `/manager-view`, Dev Dashboard quick links, and pool cards/lists.
5. **Deploy** — bump version and push to `main` so Vercel preview matches local.
