const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

// Initialize database tables
async function initializeDatabase() {
  try {
    // Products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255),
        price DECIMAL(10, 2) NOT NULL,
        stock INTEGER DEFAULT 0,
        description TEXT,
        standard_equipment JSONB,
        specs JSONB,
        images TEXT[],
        options JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Brands table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        logo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        product_id INTEGER REFERENCES products(id),
        product_name VARCHAR(255) NOT NULL,
        product_brand VARCHAR(255),
        product_price DECIMAL(10, 2),
        selected_options JSONB,
        price_breakdown JSONB,
        total_excl_vat DECIMAL(10, 2),
        total_incl_vat DECIMAL(10, 2),
        customer_info JSONB NOT NULL,
        product_images TEXT[],
        product_description TEXT,
        product_specs JSONB,
        product_standard_equipment JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings table (for shop logo)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Admin users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables initialized');
    
    // After tables are created, initialize admin user
    if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
      try {
        const checkResult = await pool.query(
          'SELECT * FROM admin_users WHERE username = $1',
          [process.env.ADMIN_USERNAME]
        );
        
        if (checkResult.rows.length === 0) {
          // Create admin user
          await pool.query(
            'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)',
            [process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD]
          );
          console.log(`Admin user created: ${process.env.ADMIN_USERNAME}`);
        } else {
          // Update password if user exists
          await pool.query(
            'UPDATE admin_users SET password_hash = $1 WHERE username = $2',
            [process.env.ADMIN_PASSWORD, process.env.ADMIN_USERNAME]
          );
          console.log(`Admin user password updated: ${process.env.ADMIN_USERNAME}`);
        }
      } catch (err) {
        console.error('Error initializing admin user:', err);
      }
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Initialize on startup
initializeDatabase();

// Authentication middleware
const authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // In production, verify JWT token here
    // For now, using simple token check
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE password_hash = $1',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.admin = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Public API Routes

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get all brands
app.get('/api/brands', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM brands ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// Get brand by name
app.get('/api/brands/name/:name', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM brands WHERE name = $1', [req.params.name]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({ error: 'Failed to fetch brand' });
  }
});

// Get shop logo
app.get('/api/settings/logo', async (req, res) => {
  try {
    const result = await pool.query('SELECT value FROM settings WHERE key = $1', ['shop_logo']);
    res.json({ logo: result.rows[0]?.value || '' });
  } catch (error) {
    console.error('Error fetching logo:', error);
    res.status(500).json({ error: 'Failed to fetch logo' });
  }
});

// Create order (public)
app.post('/api/orders', async (req, res) => {
  try {
    const order = req.body;
    const orderNumber = `ORD-${Date.now()}`;
    
    const result = await pool.query(`
      INSERT INTO orders (
        order_number, product_id, product_name, product_brand, product_price,
        selected_options, price_breakdown, total_excl_vat, total_incl_vat,
        customer_info, product_images, product_description, product_specs,
        product_standard_equipment, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      orderNumber,
      order.productId,
      order.productName,
      order.productBrand,
      order.productPrice,
      JSON.stringify(order.selectedOptions || {}),
      JSON.stringify(order.priceBreakdown || []),
      order.totalExclVAT,
      order.totalInclVAT,
      JSON.stringify(order.customerInfo),
      order.productImages || [],
      order.productDescription,
      JSON.stringify(order.productSpecs || {}),
      JSON.stringify(order.productStandardEquipment || []),
      'pending'
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Admin API Routes (require authentication)

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Simple password check (in production, use bcrypt)
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // For now, simple password check (replace with bcrypt in production)
    if (result.rows[0].password_hash !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Return token (in production, use JWT)
    res.json({ token: result.rows[0].password_hash, username: result.rows[0].username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get all orders (admin only)
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY date DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID (admin only)
app.get('/api/admin/orders/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order status (admin only)
app.patch('/api/admin/orders/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Delete order (admin only)
app.delete('/api/admin/orders/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Product management (admin only)
app.post('/api/admin/products', authenticateAdmin, async (req, res) => {
  try {
    const product = req.body;
    const result = await pool.query(`
      INSERT INTO products (name, category, price, stock, description, standard_equipment, specs, images, options)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      product.name,
      product.category,
      product.price,
      product.stock,
      product.description,
      JSON.stringify(product.standardEquipment || []),
      JSON.stringify(product.specs || {}),
      product.images || [],
      JSON.stringify(product.options || [])
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = req.body;
    const result = await pool.query(`
      UPDATE products 
      SET name = $1, category = $2, price = $3, stock = $4, description = $5,
          standard_equipment = $6, specs = $7, images = $8, options = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [
      product.name,
      product.category,
      product.price,
      product.stock,
      product.description,
      JSON.stringify(product.standardEquipment || []),
      JSON.stringify(product.specs || {}),
      product.images || [],
      JSON.stringify(product.options || []),
      req.params.id
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Brand management (admin only)
app.post('/api/admin/brands', authenticateAdmin, async (req, res) => {
  try {
    const brand = req.body;
    const result = await pool.query(`
      INSERT INTO brands (name, logo)
      VALUES ($1, $2)
      RETURNING *
    `, [brand.name, brand.logo]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Brand already exists' });
    }
    console.error('Error creating brand:', error);
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

app.put('/api/admin/brands/:id', authenticateAdmin, async (req, res) => {
  try {
    const brand = req.body;
    const result = await pool.query(`
      UPDATE brands 
      SET name = $1, logo = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [brand.name, brand.logo, req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating brand:', error);
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

app.delete('/api/admin/brands/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM brands WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ error: 'Failed to delete brand' });
  }
});

// Settings management (admin only)
app.put('/api/admin/settings/logo', authenticateAdmin, async (req, res) => {
  try {
    const { logo } = req.body;
    await pool.query(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('shop_logo', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP
    `, [logo || '']);
    res.json({ message: 'Logo updated successfully' });
  } catch (error) {
    console.error('Error updating logo:', error);
    res.status(500).json({ error: 'Failed to update logo' });
  }
});

// Migration endpoint (admin only - for one-time data migration)
app.post('/api/admin/migrate-localstorage', authenticateAdmin, async (req, res) => {
  try {
    // Get data from request body (sent from frontend)
    const exportedData = req.body;
    
    if (!exportedData || (!exportedData.products && !exportedData.brands && !exportedData.orders)) {
      return res.status(400).json({ error: 'Invalid data. Expected products, brands, orders, or logo.' });
    }
    const results = { products: 0, brands: 0, orders: 0, logo: false, errors: [] };

    // Migrate Products
    if (exportedData.products && exportedData.products.length > 0) {
      for (const product of exportedData.products) {
        try {
          const existing = await pool.query('SELECT id FROM products WHERE id = $1', [product.id]);
          if (existing.rows.length === 0) {
            await pool.query(`
              INSERT INTO products (id, name, category, price, stock, description, standard_equipment, specs, images, options)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
              parseInt(product.id) || null,
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
            results.products++;
          }
        } catch (err) {
          results.errors.push(`Product "${product.name}": ${err.message}`);
        }
      }
    }

    // Migrate Brands
    if (exportedData.brands && exportedData.brands.length > 0) {
      for (const brand of exportedData.brands) {
        try {
          const existing = await pool.query('SELECT id FROM brands WHERE name = $1', [brand.name]);
          if (existing.rows.length === 0) {
            await pool.query('INSERT INTO brands (name, logo) VALUES ($1, $2)', [brand.name, brand.logo]);
            results.brands++;
          }
        } catch (err) {
          results.errors.push(`Brand "${brand.name}": ${err.message}`);
        }
      }
    }

    // Migrate Orders
    if (exportedData.orders && exportedData.orders.length > 0) {
      for (const order of exportedData.orders) {
        try {
          const existing = await pool.query('SELECT id FROM orders WHERE order_number = $1', [order.orderNumber]);
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
            results.orders++;
          }
        } catch (err) {
          results.errors.push(`Order "${order.orderNumber}": ${err.message}`);
        }
      }
    }

    // Migrate Shop Logo
    if (exportedData.logo) {
      try {
        await pool.query(`
          INSERT INTO settings (key, value, updated_at)
          VALUES ('shop_logo', $1, CURRENT_TIMESTAMP)
          ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP
        `, [exportedData.logo]);
        results.logo = true;
      } catch (err) {
        results.errors.push(`Logo: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Migration completed',
      results: results
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed', message: error.message });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch all handler for SPA routing (serve index.html for non-API routes)
app.get('*', (req, res) => {
  // Don't serve HTML for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', req.path));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
