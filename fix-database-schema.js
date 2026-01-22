// Script to fix database schema - change INTEGER to BIGINT for product IDs
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixSchema() {
  try {
    console.log('Fixing database schema...\n');

    // Check current column type
    const checkProducts = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'id'
    `);

    if (checkProducts.rows.length > 0 && checkProducts.rows[0].data_type === 'integer') {
      console.log('Converting products.id from INTEGER to BIGINT...');
      
      // This is complex - we need to:
      // 1. Create new table with BIGINT
      // 2. Copy data
      // 3. Drop old table
      // 4. Rename new table
      
      await pool.query(`
        ALTER TABLE products 
        ALTER COLUMN id TYPE BIGINT USING id::BIGINT
      `);
      console.log('✓ Products table updated');
    } else {
      console.log('Products table already uses BIGINT or doesn\'t exist');
    }

    // Check orders.product_id
    const checkOrders = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'product_id'
    `);

    if (checkOrders.rows.length > 0 && checkOrders.rows[0].data_type === 'integer') {
      console.log('Converting orders.product_id from INTEGER to BIGINT...');
      await pool.query(`
        ALTER TABLE orders 
        ALTER COLUMN product_id TYPE BIGINT USING product_id::BIGINT
      `);
      console.log('✓ Orders table updated');
    } else {
      console.log('Orders.product_id already uses BIGINT or doesn\'t exist');
    }

    // Update sequence to BIGINT if needed
    try {
      await pool.query(`
        ALTER SEQUENCE products_id_seq AS BIGINT
      `);
      console.log('✓ Products sequence updated to BIGINT');
    } catch (e) {
      // Sequence might already be bigint or not exist
      console.log('Products sequence already correct or doesn\'t exist');
    }

    console.log('\n✅ Schema fix completed!');
    console.log('You can now run the migration again.\n');

  } catch (error) {
    console.error('Error fixing schema:', error);
  } finally {
    await pool.end();
  }
}

fixSchema();
