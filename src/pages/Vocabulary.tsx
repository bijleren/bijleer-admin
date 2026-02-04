import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BookA, Edit2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import WordFrequencyModal from '../components/WordFrequencyModal';

interface WordFrequency {
  id: number;
  word: string;
  klankteken: string | null;
  klankgroepen: string | null;
  klankgroepenklanken: string | null;
  aantal_klankgroepen: number;
  samenstelling: string | null;
  frequency: number | null;
  created_at: string;
  updated_at: string;
  audio: string | null;
  audio_file: string | null;
  image: string | null;
  image_file: string | null;
  klankteken_checked: number | null;
  klankteken_tobechecked: number | null;
  image_checked: number | null;
  klankgroepen_checked: number | null;
  opmerking: string | null;
  betekenis: string | null;
  lidwoord: string | null;
  woordsoort_id: number | null;
  vergrotende_trap_id: number | null;
  overtreffende_trap_id: number | null;
  forbidden: number;
  aantal_klinkers: number | null;
  klankzuiver: number | null;
  woordstructuur: string | null;
  aantal_karakters: number | null;
  capitalized: number | null;
  has_multiple_meanings: number;
  verb_id: number | null;
  verb_form: string | null;
  frequency_norm: number | null;
  concreteness: number | null;
  betekenis_check: number | null;
  addition_front: string | null;
  addition_back: string | null;
  deletion_front: string | null;
  deletion_back: string | null;
  substitute_front: string | null;
  substitute_back: string | null;
  substitute_middle: string | null;
  audio_checked: number | null;
  klankgroup_checked: number;
}

const ITEMS_PER_PAGE = 50;

export default function Vocabulary() {
  const [words, setWords] = useState<WordFrequency[]>([]);
  const [filteredWords, setFilteredWords] = useState<WordFrequency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState<WordFrequency | null>(null);

  useEffect(() => {
    fetchWords();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredWords(words);
    } else {
      const filtered = words.filter((word) =>
        word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (word.betekenis && word.betekenis.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (word.klankteken && word.klankteken.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredWords(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, words]);

  const fetchWords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wordfrequency')
        .select('*')
        .order('word', { ascending: true });

      if (error) throw error;
      setWords(data || []);
      setFilteredWords(data || []);
    } catch (error) {
      console.error('Error fetching words:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (word: WordFrequency) => {
    setSelectedWord(word);
    setIsModalOpen(true);
  };

  const handleSave = async (word: WordFrequency) => {
    try {
      const { id, created_at, updated_at, ...updateData } = word;

      if (id) {
        const { error } = await supabase
          .from('wordfrequency')
          .update({
            ...updateData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('wordfrequency')
          .insert([updateData]);

        if (error) throw error;
      }

      await fetchWords();
      setIsModalOpen(false);
      setSelectedWord(null);
    } catch (error) {
      console.error('Error saving word:', error);
      alert('Er is een fout opgetreden bij het opslaan van het woord.');
      throw error;
    }
  };

  const totalPages = Math.ceil(filteredWords.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentWords = filteredWords.slice(startIndex, endIndex);

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
          <h1 className="text-3xl font-bold text-gray-900">Woordenschat</h1>
          <p className="text-gray-600 mt-1">Beheer woordfrequentie database</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek woorden..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredWords.length === 0 ? (
          <div className="p-12 text-center">
            <BookA className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'Geen resultaten gevonden' : 'Geen woorden beschikbaar'}
            </h3>
            <p className="text-gray-500">
              {searchQuery ? 'Probeer een andere zoekterm.' : 'Er zijn geen woorden in de database.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Woord
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Klankteken
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Klankgroepen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Betekenis
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frequentie
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lidwoord
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentWords.map((word) => (
                    <tr key={word.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                            <BookA className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-semibold text-gray-900">{word.word}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-gray-900">
                          {word.klankteken || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {word.klankgroepen || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 line-clamp-2 max-w-xs">
                          {word.betekenis || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-900 font-medium">
                          {word.frequency || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-600">
                          {word.lidwoord || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleEdit(word)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Bewerken"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Resultaten {startIndex + 1} - {Math.min(endIndex, filteredWords.length)} van{' '}
                  {filteredWords.length}
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

      <WordFrequencyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedWord(null);
        }}
        onSave={handleSave}
        word={selectedWord}
      />
    </div>
  );
}
