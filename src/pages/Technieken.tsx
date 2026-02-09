import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lightbulb, Edit2, Trash2, Search, Plus, Eye, EyeOff, AlertTriangle, X, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import TechniqueModal, { Technique, TechniqueFormData, Category, AgeGroup, Subject, Material } from '../components/TechniqueModal';

interface TechniqueWithRelations extends Technique {
  categories: Category[];
  age_groups: AgeGroup[];
  subjects: Subject[];
  materials: Material[];
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

export default function Technieken() {
  const [techniques, setTechniques] = useState<TechniqueWithRelations[]>([]);
  const [filteredTechniques, setFilteredTechniques] = useState<TechniqueWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; techniqueId: string | null; title: string }>({
    show: false,
    techniqueId: null,
    title: '',
  });
  const [notification, setNotification] = useState<Notification | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>('all');

  useEffect(() => {
    fetchReferenceData();
    fetchTechniques();
  }, []);

  useEffect(() => {
    let filtered = techniques;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((technique) =>
        technique.categories.some((cat) => cat.id === categoryFilter)
      );
    }

    if (ageGroupFilter !== 'all') {
      filtered = filtered.filter((technique) =>
        technique.age_groups.some((ag) => ag.id === ageGroupFilter)
      );
    }

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(
        (technique) =>
          technique.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          technique.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (technique.subtitle && technique.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredTechniques(filtered);
  }, [searchQuery, techniques, categoryFilter, ageGroupFilter]);

  const fetchReferenceData = async () => {
    try {
      const [categoriesRes, ageGroupsRes, subjectsRes, materialsRes] = await Promise.all([
        supabase.from('technique_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('age_groups').select('*').order('sort_order'),
        supabase.from('subjects').select('*').order('sort_order'),
        supabase.from('materials').select('*').order('sort_order'),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (ageGroupsRes.error) throw ageGroupsRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (materialsRes.error) throw materialsRes.error;

      setCategories(categoriesRes.data || []);
      setAgeGroups(ageGroupsRes.data || []);
      setSubjects(subjectsRes.data || []);
      setMaterials(materialsRes.data || []);
    } catch (error) {
      console.error('Error fetching reference data:', error);
      showNotification('error', 'Fout bij het ophalen van referentiegegevens');
    }
  };

  const fetchTechniques = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teaching_techniques')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const techniquesWithRelations = await Promise.all(
        (data || []).map(async (technique) => {
          const [categoriesRes, ageGroupsRes, subjectsRes, materialsRes] = await Promise.all([
            supabase
              .from('teaching_technique_categories')
              .select('category:technique_categories(*)')
              .eq('technique_id', technique.id),
            supabase
              .from('teaching_technique_age_groups')
              .select('age_group:age_groups(*)')
              .eq('technique_id', technique.id),
            supabase
              .from('teaching_technique_subjects')
              .select('subject:subjects(*)')
              .eq('technique_id', technique.id),
            supabase
              .from('teaching_technique_materials')
              .select('material:materials(*)')
              .eq('technique_id', technique.id),
          ]);

          return {
            ...technique,
            categories: (categoriesRes.data || []).map((c: any) => c.category).filter(Boolean),
            age_groups: (ageGroupsRes.data || []).map((a: any) => a.age_group).filter(Boolean),
            subjects: (subjectsRes.data || []).map((s: any) => s.subject).filter(Boolean),
            materials: (materialsRes.data || []).map((m: any) => m.material).filter(Boolean),
          };
        })
      );

      setTechniques(techniquesWithRelations);
      setFilteredTechniques(techniquesWithRelations);
    } catch (error) {
      console.error('Error fetching techniques:', error);
      showNotification('error', 'Fout bij het ophalen van technieken');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleEdit = (technique: TechniqueWithRelations) => {
    setSelectedTechnique({
      ...technique,
      category_ids: technique.categories.map((c) => c.id),
      age_group_ids: technique.age_groups.map((a) => a.id),
      subject_ids: technique.subjects.map((s) => s.id),
      material_ids: technique.materials.map((m) => m.id),
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (technique: TechniqueWithRelations) => {
    setDeleteConfirm({
      show: true,
      techniqueId: technique.id,
      title: technique.title,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.techniqueId) return;

    try {
      await Promise.all([
        supabase.from('teaching_technique_categories').delete().eq('technique_id', deleteConfirm.techniqueId),
        supabase.from('teaching_technique_age_groups').delete().eq('technique_id', deleteConfirm.techniqueId),
        supabase.from('teaching_technique_subjects').delete().eq('technique_id', deleteConfirm.techniqueId),
        supabase.from('teaching_technique_materials').delete().eq('technique_id', deleteConfirm.techniqueId),
      ]);

      const { error } = await supabase
        .from('teaching_techniques')
        .delete()
        .eq('id', deleteConfirm.techniqueId);

      if (error) throw error;

      await fetchTechniques();
      showNotification('success', 'Techniek succesvol verwijderd');
    } catch (error) {
      console.error('Error deleting technique:', error);
      showNotification('error', 'Er is een fout opgetreden bij het verwijderen van de techniek.');
    } finally {
      setDeleteConfirm({ show: false, techniqueId: null, title: '' });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, techniqueId: null, title: '' });
  };

  const handleSave = async (formData: TechniqueFormData) => {
    try {
      const techniqueData = {
        title: formData.title,
        subtitle: formData.subtitle || null,
        description: formData.description,
        photo_url: formData.photo_url || null,
        student_video_url: formData.student_video_url || null,
        teacher_video_url: formData.teacher_video_url || null,
        external_links: formData.external_links.length > 0 ? formData.external_links : null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      let techniqueId = formData.id;

      if (formData.id) {
        const { error } = await supabase
          .from('teaching_techniques')
          .update(techniqueData)
          .eq('id', formData.id);

        if (error) throw error;

        await Promise.all([
          supabase.from('teaching_technique_categories').delete().eq('technique_id', formData.id),
          supabase.from('teaching_technique_age_groups').delete().eq('technique_id', formData.id),
          supabase.from('teaching_technique_subjects').delete().eq('technique_id', formData.id),
          supabase.from('teaching_technique_materials').delete().eq('technique_id', formData.id),
        ]);
      } else {
        const { data, error } = await supabase
          .from('teaching_techniques')
          .insert([techniqueData])
          .select()
          .single();

        if (error) throw error;
        techniqueId = data.id;
      }

      if (techniqueId) {
        const inserts = [
          ...formData.category_ids.map((id) => ({ technique_id: techniqueId, category_id: id })),
          ...formData.age_group_ids.map((id) => ({ technique_id: techniqueId, age_group_id: id })),
          ...formData.subject_ids.map((id) => ({ technique_id: techniqueId, subject_id: id })),
          ...formData.material_ids.map((id) => ({ technique_id: techniqueId, material_id: id })),
        ];

        await Promise.all([
          formData.category_ids.length > 0
            ? supabase.from('teaching_technique_categories').insert(
                formData.category_ids.map((id) => ({ technique_id: techniqueId, category_id: id }))
              )
            : Promise.resolve(),
          formData.age_group_ids.length > 0
            ? supabase.from('teaching_technique_age_groups').insert(
                formData.age_group_ids.map((id) => ({ technique_id: techniqueId, age_group_id: id }))
              )
            : Promise.resolve(),
          formData.subject_ids.length > 0
            ? supabase.from('teaching_technique_subjects').insert(
                formData.subject_ids.map((id) => ({ technique_id: techniqueId, subject_id: id }))
              )
            : Promise.resolve(),
          formData.material_ids.length > 0
            ? supabase.from('teaching_technique_materials').insert(
                formData.material_ids.map((id) => ({ technique_id: techniqueId, material_id: id }))
              )
            : Promise.resolve(),
        ]);
      }

      await fetchTechniques();
      setIsModalOpen(false);
      setSelectedTechnique(null);
      showNotification('success', formData.id ? 'Techniek succesvol bijgewerkt' : 'Techniek succesvol aangemaakt');
    } catch (error) {
      console.error('Error saving technique:', error);
      showNotification('error', 'Er is een fout opgetreden bij het opslaan van de techniek.');
      throw error;
    }
  };

  const handleAddNew = () => {
    setSelectedTechnique(null);
    setIsModalOpen(true);
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Didactische Technieken</h1>
          <p className="text-gray-600 mt-1">
            Beheer didactische technieken ({techniques.length} totaal)
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nieuwe Techniek
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek technieken..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Categorie:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Alle</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Leeftijd:</span>
              <select
                value={ageGroupFilter}
                onChange={(e) => setAgeGroupFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Alle</option>
                {ageGroups.filter(ag => ag.is_active).map((ageGroup) => (
                  <option key={ageGroup.id} value={ageGroup.id}>
                    {ageGroup.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredTechniques.length === 0 ? (
          <div className="p-12 text-center">
            <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || categoryFilter !== 'all' || ageGroupFilter !== 'all'
                ? 'Geen resultaten gevonden'
                : 'Geen technieken beschikbaar'}
            </h3>
            <p className="text-gray-500">
              {searchQuery || categoryFilter !== 'all' || ageGroupFilter !== 'all'
                ? 'Probeer een andere zoekterm of filter.'
                : 'Klik op "Nieuwe Techniek" om te beginnen.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredTechniques.map((technique) => (
              <div
                key={technique.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                {technique.photo_url && (
                  <img
                    src={technique.photo_url}
                    alt={technique.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1">
                      {technique.title}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(technique)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Bewerken"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(technique)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {technique.subtitle && (
                    <p className="text-sm text-gray-600 font-medium">{technique.subtitle}</p>
                  )}

                  <p className="text-sm text-gray-600 line-clamp-3">{technique.description}</p>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {technique.categories.map((category) => (
                      <span
                        key={category.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${category.color}20`,
                          color: category.color,
                        }}
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {technique.age_groups.map((ageGroup) => (
                      <span
                        key={ageGroup.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {ageGroup.name}
                      </span>
                    ))}
                  </div>

                  {technique.is_active ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Eye className="w-3 h-3" />
                      Actief
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      <EyeOff className="w-3 h-3" />
                      Inactief
                    </span>
                  )}

                  {technique.external_links && technique.external_links.length > 0 && (
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <ExternalLink className="w-3 h-3" />
                        <span>Externe bronnen</span>
                      </div>
                      {technique.external_links.map((link, index) => (
                        <a
                          key={index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-blue-600 hover:underline truncate"
                        >
                          {link.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TechniqueModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTechnique(null);
        }}
        onSave={handleSave}
        technique={selectedTechnique}
        categories={categories}
        ageGroups={ageGroups}
        subjects={subjects}
        materials={materials}
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
                  Techniek verwijderen?
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  Weet je zeker dat je deze techniek wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                </p>
                <p className="text-gray-900 font-medium text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {deleteConfirm.title}
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
