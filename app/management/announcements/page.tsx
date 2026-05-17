'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Megaphone,
  Plus,
  Send,
  Clock,
  User,
  AlertTriangle,
  Info,
  CheckCircle,
  Users,
  MapPin,
  Calendar,
  X
} from 'lucide-react';
import { EmptyState, PageHeader, SectionCard, StatusBadge, buttonClass } from '../../../components/OperationsUI';

type Priority = 'normal' | 'important' | 'emergency';
type Audience = 'all_lifeguards' | 'specific_pool' | 'managers_only';

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: Priority;
  audience: Audience;
  pool_id?: string;
  pool_name?: string;
  created_by: string;
  author_name: string;
  created_at: string;
  send_notification: boolean;
}

interface Pool {
  id: string;
  name: string;
}

const priorityConfig = {
  normal: { color: 'blue', icon: Info, label: 'Normal' },
  important: { color: 'orange', icon: AlertTriangle, label: 'Important' },
  emergency: { color: 'red', icon: AlertTriangle, label: 'Emergency' },
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'normal' as Priority,
    audience: 'all_lifeguards' as Audience,
    pool_id: '',
    send_notification: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [announcementNotifications, setAnnouncementNotifications] = useState(true);

  async function loadData() {
    const supabase = createClient();

    // Get user role
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      setIsManager(profile?.role === 'manager');
    }

    // Load pools for manager form
    const { data: poolsData } = await supabase
      .from('pools')
      .select('id, name')
      .order('name');
    setPools(poolsData || []);

    // Load announcements (mock data for now)
    const mockAnnouncements: Announcement[] = [
      {
        id: '1',
        title: 'Weekly Maintenance Reminder',
        message: 'Please ensure all pool equipment is functioning properly and chemical levels are within range. Report any issues immediately.',
        priority: 'normal',
        audience: 'all_lifeguards',
        created_by: 'manager1',
        author_name: 'John Manager',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        send_notification: true,
      },
      {
        id: '2',
        title: 'New Safety Protocol',
        message: 'Starting tomorrow, all baby pools must have photo verification for every chemical test. This is mandatory for safety compliance.',
        priority: 'important',
        audience: 'all_lifeguards',
        created_by: 'manager1',
        author_name: 'John Manager',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        send_notification: true,
      },
      {
        id: '3',
        title: 'Emergency: Pool 3 Closure',
        message: 'Pool 3 is experiencing equipment failure and must be closed immediately. All guards please evacuate the area and redirect guests to other pools.',
        priority: 'emergency',
        audience: 'all_lifeguards',
        pool_id: 'pool3',
        pool_name: 'Olympic Pool',
        created_by: 'manager1',
        author_name: 'John Manager',
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        send_notification: true,
      },
    ];

    setAnnouncements(mockAnnouncements);
    setLoading(false);

    // Load notification preference
    const saved = localStorage.getItem('announcement-notifications');
    if (saved !== null) {
      setAnnouncementNotifications(JSON.parse(saved));
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) return;

    setSubmitting(true);

    // Mock announcement creation
    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      title: formData.title,
      message: formData.message,
      priority: formData.priority,
      audience: formData.audience,
      pool_id: formData.pool_id || undefined,
      pool_name: formData.pool_id ? pools.find(p => p.id === formData.pool_id)?.name : undefined,
      created_by: 'current-user',
      author_name: 'Current User',
      created_at: new Date().toISOString(),
      send_notification: formData.send_notification,
    };

    setAnnouncements(prev => [newAnnouncement, ...prev]);
    setFormData({
      title: '',
      message: '',
      priority: 'normal',
      audience: 'all_lifeguards',
      pool_id: '',
      send_notification: true,
    });
    setShowCreateForm(false);
    setSubmitting(false);
  };

  const toggleNotifications = () => {
    const newValue = !announcementNotifications;
    setAnnouncementNotifications(newValue);
    localStorage.setItem('announcement-notifications', JSON.stringify(newValue));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-center">
          <Megaphone className="w-8 h-8 text-blue-400 mx-auto mb-4" />
          <p className="text-slate-600">Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Management"
        title="Announcements"
        description={isManager
          ? 'Send important messages and updates to your team.'
          : 'Stay updated with the latest information from management.'}
        icon={<Megaphone className="h-4 w-4" />}
        actions={!isManager ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700">Announcement notifications</span>
              <button
                onClick={toggleNotifications}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  announcementNotifications ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    announcementNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
        ) : undefined}
      />

      {isManager && (
        <SectionCard className="p-4">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Post New Announcement
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-950">Create Announcement</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter announcement title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your announcement message"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Audience</label>
                  <select
                    value={formData.audience}
                    onChange={(e) => setFormData(prev => ({ ...prev, audience: e.target.value as Audience }))}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all_lifeguards">All Lifeguards</option>
                    <option value="specific_pool">Specific Pool</option>
                    <option value="managers_only">Managers Only</option>
                  </select>
                </div>
              </div>

              {formData.audience === 'specific_pool' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Pool</label>
                  <select
                    value={formData.pool_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, pool_id: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Choose a pool...</option>
                    {pools.map(pool => (
                      <option key={pool.id} value={pool.id}>{pool.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="send_notification"
                  checked={formData.send_notification}
                  onChange={(e) => setFormData(prev => ({ ...prev, send_notification: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="send_notification" className="text-sm text-slate-700">
                  Send push notification to recipients
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className={buttonClass.primary}
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Posting...' : 'Post Announcement'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className={buttonClass.secondary}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </SectionCard>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Recent Announcements</h2>

        {announcements.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="h-6 w-6" />}
            title="No announcements yet"
            description={isManager ? 'Create your first announcement to communicate with your team.' : 'Check back later for updates from management.'}
          />
        ) : (
          announcements.map((announcement) => {
            const priority = priorityConfig[announcement.priority];
            const PriorityIcon = priority.icon;

            return (
              <div
                key={announcement.id}
                className={`rounded-xl border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
                  announcement.priority === 'emergency'
                    ? 'border-red-200 bg-red-50'
                    : announcement.priority === 'important'
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      announcement.priority === 'emergency'
                        ? 'bg-red-100'
                        : announcement.priority === 'important'
                        ? 'bg-orange-100'
                        : 'bg-blue-100'
                    }`}>
                      <PriorityIcon className={`w-5 h-5 ${
                        announcement.priority === 'emergency'
                          ? 'text-red-600'
                          : announcement.priority === 'important'
                          ? 'text-orange-600'
                          : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{announcement.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {announcement.author_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDate(announcement.created_at)}
                        </div>
                        {announcement.pool_name && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {announcement.pool_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <StatusBadge tone={announcement.priority === 'emergency' ? 'critical' : announcement.priority === 'important' ? 'warning' : 'info'}>
                    {priority.label}
                  </StatusBadge>
                </div>

                <p className="text-slate-700 leading-relaxed">{announcement.message}</p>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {announcement.audience === 'all_lifeguards' ? 'All Lifeguards' :
                       announcement.audience === 'specific_pool' ? 'Specific Pool' : 'Managers Only'}
                    </div>
                    {announcement.send_notification && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Notification sent
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
