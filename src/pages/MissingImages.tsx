import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Image, Check, X, SkipForward, Trash2, Search, Filter } from 'lucide-react';

interface Word {
  id: number;
  word: string;
  frequency: number;
  klankteken: string | null;
  image: string | null;
  image_file: string | null;
}

interface SelectedWord extends Word {
  imageUrl?: string | null;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

type SortOption = 'shortest' | 'longest' | 'frequency-high' | 'frequency-low' | 'random';
type TabType = 'overview' | 'check';

export default function MissingImages() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [words, setWords] = useState<Word[]>([]);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('shortest');
  const [searchTerm, setSearchTerm] = useState('');
  const [totalWithoutImage, setTotalWithoutImage] = useState(0);
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [selectedImageLoading, setSelectedImageLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [overviewSortOption, setOverviewSortOption] = useState<SortOption>('shortest');
  const itemsPerPage = 100;

  useEffect(() => {
    fetchWordsWithoutImages();
  }, []);

  useEffect(() => {
    if (activeTab === 'check' && !currentWord) {
      loadNextWord();
    }
  }, [activeTab]);

  useEffect(() => {
    if (currentWord) {
      checkImageExists(currentWord.word);
    }
  }, [currentWord]);

  const fetchWordsWithoutImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wordfrequency')
        .select('id, word, frequency, klankteken, image, image_file')
        .or('image.is.null,image.eq.')
        .or('image_file.is.null,image_file.eq.');

      if (error) throw error;

      const filtered = (data || []).filter(
        (w) => (!w.image || w.image === '') && (!w.image_file || w.image_file === '')
      );

      setWords(filtered);
      setTotalWithoutImage(filtered.length);
    } catch (error) {
      console.error('Error fetching words:', error);
      showNotification('error', 'Failed to load words');
    } finally {
      setLoading(false);
    }
  };

  const loadNextWord = async (specificWord?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('wordfrequency')
        .select('id, word, frequency, klankteken, image, image_file')
        .or('image.is.null,image.eq.')
        .or('image_file.is.null,image_file.eq.');

      if (specificWord) {
        query = query.eq('word', specificWord);
      } else {
        switch (sortOption) {
          case 'shortest':
            query = query.order('word', { ascending: true });
            break;
          case 'longest':
            query = query.order('word', { ascending: false });
            break;
          case 'frequency-high':
            query = query.order('frequency', { ascending: false });
            break;
          case 'frequency-low':
            query = query.order('frequency', { ascending: true });
            break;
          case 'random':
            break;
        }
      }

      query = query.limit(sortOption === 'random' ? 100 : 1);

      const { data, error } = await supabase.rpc('get_words_without_image', {
        sort_type: sortOption,
        search_word: specificWord || null
      }).maybeSingle();

      if (!data && !error) {
        const { data: fallbackData, error: fallbackError } = await query;

        if (fallbackError) throw fallbackError;

        const filtered = (fallbackData || []).filter(
          (w) => (!w.image || w.image === '') && (!w.image_file || w.image_file === '')
        );

        if (filtered.length > 0) {
          const word = sortOption === 'random'
            ? filtered[Math.floor(Math.random() * filtered.length)]
            : filtered[0];
          setCurrentWord(word);
        } else {
          setCurrentWord(null);
          showNotification('success', 'All words have been checked!');
        }
      } else {
        setCurrentWord(data);
      }
    } catch (error) {
      console.error('Error loading word:', error);
      showNotification('error', 'Failed to load word');
    } finally {
      setLoading(false);
    }
  };

  const checkImageExists = async (word: string) => {
    setImageLoading(true);
    setImageUrl(null);

    const extensions = ['jpg', 'png'];
    const baseUrl = 'https://www.instructielezen.be/img';

    for (const ext of extensions) {
      try {
        const url = `${baseUrl}/${word}.${ext}`;
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          setImageUrl(url);
          setImageLoading(false);
          return;
        }
      } catch (error) {
        continue;
      }
    }

    setImageLoading(false);
  };

  const updateImageStatus = async (status: '1' | '2', word?: Word) => {
    const targetWord = word || currentWord;
    if (!targetWord) return;

    try {
      const updateData: { image: string; image_file?: string } = { image: status };

      if (status === '2') {
        updateData.image_file = `${targetWord.word}.png`;
      }

      const { error } = await supabase
        .from('wordfrequency')
        .update(updateData)
        .eq('id', targetWord.id);

      if (error) throw error;

      showNotification(
        'success',
        status === '1'
          ? 'Marked as no image possible'
          : `Marked as has image (${targetWord.word}.png)`
      );

      await fetchWordsWithoutImages();

      if (word) {
        setSelectedWord(null);
        setCurrentPage(1);
      } else {
        setTimeout(() => loadNextWord(), 500);
      }
    } catch (error) {
      console.error('Error updating word:', error);
      showNotification('error', 'Failed to update word');
    }
  };

  const deleteWord = async () => {
    if (!currentWord) return;

    if (!confirm(`Are you sure you want to delete "${currentWord.word}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('wordfrequency')
        .delete()
        .eq('id', currentWord.id);

      if (error) throw error;

      showNotification('success', 'Word deleted successfully');
      await fetchWordsWithoutImages();
      setTimeout(() => loadNextWord(), 500);
    } catch (error) {
      console.error('Error deleting word:', error);
      showNotification('error', 'Failed to delete word');
    }
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      loadNextWord(searchTerm.trim());
    }
  };

  const handleWordClick = async (word: Word) => {
    setSelectedWord({ ...word, imageUrl: undefined });
    setSelectedImageLoading(true);

    const extensions = ['jpg', 'png'];
    const baseUrl = 'https://www.instructielezen.be/img';
    let foundUrl: string | null = null;

    for (const ext of extensions) {
      try {
        const url = `${baseUrl}/${word.word}.${ext}`;
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          foundUrl = url;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    setSelectedWord((prev) => prev ? { ...prev, imageUrl: foundUrl } : null);
    setSelectedImageLoading(false);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const getSortedWords = () => {
    let sorted = [...words];

    switch (overviewSortOption) {
      case 'shortest':
        sorted.sort((a, b) => a.word.length - b.word.length);
        break;
      case 'longest':
        sorted.sort((a, b) => b.word.length - a.word.length);
        break;
      case 'frequency-high':
        sorted.sort((a, b) => b.frequency - a.frequency);
        break;
      case 'frequency-low':
        sorted.sort((a, b) => a.frequency - b.frequency);
        break;
    }

    return sorted;
  };

  const filteredWords = getSortedWords().filter((word) =>
    word.word.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredWords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWords = filteredWords.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedWord(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    const pageNumbers = [];
    const maxVisiblePages = 7;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          First
        </button>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Previous
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2">...</span>}
          </>
        )}

        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-2 rounded-lg border ${
              currentPage === page
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2">...</span>}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Next
        </button>
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Last
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Image className="w-8 h-8" />
            Missing Images
          </h1>
          <p className="mt-2 text-gray-600">
            Manage words that need images
          </p>
        </div>

        {notification && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {notification.message}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">
                Words without images
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {totalWithoutImage}
              </p>
            </div>
            <Image className="w-12 h-12 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('check')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'check'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Check Images
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' ? (
              <div>
                <div className="mb-6 flex gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select
                      value={overviewSortOption}
                      onChange={(e) => {
                        setOverviewSortOption(e.target.value as SortOption);
                        setCurrentPage(1);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="shortest">Shortest word first</option>
                      <option value="longest">Longest word first</option>
                      <option value="frequency-high">Highest frequency first</option>
                      <option value="frequency-low">Lowest frequency first</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Search words..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="mb-4 text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredWords.length)} of {filteredWords.length} words
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading words...</p>
                  </div>
                ) : filteredWords.length === 0 ? (
                  <div className="text-center py-12">
                    <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {searchTerm
                        ? 'No words found matching your search'
                        : 'All words have images!'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="overflow-x-auto mb-6">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Word
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Frequency
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Klankteken
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedWords.map((word) => (
                            <tr
                              key={word.id}
                              onClick={() => handleWordClick(word)}
                              className={`cursor-pointer transition-colors ${
                                selectedWord?.id === word.id
                                  ? 'bg-blue-50 hover:bg-blue-100'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {word.word}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {word.frequency}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {word.klankteken || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalPages > 1 && renderPagination()}

                    {selectedWord && (
                      <div className="border-t border-gray-200 pt-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                          <div className="text-center mb-6">
                            <h3 className="text-3xl font-bold text-gray-900 mb-2">
                              {selectedWord.word}
                            </h3>
                            <p className="text-gray-600">
                              Frequency: {selectedWord.frequency}
                              {selectedWord.klankteken && (
                                <span className="ml-4">
                                  Klankteken: {selectedWord.klankteken}
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-6 mb-6 min-h-[250px] flex items-center justify-center">
                            {selectedImageLoading ? (
                              <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                                <p className="mt-3 text-gray-600">
                                  Checking for image...
                                </p>
                              </div>
                            ) : selectedWord.imageUrl ? (
                              <img
                                src={selectedWord.imageUrl}
                                alt={selectedWord.word}
                                className="max-w-full max-h-[300px] object-contain"
                              />
                            ) : (
                              <div className="text-center">
                                <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-600">No image found</p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-3 justify-center">
                            <button
                              onClick={() => setSelectedWord(null)}
                              className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => updateImageStatus('1', selectedWord)}
                              className="px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 font-medium"
                            >
                              <X className="w-4 h-4" />
                              No Image Possible
                            </button>
                            <button
                              onClick={() => updateImageStatus('2', selectedWord)}
                              className="px-5 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 font-medium"
                            >
                              <Check className="w-4 h-4" />
                              Image Added
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-6 flex gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select
                      value={sortOption}
                      onChange={(e) => {
                        setSortOption(e.target.value as SortOption);
                        loadNextWord();
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="shortest">Shortest word first</option>
                      <option value="longest">Longest word first</option>
                      <option value="frequency-high">Highest frequency first</option>
                      <option value="frequency-low">Lowest frequency first</option>
                      <option value="random">Random</option>
                    </select>
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search specific word..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleSearch}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                      Search
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading word...</p>
                  </div>
                ) : !currentWord ? (
                  <div className="text-center py-12">
                    <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      All done!
                    </p>
                    <p className="text-gray-600">
                      No more words to check or none found
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-center mb-8">
                      <h2 className="text-5xl font-bold text-gray-900 mb-2">
                        {currentWord.word}
                      </h2>
                      <p className="text-gray-600">
                        Frequency: {currentWord.frequency}
                        {currentWord.klankteken && (
                          <span className="ml-4">
                            Klankteken: {currentWord.klankteken}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-8 mb-6 min-h-[300px] flex items-center justify-center">
                      {imageLoading ? (
                        <div className="text-center">
                          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                          <p className="mt-4 text-gray-600">
                            Checking for image...
                          </p>
                        </div>
                      ) : imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={currentWord.word}
                          className="max-w-full max-h-[400px] object-contain"
                        />
                      ) : (
                        <div className="text-center">
                          <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-600">No image found</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={() => loadNextWord()}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-medium"
                      >
                        <SkipForward className="w-5 h-5" />
                        Skip
                      </button>
                      <button
                        onClick={() => updateImageStatus('1')}
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 font-medium"
                      >
                        <X className="w-5 h-5" />
                        No Image Possible
                      </button>
                      <button
                        onClick={() => updateImageStatus('2')}
                        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 font-medium"
                      >
                        <Check className="w-5 h-5" />
                        Image Added
                      </button>
                      <button
                        onClick={deleteWord}
                        className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 font-medium"
                      >
                        <Trash2 className="w-5 h-5" />
                        Delete Word
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
