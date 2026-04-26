import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Search,
  Plus,
  CreditCard as Edit2,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Layers,
} from 'lucide-react';

interface BehaviorCard {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  card_type: string;
  is_active: boolean;
  is_validated: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  id?: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  card_type: string;
  is_active: boolean;
  is_validated: boolean;
  is_public: boolean;
}

const EMPTY_FORM: FormData = {
  title: '',
  description: '',
  category: 'Werkgeheugen',
  icon: '🎯',
  card_type: 'admin',
  is_active: true,
  is_validated: false,
  is_public: false,
};

const CATEGORIES = [
  'Werkgeheugen',
  'Inhibitie',
  'Flexibiliteit',
  'Planning',
  'Taakinitiatie',
  'Emotieregulatie',
  'Zelfmonitoring',
  'Timemanagement',
];

const CATEGORY_ICONS: Record<string, string> = {
  Werkgeheugen: '🧠',
  Inhibitie: '🛑',
  Flexibiliteit: '🔄',
  Planning: '📋',
  Taakinitiatie: '🚀',
  Emotieregulatie: '💚',
  Zelfmonitoring: '🔍',
  Timemanagement: '⏰',
};

const ICON_OPTIONS = [
  '🎯', '🧠', '🛑', '🔄', '📋', '🚀', '💚', '🔍', '⏰', '✋', '🙋', '🤫', '💭',
  '🪑', '💡', '✨', '🌊', '🔀', '📚', '🧹', '🎒', '👣', '🗂️', '⚡', '💪', '🏃',
  '🎧', '⏱️', '🌬️', '🆘', '🏆', '😊', '😌', '👁️', '❤️',
];

interface Notification {
  type: 'success' | 'error';
  message: string;
}

export default function BehaviorCards() {
  const [cards, setCards] = useState<BehaviorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null; title: string }>({
    show: false,
    id: null,
    title: '',
  });
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('behavior_cards')
        .select('*')
        .order('category', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Error fetching behavior cards:', error);
      showNotification('error', 'Fout bij het ophalen van gedragskaarten');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddNew = () => {
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleEdit = (card: BehaviorCard) => {
    setFormData({
      id: card.id,
      title: card.title,
      description: card.description,
      category: card.category,
      icon: card.icon,
      card_type: card.card_type,
      is_active: card.is_active,
      is_validated: card.is_validated,
      is_public: card.is_public,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      showNotification('error', 'Titel is verplicht');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        icon: formData.icon || '🎯',
        card_type: formData.card_type,
        is_active: formData.is_active,
        is_validated: formData.is_validated,
        is_public: formData.is_public,
        updated_at: new Date().toISOString(),
      };

      if (formData.id) {
        const { error } = await supabase
          .from('behavior_cards')
          .update(payload)
          .eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('behavior_cards').insert([payload]);
        if (error) throw error;
      }

      await fetchCards();
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      showNotification('success', formData.id ? 'Gedragskaart bijgewerkt' : 'Gedragskaart aangemaakt');
    } catch (error) {
      console.error('Error saving behavior card:', error);
      showNotification('error', 'Fout bij het opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (card: BehaviorCard) => {
    setDeleteConfirm({ show: true, id: card.id, title: card.title });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      const { error } = await supabase.from('behavior_cards').delete().eq('id', deleteConfirm.id);
      if (error) throw error;
      await fetchCards();
      showNotification('success', 'Gedragskaart verwijderd');
    } catch (error) {
      console.error('Error deleting behavior card:', error);
      showNotification('error', 'Fout bij het verwijderen');
    } finally {
      setDeleteConfirm({ show: false, id: null, title: '' });
    }
  };

  const toggleActive = async (card: BehaviorCard) => {
    try {
      const { error } = await supabase
        .from('behavior_cards')
        .update({ is_active: !card.is_active, updated_at: new Date().toISOString() })
        .eq('id', card.id);
      if (error) throw error;
      await fetchCards();
      showNotification('success', `${card.title} is nu ${card.is_active ? 'inactief' : 'actief'}`);
    } catch (error) {
      console.error('Error toggling active:', error);
      showNotification('error', 'Fout bij het wijzigen van status');
    }
  };

  const filteredCards = cards.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categoryCounts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = cards.filter((c) => c.category === cat).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gedragskaarten</h1>
          <p className="text-gray-600 mt-1">
            Beheer de gedragskaarten die beschikbaar zijn in de app ({cards.length} totaal)
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nieuwe Kaart
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
              categoryFilter === cat
                ? 'border-blue-600 bg-blue-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
            <span className="text-xs font-medium text-gray-700 text-center leading-tight">{cat}</span>
            <span className="text-xs font-bold text-gray-500">{categoryCounts[cat] || 0}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek gedragskaarten..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {categoryFilter !== 'all' && (
            <button
              onClick={() => setCategoryFilter('all')}
              className="flex items-center gap-1 px-3 py-2 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <X className="w-3 h-3" />
              {categoryFilter}
            </button>
          )}
        </div>

        {filteredCards.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || categoryFilter !== 'all' ? 'Geen resultaten gevonden' : 'Geen gedragskaarten'}
            </h3>
            <p className="text-gray-500">
              {searchQuery || categoryFilter !== 'all'
                ? 'Probeer een andere zoekterm of filter.'
                : 'Klik op "Nieuwe Kaart" om te beginnen.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kaart
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beschrijving
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
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
                {filteredCards.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{card.icon}</span>
                        <span className="text-sm font-medium text-gray-900">{card.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 max-w-xs line-clamp-2">{card.description}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {CATEGORY_ICONS[card.category]} {card.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          card.card_type === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {card.card_type === 'admin' ? 'Admin' : 'Gebruiker'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(card)}
                        className="transition-colors"
                        title={card.is_active ? 'Deactiveren' : 'Activeren'}
                      >
                        {card.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200">
                            <Eye className="w-3 h-3" />
                            Actief
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">
                            <EyeOff className="w-3 h-3" />
                            Inactief
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(card)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Bewerken"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(card)}
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {formData.id ? 'Gedragskaart Bewerken' : 'Nieuwe Gedragskaart'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setFormData(EMPTY_FORM);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="bijv. Hand opsteken"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="bijv. Ik steek mijn hand op voor ik iets zeg"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_ICONS[cat]} {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icoon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl transition-colors ${
                        formData.icon === icon
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="Of typ een emoji..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm font-medium text-gray-700">Actief</span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_validated}
                      onChange={(e) => setFormData({ ...formData, is_validated: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                  <span className="text-sm font-medium text-gray-700">Gevalideerd</span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_public}
                      onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                  <span className="text-sm font-medium text-gray-700">Openbaar</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setFormData(EMPTY_FORM);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {formData.id ? 'Opslaan' : 'Aanmaken'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-3 rounded-full flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Gedragskaart verwijderen?</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Deze actie kan niet ongedaan worden gemaakt.
                </p>
                <p className="text-gray-900 font-medium text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {deleteConfirm.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm({ show: false, id: null, title: '' })}
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
            <button onClick={() => setNotification(null)} className="ml-2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
