import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator, TrendingUp, Hash, Layers, AlertCircle, Search, X, ChevronUp, ChevronDown, ChevronsUpDown, Download } from 'lucide-react';

interface KlankgroepCount {
  klankgroep: string;
  count: number;
  percentage: number;
}

type SortField = 'rank' | 'klankgroep' | 'count' | 'percentage';
type SortDir = 'asc' | 'desc';

export default function AnalyseKlankgroepen() {
  const [results, setResults] = useState<KlankgroepCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalWords, setTotalWords] = useState(0);
  const [totalParts, setTotalParts] = useState(0);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const calculate = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const batchSize = 1000;
      let from = 0;
      let hasMore = true;
      const countMap = new Map<string, number>();
      let wordsProcessed = 0;
      let partsTotal = 0;

      while (hasMore) {
        const { data, error: fetchError } = await supabase
          .from('wordfrequency')
          .select('klankgroepenklanken')
          .not('klankgroepenklanken', 'is', null)
          .neq('klankgroepenklanken', '')
          .range(from, from + batchSize - 1);

        if (fetchError) throw fetchError;

        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        for (const row of data) {
          if (!row.klankgroepenklanken) continue;
          const parts = row.klankgroepenklanken.split('+').map((p: string) => p.trim()).filter((p: string) => p !== '');
          if (parts.length === 0) continue;
          wordsProcessed++;
          for (const part of parts) {
            countMap.set(part, (countMap.get(part) || 0) + 1);
            partsTotal++;
          }
        }

        from += batchSize;
        hasMore = data.length === batchSize;
      }

      if (wordsProcessed === 0) {
        setError('Geen woorden gevonden met klankgroepen data.');
        setLoading(false);
        return;
      }

      const sorted: KlankgroepCount[] = Array.from(countMap.entries())
        .map(([klankgroep, count]) => ({
          klankgroep,
          count,
          percentage: (count / partsTotal) * 100,
        }))
        .sort((a, b) => b.count - a.count);

      setResults(sorted);
      setTotalWords(wordsProcessed);
      setTotalParts(partsTotal);
    } catch (err) {
      console.error(err);
      setError('Fout bij het berekenen van de klankgroep frequenties.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'rank' || field === 'count' || field === 'percentage' ? 'asc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />;
  };

  const filtered = results
    .filter((r) => !search || r.klankgroep.toLowerCase().includes(search.toLowerCase()))
    .slice()
    .sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (sortField === 'rank') {
        av = results.indexOf(a);
        bv = results.indexOf(b);
      } else if (sortField === 'klankgroep') {
        av = a.klankgroep;
        bv = b.klankgroep;
      } else if (sortField === 'count') {
        av = a.count;
        bv = b.count;
      } else {
        av = a.percentage;
        bv = b.percentage;
      }
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

  const maxCount = results[0]?.count || 1;

  const exportToCSV = () => {
    const rows = [
      ['Rang', 'Klankgroep', 'Aantal', 'Percentage'],
      ...results.map((r, i) => [
        i + 1,
        r.klankgroep,
        r.count,
        r.percentage.toFixed(4),
      ]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `klankgroep-analyse-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analyse Klankgroepen</h1>
        <p className="text-gray-600 mt-1">
          Tel alle unieke klankgroep-onderdelen (alles voor, tussen of na een '+' teken) over alle woorden in de database.
        </p>
      </div>

      {!results.length && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calculator className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Start de analyse</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
            Alle woorden met klankgroepen worden geladen en elk onderdeel (gesplitst op '+') wordt geteld.
          </p>
          <button
            onClick={calculate}
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start berekening
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Klankgroepen aan het berekenen...</p>
          <p className="text-gray-400 text-sm mt-1">Dit kan enkele seconden duren</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Fout</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">Woorden geanalyseerd</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalWords.toLocaleString('nl-BE')}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Layers className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">Totaal klankgroep-onderdelen</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalParts.toLocaleString('nl-BE')}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-teal-100 p-2 rounded-lg">
                  <Hash className="w-5 h-5 text-teal-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">Unieke klankgroepen</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{results.length.toLocaleString('nl-BE')}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 mr-auto">Klankgroep frequenties</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Zoek klankgroep..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-52"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <span className="text-sm text-gray-500">{filtered.length} resultaten</span>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exporteer CSV
              </button>
              <button
                onClick={calculate}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Herbereken
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {(
                      [
                        { field: 'rank' as SortField, label: '#', center: true },
                        { field: 'klankgroep' as SortField, label: 'Klankgroep', center: false },
                        { field: 'count' as SortField, label: 'Aantal', center: false },
                        { field: 'percentage' as SortField, label: '%', center: false },
                        { field: null, label: 'Visualisatie', center: false },
                      ] as { field: SortField | null; label: string; center: boolean }[]
                    ).map(({ field, label, center }) =>
                      field ? (
                        <th
                          key={label}
                          onClick={() => handleSort(field)}
                          className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${center ? 'text-center' : 'text-left'}`}
                        >
                          <div className={`flex items-center gap-1.5 ${center ? 'justify-center' : ''}`}>
                            {label}
                            <SortIcon field={field} />
                          </div>
                        </th>
                      ) : (
                        <th key={label} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((item) => {
                    const rank = results.indexOf(item) + 1;
                    const barWidth = Math.max((item.count / maxCount) * 100, 1);
                    return (
                      <tr key={item.klankgroep} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-center text-gray-400 text-xs font-medium w-12">
                          {rank}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-gray-900">{item.klankgroep}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums">
                          {item.count.toLocaleString('nl-BE')}
                        </td>
                        <td className="px-4 py-3 text-gray-500 tabular-nums w-20">
                          {item.percentage.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 w-56">
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-gray-400">
                        Geen klankgroepen gevonden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
