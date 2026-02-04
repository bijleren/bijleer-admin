import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Volume2, Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import PhonemeModal from '../components/PhonemeModal';

interface Phoneme {
  id: string;
  symbol: string;
  name: string;
  description: string | null;
  example_word: string | null;
  audio_url: string | null;
  image_url: string | null;
  is_vowel: boolean | null;
  is_consonant: boolean | null;
  difficulty_level: number | null;
  display_order: number | null;
  is_active: boolean | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 20;

export default function Klankteken() {
  const [phonemes, setPhonemes] = useState<Phoneme[]>([]);
  const [filteredPhonemes, setFilteredPhonemes] = useState<Phoneme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPhoneme, setSelectedPhoneme] = useState<Phoneme | null>(null);

  useEffect(() => {
    fetchPhonemes();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPhonemes(phonemes);
    } else {
      const filtered = phonemes.filter((phoneme) =>
        phoneme.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (phoneme.name && phoneme.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (phoneme.description && phoneme.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (phoneme.example_word && phoneme.example_word.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredPhonemes(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, phonemes]);

  const fetchPhonemes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('phonemes')
        .select('*')
        .order('display_order', { ascending: true })
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

  const handleEdit = (phoneme: Phoneme) => {
    setSelectedPhoneme(phoneme);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit klankteken wilt verwijderen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('phonemes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchPhonemes();
    } catch (error) {
      console.error('Error deleting phoneme:', error);
      alert('Er is een fout opgetreden bij het verwijderen van het klankteken.');
    }
  };

  const handleSave = async (phoneme: Phoneme) => {
    try {
      if (phoneme.id) {
        const { error } = await supabase
          .from('phonemes')
          .update({
            symbol: phoneme.symbol,
            name: phoneme.name,
            description: phoneme.description,
            example_word: phoneme.example_word,
            audio_url: phoneme.audio_url,
            image_url: phoneme.image_url,
            is_vowel: phoneme.is_vowel,
            is_consonant: phoneme.is_consonant,
            difficulty_level: phoneme.difficulty_level,
            display_order: phoneme.display_order,
            is_active: phoneme.is_active,
          })
          .eq('id', phoneme.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('phonemes')
          .insert([
            {
              symbol: phoneme.symbol,
              name: phoneme.name,
              description: phoneme.description,
              example_word: phoneme.example_word,
              audio_url: phoneme.audio_url,
              image_url: phoneme.image_url,
              is_vowel: phoneme.is_vowel,
              is_consonant: phoneme.is_consonant,
              difficulty_level: phoneme.difficulty_level,
              display_order: phoneme.display_order,
              is_active: phoneme.is_active,
            },
          ]);

        if (error) throw error;
      }

      await fetchPhonemes();
      setIsModalOpen(false);
      setSelectedPhoneme(null);
    } catch (error) {
      console.error('Error saving phoneme:', error);
      alert('Er is een fout opgetreden bij het opslaan van het klankteken.');
      throw error;
    }
  };

  const handleAddNew = () => {
    setSelectedPhoneme(null);
    setIsModalOpen(true);
  };

  const totalPages = Math.ceil(filteredPhonemes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPhonemes = filteredPhonemes.slice(startIndex, endIndex);

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
          onClick={handleAddNew}
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
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Symbool
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Naam
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Beschrijving
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Voorbeeld
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Niveau
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPhonemes.map((phoneme) => (
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
                        <span className="text-sm font-medium text-gray-900">{phoneme.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 line-clamp-2 max-w-xs">
                          {phoneme.description || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 font-medium">
                          {phoneme.example_word || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-1 justify-center">
                          {phoneme.is_vowel && (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                              K
                            </span>
                          )}
                          {phoneme.is_consonant && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              M
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-600">
                          {phoneme.difficulty_level || 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {phoneme.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Actief
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inactief
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(phoneme)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Bewerken"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(phoneme.id)}
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

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Resultaten {startIndex + 1} - {Math.min(endIndex, filteredPhonemes.length)} van{' '}
                  {filteredPhonemes.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-700">
                    Pagina {currentPage} van {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <PhonemeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPhoneme(null);
        }}
        onSave={handleSave}
        phoneme={selectedPhoneme}
      />
    </div>
  );
}
