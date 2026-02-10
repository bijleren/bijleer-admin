import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BookA, Music, Image as ImageIcon, MessageSquare, CheckCircle, BarChart3 } from 'lucide-react';

interface DetailedStats {
  totalWords: number;
  wordsWithAudio: number;
  wordsWithImage: number;
  wordsWithAudioChecked: number;
  percentAudioChecked: number;
  wordsWithKlankteken: number;
  wordsWithKlanktekenChecked: number;
  percentKlanktekenChecked: number;
  wordsWithBetekenis: number;
  percentWordsWithBetekenis: number;
  wordsWithBetekenisChecked: number;
  percentBetekenisChecked: number;
  wordsAudioBetekenis: number;
  percentAudioBetekenis: number;
  wordsAudioBetekenisChecked: number;
  percentAudioBetekenisChecked: number;
  wordsAllFour: number;
  percentAllFour: number;
  wordsAllFourChecked: number;
  percentAllFourChecked: number;
  wordsAudioKlanktekenImage: number;
  percentAudioKlanktekenImage: number;
  wordsAudioKlanktekenImageChecked: number;
  percentAudioKlanktekenImageChecked: number;
}

export default function Statistics() {
  const [stats, setStats] = useState<DetailedStats>({
    totalWords: 0,
    wordsWithAudio: 0,
    wordsWithImage: 0,
    wordsWithAudioChecked: 0,
    percentAudioChecked: 0,
    wordsWithKlankteken: 0,
    wordsWithKlanktekenChecked: 0,
    percentKlanktekenChecked: 0,
    wordsWithBetekenis: 0,
    percentWordsWithBetekenis: 0,
    wordsWithBetekenisChecked: 0,
    percentBetekenisChecked: 0,
    wordsAudioBetekenis: 0,
    percentAudioBetekenis: 0,
    wordsAudioBetekenisChecked: 0,
    percentAudioBetekenisChecked: 0,
    wordsAllFour: 0,
    percentAllFour: 0,
    wordsAllFourChecked: 0,
    percentAllFourChecked: 0,
    wordsAudioKlanktekenImage: 0,
    percentAudioKlanktekenImage: 0,
    wordsAudioKlanktekenImageChecked: 0,
    percentAudioKlanktekenImageChecked: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const { count: totalWords } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true });

      const { count: wordsWithAudio } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('audio', 1);

      const { count: wordsWithImage } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('image', 1);

      const { count: wordsWithAudioChecked } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('audio', 1)
        .eq('audio_checked', 1);

      const { count: wordsWithKlankteken } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .not('klankteken', 'is', null)
        .neq('klankteken', '');

      const { count: wordsWithKlanktekenChecked } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .not('klankteken', 'is', null)
        .neq('klankteken', '')
        .eq('klankteken_checked', 1);

      const { count: wordsWithBetekenis } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .not('betekenis', 'is', null)
        .neq('betekenis', '');

      const { count: wordsWithBetekenisChecked } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .not('betekenis', 'is', null)
        .neq('betekenis', '')
        .eq('betekenis_check', 1);

      const { count: wordsAudioBetekenis } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('audio', 1)
        .not('betekenis', 'is', null)
        .neq('betekenis', '');

      const { count: wordsAudioBetekenisChecked } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('audio', 1)
        .eq('audio_checked', 1)
        .not('betekenis', 'is', null)
        .neq('betekenis', '')
        .eq('betekenis_check', 1);

      const { count: wordsAllFour } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('audio', 1)
        .not('betekenis', 'is', null)
        .neq('betekenis', '')
        .not('klankteken', 'is', null)
        .neq('klankteken', '')
        .eq('image', 1);

      const { count: wordsAllFourChecked } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('audio', 1)
        .eq('audio_checked', 1)
        .not('betekenis', 'is', null)
        .neq('betekenis', '')
        .eq('betekenis_check', 1)
        .not('klankteken', 'is', null)
        .neq('klankteken', '')
        .eq('klankteken_checked', 1)
        .eq('image', 1);

      const { count: wordsAudioKlanktekenImage } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('audio', 1)
        .not('klankteken', 'is', null)
        .neq('klankteken', '')
        .eq('image', 1);

      const { count: wordsAudioKlanktekenImageChecked } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('audio', 1)
        .eq('audio_checked', 1)
        .not('klankteken', 'is', null)
        .neq('klankteken', '')
        .eq('klankteken_checked', 1)
        .eq('image', 1);

      const total = totalWords || 0;
      const audio = wordsWithAudio || 0;
      const klankteken = wordsWithKlankteken || 0;
      const betekenis = wordsWithBetekenis || 0;
      const audioBetekenis = wordsAudioBetekenis || 0;
      const allFour = wordsAllFour || 0;
      const audioKlanktekenImage = wordsAudioKlanktekenImage || 0;

      setStats({
        totalWords: total,
        wordsWithAudio: audio,
        wordsWithImage: wordsWithImage || 0,
        wordsWithAudioChecked: wordsWithAudioChecked || 0,
        percentAudioChecked: audio > 0 ? Math.round(((wordsWithAudioChecked || 0) / audio) * 100 * 100) / 100 : 0,
        wordsWithKlankteken: klankteken,
        wordsWithKlanktekenChecked: wordsWithKlanktekenChecked || 0,
        percentKlanktekenChecked: klankteken > 0 ? Math.round(((wordsWithKlanktekenChecked || 0) / klankteken) * 100 * 100) / 100 : 0,
        wordsWithBetekenis: betekenis,
        percentWordsWithBetekenis: total > 0 ? Math.round((betekenis / total) * 100 * 100) / 100 : 0,
        wordsWithBetekenisChecked: wordsWithBetekenisChecked || 0,
        percentBetekenisChecked: betekenis > 0 ? Math.round(((wordsWithBetekenisChecked || 0) / betekenis) * 100 * 100) / 100 : 0,
        wordsAudioBetekenis: audioBetekenis,
        percentAudioBetekenis: total > 0 ? Math.round((audioBetekenis / total) * 100 * 100) / 100 : 0,
        wordsAudioBetekenisChecked: wordsAudioBetekenisChecked || 0,
        percentAudioBetekenisChecked: audioBetekenis > 0 ? Math.round(((wordsAudioBetekenisChecked || 0) / audioBetekenis) * 100 * 100) / 100 : 0,
        wordsAllFour: allFour,
        percentAllFour: total > 0 ? Math.round((allFour / total) * 100 * 100) / 100 : 0,
        wordsAllFourChecked: wordsAllFourChecked || 0,
        percentAllFourChecked: allFour > 0 ? Math.round(((wordsAllFourChecked || 0) / allFour) * 100 * 100) / 100 : 0,
        wordsAudioKlanktekenImage: audioKlanktekenImage,
        percentAudioKlanktekenImage: total > 0 ? Math.round((audioKlanktekenImage / total) * 100 * 100) / 100 : 0,
        wordsAudioKlanktekenImageChecked: wordsAudioKlanktekenImageChecked || 0,
        percentAudioKlanktekenImageChecked: audioKlanktekenImage > 0 ? Math.round(((wordsAudioKlanktekenImageChecked || 0) / audioKlanktekenImage) * 100 * 100) / 100 : 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Statistieken</h1>
        <p className="text-gray-600 mt-1">Overzicht van woordenschat data</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <BookA className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Basis Statistieken</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 font-medium">Totaal Woorden</p>
            <p className="text-3xl font-bold text-blue-900">{stats.totalWords}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 font-medium">Woorden met Audio</p>
            <p className="text-3xl font-bold text-green-900">{stats.wordsWithAudio}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-600 font-medium">Woorden met Afbeelding</p>
            <p className="text-3xl font-bold text-purple-900">{stats.wordsWithImage}</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-600 font-medium">Woorden met Betekenis</p>
            <p className="text-3xl font-bold text-orange-900">{stats.wordsWithBetekenis}</p>
            <p className="text-xs text-orange-600 mt-1">
              {stats.percentWordsWithBetekenis}% van alle woorden
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-green-100 p-2 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Controle Statistieken</h2>
        </div>
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Music className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Audio Controle</h3>
            </div>
            <div className="ml-8 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Gecontroleerd</span>
                <span className="font-bold text-gray-900">
                  {stats.wordsWithAudioChecked} van {stats.wordsWithAudio}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${stats.percentAudioChecked}%` }}
                ></div>
              </div>
              <p className="text-sm text-green-600 font-medium">{stats.percentAudioChecked}%</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-3">
              <BookA className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Klankteken Controle</h3>
            </div>
            <div className="ml-8 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Woorden met klankteken</span>
                <span className="font-bold text-gray-900">{stats.wordsWithKlankteken}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Gecontroleerd</span>
                <span className="font-bold text-gray-900">
                  {stats.wordsWithKlanktekenChecked} van {stats.wordsWithKlankteken}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${stats.percentKlanktekenChecked}%` }}
                ></div>
              </div>
              <p className="text-sm text-blue-600 font-medium">{stats.percentKlanktekenChecked}%</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-gray-900">Betekenis Controle</h3>
            </div>
            <div className="ml-8 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Gecontroleerd</span>
                <span className="font-bold text-gray-900">
                  {stats.wordsWithBetekenisChecked} van {stats.wordsWithBetekenis}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all"
                  style={{ width: `${stats.percentBetekenisChecked}%` }}
                ></div>
              </div>
              <p className="text-sm text-orange-600 font-medium">{stats.percentBetekenisChecked}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-100 p-2 rounded-lg">
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Combinatie Statistieken</h2>
        </div>
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-4 h-4 text-green-600" />
              <span className="text-lg font-medium">+</span>
              <MessageSquare className="w-4 h-4 text-orange-600" />
              <h3 className="font-semibold text-gray-900 ml-2">Audio + Betekenis</h3>
            </div>
            <div className="ml-8 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Totaal woorden met beide</span>
                  <span className="font-bold text-gray-900">{stats.wordsAudioBetekenis}</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${stats.percentAudioBetekenis}%` }}
                  ></div>
                </div>
                <p className="text-sm text-blue-600 font-medium mt-1">
                  {stats.percentAudioBetekenis}% van alle woorden
                </p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Volledig gecontroleerd</span>
                  <span className="font-bold text-gray-900">
                    {stats.wordsAudioBetekenisChecked} van {stats.wordsAudioBetekenis}
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${stats.percentAudioBetekenisChecked}%` }}
                  ></div>
                </div>
                <p className="text-sm text-green-600 font-medium mt-1">
                  {stats.percentAudioBetekenisChecked}%
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-4 h-4 text-green-600" />
              <span className="text-lg font-medium">+</span>
              <BookA className="w-4 h-4 text-blue-600" />
              <span className="text-lg font-medium">+</span>
              <ImageIcon className="w-4 h-4 text-purple-600" />
              <h3 className="font-semibold text-gray-900 ml-2">Audio + Klankteken + Afbeelding</h3>
            </div>
            <div className="ml-8 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Totaal woorden met alledrie</span>
                  <span className="font-bold text-gray-900">{stats.wordsAudioKlanktekenImage}</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${stats.percentAudioKlanktekenImage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-blue-600 font-medium mt-1">
                  {stats.percentAudioKlanktekenImage}% van alle woorden
                </p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Volledig gecontroleerd</span>
                  <span className="font-bold text-gray-900">
                    {stats.wordsAudioKlanktekenImageChecked} van {stats.wordsAudioKlanktekenImage}
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${stats.percentAudioKlanktekenImageChecked}%` }}
                  ></div>
                </div>
                <p className="text-sm text-green-600 font-medium mt-1">
                  {stats.percentAudioKlanktekenImageChecked}%
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-4 h-4 text-green-600" />
              <span className="text-lg font-medium">+</span>
              <MessageSquare className="w-4 h-4 text-orange-600" />
              <span className="text-lg font-medium">+</span>
              <BookA className="w-4 h-4 text-blue-600" />
              <span className="text-lg font-medium">+</span>
              <ImageIcon className="w-4 h-4 text-purple-600" />
              <h3 className="font-semibold text-gray-900 ml-2">Audio + Betekenis + Klankteken + Afbeelding</h3>
            </div>
            <div className="ml-8 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Totaal complete woorden</span>
                  <span className="font-bold text-gray-900">{stats.wordsAllFour}</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${stats.percentAllFour}%` }}
                  ></div>
                </div>
                <p className="text-sm text-blue-600 font-medium mt-1">
                  {stats.percentAllFour}% van alle woorden
                </p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Volledig gecontroleerd</span>
                  <span className="font-bold text-gray-900">
                    {stats.wordsAllFourChecked} van {stats.wordsAllFour}
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${stats.percentAllFourChecked}%` }}
                  ></div>
                </div>
                <p className="text-sm text-green-600 font-medium mt-1">
                  {stats.percentAllFourChecked}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
