import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Volume2, Plus, Edit2, Trash2, Search } from 'lucide-react';

interface Phoneme {
  id: string;
  symbol: string;
  description: string;
  example: string;
  created_at: string;
}

export default function Klankteken() {
  const [phonemes, setPhonemes] = useState<Phoneme[]>([]);
  const [filteredPhonemes, setFilteredPhonemes] = useState<Phoneme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPhonemes();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPhonemes(phonemes);
    } else {
      const filtered = phonemes.filter((phoneme) =>
        phoneme.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phoneme.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phoneme.example.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPhonemes(filtered);
    }
  }, [searchQuery, phonemes]);

  const fetchPhonemes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('phonemes')
        .select('*')
        .order('symbol', { ascending: true });

      if (error) throw error;
      setPhonemes(data || []);
      setFilteredPhonemes(data || []);
    } catch (error) {
      console.error('Error fetching phonemes:', error);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Klankteken</h1>
          <p className="text-gray-600 mt-1">Beheer fonetische klanktekens</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nieuw Klankteken
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek klanktekens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredPhonemes.length === 0 ? (
          <div className="p-12 text-center">
            <Volume2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'Geen resultaten gevonden' : 'Geen klanktekens beschikbaar'}
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? 'Probeer een andere zoekterm.'
                : 'Klik op "Nieuw Klankteken" om te beginnen.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbool
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beschrijving
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Voorbeeld
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPhonemes.map((phoneme) => (
                  <tr key={phoneme.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                          <Volume2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-mono text-lg font-bold text-gray-900">
                          {phoneme.symbol}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{phoneme.description}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 font-medium">{phoneme.example}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Bewerken"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
