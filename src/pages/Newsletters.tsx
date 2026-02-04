import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Download, Edit2, Trash2, Plus, Search } from 'lucide-react';
import NewsletterModal from '../components/NewsletterModal';

interface Newsletter {
  id: string;
  school_id: string | null;
  title: string;
  description: string | null;
  file_path: string;
  created_at: string;
  created_by: string | null;
}

export default function Newsletters() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [filteredNewsletters, setFilteredNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null);

  useEffect(() => {
    fetchNewsletters();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredNewsletters(newsletters);
    } else {
      const filtered = newsletters.filter((newsletter) =>
        newsletter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (newsletter.description && newsletter.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredNewsletters(filtered);
    }
  }, [searchQuery, newsletters]);

  const fetchNewsletters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNewsletters(data || []);
      setFilteredNewsletters(data || []);
    } catch (error) {
      console.error('Error fetching newsletters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (filePath: string, title: string) => {
    window.open(filePath, '_blank');
  };

  const handleEdit = (newsletter: Newsletter) => {
    setSelectedNewsletter(newsletter);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze nieuwsbrief wilt verwijderen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('newsletters')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchNewsletters();
    } catch (error) {
      console.error('Error deleting newsletter:', error);
      alert('Er is een fout opgetreden bij het verwijderen van de nieuwsbrief.');
    }
  };

  const handleSave = async (newsletter: Newsletter) => {
    try {
      if (newsletter.id) {
        const { error } = await supabase
          .from('newsletters')
          .update({
            title: newsletter.title,
            description: newsletter.description,
            file_path: newsletter.file_path,
            updated_at: new Date().toISOString(),
          })
          .eq('id', newsletter.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('newsletters')
          .insert([
            {
              title: newsletter.title,
              description: newsletter.description,
              file_path: newsletter.file_path,
            },
          ]);

        if (error) throw error;
      }

      await fetchNewsletters();
      setIsModalOpen(false);
      setSelectedNewsletter(null);
    } catch (error) {
      console.error('Error saving newsletter:', error);
      alert('Er is een fout opgetreden bij het opslaan van de nieuwsbrief.');
      throw error;
    }
  };

  const handleAddNew = () => {
    setSelectedNewsletter(null);
    setIsModalOpen(true);
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
          <h1 className="text-3xl font-bold text-gray-900">Didactiek Nieuwsbrieven</h1>
          <p className="text-gray-600 mt-1">Beheer alle didactiek nieuwsbrieven</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nieuwe Nieuwsbrief
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek nieuwsbrieven..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredNewsletters.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'Geen resultaten gevonden' : 'Geen nieuwsbrieven beschikbaar'}
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? 'Probeer een andere zoekterm.'
                : 'Klik op "Nieuwe Nieuwsbrief" om te beginnen.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Titel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beschrijving
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredNewsletters.map((newsletter) => (
                  <tr key={newsletter.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{newsletter.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 line-clamp-2 max-w-md">
                        {newsletter.description || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {new Date(newsletter.created_at).toLocaleDateString('nl-NL', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(newsletter.file_path, newsletter.title)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(newsletter)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Bewerken"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(newsletter.id)}
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

      <NewsletterModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedNewsletter(null);
        }}
        onSave={handleSave}
        newsletter={selectedNewsletter}
      />
    </div>
  );
}
