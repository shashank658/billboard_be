import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import * as schema from './schema/index.js';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Define all permissions by module
const permissionsData = [
  // Dashboard
  { name: 'dashboard.view', module: 'dashboard', action: 'view', description: 'View dashboard' },

  // Billboards
  { name: 'billboards.view', module: 'billboards', action: 'view', description: 'View billboards' },
  { name: 'billboards.create', module: 'billboards', action: 'create', description: 'Create billboards' },
  { name: 'billboards.edit', module: 'billboards', action: 'edit', description: 'Edit billboards' },
  { name: 'billboards.delete', module: 'billboards', action: 'delete', description: 'Delete billboards' },

  // Locations (Regions, Cities, Zones)
  { name: 'locations.view', module: 'locations', action: 'view', description: 'View locations' },
  { name: 'locations.create', module: 'locations', action: 'create', description: 'Create locations' },
  { name: 'locations.edit', module: 'locations', action: 'edit', description: 'Edit locations' },
  { name: 'locations.delete', module: 'locations', action: 'delete', description: 'Delete locations' },

  // Landlords
  { name: 'landlords.view', module: 'landlords', action: 'view', description: 'View landlords' },
  { name: 'landlords.create', module: 'landlords', action: 'create', description: 'Create landlords' },
  { name: 'landlords.edit', module: 'landlords', action: 'edit', description: 'Edit landlords' },
  { name: 'landlords.delete', module: 'landlords', action: 'delete', description: 'Delete landlords' },

  // Customers
  { name: 'customers.view', module: 'customers', action: 'view', description: 'View customers' },
  { name: 'customers.create', module: 'customers', action: 'create', description: 'Create customers' },
  { name: 'customers.edit', module: 'customers', action: 'edit', description: 'Edit customers' },
  { name: 'customers.delete', module: 'customers', action: 'delete', description: 'Delete customers' },

  // Taxes
  { name: 'taxes.view', module: 'taxes', action: 'view', description: 'View taxes' },
  { name: 'taxes.create', module: 'taxes', action: 'create', description: 'Create taxes' },
  { name: 'taxes.edit', module: 'taxes', action: 'edit', description: 'Edit taxes' },
  { name: 'taxes.delete', module: 'taxes', action: 'delete', description: 'Delete taxes' },

  // Bookings
  { name: 'bookings.view', module: 'bookings', action: 'view', description: 'View bookings' },
  { name: 'bookings.create', module: 'bookings', action: 'create', description: 'Create bookings' },
  { name: 'bookings.edit', module: 'bookings', action: 'edit', description: 'Edit bookings' },
  { name: 'bookings.delete', module: 'bookings', action: 'delete', description: 'Delete bookings' },

  // Campaigns
  { name: 'campaigns.view', module: 'campaigns', action: 'view', description: 'View campaigns' },
  { name: 'campaigns.create', module: 'campaigns', action: 'create', description: 'Create campaigns' },
  { name: 'campaigns.edit', module: 'campaigns', action: 'edit', description: 'Edit campaigns' },
  { name: 'campaigns.delete', module: 'campaigns', action: 'delete', description: 'Delete campaigns' },

  // Purchase Orders
  { name: 'purchase_orders.view', module: 'purchase_orders', action: 'view', description: 'View purchase orders' },
  { name: 'purchase_orders.create', module: 'purchase_orders', action: 'create', description: 'Create purchase orders' },
  { name: 'purchase_orders.edit', module: 'purchase_orders', action: 'edit', description: 'Edit purchase orders' },
  { name: 'purchase_orders.delete', module: 'purchase_orders', action: 'delete', description: 'Delete purchase orders' },

  // Invoices
  { name: 'invoices.view', module: 'invoices', action: 'view', description: 'View invoices' },
  { name: 'invoices.create', module: 'invoices', action: 'create', description: 'Create invoices' },
  { name: 'invoices.edit', module: 'invoices', action: 'edit', description: 'Edit invoices' },
  { name: 'invoices.delete', module: 'invoices', action: 'delete', description: 'Delete invoices' },

  // Audit Media
  { name: 'audit_media.view', module: 'audit_media', action: 'view', description: 'View audit media' },
  { name: 'audit_media.upload', module: 'audit_media', action: 'upload', description: 'Upload audit media' },
  { name: 'audit_media.delete', module: 'audit_media', action: 'delete', description: 'Delete audit media' },

  // Reports
  { name: 'reports.view', module: 'reports', action: 'view', description: 'View reports' },
  { name: 'reports.export', module: 'reports', action: 'export', description: 'Export reports' },

  // Users
  { name: 'users.view', module: 'users', action: 'view', description: 'View users' },
  { name: 'users.create', module: 'users', action: 'create', description: 'Create users' },
  { name: 'users.edit', module: 'users', action: 'edit', description: 'Edit users' },
  { name: 'users.delete', module: 'users', action: 'delete', description: 'Delete users' },

  // Roles (RBAC)
  { name: 'roles.view', module: 'roles', action: 'view', description: 'View roles' },
  { name: 'roles.create', module: 'roles', action: 'create', description: 'Create roles' },
  { name: 'roles.edit', module: 'roles', action: 'edit', description: 'Edit roles' },
  { name: 'roles.delete', module: 'roles', action: 'delete', description: 'Delete roles' },

  // Settings
  { name: 'settings.view', module: 'settings', action: 'view', description: 'View settings' },
  { name: 'settings.edit', module: 'settings', action: 'edit', description: 'Edit settings' },

  // Import
  { name: 'import.execute', module: 'import', action: 'execute', description: 'Execute bulk imports' },
];

// Define default roles
const rolesData = [
  { name: 'Super Admin', description: 'Full system access with RBAC management', isSystem: true },
  { name: 'Sales', description: 'Manage bookings, customers, and campaigns', isSystem: false },
  { name: 'Accounts', description: 'Manage PO, invoicing, and payment tracking', isSystem: false },
  { name: 'Operations', description: 'Manage audit media and operations', isSystem: false },
  { name: 'Customer', description: 'View-only portal access for customers', isSystem: false },
];

// Define role-permission mappings
const rolePermissionMapping: Record<string, string[]> = {
  'Super Admin': permissionsData.map(p => p.name), // All permissions
  'Sales': [
    'dashboard.view',
    'billboards.view',
    'locations.view',
    'customers.view', 'customers.create', 'customers.edit',
    'bookings.view', 'bookings.create', 'bookings.edit',
    'campaigns.view', 'campaigns.create', 'campaigns.edit',
    'reports.view', 'reports.export',
  ],
  'Accounts': [
    'dashboard.view',
    'billboards.view',
    'customers.view',
    'bookings.view',
    'purchase_orders.view', 'purchase_orders.create', 'purchase_orders.edit',
    'invoices.view', 'invoices.create', 'invoices.edit',
    'taxes.view', 'taxes.create', 'taxes.edit',
    'reports.view', 'reports.export',
  ],
  'Operations': [
    'dashboard.view',
    'billboards.view',
    'locations.view',
    'bookings.view',
    'audit_media.view', 'audit_media.upload', 'audit_media.delete',
    'reports.view',
  ],
  'Customer': [
    'dashboard.view',
    'bookings.view',
    'invoices.view',
    'audit_media.view',
  ],
};

// Default system settings
const settingsData = [
  {
    key: 'invoice_prefix',
    value: { prefix: 'INV', separator: '-' },
    description: 'Invoice number prefix and separator'
  },
  {
    key: 'booking_prefix',
    value: { prefix: 'BK', separator: '-' },
    description: 'Booking reference prefix and separator'
  },
  {
    key: 'campaign_prefix',
    value: { prefix: 'CP', separator: '-' },
    description: 'Campaign reference prefix and separator'
  },
  {
    key: 'po_prefix',
    value: { prefix: 'PO', separator: '-' },
    description: 'Purchase order number prefix and separator'
  },
  {
    key: 'company_info',
    value: {
      name: 'Billboard Management Co.',
      address: '',
      phone: '',
      email: '',
      gst_number: '',
      pan_number: '',
      bank_name: '',
      bank_account: '',
      ifsc_code: '',
    },
    description: 'Company information for invoices'
  },
  {
    key: 'invoice_settings',
    value: {
      due_days: 30,
      terms_and_conditions: 'Payment is due within 30 days of invoice date.',
      footer_text: 'Thank you for your business!',
    },
    description: 'Invoice generation settings'
  },
  {
    key: 'default_tax_id',
    value: { tax_id: null },
    description: 'Default tax for new invoices'
  },
];

// Default taxes
const taxesData = [
  { name: 'GST 18%', percentage: '18.00', hsnSacCode: '998365', description: 'Goods and Services Tax at 18%', isActive: true },
  { name: 'IGST 18%', percentage: '18.00', hsnSacCode: '998365', description: 'Integrated GST for interstate transactions', isActive: true },
  { name: 'GST 12%', percentage: '12.00', hsnSacCode: '998365', description: 'Goods and Services Tax at 12%', isActive: true },
  { name: 'GST 5%', percentage: '5.00', hsnSacCode: '998365', description: 'Goods and Services Tax at 5%', isActive: true },
];

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // 1. Create permissions
    console.log('📝 Creating permissions...');
    const insertedPermissions = await db.insert(schema.permissions).values(permissionsData).returning();
    console.log(`   ✓ Created ${insertedPermissions.length} permissions\n`);

    // Create permission name to ID mapping
    const permissionMap = new Map(insertedPermissions.map(p => [p.name, p.id]));

    // 2. Create roles
    console.log('👥 Creating roles...');
    const insertedRoles = await db.insert(schema.roles).values(rolesData).returning();
    console.log(`   ✓ Created ${insertedRoles.length} roles\n`);

    // Create role name to ID mapping
    const roleMap = new Map(insertedRoles.map(r => [r.name, r.id]));

    // 3. Assign permissions to roles
    console.log('🔗 Assigning permissions to roles...');
    const rolePermissions: { roleId: string; permissionId: string }[] = [];

    for (const [roleName, permissionNames] of Object.entries(rolePermissionMapping)) {
      const roleId = roleMap.get(roleName);
      if (!roleId) continue;

      for (const permName of permissionNames) {
        const permId = permissionMap.get(permName);
        if (permId) {
          rolePermissions.push({ roleId, permissionId: permId });
        }
      }
    }

    await db.insert(schema.rolePermissions).values(rolePermissions);
    console.log(`   ✓ Created ${rolePermissions.length} role-permission assignments\n`);

    // 4. Create super admin user
    console.log('👤 Creating super admin user...');
    const passwordHash = await bcrypt.hash('admin123', 12);
    const [adminUser] = await db.insert(schema.users).values({
      email: 'admin@billboard.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
      isCustomer: false,
    }).returning();
    console.log(`   ✓ Created admin user: admin@billboard.com\n`);

    // 5. Assign super admin role to admin user
    console.log('🔐 Assigning super admin role...');
    const superAdminRoleId = roleMap.get('Super Admin');
    if (superAdminRoleId) {
      await db.insert(schema.userRoles).values({
        userId: adminUser.id,
        roleId: superAdminRoleId,
      });
      console.log(`   ✓ Assigned Super Admin role to admin user\n`);
    }

    // 6. Create default taxes
    console.log('💰 Creating default taxes...');
    const insertedTaxes = await db.insert(schema.taxes).values(taxesData).returning();
    console.log(`   ✓ Created ${insertedTaxes.length} taxes\n`);

    // 7. Create system settings
    console.log('⚙️  Creating system settings...');
    await db.insert(schema.systemSettings).values(settingsData);
    console.log(`   ✓ Created ${settingsData.length} system settings\n`);

    console.log('✅ Database seed completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   - ${insertedPermissions.length} permissions`);
    console.log(`   - ${insertedRoles.length} roles`);
    console.log(`   - ${rolePermissions.length} role-permission assignments`);
    console.log(`   - 1 admin user (admin@billboard.com / admin123)`);
    console.log(`   - ${insertedTaxes.length} taxes`);
    console.log(`   - ${settingsData.length} system settings`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
