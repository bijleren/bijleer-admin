import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LicenseAccess, ProductType } from '../types/license';

export function useLicenseAccess(organizationId: string | undefined, productType: ProductType) {
  const [licenseAccess, setLicenseAccess] = useState<LicenseAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    async function checkAccess() {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('check_license_access', {
          p_organization_id: organizationId,
          p_product_type: productType,
        });

        if (error) throw error;

        if (data && data.length > 0) {
          setLicenseAccess(data[0]);
        } else {
          setLicenseAccess({
            has_access: false,
            license_type: undefined,
            status: undefined,
            valid_until: undefined,
            days_remaining: undefined,
          });
        }
      } catch (err) {
        console.error('Error checking license access:', err);
        setError(err instanceof Error ? err.message : 'Failed to check license access');
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [organizationId, productType]);

  return { licenseAccess, loading, error };
}

export function useRedeemVoucher() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redeemVoucher = async (
    code: string,
    organizationId: string,
    userId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('redeem_voucher_code', {
        p_code: code,
        p_organization_id: organizationId,
        p_user_id: userId,
      });

      if (error) throw error;

      if (data && !data.success) {
        setError(data.error || 'Failed to redeem voucher');
        return { success: false, error: data.error };
      }

      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to redeem voucher';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return { redeemVoucher, loading, error };
}
