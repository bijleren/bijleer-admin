import { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Vorming {
  id: string;
  title: string;
  category: string;
}

interface Newsletter {
  id?: string;
  school_id?: string;
  title: string;
  description?: string;
  file_path: string;
  vorming_id?: string;
}

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newsletter: Newsletter) => Promise<void>;
  newsletter?: Newsletter | null;
  vormingen: Vorming[];
}

export default function NewsletterModal({ isOpen, onClose, onSave, newsletter, vormingen }: NewsletterModalProps) {
  const [formData, setFormData] = useState<Newsletter>({
    title: '',
    description: '',
    file_path: '',
    vorming_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (newsletter) {
      setFormData({
        id: newsletter.id,
        school_id: newsletter.school_id,
        title: newsletter.title,
        description: newsletter.description || '',
        file_path: newsletter.file_path,
        vorming_id: newsletter.vorming_id || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        file_path: '',
        vorming_id: '',
      });
    }
    setSelectedFile(null);
    setUploadProgress(0);
  }, [newsletter, isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('nieuwsletters')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newsletter && !selectedFile) {
      alert('Selecteer een bestand om te uploaden.');
      return;
    }

    setLoading(true);
    try {
      let filePath = formData.file_path;

      if (selectedFile) {
        setUploadProgress(50);
        filePath = await uploadFile(selectedFile);
        setUploadProgress(100);
      }

      await onSave({
        ...formData,
        file_path: filePath,
        vorming_id: formData.vorming_id || undefined,
      });

      onClose();
    } catch (error) {
      console.error('Error saving newsletter:', error);
      alert('Er is een fout opgetreden bij het opslaan van de nieuwsbrief.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
            <label htmlFor="vorming_id" className="block text-sm font-medium text-gray-700 mb-2">
              Didactiek Vorming
            </label>
            <select
              id="vorming_id"
              name="vorming_id"
              value={formData.vorming_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Geen vorming gekoppeld</option>
              {vormingen.map((vorming) => (
                <option key={vorming.id} value={vorming.id}>
                  {vorming.title} {vorming.category ? `(${vorming.category})` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Koppel deze nieuwsbrief aan een didactiek vorming
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {newsletter ? 'Nieuw Bestand (optioneel)' : 'Bestand *'}
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-gray-400" />
                  {selectedFile ? (
                    <p className="text-sm text-gray-700 font-medium">{selectedFile.name}</p>
                  ) : formData.file_path && newsletter ? (
                    <p className="text-sm text-gray-700">Bestaand bestand: {formData.file_path}</p>
                  ) : (
                    <>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Klik om te uploaden</span> of sleep bestand hierheen
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOC, DOCX (MAX. 10MB)</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx"
                />
              </label>
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Uploaden... {uploadProgress}%</p>
              </div>
            )}
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
