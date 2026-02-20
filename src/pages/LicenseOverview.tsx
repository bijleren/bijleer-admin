import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Search, Filter, Download, Eye, XCircle, Calendar } from 'lucide-react';
import {
  LicenseWithOrganization,
  ProductType,
  LicenseType,
  LicenseStatus,
} from '../types/license';
import {
  formatLicenseStatus,
  calculateDaysRemaining,
  formatProductType,
  formatDate,
  exportToCSV,
} from '../utils/license';

export default function LicenseOverview() {
  const [licenses, setLicenses] = useState<LicenseWithOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    organization_type: '',
    product_type: '',
    license_type: '',
    status: '',
  });
  const [sortField, setSortField] = useState<string>('valid_until');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchLicenses();
  }, []);

  async function fetchLicenses() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organization_licenses')
        .select(`
          *,
          schools:organization_id (
            id,
            name,
            email,
            phone,
            organization_type
          )
        `)
        .order('valid_until', { ascending: true });

      if (error) throw error;

      const formattedData = (data || []).map((license: any) => ({
        ...license,
        organization_name: license.schools?.name,
        organization_email: license.schools?.email,
        organization_phone: license.schools?.phone,
        organization_type: license.schools?.organization_type,
        days_remaining: calculateDaysRemaining(license.valid_until),
      }));

      setLicenses(formattedData);
    } catch (error) {
      console.error('Error fetching licenses:', error);
    } finally {
      setLoading(false);
    }
  }

  function getFilteredAndSortedLicenses() {
    let filtered = [...licenses];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (license) =>
          license.organization_name?.toLowerCase().includes(query) ||
          license.organization_email?.toLowerCase().includes(query)
      );
    }

    if (filters.organization_type) {
      filtered = filtered.filter(
        (license) => license.organization_type === filters.organization_type
      );
    }

    if (filters.product_type) {
      filtered = filtered.filter(
        (license) => license.product_type === filters.product_type
      );
    }

    if (filters.license_type) {
      filtered = filtered.filter(
        (license) => license.license_type === filters.license_type
      );
    }

    if (filters.status) {
      filtered = filtered.filter((license) => license.status === filters.status);
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField as keyof LicenseWithOrganization];
      let bVal = b[sortField as keyof LicenseWithOrganization];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function handleExport() {
    const filtered = getFilteredAndSortedLicenses();
    const exportData = filtered.map((license) => ({
      Organization: license.organization_name,
      Product: formatProductType(license.product_type),
      Type: license.license_type,
      Status: license.status,
      'Valid From': formatDate(license.valid_from),
      'Valid Until': formatDate(license.valid_until),
      'Days Remaining': license.days_remaining,
      Email: license.organization_email,
      Phone: license.organization_phone,
    }));
    exportToCSV(exportData, 'licenses-overview');
  }

  async function handleCancelLicense(licenseId: string) {
    if (!confirm('Are you sure you want to cancel this license?')) return;

    const reason = prompt('Reason for cancellation:');
    if (!reason) return;

    try {
      const { data, error } = await supabase.rpc('cancel_license', {
        p_license_id: licenseId,
        p_reason: reason,
      });

      if (error) throw error;

      if (data && !data.success) {
        alert(data.error || 'Failed to cancel license');
        return;
      }

      alert('License cancelled successfully');
      fetchLicenses();
    } catch (error) {
      console.error('Error cancelling license:', error);
      alert('Failed to cancel license');
    }
  }

  const filteredLicenses = getFilteredAndSortedLicenses();

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">License Overview</h1>
        <p className="text-gray-600 mt-1">
          Manage and monitor all organization licenses
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filters.organization_type}
            onChange={(e) =>
              setFilters({ ...filters, organization_type: e.target.value })
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Organization Types</option>
            <option value="school">School</option>
            <option value="family">Family</option>
            <option value="organisation">Organisation</option>
          </select>

          <select
            value={filters.product_type}
            onChange={(e) =>
              setFilters({ ...filters, product_type: e.target.value })
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Products</option>
            <option value="woordenschat">Woordenschat</option>
            <option value="storage_upgrade">Storage Upgrade</option>
            <option value="digitools">DigiTools</option>
            <option value="webwijzer">WebWijzer</option>
          </select>

          <select
            value={filters.license_type}
            onChange={(e) =>
              setFilters({ ...filters, license_type: e.target.value })
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All License Types</option>
            <option value="trial">Trial</option>
            <option value="paid_stripe">Paid (Stripe)</option>
            <option value="paid_voucher">Paid (Voucher)</option>
            <option value="manual">Manual</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-600">
            Showing {filteredLicenses.length} of {licenses.length} licenses
          </p>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading licenses...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('organization_name')}
                  >
                    Organization
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('product_type')}
                  >
                    Product
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('license_type')}
                  >
                    Type
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('valid_from')}
                  >
                    Valid From
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('valid_until')}
                  >
                    Valid Until
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLicenses.map((license) => {
                  const statusInfo = formatLicenseStatus(
                    license.status,
                    license.days_remaining
                  );
                  return (
                    <tr key={license.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/schools/${license.organization_id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {license.organization_name}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {license.organization_type}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatProductType(license.product_type)}
                        {license.pricing_tier && (
                          <p className="text-xs text-gray-500">
                            {license.pricing_tier}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {license.license_type.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}
                        >
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(license.valid_from)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(license.valid_until)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/schools/${license.organization_id}`}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="View Organization"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {license.status === 'active' && (
                            <button
                              onClick={() => handleCancelLicense(license.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Cancel License"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredLicenses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No licenses found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
