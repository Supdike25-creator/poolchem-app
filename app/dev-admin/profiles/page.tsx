import { formatWorkplaceRoleLabel } from '@/lib/devRoleMapping';
import AdminActionPanel from '@/components/dev/AdminActionPanel';
import CreateProfileForm from '@/components/dev/CreateProfileForm';
import DevShell from '@/components/dev/DevShell';
import { loadCompanies, loadProfiles, requireDev } from '@/lib/devAdmin';

export const dynamic = 'force-dynamic';

export default async function DevAdminProfilesPage() {
  await requireDev();
  const [profiles, companies] = await Promise.all([loadProfiles(), loadCompanies()]);
  const companyNameById = new Map(companies.map((company) => [company.id, company.company_name]));

  return (
    <DevShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-950">Admin Panel: Profiles</h1>
        <CreateProfileForm companies={companies} />
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Username</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Company</th>
                  <th className="px-3 py-3">Active</th>
                  <th className="px-3 py-3">Last login</th>
                  <th className="px-3 py-3">ID</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td className="px-3 py-3 font-semibold text-slate-900">{profile.full_name ?? '-'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{profile.username ?? '-'}</td>
                    <td className="px-3 py-3">{profile.email ?? '-'}</td>
                    <td className="px-3 py-3">{formatWorkplaceRoleLabel(profile.role)}</td>
                    <td className="px-3 py-3">{profile.company_id ? companyNameById.get(profile.company_id) ?? profile.company_id : '-'}</td>
                    <td className="px-3 py-3">{profile.active === false || profile.status === 'inactive' ? 'Inactive' : 'Active'}</td>
                    <td className="px-3 py-3">{profile.last_login ? new Date(profile.last_login).toLocaleString() : '-'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{profile.id}</td>
                    <td className="px-3 py-3"><AdminActionPanel scope="profile" id={profile.id} companies={companies} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DevShell>
  );
}
