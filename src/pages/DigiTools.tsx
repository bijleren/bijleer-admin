import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Sparkles,
  Search,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  AlertTriangle,
  X,
  CheckCircle,
  XCircle,
  Laptop,
  Eye,
  EyeOff,
  Crown,
  Beaker,
  Zap,
} from 'lucide-react';
import DigiToolModal, { DigiTool, DigiToolFormData } from '../components/DigiToolModal';

interface Notification {
  type: 'success' | 'error';
  message: string;
}

export default function DigiTools() {
  const [tools, setTools] = useState<DigiTool[]>([]);
  const [filteredTools, setFilteredTools] = useState<DigiTool[]>([]);
  const [spotlightTool, setSpotlightTool] = useState<DigiTool | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<DigiTool | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; toolId: string | null; title: string }>({
    show: false,
    toolId: null,
    title: '',
  });
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    checkPlatformAdmin();
    fetchTools();
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTools(tools);
    } else {
      const filtered = tools.filter(
        (tool) =>
          tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTools(filtered);
    }
  }, [searchQuery, tools]);

  useEffect(() => {
    if (tools.length > 0) {
      const activeTools = tools.filter((tool) => tool.is_active && tool.visible_to_users);
      if (activeTools.length > 0) {
        const randomTool = activeTools[Math.floor(Math.random() * activeTools.length)];
        setSpotlightTool(randomTool);
      }
    }
  }, [tools]);

  const checkPlatformAdmin = async () => {
    if (!user) return;

    try {
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id')
        .eq('name', 'Bijleren')
        .single();

      if (!schoolData) {
        setIsPlatformAdmin(false);
        return;
      }

      const { data: userSchoolData } = await supabase
        .from('user_schools')
        .select('role')
        .eq('user_id', user.id)
        .eq('school_id', schoolData.id)
        .eq('role', 'admin')
        .single();

      setIsPlatformAdmin(!!userSchoolData);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsPlatformAdmin(false);
    }
  };

  const fetchTools = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('digitools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTools(data || []);
      setFilteredTools(data || []);
    } catch (error) {
      console.error('Error fetching tools:', error);
      showNotification('error', 'Fout bij het ophalen van DigiTools');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleEdit = (tool: DigiTool) => {
    setSelectedTool(tool);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (tool: DigiTool) => {
    setDeleteConfirm({
      show: true,
      toolId: tool.id,
      title: tool.title,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.toolId) return;

    try {
      const { error } = await supabase.from('digitools').delete().eq('id', deleteConfirm.toolId);

      if (error) throw error;

      await fetchTools();
      showNotification('success', 'DigiTool succesvol verwijderd');
    } catch (error) {
      console.error('Error deleting tool:', error);
      showNotification('error', 'Er is een fout opgetreden bij het verwijderen van de DigiTool.');
    } finally {
      setDeleteConfirm({ show: false, toolId: null, title: '' });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, toolId: null, title: '' });
  };

  const handleSave = async (formData: DigiToolFormData) => {
    try {
      const toolData = {
        title: formData.title,
        description: formData.description,
        screenshot_url: formData.screenshot_url,
        link: formData.link,
        is_beta: formData.is_beta,
        is_new: formData.is_new,
        is_active: formData.is_active,
        visible_to_users: formData.visible_to_users,
        requires_premium: formData.requires_premium,
        updated_at: new Date().toISOString(),
      };

      if (formData.id) {
        const { error } = await supabase.from('digitools').update(toolData).eq('id', formData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('digitools').insert([toolData]);

        if (error) throw error;
      }

      await fetchTools();
      setIsModalOpen(false);
      setSelectedTool(null);
      showNotification('success', formData.id ? 'DigiTool succesvol bijgewerkt' : 'DigiTool succesvol aangemaakt');
    } catch (error) {
      console.error('Error saving tool:', error);
      showNotification('error', 'Er is een fout opgetreden bij het opslaan van de DigiTool.');
      throw error;
    }
  };

  const handleAddNew = () => {
    setSelectedTool(null);
    setIsModalOpen(true);
  };

  const openTool = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
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
          <h1 className="text-3xl font-bold text-gray-900">DigiTools</h1>
          <p className="text-gray-600 mt-1">
            Digitale tools voor onderwijs ({tools.length} totaal)
          </p>
        </div>
        {isPlatformAdmin && (
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nieuwe DigiTool
          </button>
        )}
      </div>

      {spotlightTool && (
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-2 text-yellow-300 mb-4">
              <Sparkles className="w-6 h-6" />
              <h2 className="text-2xl font-bold">DigiTool in de Kijker</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">{spotlightTool.title}</h3>
                  <p className="text-blue-100 text-lg">{spotlightTool.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {spotlightTool.is_beta && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
                      <Beaker className="w-3 h-3" />
                      BETA
                    </span>
                  )}
                  {spotlightTool.is_new && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-400 text-green-900">
                      <Zap className="w-3 h-3" />
                      NIEUW
                    </span>
                  )}
                  {spotlightTool.requires_premium && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-400 text-purple-900">
                      <Crown className="w-3 h-3" />
                      PREMIUM
                    </span>
                  )}
                </div>
                <button
                  onClick={() => openTool(spotlightTool.link)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
                >
                  <ExternalLink className="w-5 h-5" />
                  Open Tool
                </button>
              </div>
              <div className="hidden md:block">
                <img
                  src={spotlightTool.screenshot_url}
                  alt={spotlightTool.title}
                  className="w-full h-full object-cover rounded-lg border-4 border-white/20"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek DigiTools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredTools.length === 0 ? (
          <div className="p-12 text-center">
            <Laptop className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'Geen resultaten gevonden' : 'Geen DigiTools beschikbaar'}
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? 'Probeer een andere zoekterm.'
                : 'Klik op "Nieuwe DigiTool" om te beginnen.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tool
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beschrijving
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <img
                          src={tool.screenshot_url}
                          alt={tool.title}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3E?%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <div>
                          <div className="font-medium text-gray-900">{tool.title}</div>
                          <button
                            onClick={() => openTool(tool.link)}
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open tool
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 max-w-md">{tool.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {tool.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Eye className="w-3 h-3" />
                            Actief
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            <EyeOff className="w-3 h-3" />
                            Inactief
                          </span>
                        )}
                        {tool.is_beta && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Beaker className="w-3 h-3" />
                            BETA
                          </span>
                        )}
                        {tool.is_new && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Zap className="w-3 h-3" />
                            NIEUW
                          </span>
                        )}
                        {tool.requires_premium && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <Crown className="w-3 h-3" />
                            PREMIUM
                          </span>
                        )}
                        {!tool.visible_to_users && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Verborgen
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {isPlatformAdmin && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(tool)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Bewerken"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(tool)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DigiToolModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTool(null);
        }}
        onSave={handleSave}
        tool={selectedTool}
      />

      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-3 rounded-full flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  DigiTool verwijderen?
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  Weet je zeker dat je deze DigiTool wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                </p>
                <p className="text-gray-900 font-medium text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {deleteConfirm.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Annuleren
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-900 border border-green-200'
                : 'bg-red-50 text-red-900 border border-red-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
