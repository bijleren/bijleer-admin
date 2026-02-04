import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface WordFrequency {
  id?: number;
  word: string;
  klankteken?: string;
  klankgroepen?: string;
  klankgroepenklanken?: string;
  aantal_klankgroepen?: number;
  samenstelling?: string;
  frequency?: number;
  created_at?: string;
  updated_at?: string;
  audio?: string;
  audio_file?: string;
  image?: string;
  image_file?: string;
  klankteken_checked?: number;
  klankteken_tobechecked?: number;
  image_checked?: number;
  klankgroepen_checked?: number;
  opmerking?: string;
  betekenis?: string;
  lidwoord?: string;
  woordsoort_id?: number;
  vergrotende_trap_id?: number;
  overtreffende_trap_id?: number;
  forbidden?: number;
  aantal_klinkers?: number;
  klankzuiver?: number;
  woordstructuur?: string;
  aantal_karakters?: number;
  capitalized?: number;
  has_multiple_meanings?: number;
  verb_id?: number;
  verb_form?: string;
  frequency_norm?: number;
  concreteness?: number;
  betekenis_check?: number;
  addition_front?: string;
  addition_back?: string;
  deletion_front?: string;
  deletion_back?: string;
  substitute_front?: string;
  substitute_back?: string;
  substitute_middle?: string;
  audio_checked?: number;
  klankgroup_checked?: number;
}

interface WordFrequencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (word: WordFrequency) => Promise<void>;
  word?: WordFrequency | null;
}

export default function WordFrequencyModal({ isOpen, onClose, onSave, word }: WordFrequencyModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'phonetic' | 'grammar' | 'media' | 'checks' | 'advanced'>('basic');
  const [formData, setFormData] = useState<WordFrequency>({
    word: '',
    klankteken: '',
    frequency: 1,
    aantal_klankgroepen: 1,
    forbidden: 0,
    has_multiple_meanings: 0,
    klankgroup_checked: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (word) {
      setFormData(word);
    } else {
      setFormData({
        word: '',
        klankteken: '',
        frequency: 1,
        aantal_klankgroepen: 1,
        forbidden: 0,
        has_multiple_meanings: 0,
        klankgroup_checked: 0,
      });
    }
  }, [word, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving word:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    setFormData({
      ...formData,
      [name]: type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {word ? 'Woord Bewerken' : 'Nieuw Woord'}
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
              onClick={() => setActiveTab('grammar')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'grammar'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Grammatica
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'media'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Media
            </button>
            <button
              onClick={() => setActiveTab('checks')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'checks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Controles
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
                  <label htmlFor="word" className="block text-sm font-medium text-gray-700 mb-2">
                    Woord *
                  </label>
                  <input
                    type="text"
                    id="word"
                    name="word"
                    value={formData.word}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
                    Frequentie
                  </label>
                  <input
                    type="number"
                    id="frequency"
                    name="frequency"
                    value={formData.frequency || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="betekenis" className="block text-sm font-medium text-gray-700 mb-2">
                  Betekenis
                </label>
                <textarea
                  id="betekenis"
                  name="betekenis"
                  value={formData.betekenis || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="opmerking" className="block text-sm font-medium text-gray-700 mb-2">
                  Opmerking
                </label>
                <textarea
                  id="opmerking"
                  name="opmerking"
                  value={formData.opmerking || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="frequency_norm" className="block text-sm font-medium text-gray-700 mb-2">
                    Frequentie Norm
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="frequency_norm"
                    name="frequency_norm"
                    value={formData.frequency_norm || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="concreteness" className="block text-sm font-medium text-gray-700 mb-2">
                    Concreetheid
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="concreteness"
                    name="concreteness"
                    value={formData.concreteness || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="forbidden" className="block text-sm font-medium text-gray-700 mb-2">
                    Verboden
                  </label>
                  <input
                    type="number"
                    id="forbidden"
                    name="forbidden"
                    value={formData.forbidden || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'phonetic' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="klankteken" className="block text-sm font-medium text-gray-700 mb-2">
                    Klankteken
                  </label>
                  <input
                    type="text"
                    id="klankteken"
                    name="klankteken"
                    value={formData.klankteken || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="klankgroepen" className="block text-sm font-medium text-gray-700 mb-2">
                    Klankgroepen
                  </label>
                  <input
                    type="text"
                    id="klankgroepen"
                    name="klankgroepen"
                    value={formData.klankgroepen || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="klankgroepenklanken" className="block text-sm font-medium text-gray-700 mb-2">
                  Klankgroepen Klanken
                </label>
                <input
                  type="text"
                  id="klankgroepenklanken"
                  name="klankgroepenklanken"
                  value={formData.klankgroepenklanken || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label htmlFor="aantal_klankgroepen" className="block text-sm font-medium text-gray-700 mb-2">
                    Aantal Klankgroepen
                  </label>
                  <input
                    type="number"
                    id="aantal_klankgroepen"
                    name="aantal_klankgroepen"
                    value={formData.aantal_klankgroepen || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="aantal_klinkers" className="block text-sm font-medium text-gray-700 mb-2">
                    Aantal Klinkers
                  </label>
                  <input
                    type="number"
                    id="aantal_klinkers"
                    name="aantal_klinkers"
                    value={formData.aantal_klinkers || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="aantal_karakters" className="block text-sm font-medium text-gray-700 mb-2">
                    Aantal Karakters
                  </label>
                  <input
                    type="number"
                    id="aantal_karakters"
                    name="aantal_karakters"
                    value={formData.aantal_karakters || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="klankzuiver" className="block text-sm font-medium text-gray-700 mb-2">
                    Klankzuiver
                  </label>
                  <input
                    type="number"
                    id="klankzuiver"
                    name="klankzuiver"
                    value={formData.klankzuiver || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="samenstelling" className="block text-sm font-medium text-gray-700 mb-2">
                    Samenstelling
                  </label>
                  <input
                    type="text"
                    id="samenstelling"
                    name="samenstelling"
                    value={formData.samenstelling || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="woordstructuur" className="block text-sm font-medium text-gray-700 mb-2">
                    Woordstructuur
                  </label>
                  <input
                    type="text"
                    id="woordstructuur"
                    name="woordstructuur"
                    value={formData.woordstructuur || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'grammar' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lidwoord" className="block text-sm font-medium text-gray-700 mb-2">
                    Lidwoord
                  </label>
                  <input
                    type="text"
                    id="lidwoord"
                    name="lidwoord"
                    value={formData.lidwoord || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="woordsoort_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Woordsoort ID
                  </label>
                  <input
                    type="number"
                    id="woordsoort_id"
                    name="woordsoort_id"
                    value={formData.woordsoort_id || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="vergrotende_trap_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Vergrotende Trap ID
                  </label>
                  <input
                    type="number"
                    id="vergrotende_trap_id"
                    name="vergrotende_trap_id"
                    value={formData.vergrotende_trap_id || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="overtreffende_trap_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Overtreffende Trap ID
                  </label>
                  <input
                    type="number"
                    id="overtreffende_trap_id"
                    name="overtreffende_trap_id"
                    value={formData.overtreffende_trap_id || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="verb_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Werkwoord ID
                  </label>
                  <input
                    type="number"
                    id="verb_id"
                    name="verb_id"
                    value={formData.verb_id || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="verb_form" className="block text-sm font-medium text-gray-700 mb-2">
                    Werkwoordvorm
                  </label>
                  <input
                    type="text"
                    id="verb_form"
                    name="verb_form"
                    value={formData.verb_form || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="has_multiple_meanings" className="block text-sm font-medium text-gray-700 mb-2">
                    Meerdere Betekenissen
                  </label>
                  <input
                    type="number"
                    id="has_multiple_meanings"
                    name="has_multiple_meanings"
                    value={formData.has_multiple_meanings || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="capitalized" className="block text-sm font-medium text-gray-700 mb-2">
                  Hoofdletter
                </label>
                <input
                  type="number"
                  id="capitalized"
                  name="capitalized"
                  value={formData.capitalized || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {activeTab === 'media' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                    Afbeelding URL
                  </label>
                  <input
                    type="text"
                    id="image"
                    name="image"
                    value={formData.image || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="image_file" className="block text-sm font-medium text-gray-700 mb-2">
                    Afbeelding Bestand
                  </label>
                  <input
                    type="text"
                    id="image_file"
                    name="image_file"
                    value={formData.image_file || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="audio" className="block text-sm font-medium text-gray-700 mb-2">
                    Audio URL
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
                  <label htmlFor="audio_file" className="block text-sm font-medium text-gray-700 mb-2">
                    Audio Bestand
                  </label>
                  <input
                    type="text"
                    id="audio_file"
                    name="audio_file"
                    value={formData.audio_file || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'checks' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="klankteken_checked" className="block text-sm font-medium text-gray-700 mb-2">
                    Klankteken Gecontroleerd
                  </label>
                  <input
                    type="number"
                    id="klankteken_checked"
                    name="klankteken_checked"
                    value={formData.klankteken_checked || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="klankteken_tobechecked" className="block text-sm font-medium text-gray-700 mb-2">
                    Klankteken Te Controleren
                  </label>
                  <input
                    type="number"
                    id="klankteken_tobechecked"
                    name="klankteken_tobechecked"
                    value={formData.klankteken_tobechecked || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="image_checked" className="block text-sm font-medium text-gray-700 mb-2">
                    Afbeelding Gecontroleerd
                  </label>
                  <input
                    type="number"
                    id="image_checked"
                    name="image_checked"
                    value={formData.image_checked || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="klankgroepen_checked" className="block text-sm font-medium text-gray-700 mb-2">
                    Klankgroepen Gecontroleerd
                  </label>
                  <input
                    type="number"
                    id="klankgroepen_checked"
                    name="klankgroepen_checked"
                    value={formData.klankgroepen_checked || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="audio_checked" className="block text-sm font-medium text-gray-700 mb-2">
                    Audio Gecontroleerd
                  </label>
                  <input
                    type="number"
                    id="audio_checked"
                    name="audio_checked"
                    value={formData.audio_checked || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="betekenis_check" className="block text-sm font-medium text-gray-700 mb-2">
                    Betekenis Controle
                  </label>
                  <input
                    type="number"
                    id="betekenis_check"
                    name="betekenis_check"
                    value={formData.betekenis_check || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="klankgroup_checked" className="block text-sm font-medium text-gray-700 mb-2">
                  Klankgroep Gecontroleerd
                </label>
                <input
                  type="number"
                  id="klankgroup_checked"
                  name="klankgroup_checked"
                  value={formData.klankgroup_checked || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {activeTab === 'advanced' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="addition_front" className="block text-sm font-medium text-gray-700 mb-2">
                    Toevoeging Voor
                  </label>
                  <input
                    type="text"
                    id="addition_front"
                    name="addition_front"
                    value={formData.addition_front || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="addition_back" className="block text-sm font-medium text-gray-700 mb-2">
                    Toevoeging Achter
                  </label>
                  <input
                    type="text"
                    id="addition_back"
                    name="addition_back"
                    value={formData.addition_back || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="substitute_middle" className="block text-sm font-medium text-gray-700 mb-2">
                    Vervanging Midden
                  </label>
                  <input
                    type="text"
                    id="substitute_middle"
                    name="substitute_middle"
                    value={formData.substitute_middle || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="substitute_front" className="block text-sm font-medium text-gray-700 mb-2">
                    Vervanging Voor
                  </label>
                  <input
                    type="text"
                    id="substitute_front"
                    name="substitute_front"
                    value={formData.substitute_front || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="substitute_back" className="block text-sm font-medium text-gray-700 mb-2">
                    Vervanging Achter
                  </label>
                  <input
                    type="text"
                    id="substitute_back"
                    name="substitute_back"
                    value={formData.substitute_back || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="deletion_front" className="block text-sm font-medium text-gray-700 mb-2">
                    Verwijdering Voor
                  </label>
                  <input
                    type="text"
                    id="deletion_front"
                    name="deletion_front"
                    value={formData.deletion_front || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="deletion_back" className="block text-sm font-medium text-gray-700 mb-2">
                    Verwijdering Achter
                  </label>
                  <input
                    type="text"
                    id="deletion_back"
                    name="deletion_back"
                    value={formData.deletion_back || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
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
              {loading ? 'Opslaan...' : word ? 'Opslaan' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
