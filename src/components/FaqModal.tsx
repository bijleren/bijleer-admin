import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Faq {
  id?: string;
  question: string;
  answer: string;
  category: string | null;
  display_order: number | null;
  is_published: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
}

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (faq: Faq) => Promise<void>;
  faq: Faq | null;
}

export default function FaqModal({ isOpen, onClose, onSave, faq }: FaqModalProps) {
  const [formData, setFormData] = useState<Faq>({
    question: '',
    answer: '',
    category: 'general',
    display_order: 0,
    is_published: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (faq) {
      setFormData(faq);
    } else {
      setFormData({
        question: '',
        answer: '',
        category: 'general',
        display_order: 0,
        is_published: true,
      });
    }
  }, [faq, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving FAQ:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof Faq, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {faq ? 'FAQ Bewerken' : 'Nieuwe FAQ Toevoegen'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vraag *
              </label>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => handleChange('question', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Voer de vraag in..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Antwoord * (HTML toegestaan)
              </label>
              <textarea
                value={formData.answer}
                onChange={(e) => handleChange('answer', e.target.value)}
                required
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Voer het antwoord in (HTML tags zijn toegestaan)..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Je kunt HTML tags gebruiken zoals &lt;br&gt;, &lt;strong&gt;, &lt;em&gt;, etc.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categorie
                </label>
                <select
                  value={formData.category || 'general'}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="general">Algemeen</option>
                  <option value="technical">Technisch</option>
                  <option value="didactic">Didactisch</option>
                  <option value="account">Account</option>
                  <option value="other">Overig</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volgorde
                </label>
                <input
                  type="number"
                  value={formData.display_order ?? 0}
                  onChange={(e) => handleChange('display_order', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publicatiestatus
                </label>
                <select
                  value={formData.is_published ? 'true' : 'false'}
                  onChange={(e) => handleChange('is_published', e.target.value === 'true')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="true">Gepubliceerd</option>
                  <option value="false">Concept</option>
                </select>
              </div>
            </div>

            {formData.answer && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voorbeeld Weergave
                </label>
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: formData.answer }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
