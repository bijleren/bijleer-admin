import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Phoneme {
  id?: string;
  symbol: string;
  name: string;
  description?: string;
  example_word?: string;
  audio_url?: string;
  image_url?: string;
  is_vowel?: boolean;
  is_consonant?: boolean;
  difficulty_level?: number;
  display_order?: number;
  is_active?: boolean;
  legacy_mysql_id?: number;
  created_at?: string;
}

interface PhonemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (phoneme: Phoneme) => Promise<void>;
  phoneme?: Phoneme | null;
}

export default function PhonemeModal({ isOpen, onClose, onSave, phoneme }: PhonemeModalProps) {
  const [formData, setFormData] = useState<Phoneme>({
    symbol: '',
    name: '',
    description: '',
    example_word: '',
    audio_url: '',
    image_url: '',
    is_vowel: false,
    is_consonant: false,
    difficulty_level: 1,
    display_order: 0,
    is_active: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (phoneme) {
      setFormData({
        id: phoneme.id,
        symbol: phoneme.symbol,
        name: phoneme.name,
        description: phoneme.description || '',
        example_word: phoneme.example_word || '',
        audio_url: phoneme.audio_url || '',
        image_url: phoneme.image_url || '',
        is_vowel: phoneme.is_vowel || false,
        is_consonant: phoneme.is_consonant || false,
        difficulty_level: phoneme.difficulty_level || 1,
        display_order: phoneme.display_order || 0,
        is_active: phoneme.is_active !== undefined ? phoneme.is_active : true,
      });
    } else {
      setFormData({
        symbol: '',
        name: '',
        description: '',
        example_word: '',
        audio_url: '',
        image_url: '',
        is_vowel: false,
        is_consonant: false,
        difficulty_level: 1,
        display_order: 0,
        is_active: true,
      });
    }
  }, [phoneme, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving phoneme:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
            {phoneme ? 'Klankteken Bewerken' : 'Nieuw Klankteken'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-2">
                Symbool *
              </label>
              <input
                type="text"
                id="symbol"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Bijv. a, e, i"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Naam *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Bijv. korte a"
              />
            </div>
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
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Beschrijving van het klankteken..."
            />
          </div>

          <div>
            <label htmlFor="example_word" className="block text-sm font-medium text-gray-700 mb-2">
              Voorbeeldwoord
            </label>
            <input
              type="text"
              id="example_word"
              name="example_word"
              value={formData.example_word}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Bijv. kat, raam"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="audio_url" className="block text-sm font-medium text-gray-700 mb-2">
                Audio URL
              </label>
              <input
                type="text"
                id="audio_url"
                name="audio_url"
                value={formData.audio_url}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            <div>
              <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-2">
                Afbeelding URL
              </label>
              <input
                type="text"
                id="image_url"
                name="image_url"
                value={formData.image_url}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="difficulty_level" className="block text-sm font-medium text-gray-700 mb-2">
                Moeilijkheidsgraad
              </label>
              <input
                type="number"
                id="difficulty_level"
                name="difficulty_level"
                value={formData.difficulty_level}
                onChange={handleChange}
                min="1"
                max="10"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              />
            </div>

            <div>
              <label htmlFor="legacy_mysql_id" className="block text-sm font-medium text-gray-700 mb-2">
                Legacy MySQL ID
              </label>
              <input
                type="number"
                id="legacy_mysql_id"
                name="legacy_mysql_id"
                value={formData.legacy_mysql_id || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_vowel"
                name="is_vowel"
                checked={formData.is_vowel}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="is_vowel" className="ml-2 text-sm font-medium text-gray-700">
                Is klinker
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_consonant"
                name="is_consonant"
                checked={formData.is_consonant}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="is_consonant" className="ml-2 text-sm font-medium text-gray-700">
                Is medeklinker
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                Actief
              </label>
            </div>
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
              {loading ? 'Opslaan...' : phoneme ? 'Opslaan' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
