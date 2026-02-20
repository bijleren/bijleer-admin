export type ProductType = 'woordenschat' | 'storage_upgrade' | 'digitools' | 'webwijzer';
export type LicenseType = 'trial' | 'paid_stripe' | 'paid_voucher' | 'manual';
export type LicenseStatus = 'active' | 'expired' | 'cancelled' | 'pending';
export type TransactionType = 'created' | 'renewed' | 'extended' | 'cancelled' | 'expired' | 'migration';
export type VoucherStatus = 'unused' | 'redeemed' | 'expired' | 'cancelled';

export interface OrganizationLicense {
  id: string;
  organization_id: string;
  product_type: ProductType;
  license_type: LicenseType;
  status: LicenseStatus;
  valid_from: string;
  valid_until: string;
  auto_renew: boolean;
  stripe_subscription_id?: string;
  voucher_code_id?: string;
  pricing_tier?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by_user_id?: string;
}

export interface VoucherCode {
  id: string;
  code: string;
  product_type: ProductType;
  duration_days: number;
  pricing_tier?: string;
  status: VoucherStatus;
  odoo_reference?: string;
  expires_at?: string;
  redeemed_at?: string;
  redeemed_by_organization_id?: string;
  redeemed_by_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface LicenseTransaction {
  id: string;
  license_id?: string;
  organization_id: string;
  transaction_type: TransactionType;
  product_type: ProductType;
  payment_method?: string;
  amount_eur?: number;
  stripe_payment_intent_id?: string;
  voucher_code_id?: string;
  previous_valid_until?: string;
  new_valid_until?: string;
  notes?: string;
  created_by_user_id?: string;
  created_at: string;
}

export interface LicenseAccess {
  has_access: boolean;
  license_type?: string;
  status?: string;
  valid_until?: string;
  days_remaining?: number;
}

export interface LicenseWithOrganization extends OrganizationLicense {
  organization_name?: string;
  organization_email?: string;
  organization_phone?: string;
  organization_type?: string;
  days_remaining?: number;
}

export interface VoucherWithRedemption extends VoucherCode {
  organization_name?: string;
  redeemed_by_email?: string;
}

export interface TransactionWithDetails extends LicenseTransaction {
  organization_name?: string;
  created_by_email?: string;
}

export interface LicenseStats {
  total_active: number;
  total_expired: number;
  total_cancelled: number;
  expiring_7_days: number;
  expiring_30_days: number;
  revenue_total: number;
  revenue_this_month: number;
  licenses_by_product: Record<ProductType, number>;
  licenses_by_type: Record<LicenseType, number>;
}

export interface VoucherFormData {
  product_type: ProductType;
  duration_days: number;
  pricing_tier?: string;
  quantity: number;
  expires_at?: string;
  odoo_reference?: string;
}

export interface ManualLicenseFormData {
  organization_id: string;
  product_type: ProductType;
  license_type: LicenseType;
  valid_from: string;
  valid_until: string;
  pricing_tier?: string;
  notes?: string;
}

export interface FilterOptions {
  organization_type?: string;
  product_type?: ProductType;
  license_type?: LicenseType;
  status?: LicenseStatus;
  search?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}
