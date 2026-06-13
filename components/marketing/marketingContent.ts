import {
  BarChart3,
  Bell,
  ClipboardList,
  ShieldCheck,
  Smartphone,
  Users,
  type LucideIcon,
} from 'lucide-react';

export const marketingPublicPaths = ['/', '/features', '/pricing', '/about', '/contact'] as const;

export const isMarketingPath = (pathname: string) =>
  marketingPublicPaths.includes(pathname as (typeof marketingPublicPaths)[number]);

export const scheduleDemoHref =
  'mailto:ChemdeckCo@gmail.com?subject=ChemDeck%20demo%20request';

export const marketingNavLinks = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const;

export const marketingFooterColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Security', href: '/privacy' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
] as const;

export type MarketingFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const marketingFeatures: MarketingFeature[] = [
  {
    icon: ClipboardList,
    title: 'Digital Chemical Logs',
    description: 'Employees submit pH, chlorine, and alkalinity readings directly from their phone. No paper, no manual entry.',
  },
  {
    icon: Bell,
    title: 'Instant Alerts',
    description: 'Get notified the moment a pool reading falls out of range or a scheduled test is missed.',
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Invite employees, assign them to specific pools, and manage your entire team from one dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Compliance Reports',
    description: 'Generate health inspection reports in seconds. Stay audit-ready without the paperwork.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    description: 'Managers see everything. Employees see only their assigned pools. Everyone has the right access.',
  },
  {
    icon: Smartphone,
    title: 'Works On Any Device',
    description: 'Browser or home-screen install. Employees can log offline and sync when connection returns.',
  },
];

export const onboardingSteps = [
  {
    title: 'Create Your Organization',
    description: 'Sign up and name your company. You become the admin and owner of your ChemDeck workspace.',
  },
  {
    title: 'Invite Your Team',
    description: 'Managers send email invites from the Team page. Staff join your company automatically from the link.',
  },
  {
    title: 'Start Logging',
    description: 'Employees submit readings from the field. You get real-time visibility across every pool.',
  },
] as const;

export type PricingPlan = {
  id: string;
  title: string;
  price: string;
  priceSuffix: string;
  description: string;
  highlights: { icon: LucideIcon; label: string }[];
  bullets: string[];
  cta: { label: string; href: string; variant: 'primary' | 'secondary' | 'dark' };
  badge?: string;
};

export const pricingPlans: PricingPlan[] = [
  {
    id: 'single',
    title: 'Single facility',
    price: '$49',
    priceSuffix: '/month',
    description:
      'Built for HOAs, apartment complexes, and standalone aquatic facilities that need digital logs without extra complexity.',
    highlights: [
      { icon: ClipboardList, label: 'Digital chemical logs' },
      { icon: Bell, label: 'Out-of-range alerts' },
      { icon: Users, label: 'Team invites' },
    ],
    bullets: [
      'Up to 3 pools at one location',
      'Unlimited employees',
      'Compliance report exports',
      'Email support',
    ],
    cta: { label: 'Start free trial', href: '/signup', variant: 'secondary' },
  },
  {
    id: 'multi',
    title: 'Multi-site operations',
    price: '$129',
    priceSuffix: '/month',
    description:
      'Built for pool service companies, recreation departments, and operators managing multiple properties or large teams.',
    highlights: [
      { icon: ClipboardList, label: 'Digital chemical logs' },
      { icon: Bell, label: 'Out-of-range alerts' },
      { icon: Users, label: 'Team invites' },
    ],
    bullets: [
      'Unlimited pools and locations',
      'Pool assignments per employee',
      'Priority support & onboarding call',
      'Advanced compliance exports',
    ],
    cta: {
      label: 'Book a demo',
      href: 'mailto:ChemdeckCo@gmail.com?subject=ChemDeck%20multi-site%20demo',
      variant: 'primary',
    },
    badge: 'Best for growing teams',
  },
];
