import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Video, Edit2, Trash2, Plus, Search, Eye, EyeOff } from 'lucide-react';
import VormingenModal from '../components/VormingenModal';

interface Vorming {
  id: string;
  title: string;
  description: string;
  embed_code: string;
  category: string | null;
  display_order: number | null;
  is_published: boolean | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export default function Vormingen() {
  const [vormingen, setVormingen] = useState<Vorming[]>([]);
  const [filteredVormingen, setFilteredVormingen] = useState<Vorming[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVorming, setSelectedVorming] = useState<Vorming | null>(null);
  const [previewVorming, setPreviewVorming] = useState<Vorming | null>(null);

  useEffect(() => {
    fetchVormingen();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredVormingen(vormingen);
    } else {
      const filtered = vormingen.filter((vorming) =>
        vorming.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vorming.description && vorming.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (vorming.category && vorming.category.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredVormingen(filtered);
    }
  }, [searchQuery, vormingen]);

  const fetchVormingen = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('didactiek_vormingen')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVormingen(data || []);
      setFilteredVormingen(data || []);
    } catch (error) {
      console.error('Error fetching vormingen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (vorming: Vorming) => {
    setSelectedVorming(vorming);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze vorming wilt verwijderen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('didactiek_vormingen')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchVormingen();
    } catch (error) {
      console.error('Error deleting vorming:', error);
      alert('Er is een fout opgetreden bij het verwijderen van de vorming.');
    }
  };

  const handleSave = async (vorming: Vorming) => {
    try {
      if (vorming.id) {
        const { error } = await supabase
          .from('didactiek_vormingen')
          .update({
            title: vorming.title,
            description: vorming.description,
            embed_code: vorming.embed_code,
            category: vorming.category,
            display_order: vorming.display_order,
            is_published: vorming.is_published,
            updated_at: new Date().toISOString(),
          })
          .eq('id', vorming.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('didactiek_vormingen')
          .insert([
            {
              title: vorming.title,
              description: vorming.description,
              embed_code: vorming.embed_code,
              category: vorming.category,
              display_order: vorming.display_order,
              is_published: vorming.is_published,
            },
          ]);

        if (error) throw error;
      }

      await fetchVormingen();
      setIsModalOpen(false);
      setSelectedVorming(null);
    } catch (error) {
      console.error('Error saving vorming:', error);
      alert('Er is een fout opgetreden bij het opslaan van de vorming.');
      throw error;
    }
  };

  const handleAddNew = () => {
    setSelectedVorming(null);
    setIsModalOpen(true);
  };

  const handlePreview = (vorming: Vorming) => {
    setPreviewVorming(vorming);
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
          <h1 className="text-3xl font-bold text-gray-900">Didactiek Vormingen</h1>
          <p className="text-gray-600 mt-1">Beheer alle didactiek vormingen</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nieuwe Vorming
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek vormingen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredVormingen.length === 0 ? (
          <div className="p-12 text-center">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'Geen resultaten gevonden' : 'Geen vormingen beschikbaar'}
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? 'Probeer een andere zoekterm.'
                : 'Klik op "Nieuwe Vorming" om te beginnen.'}
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
                    Categorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volgorde
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVormingen.map((vorming) => (
                  <tr key={vorming.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                          <Video className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{vorming.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 line-clamp-2 max-w-md">
                        {vorming.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {vorming.category || 'algemeen'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {vorming.is_published ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Eye className="w-3 h-3" />
                          Gepubliceerd
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <EyeOff className="w-3 h-3" />
                          Concept
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{vorming.display_order || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePreview(vorming)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Voorbeeld"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(vorming)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Bewerken"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(vorming.id)}
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

      <VormingenModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVorming(null);
        }}
        onSave={handleSave}
        vorming={selectedVorming}
      />

      {previewVorming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-75" onClick={() => setPreviewVorming(null)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{previewVorming.title}</h2>
                <p className="text-gray-600 mt-1">{previewVorming.description}</p>
              </div>
              <button
                onClick={() => setPreviewVorming(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Eye className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <div
                className="aspect-video w-full"
                dangerouslySetInnerHTML={{ __html: previewVorming.embed_code }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
