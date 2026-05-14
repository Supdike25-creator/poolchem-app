'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import BackButton from '../../../components/BackButton';
import {
  Settings,
  Palette,
  Calculator,
  Bell,
  Camera,
  User,
  HelpCircle,
  Mail,
  Shield,
  Users,
  Moon,
  Sun,
  Monitor,
  Droplets,
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
}

const defaultSettings: SettingsData = {
  theme: 'system',
  stylePreset: 'default',
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
};

const clampPoolVolume = (value: number) => Math.min(100000, Math.max(500, Math.round(value)));

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

export default function ManagementSettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(loadStoredSettings);
  const [profile, setProfile] = useState<{ full_name?: string; email?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);

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
    localStorage.setItem('chemdeck-settings', JSON.stringify(updated));
    notifySettingsChanged();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-center">
          <Settings className="w-8 h-8 text-blue-400 mx-auto mb-4" />
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-6 h-6 text-blue-600" />
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Management</p>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-2 text-slate-600 max-w-2xl">
            Configure your workspace preferences, notifications, and chemical calculator settings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BackButton fallbackHref="/management/dashboard" label="Back" />
          <Link
            href="/management/dashboard"
            data-sound="click"
            className="inline-flex items-center justify-center rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Appearance Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Theme</label>
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
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      settings.theme === value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Style Format</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: 'default' as StylePreset, label: 'Standard Blue', description: 'Clean sans with ChemDeck blue accents.' },
                  { value: 'compact' as StylePreset, label: 'Compact Teal', description: 'Tighter font with teal action colors.' },
                  { value: 'contrast' as StylePreset, label: 'High Contrast', description: 'Bold system font with amber highlights.' },
                  { value: 'soft' as StylePreset, label: 'Soft Editorial', description: 'Serif headings with softer indigo tones.' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => saveSettings({ stylePreset: option.value })}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      settings.stylePreset === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chemical Calculator Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Chemical Calculator</h2>
            </div>
            <Link href="/management/calculator" data-sound="click" className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
              Calc
            </Link>
          </div>

          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm font-semibold text-blue-900">Calculator moved to its own page</p>
            <p className="mt-1 text-xs text-blue-700">Set defaults here, then use the small Calc button for live dosing math.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Default Chlorine Type</label>
              <select
                value={settings.chlorineType}
                onChange={(e) => saveSettings({ chlorineType: e.target.value as ChlorineType })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="liquid">Liquid Chlorine</option>
                <option value="cal-hypo">Cal-Hypo</option>
                <option value="trichlor">Trichlor</option>
                <option value="dichlor">Dichlor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Default Chlorine Strength (%)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="100"
                value={settings.chlorineStrength}
                onChange={(e) => saveSettings({ chlorineStrength: parseFloat(e.target.value) || 12.5 })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <label htmlFor="pool-volume" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  Default Pool Volume
                </label>
                <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                  {settings.poolVolumeGallons.toLocaleString()} gal
                </span>
              </div>
              <input
                id="pool-volume"
                type="range"
                min="500"
                max="100000"
                step="500"
                value={settings.poolVolumeGallons}
                onChange={(e) => saveSettings({ poolVolumeGallons: clampPoolVolume(Number(e.target.value)) })}
                className="w-full accent-blue-600"
              />
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  min="500"
                  max="100000"
                  step="500"
                  value={settings.poolVolumeGallons}
                  onChange={(e) => saveSettings({ poolVolumeGallons: clampPoolVolume(Number(e.target.value) || defaultSettings.poolVolumeGallons) })}
                  className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-sm text-slate-500">Used as the calculator fallback when a pool has no saved volume.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Dosing Unit</label>
              <select
                value={settings.dosingUnit}
                onChange={(e) => saveSettings({ dosingUnit: e.target.value as DosingUnit })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="ounces">Ounces</option>
                <option value="cups">Cups</option>
                <option value="gallons">Gallons</option>
                <option value="pounds">Pounds</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">Baby Pool Safety Cap</span>
                </div>
                <button
                  type="button"
                  onClick={() => saveSettings({ babyPoolSafety: !settings.babyPoolSafety })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.babyPoolSafety ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.babyPoolSafety ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">Require Manager Approval for High-Dose</span>
                </div>
                <button
                  type="button"
                  onClick={() => saveSettings({ requireApproval: !settings.requireApproval })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.requireApproval ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.requireApproval ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Retest Reminder (minutes)</label>
              <input
                type="number"
                min="5"
                max="120"
                value={settings.retestReminder}
                onChange={(e) => saveSettings({ retestReminder: parseInt(e.target.value) || 30 })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Master Notifications</span>
              <button
                type="button"
                onClick={() => saveSettings({ masterNotifications: !settings.masterNotifications })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.masterNotifications ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.masterNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Missed Chemical Test Alerts</span>
              <button
                type="button"
                onClick={() => saveSettings({ missedTestAlerts: !settings.missedTestAlerts })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.missedTestAlerts ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                disabled={!settings.masterNotifications}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.missedTestAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Out-of-Range Chemical Alerts</span>
              <button
                type="button"
                onClick={() => saveSettings({ outOfRangeAlerts: !settings.outOfRangeAlerts })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.outOfRangeAlerts ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                disabled={!settings.masterNotifications}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.outOfRangeAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">New Announcement Alerts</span>
              <button
                type="button"
                onClick={() => saveSettings({ newAnnouncementAlerts: !settings.newAnnouncementAlerts })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.newAnnouncementAlerts ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                disabled={!settings.masterNotifications}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.newAnnouncementAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Daily Summary</span>
              <button
                type="button"
                onClick={() => saveSettings({ dailySummary: !settings.dailySummary })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.dailySummary ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                disabled={!settings.masterNotifications}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.dailySummary ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Quiet Hours Start</label>
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => saveSettings({ quietHoursStart: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Quiet Hours End</label>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => saveSettings({ quietHoursEnd: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Photo Verification */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Camera className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Photo Verification</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Require Photo for Every Test</span>
              <button
                type="button"
                onClick={() => saveSettings({ requirePhotoEveryTest: !settings.requirePhotoEveryTest })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.requirePhotoEveryTest ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.requirePhotoEveryTest ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Require Photo When Out of Range</span>
              <button
                type="button"
                onClick={() => saveSettings({ requirePhotoOutOfRange: !settings.requirePhotoOutOfRange })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.requirePhotoOutOfRange ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.requirePhotoOutOfRange ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Require Photo for Baby Pools</span>
              <button
                type="button"
                onClick={() => saveSettings({ requirePhotoBabyPools: !settings.requirePhotoBabyPools })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.requirePhotoBabyPools ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.requirePhotoBabyPools ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Allow Gallery Uploads</span>
              <button
                type="button"
                onClick={() => saveSettings({ allowGalleryUploads: !settings.allowGalleryUploads })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.allowGalleryUploads ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.allowGalleryUploads ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Camera-Only Mode</span>
              <button
                type="button"
                onClick={() => saveSettings({ cameraOnlyMode: !settings.cameraOnlyMode })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.cameraOnlyMode ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.cameraOnlyMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Account / Workspace */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Account & Workspace</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{profile?.full_name || 'User'}</p>
                  <p className="text-sm text-slate-600">{profile?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-slate-700">Role: {profile?.role === 'manager' ? 'Manager / Supervisor' : 'Guard / Technician'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              data-sound="click"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log Out
            </button>
          </div>
        </div>

        {/* Help / Contact */}
        <div id="help" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Help & Contact</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Common Help Topics</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">How to submit a chemical log</p>
                    <p className="text-sm text-slate-600 mt-1">Navigate to the Guard section, select a pool, and fill out the chemical readings form.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">How managers add pools</p>
                    <p className="text-sm text-slate-600 mt-1">Go to Management → Pools and click &quot;Add New Pool&quot; to configure pool settings.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Megaphone className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">How announcements work</p>
                    <p className="text-sm text-slate-600 mt-1">Managers can post announcements that appear in the Announcements section for all users.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">What to do if dosing looks wrong</p>
                    <p className="text-sm text-slate-600 mt-1">Contact your manager or supervisor. High doses may require approval before proceeding.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">Report a bug</p>
                    <p className="text-sm text-slate-600 mt-1">Use the contact information below to report any issues with the application.</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Contact Support</h3>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Need help with ChemDeck?</p>
                    <p className="text-sm text-blue-700 mt-1 mb-3">
                      Contact Spencer Updike and Tyler Pollock for technical support, feature requests, or questions about the application.
                    </p>
                    <a
                      href="mailto:ChemdeckCo@gmail.com"
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      ChemdeckCo@gmail.com
                    </a>
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
