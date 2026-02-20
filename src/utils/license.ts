import { LicenseStatus, ProductType } from '../types/license';

export function formatLicenseStatus(
  status: LicenseStatus,
  daysRemaining?: number
): { color: string; text: string; bgColor: string } {
  if (status === 'expired') {
    return { color: 'text-gray-600', text: 'Expired', bgColor: 'bg-gray-100' };
  }

  if (status === 'cancelled') {
    return { color: 'text-red-600', text: 'Cancelled', bgColor: 'bg-red-100' };
  }

  if (status === 'pending') {
    return { color: 'text-yellow-600', text: 'Pending', bgColor: 'bg-yellow-100' };
  }

  if (status === 'active') {
    if (daysRemaining === undefined) {
      return { color: 'text-green-600', text: 'Active', bgColor: 'bg-green-100' };
    }

    if (daysRemaining < 0) {
      return { color: 'text-red-600', text: 'Expired', bgColor: 'bg-red-100' };
    }

    if (daysRemaining < 7) {
      return { color: 'text-red-600', text: `${daysRemaining}d left`, bgColor: 'bg-red-100' };
    }

    if (daysRemaining < 30) {
      return { color: 'text-yellow-600', text: `${daysRemaining}d left`, bgColor: 'bg-yellow-100' };
    }

    return { color: 'text-green-600', text: 'Active', bgColor: 'bg-green-100' };
  }

  return { color: 'text-gray-600', text: status, bgColor: 'bg-gray-100' };
}

export function calculateDaysRemaining(validUntil: string): number {
  const now = new Date();
  const until = new Date(validUntil);
  const diff = until.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function formatProductType(productType: ProductType): string {
  const labels: Record<ProductType, string> = {
    woordenschat: 'Woordenschat',
    storage_upgrade: 'Storage Upgrade',
    digitools: 'DigiTools',
    webwijzer: 'WebWijzer',
  };
  return labels[productType] || productType;
}

export function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '€0.00';
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function generateVoucherCodePrefix(): string {
  const year = new Date().getFullYear();
  return `WS-${year}-`;
}

export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatDate(date: string | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('nl-NL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const STORAGE_TIERS = {
  default: { label: 'Default (5GB)', bytes: 5 * 1024 * 1024 * 1024 },
  basic: { label: 'Basic (10GB)', bytes: 10 * 1024 * 1024 * 1024 },
  pro: { label: 'Pro (25GB)', bytes: 25 * 1024 * 1024 * 1024 },
  enterprise: { label: 'Enterprise (50GB)', bytes: 50 * 1024 * 1024 * 1024 },
};

export function getStorageLimitFromTier(tier: string | undefined): number {
  if (!tier || !STORAGE_TIERS[tier as keyof typeof STORAGE_TIERS]) {
    return STORAGE_TIERS.default.bytes;
  }
  return STORAGE_TIERS[tier as keyof typeof STORAGE_TIERS].bytes;
}
