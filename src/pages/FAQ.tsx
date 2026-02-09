import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { HelpCircle, Edit2, Trash2, Search, Plus, Eye, EyeOff, AlertTriangle, X, CheckCircle, XCircle } from 'lucide-react';
import FaqModal from '../components/FaqModal';

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  display_order: number | null;
  is_published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const categoryLabels: Record<string, string> = {
  general: 'Algemeen',
  technical: 'Technisch',
  didactic: 'Didactisch',
  account: 'Account',
  other: 'Overig',
};

export default function FAQ() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState<Faq | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; faqId: string | null; question: string }>({
    show: false,
    faqId: null,
    question: '',
  });
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    fetchFaqs();
  }, []);

  useEffect(() => {
    let filtered = faqs;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((faq) => faq.category === categoryFilter);
    }

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredFaqs(filtered);
  }, [searchQuery, faqs, categoryFilter]);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('didactiek_faq')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFaqs(data || []);
      setFilteredFaqs(data || []);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleEdit = (faq: Faq) => {
    setSelectedFaq(faq);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (faq: Faq) => {
    setDeleteConfirm({
      show: true,
      faqId: faq.id,
      question: faq.question,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.faqId) return;

    try {
      const { error } = await supabase
        .from('didactiek_faq')
        .delete()
        .eq('id', deleteConfirm.faqId);

      if (error) throw error;

      await fetchFaqs();
      showNotification('success', 'FAQ succesvol verwijderd');
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      showNotification('error', 'Er is een fout opgetreden bij het verwijderen van de FAQ.');
    } finally {
      setDeleteConfirm({ show: false, faqId: null, question: '' });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, faqId: null, question: '' });
  };

  const handleSave = async (faq: Faq) => {
    try {
      const { id, created_at, updated_at, created_by, updated_by, ...updateData } = faq;

      if (id) {
        const { error } = await supabase
          .from('didactiek_faq')
          .update({
            ...updateData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
        showNotification('success', 'FAQ succesvol bijgewerkt');
      } else {
        const { error } = await supabase
          .from('didactiek_faq')
          .insert([updateData]);

        if (error) throw error;
        showNotification('success', 'FAQ succesvol aangemaakt');
      }

      await fetchFaqs();
      setIsModalOpen(false);
      setSelectedFaq(null);
    } catch (error) {
      console.error('Error saving FAQ:', error);
      showNotification('error', 'Er is een fout opgetreden bij het opslaan van de FAQ.');
      throw error;
    }
  };

  const handleAddNew = () => {
    setSelectedFaq(null);
    setIsModalOpen(true);
  };

  const uniqueCategories = Array.from(new Set(faqs.map((faq) => faq.category).filter(Boolean)));

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
          <h1 className="text-3xl font-bold text-gray-900">FAQ Beheer</h1>
          <p className="text-gray-600 mt-1">
            Beheer veelgestelde vragen ({faqs.length} totaal)
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nieuwe FAQ
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Categorie:</span>
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle
            </button>
            {uniqueCategories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category as string)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  categoryFilter === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {categoryLabels[category as string] || category}
              </button>
            ))}
          </div>
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="p-12 text-center">
            <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || categoryFilter !== 'all'
                ? 'Geen resultaten gevonden'
                : 'Geen FAQs beschikbaar'}
            </h3>
            <p className="text-gray-500">
              {searchQuery || categoryFilter !== 'all'
                ? 'Probeer een andere zoekterm of filter.'
                : 'Klik op "Nieuwe FAQ" om te beginnen.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredFaqs.map((faq) => (
              <div
                key={faq.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0 mt-1">
                        <HelpCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {faq.question}
                        </h3>
                        <div
                          className="prose prose-sm max-w-none text-gray-600"
                          dangerouslySetInnerHTML={{ __html: faq.answer }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {faq.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {categoryLabels[faq.category] || faq.category}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Volgorde: {faq.display_order ?? 0}
                      </span>
                      {faq.is_published ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Eye className="w-3 h-3" />
                          Gepubliceerd
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <EyeOff className="w-3 h-3" />
                          Concept
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(faq)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Bewerken"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(faq)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FaqModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFaq(null);
        }}
        onSave={handleSave}
        faq={selectedFaq}
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
                  FAQ verwijderen?
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  Weet je zeker dat je deze FAQ wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                </p>
                <p className="text-gray-900 font-medium text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {deleteConfirm.question}
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
