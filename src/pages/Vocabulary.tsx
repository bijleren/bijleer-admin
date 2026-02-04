import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BookA, Edit2, Trash2, Search, ChevronLeft, ChevronRight, Columns, Check, Plus } from 'lucide-react';
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
  created_at: string | null;
  updated_at: string | null;
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

interface ColumnConfig {
  key: keyof WordFrequency;
  label: string;
  visible: boolean;
  width?: string;
}

const ITEMS_PER_PAGE = 50;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'word', label: 'Woord', visible: true, width: '200px' },
  { key: 'klankteken', label: 'Klankteken', visible: true, width: '250px' },
  { key: 'klankgroepen', label: 'Klankgroepen', visible: true, width: '200px' },
  { key: 'klankgroepenklanken', label: 'Klankgroepen Klanken', visible: false, width: '220px' },
  { key: 'aantal_klankgroepen', label: 'Aantal Klankgroepen', visible: false, width: '120px' },
  { key: 'samenstelling', label: 'Samenstelling', visible: false, width: '200px' },
  { key: 'frequency', label: 'Frequentie', visible: true, width: '100px' },
  { key: 'frequency_norm', label: 'Frequentie Norm', visible: false, width: '120px' },
  { key: 'betekenis', label: 'Betekenis', visible: true, width: '300px' },
  { key: 'opmerking', label: 'Opmerking', visible: false, width: '250px' },
  { key: 'lidwoord', label: 'Lidwoord', visible: true, width: '100px' },
  { key: 'woordsoort_id', label: 'Woordsoort ID', visible: false, width: '120px' },
  { key: 'vergrotende_trap_id', label: 'Vergrotende Trap ID', visible: false, width: '150px' },
  { key: 'overtreffende_trap_id', label: 'Overtreffende Trap ID', visible: false, width: '160px' },
  { key: 'verb_id', label: 'Werkwoord ID', visible: false, width: '120px' },
  { key: 'verb_form', label: 'Werkwoordvorm', visible: false, width: '150px' },
  { key: 'forbidden', label: 'Verboden', visible: false, width: '100px' },
  { key: 'aantal_klinkers', label: 'Aantal Klinkers', visible: false, width: '120px' },
  { key: 'klankzuiver', label: 'Klankzuiver', visible: false, width: '120px' },
  { key: 'woordstructuur', label: 'Woordstructuur', visible: false, width: '180px' },
  { key: 'aantal_karakters', label: 'Aantal Karakters', visible: false, width: '130px' },
  { key: 'capitalized', label: 'Hoofdletter', visible: false, width: '120px' },
  { key: 'has_multiple_meanings', label: 'Meerdere Betekenissen', visible: false, width: '180px' },
  { key: 'concreteness', label: 'Concreetheid', visible: false, width: '130px' },
  { key: 'audio', label: 'Audio', visible: false, width: '200px' },
  { key: 'audio_file', label: 'Audio Bestand', visible: false, width: '200px' },
  { key: 'image', label: 'Afbeelding', visible: false, width: '200px' },
  { key: 'image_file', label: 'Afbeelding Bestand', visible: false, width: '200px' },
  { key: 'klankteken_checked', label: 'Klankteken Gecontroleerd', visible: false, width: '180px' },
  { key: 'klankteken_tobechecked', label: 'Klankteken Te Controleren', visible: false, width: '200px' },
  { key: 'image_checked', label: 'Afbeelding Gecontroleerd', visible: false, width: '180px' },
  { key: 'klankgroepen_checked', label: 'Klankgroepen Gecontroleerd', visible: false, width: '200px' },
  { key: 'audio_checked', label: 'Audio Gecontroleerd', visible: false, width: '170px' },
  { key: 'betekenis_check', label: 'Betekenis Controle', visible: false, width: '160px' },
  { key: 'klankgroup_checked', label: 'Klankgroep Gecontroleerd', visible: false, width: '190px' },
  { key: 'addition_front', label: 'Toevoeging Voor', visible: false, width: '150px' },
  { key: 'addition_back', label: 'Toevoeging Achter', visible: false, width: '160px' },
  { key: 'deletion_front', label: 'Verwijdering Voor', visible: false, width: '160px' },
  { key: 'deletion_back', label: 'Verwijdering Achter', visible: false, width: '170px' },
  { key: 'substitute_front', label: 'Vervanging Voor', visible: false, width: '160px' },
  { key: 'substitute_back', label: 'Vervanging Achter', visible: false, width: '170px' },
  { key: 'substitute_middle', label: 'Vervanging Midden', visible: false, width: '170px' },
  { key: 'created_at', label: 'Aangemaakt', visible: false, width: '180px' },
  { key: 'updated_at', label: 'Bijgewerkt', visible: false, width: '180px' },
];

export default function Vocabulary() {
  const [words, setWords] = useState<WordFrequency[]>([]);
  const [filteredWords, setFilteredWords] = useState<WordFrequency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState<WordFrequency | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [showColumnToggle, setShowColumnToggle] = useState(false);

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

  const handleDelete = async (id: number) => {
    if (!confirm('Weet je zeker dat je dit woord wilt verwijderen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('wordfrequency')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchWords();
    } catch (error) {
      console.error('Error deleting word:', error);
      alert('Er is een fout opgetreden bij het verwijderen van het woord.');
    }
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

  const handleAddNew = () => {
    setSelectedWord(null);
    setIsModalOpen(true);
  };

  const toggleColumn = (key: keyof WordFrequency) => {
    setColumns(columns.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  const renderCellValue = (word: WordFrequency, key: keyof WordFrequency) => {
    const value = word[key];

    if (value === null || value === undefined) return '-';

    switch (key) {
      case 'created_at':
      case 'updated_at':
        return value ? new Date(value as string).toLocaleDateString('nl-NL', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) : '-';
      case 'audio':
      case 'audio_file':
      case 'image':
      case 'image_file':
        return value ? (
          <a
            href={value as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline text-xs truncate block max-w-[180px]"
          >
            {(value as string).substring(0, 30)}...
          </a>
        ) : '-';
      case 'betekenis':
      case 'opmerking':
        return (
          <span className="text-sm text-gray-600 line-clamp-2">
            {value as string}
          </span>
        );
      case 'forbidden':
      case 'klankteken_checked':
      case 'klankteken_tobechecked':
      case 'image_checked':
      case 'klankgroepen_checked':
      case 'audio_checked':
      case 'betekenis_check':
      case 'klankgroup_checked':
      case 'klankzuiver':
      case 'capitalized':
      case 'has_multiple_meanings':
        return value ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {value}
          </span>
        ) : (
          <span className="text-sm text-gray-400">0</span>
        );
      default:
        return <span className="text-sm text-gray-900">{String(value)}</span>;
    }
  };

  const totalPages = Math.ceil(filteredWords.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentWords = filteredWords.slice(startIndex, endIndex);
  const visibleColumns = columns.filter(col => col.visible);

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
          <p className="text-gray-600 mt-1">Beheer woordfrequentie database ({words.length} totaal)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowColumnToggle(!showColumnToggle)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Columns className="w-5 h-5" />
              Kolommen ({visibleColumns.length}/{columns.length})
            </button>
            {showColumnToggle && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
                <div className="sticky top-0 bg-white p-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Toon/Verberg Kolommen</h3>
                </div>
                <div className="p-2">
                  {columns.map((column) => (
                    <button
                      key={column.key}
                      onClick={() => toggleColumn(column.key)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                    >
                      <span>{column.label}</span>
                      {column.visible && <Check className="w-4 h-4 text-green-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nieuw Woord
          </button>
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
              {searchQuery ? 'Probeer een andere zoekterm.' : 'Klik op "Nieuw Woord" om te beginnen.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: '100%' }}>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      ID
                    </th>
                    {visibleColumns.map((column) => (
                      <th
                        key={column.key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        style={{ minWidth: column.width }}
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="sticky right-0 z-10 bg-gray-50 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentWords.map((word) => (
                    <tr key={word.id} className="hover:bg-gray-50">
                      <td className="sticky left-0 z-10 bg-white px-6 py-4 border-r border-gray-200 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                            <BookA className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-mono text-gray-900">
                            {word.id}
                          </span>
                        </div>
                      </td>
                      {visibleColumns.map((column) => (
                        <td
                          key={column.key}
                          className="px-6 py-4 whitespace-nowrap"
                          style={{ minWidth: column.width }}
                        >
                          {renderCellValue(word, column.key)}
                        </td>
                      ))}
                      <td className="sticky right-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-right border-l border-gray-200 hover:bg-gray-50">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(word)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Bewerken"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(word.id)}
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
