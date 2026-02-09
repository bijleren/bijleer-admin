import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface DigiToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tool: DigiToolFormData) => Promise<void>;
  tool: DigiTool | null;
}

export interface DigiTool {
  id: string;
  title: string;
  description: string;
  screenshot_url: string;
  link: string;
  is_beta: boolean;
  is_new: boolean;
  is_active: boolean;
  visible_to_users: boolean;
  requires_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface DigiToolFormData {
  id?: string;
  title: string;
  description: string;
  screenshot_url: string;
  link: string;
  is_beta: boolean;
  is_new: boolean;
  is_active: boolean;
  visible_to_users: boolean;
  requires_premium: boolean;
}

export default function DigiToolModal({
  isOpen,
  onClose,
  onSave,
  tool,
}: DigiToolModalProps) {
  const [formData, setFormData] = useState<DigiToolFormData>({
    title: '',
    description: '',
    screenshot_url: '',
    link: '',
    is_beta: false,
    is_new: false,
    is_active: true,
    visible_to_users: true,
    requires_premium: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tool) {
      setFormData({
        id: tool.id,
        title: tool.title,
        description: tool.description,
        screenshot_url: tool.screenshot_url,
        link: tool.link,
        is_beta: tool.is_beta,
        is_new: tool.is_new,
        is_active: tool.is_active,
        visible_to_users: tool.visible_to_users,
        requires_premium: tool.requires_premium,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        screenshot_url: '',
        link: '',
        is_beta: false,
        is_new: false,
        is_active: true,
        visible_to_users: true,
        requires_premium: false,
      });
    }
  }, [tool]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {tool ? 'DigiTool bewerken' : 'Nieuwe DigiTool toevoegen'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titel *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Naam van de tool"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschrijving *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Korte beschrijving van de tool"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link *
            </label>
            <input
              type="url"
              required
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Screenshot URL *
            </label>
            <input
              type="url"
              required
              value={formData.screenshot_url}
              onChange={(e) => setFormData({ ...formData, screenshot_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://..."
            />
            {formData.screenshot_url && (
              <div className="mt-3">
                <img
                  src={formData.screenshot_url}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status & Toegang</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Actief
                  <span className="block text-xs text-gray-500 font-normal">
                    Tool is beschikbaar in het systeem
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="visible_to_users"
                  checked={formData.visible_to_users}
                  onChange={(e) => setFormData({ ...formData, visible_to_users: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="visible_to_users" className="text-sm font-medium text-gray-700">
                  Zichtbaar voor gebruikers
                  <span className="block text-xs text-gray-500 font-normal">
                    Reguliere gebruikers kunnen deze tool zien
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requires_premium"
                  checked={formData.requires_premium}
                  onChange={(e) => setFormData({ ...formData, requires_premium: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="requires_premium" className="text-sm font-medium text-gray-700">
                  Vereist Premium School
                  <span className="block text-xs text-gray-500 font-normal">
                    Alleen beschikbaar voor premium scholen
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_beta"
                  checked={formData.is_beta}
                  onChange={(e) => setFormData({ ...formData, is_beta: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_beta" className="text-sm font-medium text-gray-700">
                  Beta versie
                  <span className="block text-xs text-gray-500 font-normal">
                    Toon BETA badge
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_new"
                  checked={formData.is_new}
                  onChange={(e) => setFormData({ ...formData, is_new: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_new" className="text-sm font-medium text-gray-700">
                  Nieuw
                  <span className="block text-xs text-gray-500 font-normal">
                    Toon NIEUW badge
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
