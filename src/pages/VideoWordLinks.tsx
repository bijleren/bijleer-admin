import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getVideoEmbed } from '../utils/videoEmbed';
import {
  BookOpen,
  Search,
  Filter,
  Video,
  AlertCircle,
  PlayCircle,
  ExternalLink,
  Loader2,
  ArrowRight,
  Link2,
} from 'lucide-react';

interface VocabCategory {
  id: string;
  name: string;
  emoji: string;
  color_code: string | null;
}

interface VideoRow {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string | null;
  is_global: boolean;
}

interface WordLinkRow {
  word: string;
  category_id: string | null;
  video_id: string;
}

interface VideoInfo {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string | null;
  is_global: boolean;
}

interface WordRow {
  word: string;
  category_id: string | null;
  category_name: string | null;
  category_emoji: string | null;
  videos: VideoInfo[];
}

export default function VideoWordLinks() {
  const navigate = useNavigate();
  const [words, setWords] = useState<WordRow[]>([]);
  const [categories, setCategories] = useState<VocabCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showOnlyWithoutVideo, setShowOnlyWithoutVideo] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, linkRes, videoRes] = await Promise.all([
        supabase.from('vocabulary_categories').select('id, name, emoji, color_code').eq('is_active', true),
        supabase.from('educational_video_vocabulary').select('word, category_id, video_id'),
        supabase.from('educational_videos').select('id, title, url, thumbnail_url, is_global'),
      ]);

      if (catRes.error) throw catRes.error;
      if (linkRes.error) throw linkRes.error;
      if (videoRes.error) throw videoRes.error;

      const cats = catRes.data || [];
      setCategories(cats);
      const catMap = new Map<string, VocabCategory>(cats.map((c: VocabCategory) => [c.id, c]));

      const videoMap = new Map<string, VideoInfo>(
        (videoRes.data || []).map((v: VideoRow) => [v.id, v as VideoInfo])
      );

      // Group links by word
      const wordMap = new Map<string, { category_id: string | null; videos: VideoInfo[] }>();
      (linkRes.data || []).forEach((link: WordLinkRow) => {
        const existing = wordMap.get(link.word);
        const video = videoMap.get(link.video_id);
        if (video) {
          if (existing) {
            existing.videos.push(video);
          } else {
            wordMap.set(link.word, { category_id: link.category_id, videos: [video] });
          }
        }
      });

      // Also load all vocabulary words so we show words without links too
      const { data: allWords, error: wordsErr } = await supabase
        .from('vocabulary_words')
        .select('word, category_id')
        .eq('is_active', true);
      if (wordsErr) throw wordsErr;

      const rows: WordRow[] = [];
      const seenWords = new Set<string>();

      // Words with links
      wordMap.forEach((info, word) => {
        const cat = info.category_id ? catMap.get(info.category_id) : null;
        rows.push({
          word,
          category_id: info.category_id,
          category_name: cat?.name || null,
          category_emoji: cat?.emoji || null,
          videos: info.videos,
        });
        seenWords.add(word);
      });

      // Words without links
      (allWords || []).forEach((w: { word: string; category_id: string }) => {
        if (!seenWords.has(w.word)) {
          const cat = catMap.get(w.category_id);
          rows.push({
            word: w.word,
            category_id: w.category_id,
            category_name: cat?.name || null,
            category_emoji: cat?.emoji || null,
            videos: [],
          });
          seenWords.add(w.word);
        }
      });

      rows.sort((a, b) => a.word.localeCompare(b.word));
      setWords(rows);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      const matchesSearch = !searchTerm.trim() || w.word.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || w.category_id === categoryFilter;
      const matchesNoVideo = !showOnlyWithoutVideo || w.videos.length === 0;
      return matchesSearch && matchesCategory && matchesNoVideo;
    });
  }, [words, searchTerm, categoryFilter, showOnlyWithoutVideo]);

  const stats = useMemo(() => {
    const totalWords = words.length;
    const wordsWithVideo = words.filter((w) => w.videos.length > 0).length;
    const wordsWithoutVideo = totalWords - wordsWithVideo;
    const coverage = totalWords > 0 ? (wordsWithVideo / totalWords) * 100 : 0;
    return { totalWords, wordsWithVideo, wordsWithoutVideo, coverage };
  }, [words]);

  const handleWordClick = (word: string) => {
    navigate(`/kleuterdidactiek/videos?word=${encodeURIComponent(word)}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Video-Woorden Koppelingen</h1>
        <p className="text-gray-600 mt-1">Bekijk welke woorden aan video's gekoppeld zijn en vind gaten</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Totaal woorden</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalWords}</p>
            </div>
            <div className="bg-blue-50 p-2.5 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Met video</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.wordsWithVideo}</p>
            </div>
            <div className="bg-green-50 p-2.5 rounded-lg">
              <Video className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Zonder video</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.wordsWithoutVideo}</p>
            </div>
            <div className="bg-orange-50 p-2.5 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Dekking</p>
              <span className="text-sm font-bold text-gray-900">{stats.coverage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                style={{ width: `${stats.coverage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Zoek woord..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Alle categorieën</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={showOnlyWithoutVideo}
              onChange={(e) => setShowOnlyWithoutVideo(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Filter className="w-4 h-4" />
              Alleen zonder video
            </span>
          </label>
        </div>
      </div>

      {/* Word list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Woord
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Categorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Gekoppelde video's
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actie
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredWords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    Geen woorden gevonden
                  </td>
                </tr>
              ) : (
                filteredWords.map((w) => (
                  <tr key={w.word} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-medium text-gray-900">{w.word}</span>
                    </td>
                    <td className="px-6 py-3">
                      {w.category_name ? (
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <span>{w.category_emoji}</span>
                          {w.category_name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {w.videos.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-orange-600">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Geen video
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {w.videos.map((v) => {
                            const embed = getVideoEmbed(v.url);
                            const thumb = v.thumbnail_url || embed.thumbnailUrl;
                            return (
                              <span
                                key={v.id}
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                                title={v.title}
                              >
                                {thumb ? (
                                  <img src={thumb} alt="" className="w-6 h-4 object-cover rounded" />
                                ) : (
                                  <PlayCircle className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="truncate max-w-[160px]">{v.title}</span>
                                {embed.type !== 'unknown' && (
                                  <a
                                    href={v.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-gray-400 hover:text-blue-600"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleWordClick(w.word)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Open videobibliotheek gefilterd op dit woord"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Koppel video
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
