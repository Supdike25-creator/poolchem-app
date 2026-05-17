'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { temporaryLoginBypass } from '../../../lib/temporaryLoginBypass';
import { appVersion } from '../../../lib/generatedVersion';
import {
  Settings,
  Palette,
  Calculator,
  Bell,
  Camera,
  User,
  HelpCircle,
  Mail,
  Users,
  Building2,
  Clipboard,
  Clock,
  Droplets,
  FlaskConical,
  KeyRound,
  LogOut,
  Moon,
  Sun,
  Monitor,
  AlertTriangle,
  Megaphone,
  CheckCircle,
  XCircle
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';
type StylePreset = 'default' | 'compact' | 'contrast' | 'soft';
type ChlorineType = 'liquid' | 'cal-hypo' | 'trichlor' | 'dichlor';
type DosingUnit = 'ounces' | 'cups' | 'gallons' | 'pounds';

interface SettingsData {
  theme: Theme;
  stylePreset: StylePreset;
  compactLayout: boolean;
  largerTextMode: boolean;
  chemCalcEnabled: boolean;
  chlorineType: ChlorineType;
  chlorineStrength: number;
  poolVolumeGallons: number;
  dosingUnit: DosingUnit;
  babyPoolSafety: boolean;
  requireApproval: boolean;
  retestReminder: number;
  masterNotifications: boolean;
  missedTestAlerts: boolean;
  outOfRangeAlerts: boolean;
  newAnnouncementAlerts: boolean;
  dailySummary: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  requirePhotoEveryTest: boolean;
  requirePhotoOutOfRange: boolean;
  requirePhotoBabyPools: boolean;
  allowGalleryUploads: boolean;
  cameraOnlyMode: boolean;
  companyName: string;
  companyCode: string;
}

const defaultSettings: SettingsData = {
  theme: 'system',
  stylePreset: 'default',
  compactLayout: false,
  largerTextMode: false,
  chemCalcEnabled: true,
  chlorineType: 'liquid',
  chlorineStrength: 12.5,
  poolVolumeGallons: 25000,
  dosingUnit: 'ounces',
  babyPoolSafety: true,
  requireApproval: true,
  retestReminder: 30,
  masterNotifications: true,
  missedTestAlerts: true,
  outOfRangeAlerts: true,
  newAnnouncementAlerts: true,
  dailySummary: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  requirePhotoEveryTest: false,
  requirePhotoOutOfRange: true,
  requirePhotoBabyPools: true,
  allowGalleryUploads: true,
  cameraOnlyMode: false,
  companyName: 'My Pool Company',
  companyCode: 'CHEM7K2',
};

const loadStoredSettings = () => {
  if (typeof window === 'undefined') {
    return defaultSettings;
  }

  try {
    const savedSettings = localStorage.getItem('chemdeck-settings');
    return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
};

const notifySettingsChanged = () => {
  window.dispatchEvent(new Event('chemdeck-settings-change'));
};

const cardClass = 'rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
const sectionTitleClass = 'text-base font-semibold text-slate-950';
const sectionHelpClass = 'mt-1 text-sm leading-6 text-slate-500';

const SectionHeader = ({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) => (
  <div className="mb-5 flex items-start gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
      {icon}
    </div>
    <div>
      <h2 className={sectionTitleClass}>{title}</h2>
      {description ? <p className={sectionHelpClass}>{description}</p> : null}
    </div>
  </div>
);

const ToggleRow = ({
  title,
  description,
  checked,
  disabled,
  onToggle,
}: {
  title: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) => (
  <div className={`flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-3 py-3 ${disabled ? 'bg-slate-50/70 opacity-70' : 'bg-white'}`}>
    <div className="min-w-0">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {description ? <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p> : null}
    </div>
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed ${
        checked ? 'bg-blue-600' : 'bg-slate-300'
      }`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export default function ManagementSettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(loadStoredSettings);
  const [profile, setProfile] = useState<{ full_name?: string; email?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    // Load profile
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name,email,role')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData);
      }
      setLoading(false);
    };

    loadProfile();
  }, []);

  const saveSettings = (newSettings: Partial<SettingsData>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    // TODO: Sync workspace-level settings to Supabase when the settings schema is added.
    localStorage.setItem('chemdeck-settings', JSON.stringify(updated));
    notifySettingsChanged();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const copyCompanyCode = async () => {
    try {
      await navigator.clipboard.writeText(settings.companyCode);
      setCopyMessage('Copied');
      window.setTimeout(() => setCopyMessage(''), 1600);
    } catch {
      setCopyMessage('Copy failed');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-white py-12 shadow-sm">
        <div className="animate-pulse text-center">
          <Settings className="mx-auto mb-4 h-8 w-8 text-blue-500" />
          <p className="text-sm font-medium text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-1 py-1">
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <Settings className="h-4 w-4 text-slate-700" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Management</p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Settings</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Manage workspace preferences, notifications, verification rules, and calculator access.
          </p>
        </div>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* Appearance Settings */}
        <div className={cardClass}>
          <SectionHeader
            icon={<Palette className="h-4 w-4" />}
            title="Appearance"
            description="Set the visual style for your operations workspace."
          />

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'light' as Theme, label: 'Light', icon: Sun },
                  { value: 'dark' as Theme, label: 'Dark', icon: Moon },
                  { value: 'system' as Theme, label: 'System', icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => saveSettings({ theme: value })}
                    className={`flex h-20 flex-col items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
                      settings.theme === value
                        ? 'border-blue-300 bg-blue-50 text-blue-800 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.12)]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Style Format</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: 'default' as StylePreset, label: 'Standard Blue', description: 'Clean sans with ChemDeck blue accents.' },
                  { value: 'compact' as StylePreset, label: 'Compact Teal', description: 'Tighter font with teal action colors.' },
                  { value: 'contrast' as StylePreset, label: 'High Contrast', description: 'Bold system font with amber highlights.' },
                  { value: 'soft' as StylePreset, label: 'Soft Indigo', description: 'Softer indigo accents with the same SaaS typography.' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => saveSettings({ stylePreset: option.value })}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      settings.stylePreset === option.value
                        ? 'border-blue-300 bg-blue-50 text-blue-900 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.12)]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <ToggleRow
                title="Compact layout"
                description="Reduce spacing for denser management views."
                checked={settings.compactLayout}
                onToggle={() => {
                  const compactLayout = !settings.compactLayout;
                  saveSettings({ compactLayout, stylePreset: compactLayout ? 'compact' : 'default' });
                }}
              />
              <ToggleRow
                title="Larger text mode"
                description="Increase readability for staff using tablets or phones outdoors."
                checked={settings.largerTextMode}
                onToggle={() => saveSettings({ largerTextMode: !settings.largerTextMode })}
              />
            </div>
          </div>
        </div>

        {/* Chemistry / Dosing */}
        <div className={cardClass}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                <Calculator className="h-4 w-4" />
              </div>
              <div>
                <h2 className={sectionTitleClass}>Chemistry / Dosing</h2>
                <p className={sectionHelpClass}>Calculator access and default safety rules for chemical recommendations.</p>
              </div>
            </div>
            <Link
              href="/dashboard/calculator"
              data-sound="click"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-950 px-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
              aria-label="Open chemical calculator"
            >
              <Calculator className="h-3.5 w-3.5" />
              Open Calc
            </Link>
          </div>

          <div className="space-y-2">
            <ToggleRow
              title="Enable chemical calculator"
              description="Show live dosing math in the calculator workflow."
              checked={settings.chemCalcEnabled}
              onToggle={() => saveSettings({ chemCalcEnabled: !settings.chemCalcEnabled })}
            />
            <ToggleRow
              title="Require manager approval for large doses"
              description="Flag high-dose recommendations before staff proceeds."
              checked={settings.requireApproval}
              disabled={!settings.chemCalcEnabled}
              onToggle={() => saveSettings({ requireApproval: !settings.requireApproval })}
            />
            <ToggleRow
              title="Baby pool safety cap"
              description="Cap recommendations for smaller, higher-risk bodies of water."
              checked={settings.babyPoolSafety}
              disabled={!settings.chemCalcEnabled}
              onToggle={() => saveSettings({ babyPoolSafety: !settings.babyPoolSafety })}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Droplets className="h-4 w-4 text-blue-600" />
                Chlorine target
              </div>
              <p className="text-sm text-slate-600">Default range: 1.0-4.0 ppm</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FlaskConical className="h-4 w-4 text-blue-600" />
                pH target
              </div>
              <p className="text-sm text-slate-600">Default range: 7.2-7.8</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Clock className="h-4 w-4" />
              Retest reminder interval
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                step="5"
                value={settings.retestReminder}
                onChange={(event) => saveSettings({ retestReminder: Number(event.target.value) || 0 })}
                className="h-10 w-28 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-600">minutes after a flagged dose</span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className={cardClass}>
          <SectionHeader
            icon={<Bell className="h-4 w-4" />}
            title="Notifications"
            description="Control operational alerts and daily communication preferences."
          />

          <div className="space-y-2">
            <ToggleRow
              title="Master notifications"
              description="Enable or pause all app notification rules."
              checked={settings.masterNotifications}
              onToggle={() => saveSettings({ masterNotifications: !settings.masterNotifications })}
            />
            <ToggleRow
              title="Missed chemical test alerts"
              description="Notify managers when scheduled pool checks are not submitted."
              checked={settings.missedTestAlerts}
              disabled={!settings.masterNotifications}
              onToggle={() => saveSettings({ missedTestAlerts: !settings.missedTestAlerts })}
            />
            <ToggleRow
              title="Out-of-range chemical alerts"
              description="Flag chlorine or pH readings that need follow-up."
              checked={settings.outOfRangeAlerts}
              disabled={!settings.masterNotifications}
              onToggle={() => saveSettings({ outOfRangeAlerts: !settings.outOfRangeAlerts })}
            />
            <ToggleRow
              title="New announcement alerts"
              description="Notify staff when a manager posts an announcement."
              checked={settings.newAnnouncementAlerts}
              disabled={!settings.masterNotifications}
              onToggle={() => saveSettings({ newAnnouncementAlerts: !settings.newAnnouncementAlerts })}
            />
            <ToggleRow
              title="Daily summary"
              description="Send a digest of daily activity and unresolved items."
              checked={settings.dailySummary}
              disabled={!settings.masterNotifications}
              onToggle={() => saveSettings({ dailySummary: !settings.dailySummary })}
            />

            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Quiet Hours Start</label>
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => saveSettings({ quietHoursStart: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Quiet Hours End</label>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => saveSettings({ quietHoursEnd: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Photo Verification */}
        <div className={cardClass}>
          <SectionHeader
            icon={<Camera className="h-4 w-4" />}
            title="Photo Verification"
            description="Set when staff should attach photo evidence to chemical checks."
          />

          <div className="space-y-2">
            <ToggleRow
              title="Require photo for every test"
              description="Ask staff to document every chemical reading."
              checked={settings.requirePhotoEveryTest}
              onToggle={() => saveSettings({ requirePhotoEveryTest: !settings.requirePhotoEveryTest })}
            />
            <ToggleRow
              title="Require photo when out of range"
              description="Capture evidence when readings need review."
              checked={settings.requirePhotoOutOfRange}
              onToggle={() => saveSettings({ requirePhotoOutOfRange: !settings.requirePhotoOutOfRange })}
            />
            <ToggleRow
              title="Require photo for baby pools"
              description="Apply stricter verification to higher-risk pools."
              checked={settings.requirePhotoBabyPools}
              onToggle={() => saveSettings({ requirePhotoBabyPools: !settings.requirePhotoBabyPools })}
            />
            <ToggleRow
              title="Allow gallery uploads"
              description="Let staff use an existing image from their device."
              checked={settings.allowGalleryUploads}
              onToggle={() => saveSettings({ allowGalleryUploads: !settings.allowGalleryUploads })}
            />
            <ToggleRow
              title="Camera-only mode"
              description="Require a new photo at the time of submission."
              checked={settings.cameraOnlyMode}
              onToggle={() => saveSettings({ cameraOnlyMode: !settings.cameraOnlyMode })}
            />
          </div>
        </div>

        {/* Company / Workspace */}
        <div className={cardClass}>
          <SectionHeader
            icon={<Building2 className="h-4 w-4" />}
            title="Company / Workspace"
            description="Share the company code with staff joining this workspace."
          />

          <div className="space-y-3">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Company Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(event) => saveSettings({ companyName: event.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Company Code</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <code className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base font-semibold tracking-[0.18em] text-slate-950">
                  {settings.companyCode}
                </code>
                <button
                  type="button"
                  onClick={copyCompanyCode}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Clipboard className="h-4 w-4" />
                  {copyMessage || 'Copy code'}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Users className="h-4 w-4 text-slate-500" />
                <span>Current role: {profile?.role === 'manager' ? 'Manager / Supervisor' : 'Guard / Technician'}</span>
              </div>
              <button
                type="button"
                disabled
                className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-400"
              >
                Change company coming soon
              </button>
            </div>
          </div>
        </div>

        {/* Account / Security */}
        <div className={cardClass}>
          <SectionHeader
            icon={<KeyRound className="h-4 w-4" />}
            title="Account / Security"
            description="Review session status and signed-in account details."
          />

          <div className="space-y-3">
            {temporaryLoginBypass ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Developer bypass active</p>
                    <p className="mt-1 text-sm leading-5 text-amber-800">Temporary login bypass is enabled for development. Disable it before production auth testing.</p>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900">
                  <span className="text-sm font-semibold text-white">
                    {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{profile?.full_name || 'User'}</p>
                  <p className="text-sm text-slate-600">{profile?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-slate-700">Session status: Active</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              data-sound="click"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>

        {/* Help / Contact */}
        <div id="help" className={`${cardClass} lg:col-span-2`}>
          <SectionHeader
            icon={<HelpCircle className="h-4 w-4" />}
            title="Help & Contact"
            description="Reference common operating tasks and support contacts."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Common Help Topics</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">How to submit a chemical log</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">Navigate to the Guard section, select a pool, and fill out the chemical readings form.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <Users className="mt-0.5 h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">How managers add pools</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">Go to Management → Pools and click &quot;Add New Pool&quot; to configure pool settings.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <Megaphone className="mt-0.5 h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">How announcements work</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">Managers can post announcements that appear in the Announcements section for all users.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">What to do if dosing looks wrong</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">Contact your manager or supervisor. High doses may require approval before proceeding.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <XCircle className="mt-0.5 h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Report a bug</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">Use the contact information below to report any issues with the application.</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Contact Support</h3>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-blue-700" />
                  <div>
                    <p className="text-sm font-semibold text-blue-950">Need help with ChemDeck?</p>
                    <p className="mb-3 mt-1 text-sm leading-5 text-blue-800">
                      Contact Spencer Updike and Tyler Pollock for technical support, feature requests, or questions about the application.
                    </p>
                    <a
                      href="mailto:ChemdeckCo@gmail.com"
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-800 shadow-sm transition-colors hover:bg-blue-50"
                    >
                      <Mail className="h-4 w-4" />
                      ChemdeckCo@gmail.com
                    </a>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">App version {appVersion}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
