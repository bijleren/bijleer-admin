import { useState } from 'react';
import { Calculator, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PhonemeCount {
  phoneme: string;
  count: number;
  percentage: number;
}

export default function PhonemeFrequency() {
  const [phonemeCounts, setPhonemeCounts] = useState<PhonemeCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalWords, setTotalWords] = useState(0);
  const [totalPhonemes, setTotalPhonemes] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const calculateFrequencies = async () => {
    setLoading(true);
    setError(null);

    try {
      let allData: { klankteken: string | null }[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error: fetchError } = await supabase
          .from('wordfrequency')
          .select('klankteken')
          .not('klankteken', 'is', null)
          .range(from, from + batchSize - 1);

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      if (allData.length === 0) {
        setError('No words found with klankteken data');
        setLoading(false);
        return;
      }

      const phonemeMap = new Map<string, number>();
      let totalPhonemeCount = 0;

      allData.forEach(row => {
        if (row.klankteken) {
          const phonemes = row.klankteken.split('-').filter(p => p.trim() !== '');
          phonemes.forEach(phoneme => {
            const normalized = phoneme.trim();
            phonemeMap.set(normalized, (phonemeMap.get(normalized) || 0) + 1);
            totalPhonemeCount++;
          });
        }
      });

      const phonemeArray: PhonemeCount[] = Array.from(phonemeMap.entries())
        .map(([phoneme, count]) => ({
          phoneme,
          count,
          percentage: (count / totalPhonemeCount) * 100
        }))
        .sort((a, b) => b.count - a.count);

      setPhonemeCounts(phonemeArray);
      setTotalWords(allData.length);
      setTotalPhonemes(totalPhonemeCount);
    } catch (err) {
      console.error('Error calculating frequencies:', err);
      setError('Failed to calculate phoneme frequencies');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Foneem Frequentie</h1>
          <p className="text-gray-600">
            Bereken de frequentie van elk individueel klankteken in de woordenschat database
          </p>
        </div>

        {!phonemeCounts.length && !loading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Calculator className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Start Berekening</h2>
            <p className="text-gray-600 mb-6">
              Klik op de knop hieronder om de foneem frequenties te berekenen. Dit kan enkele seconden duren.
            </p>
            <button
              onClick={calculateFrequencies}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Berekenen...' : 'Start Berekening'}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Fout</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {phonemeCounts.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600">Totaal Woorden</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">{totalWords.toLocaleString()}</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600">Totaal Fonemen</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">{totalPhonemes.toLocaleString()}</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Calculator className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600">Unieke Fonemen</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">{phonemeCounts.length}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Foneem Frequenties</h2>
                <button
                  onClick={calculateFrequencies}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Berekenen...' : 'Herbereken'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Foneem
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Frequentie
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Visualisatie
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {phonemeCounts.map((item, index) => (
                      <tr key={item.phoneme} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-lg font-semibold text-gray-900 font-mono">
                            {item.phoneme}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.count.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.percentage.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${Math.min(item.percentage * 2, 100)}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
