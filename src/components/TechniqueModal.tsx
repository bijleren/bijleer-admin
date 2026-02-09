import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface TechniqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (technique: TechniqueFormData) => Promise<void>;
  technique: Technique | null;
  categories: Category[];
  ageGroups: AgeGroup[];
  subjects: Subject[];
  materials: Material[];
}

export interface Technique {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  photo_url: string | null;
  student_video_url: string | null;
  teacher_video_url: string | null;
  external_links: ExternalLink[] | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  category_ids?: string[];
  age_group_ids?: string[];
  subject_ids?: string[];
  material_ids?: string[];
}

export interface TechniqueFormData {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  photo_url: string;
  student_video_url: string;
  teacher_video_url: string;
  external_links: ExternalLink[];
  is_active: boolean;
  category_ids: string[];
  age_group_ids: string[];
  subject_ids: string[];
  material_ids: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface AgeGroup {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Subject {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Material {
  id: string;
  name: string;
  is_active: boolean;
}

interface ExternalLink {
  title: string;
  url: string;
}

export default function TechniqueModal({
  isOpen,
  onClose,
  onSave,
  technique,
  categories,
  ageGroups,
  subjects,
  materials,
}: TechniqueModalProps) {
  const [formData, setFormData] = useState<TechniqueFormData>({
    title: '',
    subtitle: '',
    description: '',
    photo_url: '',
    student_video_url: '',
    teacher_video_url: '',
    external_links: [],
    is_active: true,
    category_ids: [],
    age_group_ids: [],
    subject_ids: [],
    material_ids: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (technique) {
      setFormData({
        id: technique.id,
        title: technique.title,
        subtitle: technique.subtitle || '',
        description: technique.description,
        photo_url: technique.photo_url || '',
        student_video_url: technique.student_video_url || '',
        teacher_video_url: technique.teacher_video_url || '',
        external_links: technique.external_links || [],
        is_active: technique.is_active,
        category_ids: technique.category_ids || [],
        age_group_ids: technique.age_group_ids || [],
        subject_ids: technique.subject_ids || [],
        material_ids: technique.material_ids || [],
      });
    } else {
      setFormData({
        title: '',
        subtitle: '',
        description: '',
        photo_url: '',
        student_video_url: '',
        teacher_video_url: '',
        external_links: [],
        is_active: true,
        category_ids: [],
        age_group_ids: [],
        subject_ids: [],
        material_ids: [],
      });
    }
  }, [technique]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const toggleSelection = (id: string, field: 'category_ids' | 'age_group_ids' | 'subject_ids' | 'material_ids') => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter((item) => item !== id)
        : [...prev[field], id],
    }));
  };

  const addExternalLink = () => {
    setFormData((prev) => ({
      ...prev,
      external_links: [...prev.external_links, { title: '', url: '' }],
    }));
  };

  const removeExternalLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      external_links: prev.external_links.filter((_, i) => i !== index),
    }));
  };

  const updateExternalLink = (index: number, field: 'title' | 'url', value: string) => {
    setFormData((prev) => ({
      ...prev,
      external_links: prev.external_links.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      ),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {technique ? 'Techniek bewerken' : 'Nieuwe techniek toevoegen'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titel *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subtitel
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschrijving *
              </label>
              <textarea
                required
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto URL
              </label>
              <input
                type="url"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video URL (Studenten)
              </label>
              <input
                type="url"
                value={formData.student_video_url}
                onChange={(e) => setFormData({ ...formData, student_video_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video URL (Leraren)
              </label>
              <input
                type="url"
                value={formData.teacher_video_url}
                onChange={(e) => setFormData({ ...formData, teacher_video_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Externe Links
              </label>
              <button
                type="button"
                onClick={addExternalLink}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Link toevoegen
              </button>
            </div>
            <div className="space-y-3">
              {formData.external_links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Titel"
                    value={link.title}
                    onChange={(e) => updateExternalLink(index, 'title', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) => updateExternalLink(index, 'url', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removeExternalLink(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Categorieën
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleSelection(category.id, 'category_ids')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.category_ids.includes(category.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Leeftijdsgroepen
            </label>
            <div className="flex flex-wrap gap-2">
              {ageGroups.filter(ag => ag.is_active).map((ageGroup) => (
                <button
                  key={ageGroup.id}
                  type="button"
                  onClick={() => toggleSelection(ageGroup.id, 'age_group_ids')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.age_group_ids.includes(ageGroup.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {ageGroup.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Vakken
            </label>
            <div className="flex flex-wrap gap-2">
              {subjects.filter(s => s.is_active).map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => toggleSelection(subject.id, 'subject_ids')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.subject_ids.includes(subject.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {subject.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Materialen
            </label>
            <div className="flex flex-wrap gap-2">
              {materials.filter(m => m.is_active).map((material) => (
                <button
                  key={material.id}
                  type="button"
                  onClick={() => toggleSelection(material.id, 'material_ids')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.material_ids.includes(material.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {material.name}
                </button>
              ))}
            </div>
          </div>

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
            </label>
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
