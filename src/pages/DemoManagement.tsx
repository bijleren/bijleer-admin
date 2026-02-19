import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, Plus, Edit2, Trash2, Users, Video, ExternalLink, Link2, Check } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Platform {
  id: string;
  name: string;
  description: string;
}

interface DemoSession {
  id: string;
  platform_id: string;
  session_date: string;
  title: string;
  description: string;
  max_participants: number | null;
  is_published: boolean;
  recording_url: string | null;
  slug: string | null;
  duration_minutes: number | null;
  location: string | null;
  platform?: Platform;
  registration_count?: number;
}

export default function DemoManagement() {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [sessions, setSessions] = useState<DemoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<DemoSession | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    platform_id: '',
    session_date: '',
    title: '',
    description: '',
    max_participants: '',
    is_published: false,
    recording_url: '',
    slug: '',
    duration_minutes: '60',
    location: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: platformsData, error: platformsError } = await supabase
        .from('demo_platforms')
        .select('*')
        .order('name');

      if (platformsError) throw platformsError;

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('demo_sessions')
        .select(`
          *,
          platform:demo_platforms(*)
        `)
        .order('session_date', { ascending: false });

      if (sessionsError) throw sessionsError;

      const sessionsWithCounts = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { count } = await supabase
            .from('demo_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('demo_session_id', session.id);

          return { ...session, registration_count: count || 0 };
        })
      );

      setPlatforms(platformsData || []);
      setSessions(sessionsWithCounts || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openSessionModal = (session?: DemoSession) => {
    if (session) {
      setEditingSession(session);
      setFormData({
        platform_id: session.platform_id,
        session_date: new Date(session.session_date).toISOString().slice(0, 16),
        title: session.title,
        description: session.description || '',
        max_participants: session.max_participants?.toString() || '',
        is_published: session.is_published,
        recording_url: session.recording_url || '',
        slug: session.slug || '',
        duration_minutes: session.duration_minutes?.toString() || '60',
        location: session.location || '',
      });
    } else {
      setEditingSession(null);
      setFormData({
        platform_id: platforms[0]?.id || '',
        session_date: '',
        title: '',
        description: '',
        max_participants: '',
        is_published: false,
        recording_url: '',
        slug: '',
        duration_minutes: '60',
        location: '',
      });
    }
    setShowSessionModal(true);
  };

  const closeSessionModal = () => {
    setShowSessionModal(false);
    setEditingSession(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const sessionData = {
        platform_id: formData.platform_id,
        session_date: new Date(formData.session_date).toISOString(),
        title: formData.title,
        description: formData.description || null,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        is_published: formData.is_published,
        recording_url: formData.recording_url || null,
        slug: formData.slug || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : 60,
        location: formData.location || null,
        updated_at: new Date().toISOString(),
      };

      if (editingSession) {
        const { error } = await supabase
          .from('demo_sessions')
          .update(sessionData)
          .eq('id', editingSession.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('demo_sessions')
          .insert([sessionData]);

        if (error) throw error;
      }

      closeSessionModal();
      fetchData();
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Error saving session. Please try again.');
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this demo session?')) return;

    try {
      const { error } = await supabase
        .from('demo_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchData();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting session. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('nl-BE', {
      timeZone: 'Europe/Brussels',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copySessionLink = async (session: DemoSession) => {
    const baseUrl = window.location.origin;
    const link = session.slug
      ? `${baseUrl}/demos/${session.slug}`
      : `${baseUrl}/demos/${session.id}`;

    try {
      await navigator.clipboard.writeText(link);
      setCopiedSessionId(session.id);
      setTimeout(() => setCopiedSessionId(null), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
      alert('Failed to copy link. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Demo Management</h1>
          <p className="text-gray-600 mt-1">Schedule and manage demo sessions</p>
        </div>
        <button
          onClick={() => openSessionModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Demo Session
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registrations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recording
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Share
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {formatDate(session.session_date)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{session.title}</div>
                    {session.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {session.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {session.platform?.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/platform/demo/${session.id}/registrations`)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {session.registration_count}
                        {session.max_participants && ` / ${session.max_participants}`}
                      </span>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        session.is_published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {session.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {session.recording_url ? (
                      <a
                        href={session.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <Video className="w-4 h-4" />
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400">No recording</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {session.is_published ? (
                      <button
                        onClick={() => copySessionLink(session)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        {copiedSessionId === session.id ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Link2 className="w-4 h-4" />
                            Copy Link
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400">Unpublished</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openSessionModal(session)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingSession ? 'Edit Demo Session' : 'New Demo Session'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform *
                </label>
                <select
                  value={formData.platform_id}
                  onChange={(e) => setFormData({ ...formData, platform_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a platform</option>
                  {platforms.map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.session_date}
                  onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <div className="border border-gray-300 rounded-lg">
                  <ReactQuill
                    theme="snow"
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['link'],
                        ['clean'],
                      ],
                    }}
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location / Meeting Link
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Online via Zoom, or physical address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., spelling-intro-march-2024"
                  pattern="[a-z0-9\-]*"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Optional friendly URL (lowercase letters, numbers, and hyphens only)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recording URL
                </label>
                <input
                  type="url"
                  value={formData.recording_url}
                  onChange={(e) => setFormData({ ...formData, recording_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_published" className="ml-2 text-sm text-gray-700">
                  Publish this demo (make it visible to the public)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingSession ? 'Update Session' : 'Create Session'}
                </button>
                <button
                  type="button"
                  onClick={closeSessionModal}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
