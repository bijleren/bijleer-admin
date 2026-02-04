import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Newsletter {
  id?: string;
  school_id?: string;
  title: string;
  description?: string;
  file_path: string;
}

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newsletter: Newsletter) => Promise<void>;
  newsletter?: Newsletter | null;
}

export default function NewsletterModal({ isOpen, onClose, onSave, newsletter }: NewsletterModalProps) {
  const [formData, setFormData] = useState<Newsletter>({
    title: '',
    description: '',
    file_path: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (newsletter) {
      setFormData({
        id: newsletter.id,
        school_id: newsletter.school_id,
        title: newsletter.title,
        description: newsletter.description || '',
        file_path: newsletter.file_path,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        file_path: '',
      });
    }
  }, [newsletter, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving newsletter:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {newsletter ? 'Nieuwsbrief Bewerken' : 'Nieuwe Nieuwsbrief'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Titel *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Bijv. Nieuwsbrief Januari 2026"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Beschrijving
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Korte beschrijving van de nieuwsbrief..."
            />
          </div>

          <div>
            <label htmlFor="file_path" className="block text-sm font-medium text-gray-700 mb-2">
              Bestand URL *
            </label>
            <input
              type="text"
              id="file_path"
              name="file_path"
              value={formData.file_path}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/newsletter.pdf"
            />
            <p className="mt-1 text-sm text-gray-500">
              Volledige URL naar het nieuwsbrief bestand
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Opslaan...' : newsletter ? 'Opslaan' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
