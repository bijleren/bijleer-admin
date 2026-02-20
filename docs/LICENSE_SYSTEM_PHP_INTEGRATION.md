# License System - PHP Platform Integration Guide

## Overview

The new license management system is designed to work seamlessly with the existing woordenschat.be PHP platform. This guide provides integration instructions for the PHP team.

## Database Connection

The PHP platform should connect to Supabase using the **service role key** (not the anon key) to bypass Row Level Security and perform administrative operations.

```php
// Supabase connection details (from .env)
$supabase_url = getenv('VITE_SUPABASE_URL');
$supabase_service_key = getenv('SUPABASE_SERVICE_ROLE_KEY'); // Not in .env, needs to be added
```

## Key Functions

### 1. Extend License After Stripe Payment

After a successful Stripe payment, call this function to create or extend a license:

```sql
SELECT extend_license_from_purchase(
  p_organization_id := 'uuid-of-organization',
  p_product_type := 'woordenschat', -- or 'storage_upgrade', 'digitools', 'webwijzer'
  p_duration_days := 365,
  p_stripe_payment_intent_id := 'pi_xxx_stripe_payment_id',
  p_amount_eur := 99.99,
  p_pricing_tier := NULL -- or 'basic', 'pro', 'enterprise' for storage upgrades
);
```

**Example PHP Implementation:**

```php
<?php
// After Stripe payment success
$organization_id = $_POST['organization_id'];
$product_type = $_POST['product_type']; // 'woordenschat', 'storage_upgrade', etc.
$payment_intent_id = $stripe_payment->id;
$amount = $stripe_payment->amount / 100; // Convert cents to euros

// Call Supabase RPC function
$response = callSupabaseRPC('extend_license_from_purchase', [
    'p_organization_id' => $organization_id,
    'p_product_type' => $product_type,
    'p_duration_days' => 365,
    'p_stripe_payment_intent_id' => $payment_intent_id,
    'p_amount_eur' => $amount,
    'p_pricing_tier' => null
]);

if ($response['success']) {
    // License created/extended successfully
    $license_id = $response['license_id'];
    $valid_until = $response['valid_until'];
    // Send confirmation email, redirect, etc.
} else {
    // Handle error
}
?>
```

### 2. Check License Access

To verify if an organization has access to a product:

```sql
SELECT * FROM check_license_access(
  p_organization_id := 'uuid-of-organization',
  p_product_type := 'woordenschat'
);
```

**Returns:**
- `has_access` (boolean) - true if organization has valid license
- `license_type` (text) - trial, paid_stripe, paid_voucher, manual
- `status` (text) - active, expired, cancelled, pending
- `valid_until` (timestamptz) - expiration date
- `days_remaining` (integer) - days until expiration

**Example PHP Implementation:**

```php
<?php
function checkLicenseAccess($organization_id, $product_type) {
    $response = callSupabaseRPC('check_license_access', [
        'p_organization_id' => $organization_id,
        'p_product_type' => $product_type
    ]);

    if (empty($response)) {
        return ['has_access' => false];
    }

    return $response[0];
}

// Usage
$access = checkLicenseAccess($org_id, 'woordenschat');
if ($access['has_access']) {
    // Grant access to platform
} else {
    // Show upgrade page
}
?>
```

### 3. Insert Voucher Codes from ODOO

When generating vouchers in ODOO, insert them into Supabase:

```sql
INSERT INTO voucher_codes (
  code,
  product_type,
  duration_days,
  pricing_tier,
  odoo_reference,
  expires_at,
  status
) VALUES (
  'WS-2026-ABCD-1234',
  'woordenschat',
  365,
  NULL,
  'INV-12345',
  '2026-12-31 23:59:59+00',
  'unused'
);
```

**Example PHP Implementation:**

```php
<?php
function createVoucherFromODOO($invoice_number, $product_type, $duration_days, $expires_at) {
    // Generate unique code
    $code = generateVoucherCode();

    $data = [
        'code' => $code,
        'product_type' => $product_type,
        'duration_days' => $duration_days,
        'pricing_tier' => null,
        'odoo_reference' => $invoice_number,
        'expires_at' => $expires_at,
        'status' => 'unused'
    ];

    $response = insertSupabase('voucher_codes', $data);
    return $code;
}

function generateVoucherCode() {
    $year = date('Y');
    $random1 = strtoupper(substr(md5(uniqid(rand(), true)), 0, 4));
    $random2 = strtoupper(substr(md5(uniqid(rand(), true)), 0, 4));
    return "WS-{$year}-{$random1}-{$random2}";
}
?>
```

## Supabase Helper Functions

```php
<?php
class SupabaseLicenseClient {
    private $url;
    private $serviceKey;

    public function __construct($url, $serviceKey) {
        $this->url = $url;
        $this->serviceKey = $serviceKey;
    }

    public function callRPC($functionName, $params) {
        $ch = curl_init($this->url . '/rest/v1/rpc/' . $functionName);

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($params),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'apikey: ' . $this->serviceKey,
                'Authorization: Bearer ' . $this->serviceKey
            ]
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception("Supabase RPC call failed: HTTP {$httpCode}");
        }

        return json_decode($response, true);
    }

    public function insert($table, $data) {
        $ch = curl_init($this->url . '/rest/v1/' . $table);

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'apikey: ' . $this->serviceKey,
                'Authorization: Bearer ' . $this->serviceKey,
                'Prefer: return=representation'
            ]
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 201) {
            throw new Exception("Supabase insert failed: HTTP {$httpCode}");
        }

        return json_decode($response, true);
    }
}
?>
```

## Stripe Webhook Handler Example

```php
<?php
require_once 'vendor/autoload.php';

$stripe = new \Stripe\StripeClient(getenv('STRIPE_SECRET_KEY'));
$supabase = new SupabaseLicenseClient(
    getenv('VITE_SUPABASE_URL'),
    getenv('SUPABASE_SERVICE_ROLE_KEY')
);

// Get webhook payload
$payload = @file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'];
$webhook_secret = getenv('STRIPE_WEBHOOK_SECRET');

try {
    $event = \Stripe\Webhook::constructEvent($payload, $sig_header, $webhook_secret);
} catch(\Exception $e) {
    http_response_code(400);
    exit();
}

// Handle payment success
if ($event->type === 'payment_intent.succeeded') {
    $payment_intent = $event->data->object;

    // Get metadata from payment
    $organization_id = $payment_intent->metadata->organization_id;
    $product_type = $payment_intent->metadata->product_type;
    $duration_days = $payment_intent->metadata->duration_days ?? 365;
    $pricing_tier = $payment_intent->metadata->pricing_tier ?? null;
    $amount_eur = $payment_intent->amount / 100;

    // Extend license via Supabase
    $result = $supabase->callRPC('extend_license_from_purchase', [
        'p_organization_id' => $organization_id,
        'p_product_type' => $product_type,
        'p_duration_days' => $duration_days,
        'p_stripe_payment_intent_id' => $payment_intent->id,
        'p_amount_eur' => $amount_eur,
        'p_pricing_tier' => $pricing_tier
    ]);

    if ($result['success']) {
        // Send confirmation email
        sendLicenseConfirmationEmail($organization_id, $result);
    }
}

http_response_code(200);
?>
```

## Product Types

The system supports four product types:

1. **woordenschat** - Main platform access
2. **storage_upgrade** - Additional storage (requires pricing_tier: basic/pro/enterprise)
3. **digitools** - DigiTools access
4. **webwijzer** - WebWijzer access

## Storage Upgrades

When a storage_upgrade license is activated, the system automatically updates the `schools.storage_limit_bytes` field:

- **basic**: 10GB (10,737,418,240 bytes)
- **pro**: 25GB (26,843,545,600 bytes)
- **enterprise**: 50GB (53,687,091,200 bytes)
- **default**: 5GB (5,368,709,120 bytes)

When the license expires or is cancelled, storage reverts to default 5GB.

## Important Notes

1. **Service Role Key Security**: Never expose the service role key in client-side code. Only use it in server-side PHP scripts.

2. **Backward Compatibility**: The `premium_school` column is automatically kept in sync with woordenschat licenses via database triggers.

3. **Transaction Logging**: All license operations are automatically logged in `license_transactions` table for audit purposes.

4. **Voucher Redemption**: Users redeem vouchers through the frontend admin panel, not via PHP.

5. **Error Handling**: All RPC functions return JSON with `success` boolean and appropriate error messages.

## Testing

Test the integration in a staging environment first:

1. Create a test Stripe payment
2. Verify license is created/extended in Supabase
3. Check transaction record exists
4. Verify email notifications work
5. Test storage upgrade limits update correctly

## Support

For questions about the license system, contact the admin dashboard team or refer to the Supabase documentation in the admin panel under Licensing > Reports.
