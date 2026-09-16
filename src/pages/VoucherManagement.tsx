import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Download, Search, X } from 'lucide-react';
import {
  VoucherWithRedemption,
  VoucherFormData,
  ProductType,
  VoucherStatus,
} from '../types/license';
import { formatProductType, formatDate, formatDateTime, exportToCSV } from '../utils/license';

export default function VoucherManagement() {
  const [vouchers, setVouchers] = useState<VoucherWithRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [productFilter, setProductFilter] = useState<string>('');
  const [formData, setFormData] = useState<VoucherFormData>({
    product_type: 'woordenschat',
    duration_days: 365,
    quantity: 1,
    pricing_tier: '',
    expires_at: '',
    odoo_reference: '',
  });

  useEffect(() => {
    fetchVouchers();
  }, []);

  async function fetchVouchers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('voucher_codes')
        .select(`
          *,
          schools:redeemed_by_organization_id (name),
          profiles:redeemed_by_user_id (email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((voucher: any) => ({
        ...voucher,
        organization_name: voucher.schools?.name,
        redeemed_by_email: voucher.profiles?.email,
      }));

      setVouchers(formattedData);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateVouchers(e: React.FormEvent) {
    e.preventDefault();

    try {
      const vouchersToCreate = [];

      for (let i = 0; i < formData.quantity; i++) {
        const { data: codeData, error: codeError } = await supabase.rpc(
          'generate_voucher_code'
        );

        if (codeError) throw codeError;

        vouchersToCreate.push({
          code: codeData,
          product_type: formData.product_type,
          duration_days: formData.duration_days,
          pricing_tier: formData.pricing_tier || null,
          expires_at: formData.expires_at || null,
          odoo_reference: formData.odoo_reference || null,
          status: 'unused',
        });
      }

      const { error } = await supabase.from('voucher_codes').insert(vouchersToCreate);

      if (error) throw error;

      alert(`${formData.quantity} voucher(s) created successfully`);
      setShowCreateForm(false);
      setFormData({
        product_type: 'woordenschat',
        duration_days: 365,
        quantity: 1,
        pricing_tier: '',
        expires_at: '',
        odoo_reference: '',
      });
      fetchVouchers();
    } catch (error) {
      console.error('Error creating vouchers:', error);
      alert('Failed to create vouchers');
    }
  }

  async function handleCancelVoucher(voucherId: string) {
    if (!confirm('Are you sure you want to cancel this voucher?')) return;

    try {
      const { error } = await supabase
        .from('voucher_codes')
        .update({ status: 'cancelled' })
        .eq('id', voucherId);

      if (error) throw error;

      alert('Voucher cancelled successfully');
      fetchVouchers();
    } catch (error) {
      console.error('Error cancelling voucher:', error);
      alert('Failed to cancel voucher');
    }
  }

  function getFilteredVouchers() {
    let filtered = [...vouchers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.code.toLowerCase().includes(query) ||
          v.organization_name?.toLowerCase().includes(query) ||
          v.odoo_reference?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((v) => v.status === statusFilter);
    }

    if (productFilter) {
      filtered = filtered.filter((v) => v.product_type === productFilter);
    }

    return filtered;
  }

  function handleExport() {
    const filtered = getFilteredVouchers();
    const exportData = filtered.map((v) => ({
      Code: v.code,
      Product: formatProductType(v.product_type),
      'Duration (days)': v.duration_days,
      'Pricing Tier': v.pricing_tier || '-',
      Status: v.status,
      'ODOO Reference': v.odoo_reference || '-',
      'Created At': formatDateTime(v.created_at),
      'Expires At': formatDateTime(v.expires_at),
      'Redeemed At': formatDateTime(v.redeemed_at),
      'Redeemed By': v.organization_name || '-',
    }));
    exportToCSV(exportData, 'voucher-codes');
  }

  const filteredVouchers = getFilteredVouchers();
  const stats = {
    unused: vouchers.filter((v) => v.status === 'unused').length,
    redeemed: vouchers.filter((v) => v.status === 'redeemed').length,
    expired: vouchers.filter((v) => v.status === 'expired').length,
    cancelled: vouchers.filter((v) => v.status === 'cancelled').length,
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Voucher Management</h1>
          <p className="text-gray-600 mt-1">Create and manage voucher codes</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Create Vouchers
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Unused</p>
          <p className="text-2xl font-bold text-green-600">{stats.unused}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Redeemed</p>
          <p className="text-2xl font-bold text-blue-600">{stats.redeemed}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Expired</p>
          <p className="text-2xl font-bold text-gray-600">{stats.expired}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Cancelled</p>
          <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search vouchers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="unused">Unused</option>
            <option value="redeemed">Redeemed</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Products</option>
            <option value="oefentijd">Oefentijd</option>
            <option value="premium">Premium</option>
            <option value="woordenschat">Woordenschat</option>
            <option value="storage_upgrade">Storage Upgrade</option>
            <option value="digitools">DigiTools</option>
            <option value="webwijzer">WebWijzer</option>
          </select>
        </div>

        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-600">
            Showing {filteredVouchers.length} of {vouchers.length} vouchers
          </p>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading vouchers...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Redeemed By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {voucher.code}
                      </code>
                      {voucher.odoo_reference && (
                        <p className="text-xs text-gray-500 mt-1">
                          ODOO: {voucher.odoo_reference}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatProductType(voucher.product_type)}
                      {voucher.pricing_tier && (
                        <p className="text-xs text-gray-500">{voucher.pricing_tier}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {voucher.duration_days} days
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          voucher.status === 'unused'
                            ? 'bg-green-100 text-green-800'
                            : voucher.status === 'redeemed'
                            ? 'bg-blue-100 text-blue-800'
                            : voucher.status === 'expired'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {voucher.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(voucher.created_at)}
                      {voucher.expires_at && (
                        <p className="text-xs text-gray-500">
                          Expires: {formatDate(voucher.expires_at)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {voucher.organization_name || '-'}
                      {voucher.redeemed_at && (
                        <p className="text-xs text-gray-500">
                          {formatDate(voucher.redeemed_at)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {voucher.status === 'unused' && (
                        <button
                          onClick={() => handleCancelVoucher(voucher.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredVouchers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No vouchers found</p>
            </div>
          )}
        </div>
      )}

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Create Vouchers</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateVouchers} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Type
                </label>
                <select
                  value={formData.product_type}
                  onChange={(e) =>
                    setFormData({ ...formData, product_type: e.target.value as ProductType })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="oefentijd">Oefentijd</option>
                  <option value="premium">Premium</option>
                  <option value="woordenschat">Woordenschat</option>
                  <option value="storage_upgrade">Storage Upgrade</option>
                  <option value="digitools">DigiTools</option>
                  <option value="webwijzer">WebWijzer</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) =>
                      setFormData({ ...formData, duration_days: parseInt(e.target.value) })
                    }
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: parseInt(e.target.value) })
                    }
                    min="1"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pricing Tier (Optional)
                </label>
                <input
                  type="text"
                  value={formData.pricing_tier}
                  onChange={(e) => setFormData({ ...formData, pricing_tier: e.target.value })}
                  placeholder="e.g., basic, pro, enterprise"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ODOO Reference (Optional)
                </label>
                <input
                  type="text"
                  value={formData.odoo_reference}
                  onChange={(e) => setFormData({ ...formData, odoo_reference: e.target.value })}
                  placeholder="Order or invoice number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create {formData.quantity} Voucher{formData.quantity > 1 ? 's' : ''}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
