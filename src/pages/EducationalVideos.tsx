import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Video,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  TrendingUp,
  PlayCircle,
  Clock,
  Globe,
  School as SchoolIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface EducationalVideo {
  id?: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url: string;
  duration_minutes: number;
  is_global: boolean;
  school_id: string | null;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

interface School {
  id: string;
  name: string;
}

interface Stats {
  total: number;
  global: number;
  schoolSpecific: number;
  totalDuration: number;
  growth: {
    thisMonth: number;
    lastMonth: number;
    percentage: number;
  };
}

type SortField = 'title' | 'duration_minutes' | 'created_at' | 'is_global';
type SortOrder = 'asc' | 'desc';

export default function EducationalVideos() {
  const [videos, setVideos] = useState<EducationalVideo[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    global: 0,
    schoolSpecific: 0,
    totalDuration: 0,
    growth: { thisMonth: 0, lastMonth: 0, percentage: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'global' | 'school'>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<EducationalVideo>({
    title: '',
    description: '',
    url: '',
    thumbnail_url: '',
    duration_minutes: 0,
    is_global: true,
    school_id: null,
    created_by: '',
  });

  useEffect(() => {
    fetchVideos();
    fetchSchools();
    fetchStats();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('educational_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      showNotification('error', 'Fout bij ophalen video\'s');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: allVideos, error } = await supabase
        .from('educational_videos')
        .select('duration_minutes, is_global, created_at');

      if (error) throw error;

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const total = allVideos?.length || 0;
      const global = allVideos?.filter((v) => v.is_global).length || 0;
      const schoolSpecific = total - global;
      const totalDuration = allVideos?.reduce((sum, v) => sum + (v.duration_minutes || 0), 0) || 0;

      const thisMonth = allVideos?.filter((v) => new Date(v.created_at || '') >= thisMonthStart).length || 0;
      const lastMonth = allVideos?.filter(
        (v) => new Date(v.created_at || '') >= lastMonthStart && new Date(v.created_at || '') < thisMonthStart
      ).length || 0;

      const percentage = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;

      setStats({
        total,
        global,
        schoolSpecific,
        totalDuration,
        growth: { thisMonth, lastMonth, percentage },
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      url: '',
      thumbnail_url: '',
      duration_minutes: 0,
      is_global: true,
      school_id: null,
      created_by: user.id,
    });
    setShowModal(true);
  };

  const handleEdit = (video: EducationalVideo) => {
    setEditingId(video.id || null);
    setFormData({
      title: video.title,
      description: video.description,
      url: video.url,
      thumbnail_url: video.thumbnail_url,
      duration_minutes: video.duration_minutes,
      is_global: video.is_global,
      school_id: video.school_id,
      created_by: video.created_by,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      showNotification('error', 'Titel is verplicht');
      return;
    }

    if (!formData.url.trim()) {
      showNotification('error', 'URL is verplicht');
      return;
    }

    if (formData.duration_minutes < 0) {
      showNotification('error', 'Duur moet positief zijn');
      return;
    }

    if (!formData.is_global && !formData.school_id) {
      showNotification('error', 'Selecteer een school of maak de video globaal');
      return;
    }

    setSaving(true);
    try {
      const videoData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        url: formData.url.trim(),
        thumbnail_url: formData.thumbnail_url.trim(),
        duration_minutes: formData.duration_minutes,
        is_global: formData.is_global,
        school_id: formData.is_global ? null : formData.school_id,
        created_by: formData.created_by,
      };

      if (editingId) {
        const { error } = await supabase
          .from('educational_videos')
          .update(videoData)
          .eq('id', editingId);

        if (error) throw error;
        showNotification('success', 'Video succesvol bijgewerkt');
      } else {
        const { error } = await supabase
          .from('educational_videos')
          .insert([videoData]);

        if (error) throw error;
        showNotification('success', 'Video succesvol toegevoegd');
      }

      await fetchVideos();
      await fetchStats();
      setShowModal(false);
      setFormData({
        title: '',
        description: '',
        url: '',
        thumbnail_url: '',
        duration_minutes: 0,
        is_global: true,
        school_id: null,
        created_by: '',
      });
    } catch (error) {
      console.error('Error saving video:', error);
      showNotification('error', 'Fout bij opslaan video');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze video wilt verwijderen?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('educational_videos').delete().eq('id', id);

      if (error) throw error;
      showNotification('success', 'Video succesvol verwijderd');
      await fetchVideos();
      await fetchStats();
    } catch (error) {
      console.error('Error deleting video:', error);
      showNotification('error', 'Fout bij verwijderen video');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedVideos = videos
    .filter((video) => {
      const matchesSearch =
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterType === 'all' ||
        (filterType === 'global' && video.is_global) ||
        (filterType === 'school' && !video.is_global);

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'created_at') {
        aValue = new Date(aValue || '').getTime();
        bValue = new Date(bValue || '').getTime();
      } else if (sortField === 'is_global') {
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Educatieve Video's</h1>
          <p className="text-gray-600 mt-1">Beheer educatieve video's voor scholen</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nieuwe Video
        </button>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-lg ${
            notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Totaal Video's</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Video className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Globale Video's</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.global}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <Globe className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">School Specifiek</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.schoolSpecific}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <SchoolIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Groei Deze Maand</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.growth.percentage > 0 ? '+' : ''}
                {stats.growth.percentage.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.growth.thisMonth} deze maand vs {stats.growth.lastMonth} vorige maand
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stats.growth.percentage >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <TrendingUp className={`w-6 h-6 ${stats.growth.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Zoek video's..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Alle
              </button>
              <button
                onClick={() => setFilterType('global')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filterType === 'global' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Globaal
              </button>
              <button
                onClick={() => setFilterType('school')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filterType === 'school' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                School
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('title')}
                    className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                  >
                    Titel
                    <SortIcon field="title" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Beschrijving
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('duration_minutes')}
                    className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                  >
                    Duur
                    <SortIcon field="duration_minutes" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('is_global')}
                    className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                  >
                    Type
                    <SortIcon field="is_global" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center gap-2 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                  >
                    Toegevoegd
                    <SortIcon field="created_at" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedVideos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Geen video's gevonden
                  </td>
                </tr>
              ) : (
                filteredAndSortedVideos.map((video) => (
                  <tr key={video.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt="" className="w-16 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-10 bg-gray-200 rounded flex items-center justify-center">
                            <PlayCircle className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="font-medium text-gray-900">{video.title}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{video.description}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {video.duration_minutes} min
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          video.is_global
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {video.is_global ? (
                          <>
                            <Globe className="w-3 h-3" />
                            Globaal
                          </>
                        ) : (
                          <>
                            <SchoolIcon className="w-3 h-3" />
                            School
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {video.created_at
                        ? new Date(video.created_at).toLocaleDateString('nl-NL', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(video)}
                          disabled={deletingId === video.id}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Bewerken"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => video.id && handleDelete(video.id)}
                          disabled={deletingId === video.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Verwijderen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Video Bewerken' : 'Nieuwe Video'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titel *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={saving}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Video titel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Beschrijving</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={saving}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Korte beschrijving van de video..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Video URL *</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  disabled={saving}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="https://example.com/video"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL</label>
                <input
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  disabled={saving}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="https://example.com/thumbnail.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duur (minuten)</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 0) {
                      setFormData({ ...formData, duration_minutes: value });
                    }
                  }}
                  min="0"
                  disabled={saving}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_global}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_global: e.target.checked,
                        school_id: e.target.checked ? null : formData.school_id,
                      })
                    }
                    disabled={saving}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm font-medium text-gray-700">Globaal beschikbaar voor alle scholen</span>
                </label>

                {!formData.is_global && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Selecteer School *</label>
                    <select
                      value={formData.school_id || ''}
                      onChange={(e) => setFormData({ ...formData, school_id: e.target.value || null })}
                      disabled={saving}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Selecteer een school</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
