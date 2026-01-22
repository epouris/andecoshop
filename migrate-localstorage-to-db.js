// Migration script to transfer data from localStorage to PostgreSQL
const { Pool } = require('pg');
require('dotenv').config();

// Read localStorage data from a browser export or manual input
// Since we can't access browser localStorage from Node.js, we'll create a script
// that you can run in the browser console to export data, then import it here

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateData() {
  try {
    console.log('Starting migration from localStorage to PostgreSQL...\n');

    // First, let's create a way to get the data
    // Option 1: Export from browser console (see instructions below)
    // Option 2: Read from a JSON file if you export it
    
    console.log('='.repeat(60));
    console.log('STEP 1: Export your localStorage data');
    console.log('='.repeat(60));
    console.log('\nOpen your browser console (F12) and run this code:\n');
    console.log(`
const data = {
  products: JSON.parse(localStorage.getItem('andecomarine.shop_products') || '[]'),
  brands: JSON.parse(localStorage.getItem('andecomarine.shop_brands') || '[]'),
  orders: JSON.parse(localStorage.getItem('andecomarine.shop_orders') || '[]'),
  logo: localStorage.getItem('andecomarine.shop_logo') || ''
};

console.log(JSON.stringify(data, null, 2));
// Copy the output and save it to a file named 'localstorage-export.json'
    `);
    console.log('\nLooking for export file...\n');
    
    // Check if the file exists
    const fs = require('fs');
    const path = require('path');
    const exportFile = path.join(__dirname, 'localstorage-export.json');
    
    if (!fs.existsSync(exportFile)) {
      console.log('\n❌ File "localstorage-export.json" not found!');
      console.log('Please create it first using the browser console code above.\n');
      process.exit(1);
    }

    // Read the exported data
    const exportedData = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    
    console.log('\n✅ Found export file!');
    console.log(`- Products: ${exportedData.products?.length || 0}`);
    console.log(`- Brands: ${exportedData.brands?.length || 0}`);
    console.log(`- Orders: ${exportedData.orders?.length || 0}`);
    console.log(`- Logo: ${exportedData.logo ? 'Yes' : 'No'}\n`);

    // Migrate Products
    if (exportedData.products && exportedData.products.length > 0) {
      console.log('Migrating products...');
      for (const product of exportedData.products) {
        try {
          // Check if product already exists by name (since we're not preserving IDs)
          const existing = await pool.query(
            'SELECT id FROM products WHERE name = $1 AND category = $2',
            [product.name, product.category]
          );

          if (existing.rows.length === 0) {
            // Don't try to preserve old ID - let database generate new one
            // This avoids integer overflow issues with large timestamp-based IDs
            await pool.query(`
              INSERT INTO products (name, category, price, stock, description, standard_equipment, specs, images, options)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              product.name,
              product.category,
              product.price,
              product.stock || 0,
              product.description,
              JSON.stringify(product.standardEquipment || []),
              JSON.stringify(product.specs || {}),
              product.images || [],
              JSON.stringify(product.options || [])
            ]);
            console.log(`  ✓ Migrated product: ${product.name}`);
          } else {
            console.log(`  - Skipped (exists): ${product.name}`);
          }
        } catch (err) {
          console.error(`  ✗ Error migrating product "${product.name}":`, err.message);
        }
      }
    }

    // Migrate Brands
    if (exportedData.brands && exportedData.brands.length > 0) {
      console.log('\nMigrating brands...');
      for (const brand of exportedData.brands) {
        try {
          // Check if brand already exists
          const existing = await pool.query(
            'SELECT id FROM brands WHERE name = $1',
            [brand.name]
          );

          if (existing.rows.length === 0) {
            await pool.query(`
              INSERT INTO brands (name, logo)
              VALUES ($1, $2)
            `, [brand.name, brand.logo]);
            console.log(`  ✓ Migrated brand: ${brand.name}`);
          } else {
            console.log(`  - Skipped (exists): ${brand.name}`);
          }
        } catch (err) {
          console.error(`  ✗ Error migrating brand "${brand.name}":`, err.message);
        }
      }
    }

    // Migrate Orders
    if (exportedData.orders && exportedData.orders.length > 0) {
      console.log('\nMigrating orders...');
      for (const order of exportedData.orders) {
        try {
          // Check if order already exists
          const existing = await pool.query(
            'SELECT id FROM orders WHERE order_number = $1',
            [order.orderNumber]
          );

          if (existing.rows.length === 0) {
            await pool.query(`
              INSERT INTO orders (
                order_number, product_id, product_name, product_brand, product_price,
                selected_options, price_breakdown, total_excl_vat, total_incl_vat,
                customer_info, product_images, product_description, product_specs,
                product_standard_equipment, status, date
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            `, [
              order.orderNumber,
              order.productId ? parseInt(order.productId) : null,
              order.productName,
              order.productBrand,
              order.productPrice,
              JSON.stringify(order.selectedOptions || {}),
              JSON.stringify(order.priceBreakdown || []),
              order.totalExclVAT,
              order.totalInclVAT,
              JSON.stringify(order.customerInfo || {}),
              order.productImages || [],
              order.productDescription,
              JSON.stringify(order.productSpecs || {}),
              JSON.stringify(order.productStandardEquipment || []),
              order.status || 'pending',
              order.date ? new Date(order.date) : new Date()
            ]);
            console.log(`  ✓ Migrated order: ${order.orderNumber}`);
          } else {
            console.log(`  - Skipped (exists): ${order.orderNumber}`);
          }
        } catch (err) {
          console.error(`  ✗ Error migrating order "${order.orderNumber}":`, err.message);
        }
      }
    }

    // Migrate Shop Logo
    if (exportedData.logo) {
      console.log('\nMigrating shop logo...');
      try {
        await pool.query(`
          INSERT INTO settings (key, value, updated_at)
          VALUES ('shop_logo', $1, CURRENT_TIMESTAMP)
          ON CONFLICT (key) 
          DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP
        `, [exportedData.logo]);
        console.log('  ✓ Migrated shop logo');
      } catch (err) {
        console.error('  ✗ Error migrating logo:', err.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed!');
    console.log('='.repeat(60));
    console.log('\nYour data has been migrated to PostgreSQL.');
    console.log('You can now delete the localstorage-export.json file if you want.\n');

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pool.end();
  }
}

// Run migration
migrateData();
