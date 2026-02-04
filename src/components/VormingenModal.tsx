import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Vorming {
  id?: string;
  title: string;
  description: string;
  embed_code: string;
  category?: string;
  display_order?: number;
  is_published?: boolean;
}

interface VormingenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vorming: Vorming) => Promise<void>;
  vorming?: Vorming | null;
}

export default function VormingenModal({ isOpen, onClose, onSave, vorming }: VormingenModalProps) {
  const [formData, setFormData] = useState<Vorming>({
    title: '',
    description: '',
    embed_code: '',
    category: 'algemeen',
    display_order: 0,
    is_published: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vorming) {
      setFormData({
        id: vorming.id,
        title: vorming.title,
        description: vorming.description,
        embed_code: vorming.embed_code,
        category: vorming.category || 'algemeen',
        display_order: vorming.display_order || 0,
        is_published: vorming.is_published || false,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        embed_code: '',
        category: 'algemeen',
        display_order: 0,
        is_published: false,
      });
    }
  }, [vorming, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving vorming:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {vorming ? 'Vorming Bewerken' : 'Nieuwe Vorming'}
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
              placeholder="Bijv. Differentiatie in de klas"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Beschrijving *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Korte beschrijving van de vorming..."
            />
          </div>

          <div>
            <label htmlFor="embed_code" className="block text-sm font-medium text-gray-700 mb-2">
              Embed Code *
            </label>
            <textarea
              id="embed_code"
              name="embed_code"
              value={formData.embed_code}
              onChange={handleChange}
              required
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder='<iframe src="..." width="560" height="315"></iframe>'
            />
            <p className="mt-1 text-sm text-gray-500">
              Plak de embed code van YouTube, Vimeo, of andere videodiensten
            </p>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Categorie
            </label>
            <input
              type="text"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="algemeen"
            />
          </div>

          <div>
            <label htmlFor="display_order" className="block text-sm font-medium text-gray-700 mb-2">
              Weergave Volgorde
            </label>
            <input
              type="number"
              id="display_order"
              name="display_order"
              value={formData.display_order}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
            <p className="mt-1 text-sm text-gray-500">
              Lager nummer = eerder weergegeven
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_published"
              name="is_published"
              checked={formData.is_published}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="is_published" className="ml-2 text-sm font-medium text-gray-700">
              Gepubliceerd
            </label>
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
              {loading ? 'Opslaan...' : vorming ? 'Opslaan' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
