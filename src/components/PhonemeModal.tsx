import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Klankteken {
  id?: number;
  title: string;
  klinktals?: string;
  letters?: string;
  audio?: string;
  audio_uitleg?: string;
  tool_uitleg?: string;
  articulation?: string;
  type: string;
  tool?: string;
  blockRepresentation?: string;
  imageWord?: string;
  imageTool?: string;
  created_at?: string;
  updated_at?: string;
  klankzuiver?: string;
  verenkelen?: string;
  verdubbelen?: string;
  speciale_tekens?: string;
  beschrijving?: string;
  example_words?: string;
  example_words_audio?: string;
  example_words_images?: string;
  volgorde?: number;
  length_type?: string;
  voice?: string;
  location?: string;
  lippen?: string;
  kaak?: string;
  produce_audio?: string;
  word?: string;
  fonetiek?: string;
  set?: number;
  language?: string;
}

interface PhonemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (klankteken: Klankteken) => Promise<void>;
  phoneme?: Klankteken | null;
}

export default function PhonemeModal({ isOpen, onClose, onSave, phoneme }: PhonemeModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'audio' | 'visual' | 'phonetic' | 'advanced'>('basic');
  const [formData, setFormData] = useState<Klankteken>({
    title: '',
    type: '',
    language: 'nl',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (phoneme) {
      setFormData({ language: 'nl', ...phoneme });
    } else {
      setFormData({
        title: '',
        type: '',
        language: 'nl',
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
      console.error('Error saving klankteken:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData({
      ...formData,
      [name]: type === 'number' ? (value === '' ? undefined : parseInt(value)) : value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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

        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Basis
            </button>
            <button
              onClick={() => setActiveTab('audio')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'audio'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Audio
            </button>
            <button
              onClick={() => setActiveTab('visual')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'visual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Visueel
            </button>
            <button
              onClick={() => setActiveTab('phonetic')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'phonetic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Fonetisch
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'advanced'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Geavanceerd
            </button>
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {activeTab === 'basic' && (
            <>
              <div className="grid grid-cols-2 gap-4">
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
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <input
                    type="text"
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                  Taal
                </label>
                <select
                  id="language"
                  name="language"
                  value={formData.language ?? 'nl'}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="nl">NL — Nederlands</option>
                  <option value="fr">FR — Frans</option>
                  <option value="en">EN — Engels</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="word" className="block text-sm font-medium text-gray-700 mb-2">
                    Woord
                  </label>
                  <input
                    type="text"
                    id="word"
                    name="word"
                    value={formData.word || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="letters" className="block text-sm font-medium text-gray-700 mb-2">
                    Letters
                  </label>
                  <input
                    type="text"
                    id="letters"
                    name="letters"
                    value={formData.letters || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="beschrijving" className="block text-sm font-medium text-gray-700 mb-2">
                  Beschrijving
                </label>
                <textarea
                  id="beschrijving"
                  name="beschrijving"
                  value={formData.beschrijving || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="volgorde" className="block text-sm font-medium text-gray-700 mb-2">
                    Volgorde
                  </label>
                  <input
                    type="number"
                    id="volgorde"
                    name="volgorde"
                    value={formData.volgorde || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="set" className="block text-sm font-medium text-gray-700 mb-2">
                    Set
                  </label>
                  <input
                    type="number"
                    id="set"
                    name="set"
                    value={formData.set || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'audio' && (
            <>
              <div>
                <label htmlFor="audio" className="block text-sm font-medium text-gray-700 mb-2">
                  Audio
                </label>
                <input
                  type="text"
                  id="audio"
                  name="audio"
                  value={formData.audio || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="audio_uitleg" className="block text-sm font-medium text-gray-700 mb-2">
                  Audio Uitleg
                </label>
                <input
                  type="text"
                  id="audio_uitleg"
                  name="audio_uitleg"
                  value={formData.audio_uitleg || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="produce_audio" className="block text-sm font-medium text-gray-700 mb-2">
                  Produce Audio
                </label>
                <input
                  type="text"
                  id="produce_audio"
                  name="produce_audio"
                  value={formData.produce_audio || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="example_words_audio" className="block text-sm font-medium text-gray-700 mb-2">
                  Voorbeeldwoorden Audio
                </label>
                <input
                  type="text"
                  id="example_words_audio"
                  name="example_words_audio"
                  value={formData.example_words_audio || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {activeTab === 'visual' && (
            <>
              <div>
                <label htmlFor="imageWord" className="block text-sm font-medium text-gray-700 mb-2">
                  Afbeelding Woord
                </label>
                <input
                  type="text"
                  id="imageWord"
                  name="imageWord"
                  value={formData.imageWord || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="imageTool" className="block text-sm font-medium text-gray-700 mb-2">
                  Afbeelding Tool
                </label>
                <input
                  type="text"
                  id="imageTool"
                  name="imageTool"
                  value={formData.imageTool || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="example_words_images" className="block text-sm font-medium text-gray-700 mb-2">
                  Voorbeeldwoorden Afbeeldingen
                </label>
                <input
                  type="text"
                  id="example_words_images"
                  name="example_words_images"
                  value={formData.example_words_images || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="blockRepresentation" className="block text-sm font-medium text-gray-700 mb-2">
                  Blok Representatie
                </label>
                <input
                  type="text"
                  id="blockRepresentation"
                  name="blockRepresentation"
                  value={formData.blockRepresentation || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="tool" className="block text-sm font-medium text-gray-700 mb-2">
                  Tool
                </label>
                <input
                  type="text"
                  id="tool"
                  name="tool"
                  value={formData.tool || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="tool_uitleg" className="block text-sm font-medium text-gray-700 mb-2">
                  Tool Uitleg
                </label>
                <input
                  type="text"
                  id="tool_uitleg"
                  name="tool_uitleg"
                  value={formData.tool_uitleg || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {activeTab === 'phonetic' && (
            <>
              <div>
                <label htmlFor="fonetiek" className="block text-sm font-medium text-gray-700 mb-2">
                  Fonetiek
                </label>
                <textarea
                  id="fonetiek"
                  name="fonetiek"
                  value={formData.fonetiek || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="klinktals" className="block text-sm font-medium text-gray-700 mb-2">
                  Klinktals
                </label>
                <input
                  type="text"
                  id="klinktals"
                  name="klinktals"
                  value={formData.klinktals || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="articulation" className="block text-sm font-medium text-gray-700 mb-2">
                  Articulatie
                </label>
                <input
                  type="text"
                  id="articulation"
                  name="articulation"
                  value={formData.articulation || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="length_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Lengte Type
                  </label>
                  <input
                    type="text"
                    id="length_type"
                    name="length_type"
                    value={formData.length_type || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="voice" className="block text-sm font-medium text-gray-700 mb-2">
                    Stem
                  </label>
                  <input
                    type="text"
                    id="voice"
                    name="voice"
                    value={formData.voice || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Locatie
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="lippen" className="block text-sm font-medium text-gray-700 mb-2">
                    Lippen
                  </label>
                  <input
                    type="text"
                    id="lippen"
                    name="lippen"
                    value={formData.lippen || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="kaak" className="block text-sm font-medium text-gray-700 mb-2">
                    Kaak
                  </label>
                  <input
                    type="text"
                    id="kaak"
                    name="kaak"
                    value={formData.kaak || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'advanced' && (
            <>
              <div>
                <label htmlFor="example_words" className="block text-sm font-medium text-gray-700 mb-2">
                  Voorbeeldwoorden
                </label>
                <textarea
                  id="example_words"
                  name="example_words"
                  value={formData.example_words || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="klankzuiver" className="block text-sm font-medium text-gray-700 mb-2">
                  Klankzuiver
                </label>
                <textarea
                  id="klankzuiver"
                  name="klankzuiver"
                  value={formData.klankzuiver || ''}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="verenkelen" className="block text-sm font-medium text-gray-700 mb-2">
                    Verenkelen
                  </label>
                  <textarea
                    id="verenkelen"
                    name="verenkelen"
                    value={formData.verenkelen || ''}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="verdubbelen" className="block text-sm font-medium text-gray-700 mb-2">
                    Verdubbelen
                  </label>
                  <textarea
                    id="verdubbelen"
                    name="verdubbelen"
                    value={formData.verdubbelen || ''}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="speciale_tekens" className="block text-sm font-medium text-gray-700 mb-2">
                  Speciale Tekens
                </label>
                <textarea
                  id="speciale_tekens"
                  name="speciale_tekens"
                  value={formData.speciale_tekens || ''}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
