# License Management System

## Overview

The License Management System is a comprehensive solution for managing product licenses across multiple organizations in the Bijleer.school admin platform. It supports multiple products, payment methods, and provides complete audit trails.

## Features

### Multi-Product Support
- **Woordenschat** - Main platform access
- **Storage Upgrades** - Additional storage tiers (Basic 10GB, Pro 25GB, Enterprise 50GB)
- **DigiTools** - DigiTools platform access
- **WebWijzer** - WebWijzer platform access

### Multiple License Types
- **Trial** - Free trial licenses
- **Paid (Stripe)** - Licenses purchased via Stripe
- **Paid (Voucher)** - Licenses activated via ODOO voucher codes
- **Manual** - Admin-created licenses for special cases

### License Operations
- Create licenses manually for any organization
- Generate and manage voucher codes for redemption
- Automatic license extension for renewals
- License cancellation with reason tracking
- Complete transaction audit trail

### Integration Points
- **Stripe Payments** - PHP platform integration for payment processing
- **ODOO Vouchers** - Voucher code generation and redemption
- **Automatic Storage Management** - Storage limits updated based on active licenses

## User Interface

The system provides four main pages under the "Licensing" menu:

### 1. License Overview
- View all licenses across all organizations
- Filter by organization type, product, license type, and status
- Search by organization name or email
- Color-coded status badges (green: active, yellow: expiring soon, red: expired)
- Sort by any column
- Quick actions: view organization, cancel license
- Export to CSV

### 2. Voucher Management
- Generate single or bulk voucher codes
- Track voucher status (unused, redeemed, expired, cancelled)
- View redemption details (who, when, which organization)
- Set expiration dates and ODOO references
- Filter by status and product type
- Export voucher data to CSV
- Cancel unused vouchers

### 3. Manual Grants
- Create licenses for schools and organizations
- Search and select organization with autocomplete
- Set product type, license type, and validity period
- Calculate license duration automatically
- Add internal notes for documentation
- Preview license details before creation
- Auto-creates transaction records for audit trail

### 4. Reports
- Dashboard with key metrics:
  - Active licenses count
  - Licenses expiring in 7/30 days
  - Total and monthly revenue
  - License distribution by product and type
- Upcoming expirations list (7, 14, 30, 60 days)
- Recent transactions table
- Visual charts for license distribution
- Export capabilities for all reports

## Database Schema

### Tables

**organization_licenses**
- Core license records
- Links to schools (organizations)
- Tracks product type, license type, status
- Validity period (from/until)
- Pricing tier for storage upgrades
- Auto-renew flag for future subscriptions
- Notes and Stripe references

**voucher_codes**
- Voucher code generation and tracking
- Product type and duration
- Status tracking (unused/redeemed/expired/cancelled)
- ODOO reference linking
- Redemption details (organization, user, timestamp)

**license_transactions**
- Complete audit trail
- All license operations logged
- Payment tracking (amount, method, Stripe ID)
- Previous and new validity dates
- Transaction notes and created by user

### RPC Functions

**check_license_access(organization_id, product_type)**
- Returns access status and license details
- Used by PHP platform for access control

**redeem_voucher_code(code, organization_id, user_id)**
- Validates and redeems voucher codes
- Creates or extends licenses
- Updates voucher status
- Creates transaction records

**extend_license_from_purchase(organization_id, product_type, duration_days, stripe_payment_intent_id, amount_eur, pricing_tier)**
- Called by PHP platform after Stripe payment
- Creates new license or extends existing
- Logs transaction with payment details

**get_organization_licenses(organization_id)**
- Returns all licenses for an organization
- Admin-only access

**cancel_license(license_id, reason)**
- Cancels active license
- Requires admin authentication
- Logs cancellation transaction

**get_expiring_licenses(days_threshold)**
- Returns licenses expiring within X days
- Includes organization contact details
- Used for renewal reminders

**generate_voucher_code()**
- Generates unique voucher code
- Format: WS-YYYY-XXXX-XXXX
- Collision checking

### Database Triggers

**sync_premium_school_flag()**
- Keeps `premium_school` column synchronized with woordenschat licenses
- Ensures backward compatibility during transition

**update_storage_limit_from_license()**
- Automatically updates `storage_limit_bytes` when storage_upgrade licenses activate/expire
- Reverts to default 5GB when no active storage license

## Migration

All existing premium schools (premium_school = 1) have been automatically migrated to the license system:
- Created active woordenschat licenses
- Set 1-year validity from migration date
- Marked as 'manual' license type
- Transaction records created with 'migration' type
- Original premium_school flag maintained for compatibility

## Security

### Row Level Security (RLS)
- All tables protected with RLS policies
- Admin users (via admin_users table) can view/modify all data
- PHP platform uses service role key to bypass RLS
- Voucher redemption secured through RPC functions

### Authentication Requirements
- All operations require authenticated admin user
- User email must exist in admin_users table
- Transaction records track which user performed each action

## PHP Integration

See `LICENSE_SYSTEM_PHP_INTEGRATION.md` for detailed PHP integration guide including:
- Stripe webhook handling
- License checking for access control
- Voucher code insertion from ODOO
- Example code and helper functions

## Usage Examples

### Creating a Manual License
1. Navigate to Licensing > Manual Grants
2. Search for organization
3. Select product type (e.g., woordenschat)
4. Set validity period
5. Add internal notes
6. Review preview and submit

### Generating Vouchers
1. Navigate to Licensing > Vouchers
2. Click "Create Vouchers"
3. Select product type
4. Set duration and quantity
5. Optionally add expiration date and ODOO reference
6. Generate - codes will be created automatically

### Viewing Expiring Licenses
1. Navigate to Licensing > Reports
2. View "Expiring Licenses" section
3. Filter by time period (7, 14, 30, 60 days)
4. Export list for renewal outreach

### Checking License Access (PHP)
```php
$access = checkLicenseAccess($org_id, 'woordenschat');
if ($access['has_access']) {
    // Grant platform access
}
```

## Best Practices

1. **Always add notes** when creating manual licenses for future reference
2. **Set expiration dates** on vouchers to prevent indefinite usage
3. **Include ODOO references** when generating vouchers for accounting
4. **Export reports regularly** for business analytics
5. **Monitor expiring licenses** weekly to reach out for renewals
6. **Use trial licenses** for demonstration purposes only
7. **Document cancellations** with clear reasons in the cancellation prompt

## Support & Maintenance

### Monitoring
- Check Reports page daily for system health
- Monitor expiring licenses (7-day threshold)
- Review transaction logs for anomalies

### Troubleshooting
- Verify RLS policies if access issues occur
- Check admin_users table for user permissions
- Review license_transactions for audit trail
- Test RPC functions via SQL queries

### Future Enhancements
- Email notifications for expiring licenses
- Automated renewal reminders
- Subscription management (auto-renew)
- Multi-year discounts
- License transfer between organizations

## Technical Details

### Technology Stack
- React + TypeScript (Frontend)
- Supabase (Database + Auth)
- Tailwind CSS (Styling)
- Lucide React (Icons)

### File Structure
```
src/
├── pages/
│   ├── LicenseOverview.tsx      - Main license listing
│   ├── VoucherManagement.tsx    - Voucher CRUD operations
│   ├── ManualGrants.tsx         - Manual license creation
│   └── LicenseReports.tsx       - Analytics and reports
├── types/
│   └── license.ts               - TypeScript type definitions
├── utils/
│   └── license.ts               - Utility functions
├── hooks/
│   └── useLicense.ts            - React hooks for license ops
supabase/migrations/
├── create_license_management_system.sql
├── create_license_rpc_functions.sql
└── migrate_premium_schools_to_licenses.sql
```

### Dependencies
- @supabase/supabase-js - Supabase client
- react-router-dom - Routing
- lucide-react - Icons

## Version History

### v1.0.0 (2026-02-20)
- Initial release
- Multi-product license management
- Voucher system
- Manual grants
- Reports and analytics
- PHP integration support
- Storage upgrade automation
- Data migration from premium_school flag
