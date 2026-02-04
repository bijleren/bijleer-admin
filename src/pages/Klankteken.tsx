import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Volume2, Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, Columns, Check } from 'lucide-react';
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
  legacy_mysql_id: number | null;
  created_at: string;
}

interface ColumnConfig {
  key: keyof Phoneme;
  label: string;
  visible: boolean;
  width?: string;
}

const ITEMS_PER_PAGE = 20;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'symbol', label: 'Symbool', visible: true, width: '120px' },
  { key: 'name', label: 'Naam', visible: true, width: '150px' },
  { key: 'description', label: 'Beschrijving', visible: true, width: '250px' },
  { key: 'example_word', label: 'Voorbeeld', visible: true, width: '150px' },
  { key: 'audio_url', label: 'Audio URL', visible: false, width: '200px' },
  { key: 'image_url', label: 'Afbeelding URL', visible: false, width: '200px' },
  { key: 'is_vowel', label: 'Klinker', visible: true, width: '100px' },
  { key: 'is_consonant', label: 'Medeklinker', visible: true, width: '120px' },
  { key: 'difficulty_level', label: 'Niveau', visible: true, width: '100px' },
  { key: 'display_order', label: 'Volgorde', visible: false, width: '100px' },
  { key: 'is_active', label: 'Actief', visible: true, width: '100px' },
  { key: 'legacy_mysql_id', label: 'Legacy ID', visible: false, width: '100px' },
  { key: 'created_at', label: 'Aangemaakt', visible: false, width: '180px' },
];

export default function Klankteken() {
  const [phonemes, setPhonemes] = useState<Phoneme[]>([]);
  const [filteredPhonemes, setFilteredPhonemes] = useState<Phoneme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPhoneme, setSelectedPhoneme] = useState<Phoneme | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [showColumnToggle, setShowColumnToggle] = useState(false);

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
        const { id, created_at, ...updateData } = phoneme;
        const { error } = await supabase
          .from('phonemes')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { id, created_at, ...insertData } = phoneme;
        const { error } = await supabase
          .from('phonemes')
          .insert([insertData]);

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

  const toggleColumn = (key: keyof Phoneme) => {
    setColumns(columns.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  const renderCellValue = (phoneme: Phoneme, key: keyof Phoneme) => {
    const value = phoneme[key];

    if (value === null || value === undefined) return '-';

    switch (key) {
      case 'is_vowel':
      case 'is_consonant':
      case 'is_active':
        return value ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Ja
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Nee
          </span>
        );
      case 'created_at':
        return new Date(value as string).toLocaleDateString('nl-NL', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'audio_url':
      case 'image_url':
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
      case 'description':
        return (
          <span className="text-sm text-gray-600 line-clamp-2">
            {value as string}
          </span>
        );
      default:
        return <span className="text-sm text-gray-900">{String(value)}</span>;
    }
  };

  const totalPages = Math.ceil(filteredPhonemes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPhonemes = filteredPhonemes.slice(startIndex, endIndex);
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
          <h1 className="text-3xl font-bold text-gray-900">Klankteken</h1>
          <p className="text-gray-600 mt-1">Beheer fonetische klanktekens</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowColumnToggle(!showColumnToggle)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Columns className="w-5 h-5" />
              Kolommen
            </button>
            {showColumnToggle && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-gray-200">
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
            Nieuw Klankteken
          </button>
        </div>
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
                  {currentPhonemes.map((phoneme) => (
                    <tr key={phoneme.id} className="hover:bg-gray-50">
                      <td className="sticky left-0 z-10 bg-white px-6 py-4 border-r border-gray-200 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                            <Volume2 className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-xs font-mono text-gray-500 truncate max-w-[100px]">
                            {phoneme.id.substring(0, 8)}...
                          </span>
                        </div>
                      </td>
                      {visibleColumns.map((column) => (
                        <td
                          key={column.key}
                          className="px-6 py-4 whitespace-nowrap"
                          style={{ minWidth: column.width }}
                        >
                          {renderCellValue(phoneme, column.key)}
                        </td>
                      ))}
                      <td className="sticky right-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-right border-l border-gray-200 hover:bg-gray-50">
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
