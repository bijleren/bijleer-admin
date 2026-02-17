import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Volume2, Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, Columns, Check } from 'lucide-react';
import PhonemeModal from '../components/PhonemeModal';

interface Klankteken {
  id: number;
  title: string;
  klinktals: string | null;
  letters: string | null;
  audio: string | null;
  audio_uitleg: string | null;
  tool_uitleg: string | null;
  articulation: string | null;
  type: string;
  tool: string | null;
  blockRepresentation: string | null;
  imageWord: string | null;
  imageTool: string | null;
  created_at: string | null;
  updated_at: string | null;
  klankzuiver: string | null;
  verenkelen: string | null;
  verdubbelen: string | null;
  speciale_tekens: string | null;
  beschrijving: string | null;
  example_words: string | null;
  example_words_audio: string | null;
  example_words_images: string | null;
  volgorde: number | null;
  length_type: string | null;
  voice: string | null;
  location: string | null;
  lippen: string | null;
  kaak: string | null;
  produce_audio: string | null;
  word: string | null;
  fonetiek: string | null;
  set: number | null;
}

interface ColumnConfig {
  key: keyof Klankteken;
  label: string;
  visible: boolean;
  width?: string;
}

const ITEMS_PER_PAGE = 20;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'title', label: 'Titel', visible: true, width: '200px' },
  { key: 'type', label: 'Type', visible: true, width: '120px' },
  { key: 'word', label: 'Woord', visible: true, width: '150px' },
  { key: 'letters', label: 'Letters', visible: true, width: '150px' },
  { key: 'beschrijving', label: 'Beschrijving', visible: true, width: '250px' },
  { key: 'klinktals', label: 'Klinktals', visible: false, width: '150px' },
  { key: 'audio', label: 'Audio', visible: true, width: '220px' },
  { key: 'audio_uitleg', label: 'Audio Uitleg', visible: false, width: '200px' },
  { key: 'tool_uitleg', label: 'Tool Uitleg', visible: false, width: '200px' },
  { key: 'articulation', label: 'Articulatie', visible: false, width: '150px' },
  { key: 'tool', label: 'Tool', visible: false, width: '150px' },
  { key: 'blockRepresentation', label: 'Blok Representatie', visible: false, width: '180px' },
  { key: 'imageWord', label: 'Afbeelding Woord', visible: false, width: '200px' },
  { key: 'imageTool', label: 'Afbeelding Tool', visible: false, width: '200px' },
  { key: 'klankzuiver', label: 'Klankzuiver', visible: false, width: '150px' },
  { key: 'verenkelen', label: 'Verenkelen', visible: false, width: '150px' },
  { key: 'verdubbelen', label: 'Verdubbelen', visible: false, width: '150px' },
  { key: 'speciale_tekens', label: 'Speciale Tekens', visible: false, width: '180px' },
  { key: 'example_words', label: 'Voorbeeldwoorden', visible: false, width: '200px' },
  { key: 'example_words_audio', label: 'Voorbeeldwoorden Audio', visible: false, width: '220px' },
  { key: 'example_words_images', label: 'Voorbeeldwoorden Afbeeldingen', visible: false, width: '250px' },
  { key: 'volgorde', label: 'Volgorde', visible: true, width: '100px' },
  { key: 'length_type', label: 'Lengte Type', visible: false, width: '120px' },
  { key: 'voice', label: 'Stem', visible: false, width: '100px' },
  { key: 'location', label: 'Locatie', visible: false, width: '120px' },
  { key: 'lippen', label: 'Lippen', visible: false, width: '100px' },
  { key: 'kaak', label: 'Kaak', visible: false, width: '100px' },
  { key: 'produce_audio', label: 'Produce Audio', visible: false, width: '200px' },
  { key: 'fonetiek', label: 'Fonetiek', visible: false, width: '150px' },
  { key: 'set', label: 'Set', visible: true, width: '80px' },
  { key: 'created_at', label: 'Aangemaakt', visible: false, width: '180px' },
  { key: 'updated_at', label: 'Bijgewerkt', visible: false, width: '180px' },
];

export default function Klankteken() {
  const [data, setData] = useState<Klankteken[]>([]);
  const [filteredData, setFilteredData] = useState<Klankteken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Klankteken | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [showColumnToggle, setShowColumnToggle] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredData(data);
    } else {
      const filtered = data.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.type && item.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.word && item.word.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.letters && item.letters.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.beschrijving && item.beschrijving.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredData(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, data]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase
        .from('klankteken')
        .select('*')
        .order('volgorde', { ascending: true, nullsFirst: false })
        .order('title', { ascending: true });

      if (error) throw error;
      setData(result || []);
      setFilteredData(result || []);
    } catch (error) {
      console.error('Error fetching klankteken:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Klankteken) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Weet je zeker dat je dit klankteken wilt verwijderen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('klankteken')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting klankteken:', error);
      alert('Er is een fout opgetreden bij het verwijderen van het klankteken.');
    }
  };

  const handleSave = async (item: Klankteken) => {
    try {
      if (item.id) {
        const { id, created_at, updated_at, ...updateData } = item;
        const { error } = await supabase
          .from('klankteken')
          .update({
            ...updateData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        const { id, created_at, updated_at, ...insertData } = item;
        const { error } = await supabase
          .from('klankteken')
          .insert([insertData]);

        if (error) throw error;
      }

      await fetchData();
      setIsModalOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error saving klankteken:', error);
      alert('Er is een fout opgetreden bij het opslaan van het klankteken.');
      throw error;
    }
  };

  const handleAddNew = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const toggleColumn = (key: keyof Klankteken) => {
    setColumns(columns.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      alert('Kon audio niet afspelen');
    });
  };

  const renderCellValue = (item: Klankteken, key: keyof Klankteken) => {
    const value = item[key];

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
      case 'audio_uitleg':
      case 'produce_audio':
      case 'example_words_audio':
        return value ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => playAudio(value as string)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Speel audio af"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <a
              href={value as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-xs truncate block max-w-[120px]"
            >
              {(value as string).substring(0, 20)}...
            </a>
          </div>
        ) : '-';
      case 'tool_uitleg':
      case 'imageWord':
      case 'imageTool':
      case 'example_words_images':
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
      case 'beschrijving':
      case 'example_words':
      case 'klankzuiver':
      case 'verenkelen':
      case 'verdubbelen':
      case 'speciale_tekens':
      case 'fonetiek':
        return (
          <span className="text-sm text-gray-600 line-clamp-2">
            {value as string}
          </span>
        );
      default:
        return <span className="text-sm text-gray-900">{String(value)}</span>;
    }
  };

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentData = filteredData.slice(startIndex, endIndex);
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
          <p className="text-gray-600 mt-1">Beheer fonetische klanktekens ({data.length} totaal)</p>
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

        {filteredData.length === 0 ? (
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
            <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
              <table className="w-full" style={{ minWidth: '100%' }}>
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
                  <tr>
                    <th className="sticky left-0 z-30 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      Titel
                    </th>
                    {visibleColumns.filter(col => col.key !== 'title').map((column) => (
                      <th
                        key={column.key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50"
                        style={{ minWidth: column.width }}
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="sticky right-0 z-30 bg-gray-50 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="sticky left-0 z-10 bg-white px-6 py-4 border-r border-gray-200 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                            <Volume2 className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {item.title}
                          </span>
                        </div>
                      </td>
                      {visibleColumns.filter(col => col.key !== 'title').map((column) => (
                        <td
                          key={column.key}
                          className="px-6 py-4 whitespace-nowrap"
                          style={{ minWidth: column.width }}
                        >
                          {renderCellValue(item, column.key)}
                        </td>
                      ))}
                      <td className="sticky right-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-right border-l border-gray-200 hover:bg-gray-50">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Bewerken"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
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
                  Resultaten {startIndex + 1} - {Math.min(endIndex, filteredData.length)} van{' '}
                  {filteredData.length}
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
          setSelectedItem(null);
        }}
        onSave={handleSave}
        phoneme={selectedItem}
      />
    </div>
  );
}
