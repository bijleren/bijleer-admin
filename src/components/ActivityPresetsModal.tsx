import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ActivityPreset {
  id?: number;
  school_id?: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  max_students: number;
  is_default: boolean;
  goal_codes: string[];
  created_at?: string;
}

interface ActivityPresetsModalProps {
  onClose: () => void;
  onSave: () => void;
}

export default function ActivityPresetsModal({ onClose, onSave }: ActivityPresetsModalProps) {
  const [presets, setPresets] = useState<ActivityPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<ActivityPreset>({
    name: '',
    description: '',
    icon: 'Grid',
    color: '#6B7280',
    max_students: 4,
    is_default: false,
    goal_codes: [],
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const availableIcons = ['Grid', 'Users', 'BookOpen', 'Pencil', 'Clock', 'Star', 'Heart', 'Music'];
  const availableColors = [
    { name: 'Grijs', value: '#6B7280' },
    { name: 'Blauw', value: '#3B82F6' },
    { name: 'Groen', value: '#10B981' },
    { name: 'Rood', value: '#EF4444' },
    { name: 'Geel', value: '#F59E0B' },
    { name: 'Paars', value: '#8B5CF6' },
    { name: 'Roze', value: '#EC4899' },
    { name: 'Oranje', value: '#F97316' },
  ];

  const fetchPresets = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_presets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPresets(data || []);
    } catch (error) {
      console.error('Error fetching presets:', error);
      showNotification('error', 'Fout bij ophalen voorinstellingen');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      description: '',
      icon: 'Grid',
      color: '#6B7280',
      max_students: 4,
      is_default: false,
      goal_codes: [],
    });
  };

  const handleEdit = (preset: ActivityPreset) => {
    setEditingId(preset.id || null);
    setIsCreating(false);
    setFormData({
      name: preset.name,
      description: preset.description,
      icon: preset.icon,
      color: preset.color,
      max_students: preset.max_students,
      is_default: preset.is_default,
      goal_codes: preset.goal_codes || [],
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({
      name: '',
      description: '',
      icon: 'Grid',
      color: '#6B7280',
      max_students: 4,
      is_default: false,
      goal_codes: [],
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showNotification('error', 'Naam is verplicht');
      return;
    }

    if (formData.max_students < 1) {
      showNotification('error', 'Max studenten moet minimaal 1 zijn');
      return;
    }

    setSaving(true);
    try {
      if (isCreating) {
        const { error } = await supabase
          .from('activity_presets')
          .insert([{
            name: formData.name.trim(),
            description: formData.description.trim(),
            icon: formData.icon,
            color: formData.color,
            max_students: formData.max_students,
            is_default: formData.is_default,
            goal_codes: formData.goal_codes,
          }]);

        if (error) throw error;
        showNotification('success', 'Voorinstelling succesvol aangemaakt');
      } else if (editingId) {
        const { error } = await supabase
          .from('activity_presets')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim(),
            icon: formData.icon,
            color: formData.color,
            max_students: formData.max_students,
            is_default: formData.is_default,
            goal_codes: formData.goal_codes,
          })
          .eq('id', editingId);

        if (error) throw error;
        showNotification('success', 'Voorinstelling succesvol bijgewerkt');
      }

      await fetchPresets();
      handleCancel();
    } catch (error) {
      console.error('Error saving preset:', error);
      showNotification('error', 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Weet je zeker dat je deze voorinstelling wilt verwijderen?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('activity_presets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showNotification('success', 'Voorinstelling succesvol verwijderd');
      await fetchPresets();
    } catch (error) {
      console.error('Error deleting preset:', error);
      showNotification('error', 'Fout bij verwijderen');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Voorinstellingen Beheren</h2>
            <p className="text-sm text-gray-600 mt-1">
              Maak sjablonen voor veelgebruikte activiteiten
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isCreating && !editingId && (
              <button
                onClick={handleCreate}
                disabled={saving || deletingId !== null}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Nieuwe Voorinstelling
              </button>
            )}
            <button
              onClick={onClose}
              disabled={saving || deletingId !== null}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {notification && (
          <div
            className={`mx-6 mt-4 p-4 rounded-lg ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {notification.message}
          </div>
        )}

        <div className="p-6 space-y-6">
          {(isCreating || editingId) && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                {isCreating ? 'Nieuwe Voorinstelling' : 'Voorinstelling Bewerken'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Naam *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Bijv. Lezen"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Studenten
                  </label>
                  <input
                    type="number"
                    value={formData.max_students}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value > 0) {
                        setFormData({ ...formData, max_students: value });
                      } else if (e.target.value === '') {
                        setFormData({ ...formData, max_students: 1 });
                      }
                    }}
                    min="1"
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschrijving
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Korte beschrijving van de activiteit..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icoon
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {availableIcons.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kleur
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {availableColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        disabled={saving}
                        className={`p-3 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          formData.color === color.value
                            ? 'border-gray-900 scale-105'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                      disabled={saving}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Standaard beschikbaar voor alle scholen
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900">Bestaande Voorinstellingen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-4 bg-white border-2 rounded-lg hover:shadow-md transition-shadow"
                    style={{ borderColor: preset.color }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{preset.name}</h4>
                        {preset.description && (
                          <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                        )}
                      </div>
                      {preset.is_default && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                          Standaard
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <span>Max {preset.max_students} studenten</span>
                      <span>•</span>
                      <span>{preset.icon}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(preset)}
                        disabled={deletingId === preset.id || saving}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Edit2 className="w-4 h-4" />
                        Bewerken
                      </button>
                      <button
                        onClick={() => preset.id && handleDelete(preset.id)}
                        disabled={deletingId === preset.id || saving}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {presets.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <p>Nog geen voorinstellingen aangemaakt</p>
                    <p className="text-sm mt-1">Klik op "Nieuwe Voorinstelling" om te beginnen</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              onSave();
              onClose();
            }}
            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}
