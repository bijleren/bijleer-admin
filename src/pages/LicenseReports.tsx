import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, TrendingUp, Calendar, DollarSign, Users } from 'lucide-react';
import {
  LicenseWithOrganization,
  TransactionWithDetails,
  LicenseStats,
} from '../types/license';
import {
  formatCurrency,
  formatProductType,
  formatDate,
  formatDateTime,
  exportToCSV,
  calculateDaysRemaining,
} from '../utils/license';

export default function LicenseReports() {
  const [licenses, setLicenses] = useState<LicenseWithOrganization[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LicenseStats | null>(null);
  const [expiringFilter, setExpiringFilter] = useState(30);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      const [licensesRes, transactionsRes] = await Promise.all([
        supabase.from('organization_licenses').select(`
          *,
          schools:organization_id (name, organization_type)
        `),
        supabase.from('license_transactions').select(`
          *,
          schools:organization_id (name),
          profiles:created_by_user_id (email)
        `).order('created_at', { ascending: false }),
      ]);

      if (licensesRes.error) throw licensesRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      const licensesData = (licensesRes.data || []).map((l: any) => ({
        ...l,
        organization_name: l.schools?.name,
        organization_type: l.schools?.organization_type,
        days_remaining: calculateDaysRemaining(l.valid_until),
      }));

      const transactionsData = (transactionsRes.data || []).map((t: any) => ({
        ...t,
        organization_name: t.schools?.name,
        created_by_email: t.profiles?.email,
      }));

      setLicenses(licensesData);
      setTransactions(transactionsData);
      calculateStats(licensesData, transactionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(
    licensesData: LicenseWithOrganization[],
    transactionsData: TransactionWithDetails[]
  ) {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats: LicenseStats = {
      total_active: licensesData.filter((l) => l.status === 'active').length,
      total_expired: licensesData.filter((l) => l.status === 'expired').length,
      total_cancelled: licensesData.filter((l) => l.status === 'cancelled').length,
      expiring_7_days: licensesData.filter(
        (l) => l.status === 'active' && l.days_remaining! >= 0 && l.days_remaining! <= 7
      ).length,
      expiring_30_days: licensesData.filter(
        (l) => l.status === 'active' && l.days_remaining! >= 0 && l.days_remaining! <= 30
      ).length,
      revenue_total: transactionsData
        .filter((t) => t.amount_eur)
        .reduce((sum, t) => sum + (t.amount_eur || 0), 0),
      revenue_this_month: transactionsData
        .filter(
          (t) => t.amount_eur && new Date(t.created_at) >= thisMonthStart
        )
        .reduce((sum, t) => sum + (t.amount_eur || 0), 0),
      licenses_by_product: {
        woordenschat: licensesData.filter((l) => l.product_type === 'woordenschat').length,
        storage_upgrade: licensesData.filter((l) => l.product_type === 'storage_upgrade').length,
        digitools: licensesData.filter((l) => l.product_type === 'digitools').length,
        webwijzer: licensesData.filter((l) => l.product_type === 'webwijzer').length,
      },
      licenses_by_type: {
        trial: licensesData.filter((l) => l.license_type === 'trial').length,
        paid_stripe: licensesData.filter((l) => l.license_type === 'paid_stripe').length,
        paid_voucher: licensesData.filter((l) => l.license_type === 'paid_voucher').length,
        manual: licensesData.filter((l) => l.license_type === 'manual').length,
      },
    };

    setStats(stats);
  }

  function getExpiringLicenses() {
    return licenses
      .filter(
        (l) =>
          l.status === 'active' &&
          l.days_remaining! >= 0 &&
          l.days_remaining! <= expiringFilter
      )
      .sort((a, b) => (a.days_remaining || 0) - (b.days_remaining || 0));
  }

  function handleExportTransactions() {
    const exportData = transactions.map((t) => ({
      Date: formatDateTime(t.created_at),
      Organization: t.organization_name,
      Type: t.transaction_type,
      Product: formatProductType(t.product_type),
      'Payment Method': t.payment_method || '-',
      Amount: t.amount_eur ? formatCurrency(t.amount_eur) : '-',
      'Created By': t.created_by_email || '-',
      Notes: t.notes || '-',
    }));
    exportToCSV(exportData, 'license-transactions');
  }

  function handleExportExpiring() {
    const expiring = getExpiringLicenses();
    const exportData = expiring.map((l) => ({
      Organization: l.organization_name,
      Product: formatProductType(l.product_type),
      'Days Remaining': l.days_remaining,
      'Valid Until': formatDate(l.valid_until),
      Email: l.organization_email || '-',
      Phone: l.organization_phone || '-',
    }));
    exportToCSV(exportData, `licenses-expiring-${expiringFilter}-days`);
  }

  const expiringLicenses = getExpiringLicenses();

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">License Reports</h1>
        <p className="text-gray-600 mt-1">Analytics and insights for license management</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading reports...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-green-600" />
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                  Active
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats?.total_active}</p>
              <p className="text-sm text-gray-600 mt-1">Active Licenses</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                  Expiring
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats?.expiring_30_days}</p>
              <p className="text-sm text-gray-600 mt-1">Expiring in 30 days</p>
              <p className="text-xs text-gray-500 mt-1">
                ({stats?.expiring_7_days} in 7 days)
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-blue-600" />
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Revenue
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(stats?.revenue_total || 0)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Total Revenue</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(stats?.revenue_this_month || 0)} this month
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                  Total
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {(stats?.total_active || 0) +
                  (stats?.total_expired || 0) +
                  (stats?.total_cancelled || 0)}
              </p>
              <p className="text-sm text-gray-600 mt-1">All Licenses</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Licenses by Product
              </h2>
              <div className="space-y-3">
                {Object.entries(stats?.licenses_by_product || {}).map(([product, count]) => (
                  <div key={product} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {formatProductType(product as any)}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${
                              ((count || 0) /
                                Math.max(
                                  ...Object.values(stats?.licenses_by_product || {}),
                                  1
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Licenses by Type
              </h2>
              <div className="space-y-3">
                {Object.entries(stats?.licenses_by_type || {}).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">
                      {type.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{
                            width: `${
                              ((count || 0) /
                                Math.max(...Object.values(stats?.licenses_by_type || {}), 1)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Expiring Licenses</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Licenses requiring renewal attention
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={expiringFilter}
                  onChange={(e) => setExpiringFilter(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={7}>Next 7 days</option>
                  <option value={14}>Next 14 days</option>
                  <option value={30}>Next 30 days</option>
                  <option value={60}>Next 60 days</option>
                </select>
                <button
                  onClick={handleExportExpiring}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valid Until
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Left
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expiringLicenses.map((license) => (
                    <tr key={license.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {license.organization_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatProductType(license.product_type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(license.valid_until)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            license.days_remaining! < 7
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {license.days_remaining} days
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {license.organization_email || license.organization_phone || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {expiringLicenses.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No licenses expiring in the selected period</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                <p className="text-sm text-gray-600 mt-1">Latest license activity</p>
              </div>
              <button
                onClick={handleExportTransactions}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <Download className="w-4 h-4" />
                Export All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.slice(0, 20).map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDateTime(transaction.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {transaction.organization_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {transaction.transaction_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatProductType(transaction.product_type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {transaction.payment_method || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {transaction.amount_eur ? formatCurrency(transaction.amount_eur) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
