'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '../../../lib/supabaseClient';
import { useTheme } from '../../../components/ThemeProvider';
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
  Scale,
  Clock,
  AlertTriangle,
  Megaphone,
  CheckCircle,
  XCircle
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';
type ChlorineType = 'liquid' | 'cal-hypo' | 'trichlor' | 'dichlor';
type DosingUnit = 'ounces' | 'cups' | 'gallons' | 'pounds';

interface SettingsData {
  chlorineType: ChlorineType;
  chlorineStrength: number;
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
  chlorineType: 'liquid',
  chlorineStrength: 12.5,
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

export default function ManagementSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [profile, setProfile] = useState<{ full_name?: string; email?: string; role?: string } | null>(null);
  const [organization, setOrganization] = useState<{ name?: string; company_code?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('chemdeck-settings');
    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }

    // Load profile
    const loadProfile = async () => {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name,email,role,organization_id')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData);

        // Load organization data if user has an organization
        if (profileData?.organization_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('name,company_code')
            .eq('id', profileData.organization_id)
            .single();
          setOrganization(orgData);
        }
      }
      setLoading(false);
    };

    loadProfile();
  }, []);

  const saveSettings = (newSettings: Partial<SettingsData>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('chemdeck-settings', JSON.stringify(updated));
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
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
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Management</p>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
            Configure your workspace preferences, notifications, and chemical calculator settings.
          </p>
        </div>
        <Link
          href="/management/dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appearance Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Appearance</h2>
          </div>

          <div className="space-y-4">
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
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      theme === value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chemical Calculator Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Chemical Calculator</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Default Chlorine Type</label>
              <select
                value={settings.chlorineType}
                onChange={(e) => saveSettings({ chlorineType: e.target.value as ChlorineType })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="liquid">Liquid Chlorine</option>
                <option value="cal-hypo">Cal-Hypo</option>
                <option value="trichlor">Trichlor</option>
                <option value="dichlor">Dichlor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Default Chlorine Strength (%)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="100"
                value={settings.chlorineStrength}
                onChange={(e) => saveSettings({ chlorineStrength: parseFloat(e.target.value) || 12.5 })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Preferred Dosing Unit</label>
              <select
                value={settings.dosingUnit}
                onChange={(e) => saveSettings({ dosingUnit: e.target.value as DosingUnit })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Master Notifications</span>
              <button
                onClick={() => saveSettings({ masterNotifications: !settings.masterNotifications })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.masterNotifications ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Missed Chemical Test Alerts</span>
              <button
                onClick={() => saveSettings({ missedTestAlerts: !settings.missedTestAlerts })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.missedTestAlerts ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Out-of-Range Chemical Alerts</span>
              <button
                onClick={() => saveSettings({ outOfRangeAlerts: !settings.outOfRangeAlerts })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.outOfRangeAlerts ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">New Announcement Alerts</span>
              <button
                onClick={() => saveSettings({ newAnnouncementAlerts: !settings.newAnnouncementAlerts })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.newAnnouncementAlerts ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Daily Summary</span>
              <button
                onClick={() => saveSettings({ dailySummary: !settings.dailySummary })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.dailySummary ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quiet Hours Start</label>
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => saveSettings({ quietHoursStart: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quiet Hours End</label>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => saveSettings({ quietHoursEnd: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Photo Verification */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Photo Verification</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Require Photo for Every Test</span>
              <button
                onClick={() => saveSettings({ requirePhotoEveryTest: !settings.requirePhotoEveryTest })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.requirePhotoEveryTest ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Require Photo When Out of Range</span>
              <button
                onClick={() => saveSettings({ requirePhotoOutOfRange: !settings.requirePhotoOutOfRange })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.requirePhotoOutOfRange ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Require Photo for Baby Pools</span>
              <button
                onClick={() => saveSettings({ requirePhotoBabyPools: !settings.requirePhotoBabyPools })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.requirePhotoBabyPools ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Allow Gallery Uploads</span>
              <button
                onClick={() => saveSettings({ allowGalleryUploads: !settings.allowGalleryUploads })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.allowGalleryUploads ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Camera-Only Mode</span>
              <button
                onClick={() => saveSettings({ cameraOnlyMode: !settings.cameraOnlyMode })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.cameraOnlyMode ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Account & Workspace</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{profile?.full_name || 'User'}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{profile?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm mb-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-slate-700 dark:text-slate-300">Role: {profile?.role === 'manager' ? 'Manager / Supervisor' : 'Guard / Technician'}</span>
              </div>
              {organization && (
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-slate-700 dark:text-slate-300">
                    Company: {organization.name} ({organization.company_code})
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log Out
            </button>
          </div>
        </div>

        {/* Help / Contact */}
        <div id="help" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Help & Contact</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Common Help Topics</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">How to submit a chemical log</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Navigate to the Guard section, select a pool, and fill out the chemical readings form.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">How managers add pools</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Go to Management → Pools and click "Add New Pool" to configure pool settings.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <Megaphone className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">How announcements work</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Managers can post announcements that appear in the Announcements section for all users.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">What to do if dosing looks wrong</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Contact your manager or supervisor. High doses may require approval before proceeding.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Report a bug</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Use the contact information below to report any issues with the application.</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Contact Support</h3>
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">Need help with ChemDeck?</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 mb-3">
                      Contact Spencer Updike for technical support, feature requests, or questions about the application.
                    </p>
                    <a
                      href="mailto:sru55763@email.vccs.edu"
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      sru55763@email.vccs.edu
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
