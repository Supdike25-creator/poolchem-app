import Link from 'next/link';
import ChemDeckLogo from '@/components/ChemDeckLogo';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
          ← Back to ChemDeck
        </Link>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <ChemDeckLogo variant="full" className="mb-6 h-10 w-auto" />
          <h1 className="text-3xl font-semibold">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: May 25, 2026</p>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            ChemDeck (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides pool chemistry management software for aquatic
            facilities and operations teams. This Privacy Policy explains how we collect, use, store, and protect
            information when you use the ChemDeck website, web application, and related services (collectively, the
            &quot;Service&quot;).
          </p>

          <h2 className="mt-8 text-lg font-semibold">Information we collect</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">We collect information necessary to operate the Service, including:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
            <li>
              <span className="font-medium text-slate-700">Account information:</span> name, email address, username,
              role (such as manager or employee), and authentication credentials managed through our identity provider.
            </li>
            <li>
              <span className="font-medium text-slate-700">Organization data:</span> company name, company codes,
              team membership, pool assignments, and workspace settings configured by administrators.
            </li>
            <li>
              <span className="font-medium text-slate-700">Operational records:</span> pool configuration, chemical
              log readings (pH, chlorine, alkalinity, and related fields), timestamps, notes, and optional photos
              uploaded with log submissions.
            </li>
            <li>
              <span className="font-medium text-slate-700">Usage and device data:</span> browser type, device
              information, IP address, and activity logs needed to secure the Service, troubleshoot issues, and
              maintain performance.
            </li>
          </ul>

          <h2 className="mt-8 text-lg font-semibold">How we use information</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">We use collected information to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
            <li>Provide guard logging, manager dashboards, alerts, announcements, and compliance reporting</li>
            <li>Authenticate users, enforce role-based access, and maintain secure sessions</li>
            <li>Support offline-capable app behavior and sync submitted data when connectivity returns</li>
            <li>Improve reliability, security, and product functionality</li>
            <li>Respond to support requests and communicate important service updates</li>
          </ul>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            We do not sell your personal information. We do not use customer chemistry logs or account data for
            third-party advertising.
          </p>

          <h2 className="mt-8 text-lg font-semibold">How we share information</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Within your organization, managers and authorized staff can access data according to their assigned
            roles. We may share information with service providers that help us operate ChemDeck, such as cloud
            hosting and authentication providers, under contractual obligations to protect your data. We may also
            disclose information when required by law or to protect the rights, safety, and security of ChemDeck,
            our users, or the public.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Data retention</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            We retain account and operational data for as long as your organization uses the Service or as needed
            to provide features you rely on, comply with legal obligations, resolve disputes, and enforce our
            agreements. Organization administrators may request deletion of company data subject to applicable
            retention requirements.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Security</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            We implement administrative, technical, and organizational measures designed to protect information
            against unauthorized access, alteration, disclosure, or destruction. No method of transmission or
            storage is completely secure, and we cannot guarantee absolute security.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Your choices and rights</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Depending on your location, you may have rights to access, correct, delete, or export personal
            information we hold about you. Organization members should contact their company administrator for
            workspace-related requests. You may also contact us directly using the information below.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Children&apos;s privacy</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            ChemDeck is intended for use by organizations and their authorized staff. It is not directed to
            children under 13, and we do not knowingly collect personal information from children.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Changes to this policy</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            We may update this Privacy Policy from time to time. When we do, we will revise the &quot;Last updated&quot;
            date above. Continued use of the Service after changes become effective constitutes acceptance of the
            updated policy.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Contact us</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Questions about this Privacy Policy or our data practices can be sent to{' '}
            <a href="mailto:ChemdeckCo@gmail.com" className="font-medium text-blue-700 hover:text-blue-800">
              ChemdeckCo@gmail.com
            </a>.
          </p>
        </div>
      </div>
    </main>
  );
}
