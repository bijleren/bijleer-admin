import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Check } from 'lucide-react';
import { ProductType, LicenseType, ManualLicenseFormData } from '../types/license';
import { formatProductType, formatDate } from '../utils/license';

interface School {
  id: string;
  name: string;
  organization_type: string;
  email?: string;
}

export default function ManualGrants() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<School[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState<ManualLicenseFormData>({
    organization_id: '',
    product_type: 'woordenschat',
    license_type: 'manual',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    pricing_tier: '',
    notes: '',
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredSchools(
        schools.filter(
          (s) =>
            s.name.toLowerCase().includes(query) ||
            s.email?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredSchools([]);
    }
  }, [searchQuery, schools]);

  async function fetchSchools() {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, organization_type, email')
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  }

  function selectSchool(school: School) {
    setFormData({ ...formData, organization_id: school.id });
    setSearchQuery(school.name);
    setFilteredSchools([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user?.id) {
      alert('You must be logged in to create licenses');
      return;
    }

    if (!formData.organization_id) {
      alert('Please select an organization');
      return;
    }

    try {
      setLoading(true);

      const { data: licenseData, error: licenseError } = await supabase
        .from('organization_licenses')
        .insert([
          {
            organization_id: formData.organization_id,
            product_type: formData.product_type,
            license_type: formData.license_type,
            status: 'active',
            valid_from: formData.valid_from,
            valid_until: formData.valid_until,
            pricing_tier: formData.pricing_tier || null,
            notes: formData.notes || null,
            created_by_user_id: user.id,
          },
        ])
        .select()
        .single();

      if (licenseError) throw licenseError;

      const { error: transactionError } = await supabase
        .from('license_transactions')
        .insert([
          {
            license_id: licenseData.id,
            organization_id: formData.organization_id,
            transaction_type: 'created',
            product_type: formData.product_type,
            payment_method: 'manual',
            new_valid_until: formData.valid_until,
            notes: `Manual license grant: ${formData.notes || 'No notes provided'}`,
            created_by_user_id: user.id,
          },
        ]);

      if (transactionError) throw transactionError;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      setFormData({
        organization_id: '',
        product_type: 'woordenschat',
        license_type: 'manual',
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        pricing_tier: '',
        notes: '',
      });
      setSearchQuery('');
    } catch (error) {
      console.error('Error creating license:', error);
      alert('Failed to create license');
    } finally {
      setLoading(false);
    }
  }

  function calculateDuration() {
    if (!formData.valid_from || !formData.valid_until) return 0;
    const from = new Date(formData.valid_from);
    const until = new Date(formData.valid_until);
    const diff = until.getTime() - from.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  const selectedSchool = schools.find((s) => s.id === formData.organization_id);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manual License Grants</h1>
        <p className="text-gray-600 mt-1">
          Create licenses manually for schools and organizations
        </p>
      </div>

      {showSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <div className="bg-green-600 rounded-full p-1">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-green-900">License created successfully!</p>
            <p className="text-sm text-green-700">
              The license has been granted and transaction logged.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for organization..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {filteredSchools.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredSchools.map((school) => (
                    <button
                      key={school.id}
                      type="button"
                      onClick={() => selectSchool(school)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">{school.name}</p>
                      <p className="text-xs text-gray-500">
                        {school.organization_type} {school.email && `• ${school.email}`}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedSchool && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">{selectedSchool.name}</p>
                <p className="text-xs text-blue-700">{selectedSchool.organization_type}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Type *
              </label>
              <select
                value={formData.product_type}
                onChange={(e) =>
                  setFormData({ ...formData, product_type: e.target.value as ProductType })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="woordenschat">Woordenschat</option>
                <option value="storage_upgrade">Storage Upgrade</option>
                <option value="digitools">DigiTools</option>
                <option value="webwijzer">WebWijzer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Type *
              </label>
              <select
                value={formData.license_type}
                onChange={(e) =>
                  setFormData({ ...formData, license_type: e.target.value as LicenseType })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="manual">Manual</option>
                <option value="trial">Trial</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid From *
              </label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Until *
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-medium">Duration:</span> {calculateDuration()} days
            </p>
          </div>

          {formData.product_type === 'storage_upgrade' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pricing Tier *
              </label>
              <select
                value={formData.pricing_tier}
                onChange={(e) => setFormData({ ...formData, pricing_tier: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select tier...</option>
                <option value="basic">Basic (10GB)</option>
                <option value="pro">Pro (25GB)</option>
                <option value="enterprise">Enterprise (50GB)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add internal notes about this license grant..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Organization:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedSchool?.name || 'Not selected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Product:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatProductType(formData.product_type)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Type:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formData.license_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Duration:</span>
                <span className="text-sm font-medium text-gray-900">
                  {calculateDuration()} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Valid Period:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(formData.valid_from)} - {formatDate(formData.valid_until)}
                </span>
              </div>
              {formData.pricing_tier && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tier:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formData.pricing_tier}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  organization_id: '',
                  product_type: 'woordenschat',
                  license_type: 'manual',
                  valid_from: new Date().toISOString().split('T')[0],
                  valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0],
                  pricing_tier: '',
                  notes: '',
                });
                setSearchQuery('');
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={loading || !formData.organization_id}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create License'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
