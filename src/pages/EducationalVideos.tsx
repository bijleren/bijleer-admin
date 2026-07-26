import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getVideoEmbed } from '../utils/videoEmbed';
import { Video, Plus, CreditCard as Edit2, Trash2, Search, X, Save, TrendingUp, PlayCircle, Clock, Globe, School as SchoolIcon, ArrowUpDown, ArrowUp, ArrowDown, Target, BookOpen, Filter, Loader2, ExternalLink, Layers, Link2, CheckCircle2, AlertCircle } from 'lucide-react';

interface EducationalVideo {
  id?: string;
  title: string;
  description: string | null;
  url: string;
  thumbnail_url: string | null;
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

interface VocabCategory {
  id: string;
  name: string;
  emoji: string;
  color_code: string | null;
}

interface VocabWord {
  id: string;
  word: string;
  category_id: string;
}

interface EducationalGoal {
  code: string;
  domain: string;
  subject: string;
  title: string;
  sort_order: number;
}

interface VideoLinkRow {
  id: string;
  video_id: string;
  word: string;
  category_id: string | null;
}

interface VideoGoalRow {
  id: string;
  video_id: string;
  goal_code: string;
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
  const [videos, setVideos] = useState<(EducationalVideo & { goal_count: number; vocab_count: number })[]>([]);
  const [videoWords, setVideoWords] = useState<Map<string, Set<string>>>(new Map());
  const [schools, setSchools] = useState<School[]>([]);
  const [categories, setCategories] = useState<VocabCategory[]>([]);
  const [goals, setGoals] = useState<EducationalGoal[]>([]);
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
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // URL param for word filter (from per-word reverse view)
  const [wordFilter, setWordFilter] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const word = params.get('word');
    if (word) setWordFilter(word);
    fetchVideos();
    fetchSchools();
    fetchCategories();
    fetchGoals();
    fetchStats();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('educational_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const videoRows = data || [];
      if (videoRows.length === 0) {
        setVideos([]);
        return;
      }

      const videoIds = videoRows.map((v: EducationalVideo) => v.id!);

      const [vocabRes, goalRes] = await Promise.all([
        supabase.from('educational_video_vocabulary').select('video_id, word').in('video_id', videoIds),
        supabase.from('educational_video_goals').select('video_id').in('video_id', videoIds),
      ]);

      const vocabCounts: Record<string, number> = {};
      const wordsByVideo = new Map<string, Set<string>>();
      (vocabRes.data || []).forEach((r: { video_id: string; word: string }) => {
        vocabCounts[r.video_id] = (vocabCounts[r.video_id] || 0) + 1;
        if (!wordsByVideo.has(r.video_id)) wordsByVideo.set(r.video_id, new Set());
        wordsByVideo.get(r.video_id)!.add(r.word);
      });
      const goalCounts: Record<string, number> = {};
      (goalRes.data || []).forEach((r: { video_id: string }) => {
        goalCounts[r.video_id] = (goalCounts[r.video_id] || 0) + 1;
      });

      const enriched = videoRows.map((v: EducationalVideo) => ({
        ...v,
        goal_count: goalCounts[v.id!] || 0,
        vocab_count: vocabCounts[v.id!] || 0,
      }));
      setVideoWords(wordsByVideo);
      setVideos(enriched);
    } catch (error) {
      console.error('Error fetching videos:', error);
      showNotification('error', 'Fout bij ophalen video\'s');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase.from('schools').select('id, name').order('name');
      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('vocabulary_categories')
        .select('id, name, emoji, color_code')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('educational_goals')
        .select('code, domain, subject, title, sort_order')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
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
      const lastMonth =
        allVideos?.filter(
          (v) => new Date(v.created_at || '') >= lastMonthStart && new Date(v.created_at || '') < thisMonthStart
        ).length || 0;

      const percentage = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;

      setStats({ total, global, schoolSpecific, totalDuration, growth: { thisMonth, lastMonth, percentage } });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreate = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setEditingId(null);
    setShowModal(true);
  };

  const handleEdit = (video: EducationalVideo & { goal_count: number; vocab_count: number }) => {
    setEditingId(video.id || null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze video wilt verwijderen?')) return;
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

  const filteredAndSortedVideos = useMemo(() => {
    return videos
      .filter((video) => {
        const matchesSearch =
          video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (video.description || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter =
          filterType === 'all' ||
          (filterType === 'global' && video.is_global) ||
          (filterType === 'school' && !video.is_global);

        const matchesWord =
          !wordFilter ||
          (video.id ? (videoWords.get(video.id)?.has(wordFilter) ?? false) : false);
        return matchesSearch && matchesFilter && matchesWord;
      })
      .sort((a, b) => {
        let aValue: string | number | boolean = a[sortField];
        let bValue: string | number | boolean = b[sortField];

        if (sortField === 'created_at') {
          aValue = new Date(aValue as string || '').getTime();
          bValue = new Date(bValue as string || '').getTime();
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
  }, [videos, searchTerm, filterType, wordFilter, sortField, sortOrder]);

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
          <p className="text-gray-600 mt-1">Beheer de globale videobibliotheek en woordenschat-koppelingen</p>
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

      {wordFilter && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800">
            Gefilterd op woord: <strong>{wordFilter}</strong>
          </span>
          <button
            onClick={() => {
              setWordFilter('');
              const params = new URLSearchParams(window.location.search);
              params.delete('word');
              window.history.replaceState({}, '', `${window.location.pathname}`);
            }}
            className="ml-auto p-1 text-blue-600 hover:bg-blue-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
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
                placeholder="Zoek op titel..."
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
                  URL
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
                <th className="px-6 py-3 text-left text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />
                    Leerdoelen
                  </span>
                </th>
                <th className="px-6 py-3 text-left text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    Woorden
                  </span>
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
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Geen video's gevonden
                  </td>
                </tr>
              ) : (
                filteredAndSortedVideos.map((video) => {
                  const embed = getVideoEmbed(video.url);
                  const thumb = video.thumbnail_url || embed.thumbnailUrl;
                  return (
                    <tr
                      key={video.id}
                      onClick={() => handleEdit(video)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {thumb ? (
                            <img src={thumb} alt="" className="w-16 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-16 h-10 bg-gray-200 rounded flex items-center justify-center">
                              <PlayCircle className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{video.title}</div>
                            {video.description && (
                              <div className="text-xs text-gray-500 max-w-xs truncate">{video.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {embed.type !== 'unknown' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <span className="capitalize">{embed.type}</span>
                          </span>
                        ) : (
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {video.duration_minutes} min
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          {video.goal_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {video.vocab_count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            video.is_global ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
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
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <VideoEditModal
          editingId={editingId}
          categories={categories}
          goals={goals}
          schools={schools}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchVideos();
            fetchStats();
          }}
          showNotification={showNotification}
        />
      )}
    </div>
  );
}

interface VideoEditModalProps {
  editingId: string | null;
  categories: VocabCategory[];
  goals: EducationalGoal[];
  schools: School[];
  onClose: () => void;
  onSaved: () => void;
  showNotification: (type: 'success' | 'error', message: string) => void;
}

function VideoEditModal({ editingId, categories, goals, schools, onClose, onSaved, showNotification }: VideoEditModalProps) {
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
  const [saving, setSaving] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(!!editingId);
  const [error, setError] = useState<string | null>(null);

  // Goal + vocab link state
  const [selectedGoalCodes, setSelectedGoalCodes] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set()); // set of word strings
  const [existingLinks, setExistingLinks] = useState<VideoLinkRow[]>([]);
  const [existingGoalLinks, setExistingGoalLinks] = useState<VideoGoalRow[]>([]);

  // Vocab picker state
  const [vocabSearch, setVocabSearch] = useState('');
  const [vocabCategoryFilter, setVocabCategoryFilter] = useState<string>('all');
  const [vocabResults, setVocabResults] = useState<VocabWord[]>([]);
  const [searchingVocab, setSearchingVocab] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>('');

  // Goal picker state
  const [goalSearch, setGoalSearch] = useState('');
  const [goalDomainFilter, setGoalDomainFilter] = useState<string>('all');

  useEffect(() => {
    if (editingId) {
      loadVideo();
    }
  }, [editingId]);

  useEffect(() => {
    if (vocabSearch.trim().length >= 1) {
      searchVocab();
    } else {
      setVocabResults([]);
    }
  }, [vocabSearch, vocabCategoryFilter]);

  const loadVideo = async () => {
    try {
      const { data: video, error } = await supabase
        .from('educational_videos')
        .select('*')
        .eq('id', editingId!)
        .maybeSingle();
      if (error) throw error;
      if (video) {
        setFormData({
          title: video.title,
          description: video.description || '',
          url: video.url,
          thumbnail_url: video.thumbnail_url || '',
          duration_minutes: video.duration_minutes,
          is_global: video.is_global,
          school_id: video.school_id,
          created_by: video.created_by,
        });
      }

      const [vocabRes, goalRes] = await Promise.all([
        supabase.from('educational_video_vocabulary').select('*').eq('video_id', editingId!),
        supabase.from('educational_video_goals').select('*').eq('video_id', editingId!),
      ]);

      if (vocabRes.data) {
        setExistingLinks(vocabRes.data as VideoLinkRow[]);
        setSelectedWords(new Set(vocabRes.data.map((r: VideoLinkRow) => r.word)));
      }
      if (goalRes.data) {
        setExistingGoalLinks(goalRes.data as VideoGoalRow[]);
        setSelectedGoalCodes(goalRes.data.map((r: VideoGoalRow) => r.goal_code));
      }
    } catch (err) {
      console.error('Error loading video:', err);
      setError('Fout bij laden video');
    } finally {
      setLoadingLinks(false);
    }
  };

  const searchVocab = async () => {
    setSearchingVocab(true);
    try {
      let query = supabase.from('vocabulary_words').select('id, word, category_id').eq('is_active', true);
      if (vocabSearch.trim()) {
        query = query.ilike('word', `%${vocabSearch.trim()}%`);
      }
      if (vocabCategoryFilter !== 'all') {
        query = query.eq('category_id', vocabCategoryFilter);
      }
      query = query.order('word').limit(50);
      const { data, error } = await query;
      if (error) throw error;
      setVocabResults(data || []);
    } catch (err) {
      console.error('Error searching vocab:', err);
    } finally {
      setSearchingVocab(false);
    }
  };

  const addWord = (word: string) => {
    setSelectedWords((prev) => new Set(prev).add(word));
  };

  const removeWord = (word: string) => {
    setSelectedWords((prev) => {
      const next = new Set(prev);
      next.delete(word);
      return next;
    });
  };

  const toggleGoal = (code: string) => {
    setSelectedGoalCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleBulkCategoryLink = async () => {
    if (!bulkCategory) return;
    try {
      const { data, error } = await supabase
        .from('vocabulary_words')
        .select('word, category_id')
        .eq('category_id', bulkCategory)
        .eq('is_active', true);
      if (error) throw error;
      if (data) {
        setSelectedWords((prev) => {
          const next = new Set(prev);
          data.forEach((w: { word: string }) => next.add(w.word));
          return next;
        });
        showNotification('success', `${data.length} woorden toegevoegd`);
      }
    } catch (err) {
      console.error('Error bulk linking:', err);
      showNotification('error', 'Fout bij bulk koppelen');
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError('Titel is verplicht');
      return;
    }
    if (!formData.url.trim()) {
      setError('URL is verplicht');
      return;
    }
    if (!formData.is_global && !formData.school_id) {
      setError('Selecteer een school of maak de video globaal');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Niet ingelogd');
        return;
      }

      const embed = getVideoEmbed(formData.url);
      const videoData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        url: formData.url.trim(),
        thumbnail_url: formData.thumbnail_url?.trim() || embed.thumbnailUrl || '',
        duration_minutes: formData.duration_minutes,
        is_global: formData.is_global,
        school_id: formData.is_global ? null : formData.school_id,
        created_by: formData.created_by || user.id,
      };

      let videoId = editingId;

      if (editingId) {
        const { error } = await supabase.from('educational_videos').update(videoData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('educational_videos')
          .insert([videoData])
          .select('id')
          .single();
        if (error) throw error;
        videoId = data.id;
      }

      if (!videoId) throw new Error('Geen video ID');

      // Sync vocabulary links
      const existingWordSet = new Set(existingLinks.map((l) => l.word));
      const newWords = [...selectedWords].filter((w) => !existingWordSet.has(w));
      const removedWords = [...existingWordSet].filter((w) => !selectedWords.has(w));

      if (newWords.length > 0) {
        const rows = newWords.map((word) => {
          const vocabWord = vocabResults.find((v) => v.word === word);
          const existingLink = existingLinks.find((l) => l.word === word);
          return {
            video_id: videoId,
            word,
            category_id: vocabWord?.category_id || existingLink?.category_id || null,
          };
        });
        const { error: insertErr } = await supabase.from('educational_video_vocabulary').insert(rows);
        if (insertErr) throw insertErr;
      }

      if (removedWords.length > 0) {
        const { error: delErr } = await supabase
          .from('educational_video_vocabulary')
          .delete()
          .eq('video_id', videoId)
          .in('word', removedWords);
        if (delErr) throw delErr;
      }

      // Sync goal links
      const existingGoalSet = new Set(existingGoalLinks.map((l) => l.goal_code));
      const newGoals = selectedGoalCodes.filter((c) => !existingGoalSet.has(c));
      const removedGoals = [...existingGoalSet].filter((c) => !selectedGoalCodes.includes(c));

      if (newGoals.length > 0) {
        const rows = newGoals.map((code) => ({ video_id: videoId, goal_code: code }));
        const { error: insertErr } = await supabase.from('educational_video_goals').insert(rows);
        if (insertErr) throw insertErr;
      }
      if (removedGoals.length > 0) {
        const { error: delErr } = await supabase
          .from('educational_video_goals')
          .delete()
          .eq('video_id', videoId)
          .in('goal_code', removedGoals);
        if (delErr) throw delErr;
      }

      showNotification('success', 'Video succesvol opgeslagen');
      onSaved();
    } catch (err) {
      console.error('Error saving video:', err);
      setError(err instanceof Error ? err.message : 'Fout bij opslaan video');
    } finally {
      setSaving(false);
    }
  };

  const embed = getVideoEmbed(formData.url);
  const filteredGoals = goals.filter((g) => {
    const matchesSearch =
      !goalSearch.trim() ||
      g.title.toLowerCase().includes(goalSearch.toLowerCase()) ||
      g.code.toLowerCase().includes(goalSearch.toLowerCase());
    const matchesDomain = goalDomainFilter === 'all' || g.domain.toLowerCase() === goalDomainFilter.toLowerCase();
    return matchesSearch && matchesDomain;
  });
  const domains = [...new Set(goals.map((g) => g.domain))].sort();
  const selectedWordsList = [...selectedWords].sort();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-6">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Video Bewerken' : 'Nieuwe Video'}</h2>
            <button
              onClick={onClose}
              disabled={saving}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {loadingLinks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Basic info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titel *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    placeholder="Video titel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Beschrijving</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={saving}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
                    placeholder="Korte beschrijving..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Video URL *</label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      disabled={saving}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      placeholder="https://youtube.com/watch?v=... of vimeo.com/..."
                    />
                    {embed.type !== 'unknown' && (
                      <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {embed.type === 'youtube' ? 'YouTube gedetecteerd' : 'Vimeo gedetecteerd'}
                      </p>
                    )}
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Live preview */}
                {embed.embedUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Voorbeeld</label>
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      <iframe
                        src={embed.embedUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Video preview"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-3">
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
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
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

              {/* Goal picker */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Gekoppelde leerdoelen</h3>
                  {selectedGoalCodes.length > 0 && (
                    <span className="ml-1 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      {selectedGoalCodes.length}
                    </span>
                  )}
                </div>

                {/* Selected goal chips */}
                {selectedGoalCodes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedGoalCodes.map((code) => {
                      const goal = goals.find((g) => g.code === code);
                      return (
                        <span
                          key={code}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium"
                        >
                          <span className="font-mono">{code}</span>
                          {goal && <span className="truncate max-w-[200px]">{goal.title}</span>}
                          <button
                            onClick={() => toggleGoal(code)}
                            disabled={saving}
                            className="ml-0.5 hover:bg-amber-200 rounded-full p-0.5 disabled:opacity-50"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Goal search + filter */}
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Zoek leerdoel..."
                      value={goalSearch}
                      onChange={(e) => setGoalSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={goalDomainFilter}
                    onChange={(e) => setGoalDomainFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Alle domeinen</option>
                    {domains.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {filteredGoals.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">Geen leerdoelen gevonden</div>
                  ) : (
                    filteredGoals.map((goal) => {
                      const selected = selectedGoalCodes.includes(goal.code);
                      return (
                        <button
                          key={goal.code}
                          onClick={() => toggleGoal(goal.code)}
                          disabled={saving}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 ${
                            selected ? 'bg-amber-50' : ''
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              selected ? 'bg-amber-500 border-amber-500' : 'border-gray-300'
                            }`}
                          >
                            {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className="font-mono text-xs text-gray-500">{goal.code}</span>
                          <span className="truncate">{goal.title}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Vocabulary picker */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Gekoppelde woordenschat</h3>
                  {selectedWords.size > 0 && (
                    <span className="ml-1 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                      {selectedWords.size}
                    </span>
                  )}
                </div>

                {/* Selected word chips */}
                {selectedWordsList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 max-h-32 overflow-y-auto p-1">
                    {selectedWordsList.map((word) => (
                      <span
                        key={word}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium"
                      >
                        {word}
                        <button
                          onClick={() => removeWord(word)}
                          disabled={saving}
                          className="ml-0.5 hover:bg-indigo-200 rounded-full p-0.5 disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Vocab search + filter */}
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Zoek woord..."
                      value={vocabSearch}
                      onChange={(e) => setVocabSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={vocabCategoryFilter}
                    onChange={(e) => setVocabCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Alle categorieën</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {searchingVocab && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Zoeken...
                  </div>
                )}

                {!searchingVocab && vocabSearch.trim() && vocabResults.length === 0 && (
                  <div className="py-4 text-sm text-gray-500 text-center">Geen woorden gevonden</div>
                )}

                {!searchingVocab && vocabResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {vocabResults.map((vw) => {
                      const selected = selectedWords.has(vw.word);
                      const cat = categories.find((c) => c.id === vw.category_id);
                      return (
                        <button
                          key={vw.id}
                          onClick={() => (selected ? removeWord(vw.word) : addWord(vw.word))}
                          disabled={saving}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 ${
                            selected ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              selected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                            }`}
                          >
                            {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className="font-medium">{vw.word}</span>
                          {cat && (
                            <span className="text-xs text-gray-400">
                              {cat.emoji} {cat.name}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Bulk category linking */}
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700">Bulk koppelen per categorie</span>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={bulkCategory}
                      onChange={(e) => setBulkCategory(e.target.value)}
                      disabled={saving}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    >
                      <option value="">Selecteer een categorie...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.emoji} {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleBulkCategoryLink}
                      disabled={saving || !bulkCategory}
                      className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Link2 className="w-4 h-4" />
                      Koppel alle
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    Voegt alle actieve woorden uit de geselecteerde categorie toe aan deze video.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-xl">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loadingLinks}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}
