const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const https = require('https');
const http = require('http');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// Increase JSON payload limit to handle large base64 images (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255),
        price DECIMAL(10, 2) NOT NULL,
        stock INTEGER DEFAULT 0,
        description TEXT,
        standard_equipment JSONB,
        specs JSONB,
        images TEXT[],
        options JSONB,
        display_order INTEGER DEFAULT 0,
        pdf_photo TEXT,
        specs_columns INTEGER DEFAULT 1,
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
        product_id BIGINT REFERENCES products(id),
        product_name VARCHAR(255) NOT NULL,
        product_brand VARCHAR(255),
        product_price DECIMAL(10, 2),
        selected_options JSONB,
        price_breakdown JSONB,
        total_excl_vat DECIMAL(10, 2),
        total_incl_vat DECIMAL(10, 2),
        customer_info JSONB NOT NULL,
        product_images TEXT[],
        product_pdf_photo TEXT,
        product_description TEXT,
        product_specs JSONB,
        product_standard_equipment JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Queries table (contact form submissions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS queries (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(100),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    
    // Migrate existing schema if needed (fix INTEGER to BIGINT for product IDs)
    try {
      // Check products.id column type
      const productsCheck = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'id'
      `);
      
      if (productsCheck.rows.length > 0 && productsCheck.rows[0].data_type === 'integer') {
        console.log('Migrating products.id from INTEGER to BIGINT...');
        await pool.query(`
          ALTER TABLE products 
          ALTER COLUMN id TYPE BIGINT USING id::BIGINT
        `);
        // Update sequence
        await pool.query(`
          ALTER SEQUENCE products_id_seq AS BIGINT
        `);
        console.log('✓ Products.id migrated to BIGINT');
      }
      
      // Check orders.product_id column type
      const ordersCheck = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'product_id'
      `);
      
      if (ordersCheck.rows.length > 0 && ordersCheck.rows[0].data_type === 'integer') {
        console.log('Migrating orders.product_id from INTEGER to BIGINT...');
        await pool.query(`
          ALTER TABLE orders 
          ALTER COLUMN product_id TYPE BIGINT USING product_id::BIGINT
        `);
        console.log('✓ Orders.product_id migrated to BIGINT');
      }
    } catch (migrationError) {
      // Ignore migration errors (table might not exist yet or already migrated)
      console.log('Schema migration check completed (or not needed)');
    }
    
    // Add display_order column if it doesn't exist
    try {
      const displayOrderCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'display_order'
      `);
      
      if (displayOrderCheck.rows.length === 0) {
        console.log('Adding display_order column to products table...');
        await pool.query(`
          ALTER TABLE products 
          ADD COLUMN display_order INTEGER DEFAULT 0
        `);
        
        // Set display_order for existing products based on their id (so they maintain current order)
        await pool.query(`
          UPDATE products 
          SET display_order = id::INTEGER 
          WHERE display_order = 0
        `);
        console.log('✓ display_order column added and initialized');
      }
    } catch (migrationError) {
      console.log('display_order migration check completed (or not needed)');
    }
    
    // Add pdf_photo column if it doesn't exist
    try {
      const pdfPhotoCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'pdf_photo'
      `);
      
      if (pdfPhotoCheck.rows.length === 0) {
        console.log('Adding pdf_photo column to products table...');
        await pool.query(`
          ALTER TABLE products 
          ADD COLUMN pdf_photo TEXT
        `);
        console.log('✓ pdf_photo column added');
      }
    } catch (migrationError) {
      console.log('pdf_photo migration check completed (or not needed)');
    }
    
    // Add product_pdf_photo column to orders table if it doesn't exist
    try {
      const orderPdfPhotoCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'product_pdf_photo'
      `);
      
      if (orderPdfPhotoCheck.rows.length === 0) {
        console.log('Adding product_pdf_photo column to orders table...');
        await pool.query(`
          ALTER TABLE orders 
          ADD COLUMN product_pdf_photo TEXT
        `);
        console.log('✓ product_pdf_photo column added to orders');
      }
    } catch (migrationError) {
      console.log('orders.product_pdf_photo migration check completed (or not needed)');
    }
    
    // Add specs_columns column to products table if it doesn't exist
    try {
      const specsColumnsCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'specs_columns'
      `);
      
      if (specsColumnsCheck.rows.length === 0) {
        console.log('Adding specs_columns column to products table...');
        await pool.query(`
          ALTER TABLE products
          ADD COLUMN specs_columns INTEGER DEFAULT 1
        `);
        console.log('✓ specs_columns column added');
      }
      console.log('specs_columns migration check completed (or not needed)');
    } catch (error) {
      console.error('Error checking specs_columns column:', error);
    }
    
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

// Image proxy endpoint to bypass CORS
app.get('/api/image-proxy', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate URL
    let url;
    try {
      url = new URL(imageUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    // Only allow http/https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return res.status(400).json({ error: 'Invalid protocol' });
    }

    // Fetch image
    const protocol = url.protocol === 'https:' ? https : http;
    
    protocol.get(url.href, (response) => {
      if (response.statusCode !== 200) {
        return res.status(response.statusCode).json({ error: 'Failed to fetch image' });
      }

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Content-Type', response.headers['content-type'] || 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      // Pipe image data to response
      response.pipe(res);
    }).on('error', (error) => {
      console.error('Error fetching image:', error);
      res.status(500).json({ error: 'Failed to fetch image' });
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY display_order ASC, id ASC');
    // Convert database format to frontend format
    const products = result.rows.map(row => ({
      id: row.id.toString(),
      name: row.name,
      category: row.category,
      price: parseFloat(row.price),
      stock: row.stock,
      description: row.description,
      standardEquipment: row.standard_equipment || [],
      specs: row.specs || {},
      images: row.images || [],
      options: row.options || [],
      displayOrder: row.display_order || 0,
      pdfPhoto: row.pdf_photo || null,
      specsColumns: row.specs_columns || 1
    }));
    res.json(products);
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
    const row = result.rows[0];
    // Convert database format to frontend format
    const product = {
      id: row.id.toString(),
      name: row.name,
      category: row.category,
      price: parseFloat(row.price),
      stock: row.stock,
      description: row.description,
      standardEquipment: row.standard_equipment || [],
      specs: row.specs || {},
      images: row.images || [],
      options: row.options || [],
      displayOrder: row.display_order || 0,
      pdfPhoto: row.pdf_photo || null,
      specsColumns: row.specs_columns || 1
    };
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get all brands
app.get('/api/brands', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM brands ORDER BY name');
    // Convert database format to frontend format
    const brands = result.rows.map(row => ({
      id: row.id.toString(),
      name: row.name,
      logo: row.logo || ''
    }));
    res.json(brands);
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
        customer_info, product_images, product_pdf_photo, product_description, product_specs,
        product_standard_equipment, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
      null, // product_pdf_photo - no longer used, set to null
      order.productDescription,
      JSON.stringify(order.productSpecs || {}),
      JSON.stringify(order.productStandardEquipment || []),
      'pending'
    ]);
    
    // Convert database format (snake_case) to frontend format (camelCase)
    const row = result.rows[0];
    const orderResponse = {
      id: row.id.toString(),
      orderNumber: row.order_number,
      productId: row.product_id ? row.product_id.toString() : null,
      productName: row.product_name,
      productBrand: row.product_brand,
      productPrice: row.product_price ? parseFloat(row.product_price) : null,
      selectedOptions: typeof row.selected_options === 'string' ? JSON.parse(row.selected_options) : (row.selected_options || {}),
      priceBreakdown: typeof row.price_breakdown === 'string' ? JSON.parse(row.price_breakdown) : (row.price_breakdown || []),
      totalExclVAT: row.total_excl_vat ? parseFloat(row.total_excl_vat) : 0,
      totalInclVAT: row.total_incl_vat ? parseFloat(row.total_incl_vat) : 0,
      customerInfo: typeof row.customer_info === 'string' ? JSON.parse(row.customer_info) : (row.customer_info || {}),
      productImages: row.product_images || [],
      productPdfPhoto: row.product_pdf_photo || null,
      productDescription: row.product_description,
      productSpecs: typeof row.product_specs === 'string' ? JSON.parse(row.product_specs) : (row.product_specs || {}),
      productStandardEquipment: typeof row.product_standard_equipment === 'string' ? JSON.parse(row.product_standard_equipment) : (row.product_standard_equipment || []),
      status: row.status || 'pending',
      date: row.date || row.created_at
    };
    
    res.status(201).json(orderResponse);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Create contact query (public)
app.post('/api/queries', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const result = await pool.query(`
      INSERT INTO queries (name, email, phone, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      name.trim(),
      email.trim(),
      phone ? phone.trim() : null,
      message.trim()
    ]);

    const row = result.rows[0];
    res.status(201).json({
      id: row.id.toString(),
      name: row.name,
      email: row.email,
      phone: row.phone,
      message: row.message,
      createdAt: row.created_at
    });
  } catch (error) {
    console.error('Error creating query:', error);
    res.status(500).json({ error: 'Failed to submit query' });
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
    // Convert database format (snake_case) to frontend format (camelCase)
    const orders = result.rows.map(row => ({
      id: row.id.toString(),
      orderNumber: row.order_number,
      productId: row.product_id ? row.product_id.toString() : null,
      productName: row.product_name,
      productBrand: row.product_brand,
      productPrice: row.product_price ? parseFloat(row.product_price) : null,
      selectedOptions: row.selected_options || {},
      priceBreakdown: row.price_breakdown || [],
      totalExclVAT: row.total_excl_vat ? parseFloat(row.total_excl_vat) : 0,
      totalInclVAT: row.total_incl_vat ? parseFloat(row.total_incl_vat) : 0,
      customerInfo: row.customer_info || {},
      productImages: row.product_images || [],
      productDescription: row.product_description,
      productSpecs: row.product_specs || {},
      productStandardEquipment: row.product_standard_equipment || [],
      status: row.status || 'pending',
      date: row.date || row.created_at
    }));
    res.json(orders);
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
    const row = result.rows[0];
    // Convert database format (snake_case) to frontend format (camelCase)
    const order = {
      id: row.id.toString(),
      orderNumber: row.order_number,
      productId: row.product_id ? row.product_id.toString() : null,
      productName: row.product_name,
      productBrand: row.product_brand,
      productPrice: row.product_price ? parseFloat(row.product_price) : null,
      selectedOptions: row.selected_options || {},
      priceBreakdown: row.price_breakdown || [],
      totalExclVAT: row.total_excl_vat ? parseFloat(row.total_excl_vat) : 0,
      totalInclVAT: row.total_incl_vat ? parseFloat(row.total_incl_vat) : 0,
      customerInfo: row.customer_info || {},
      productImages: row.product_images || [],
      productDescription: row.product_description,
      productSpecs: row.product_specs || {},
      productStandardEquipment: row.product_standard_equipment || [],
      status: row.status || 'pending',
      date: row.date || row.created_at
    };
    res.json(order);
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
    const row = result.rows[0];
    // Convert database format (snake_case) to frontend format (camelCase)
    const order = {
      id: row.id.toString(),
      orderNumber: row.order_number,
      productId: row.product_id ? row.product_id.toString() : null,
      productName: row.product_name,
      productBrand: row.product_brand,
      productPrice: row.product_price ? parseFloat(row.product_price) : null,
      selectedOptions: row.selected_options || {},
      priceBreakdown: row.price_breakdown || [],
      totalExclVAT: row.total_excl_vat ? parseFloat(row.total_excl_vat) : 0,
      totalInclVAT: row.total_incl_vat ? parseFloat(row.total_incl_vat) : 0,
      customerInfo: row.customer_info || {},
      productImages: row.product_images || [],
      productDescription: row.product_description,
      productSpecs: row.product_specs || {},
      productStandardEquipment: row.product_standard_equipment || [],
      status: row.status || 'pending',
      date: row.date || row.created_at
    };
    res.json(order);
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

// Get all queries (admin only)
app.get('/api/admin/queries', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM queries ORDER BY created_at DESC');
    const queries = result.rows.map(row => ({
      id: row.id.toString(),
      name: row.name,
      email: row.email,
      phone: row.phone,
      message: row.message,
      createdAt: row.created_at
    }));
    res.json(queries);
  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
});

// Product management (admin only)
app.post('/api/admin/products', authenticateAdmin, async (req, res) => {
  try {
    const product = req.body;
    
    // Get the highest display_order and add 1 for new product
    const maxOrderResult = await pool.query('SELECT COALESCE(MAX(display_order), 0) as max_order FROM products');
    const newDisplayOrder = (maxOrderResult.rows[0].max_order || 0) + 1;
    
    const result = await pool.query(`
      INSERT INTO products (name, category, price, stock, description, standard_equipment, specs, images, options, display_order, pdf_photo, specs_columns)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
      product.displayOrder || newDisplayOrder,
      null, // pdf_photo - no longer used, set to null
      product.specsColumns || 1
    ]);
    
    // Convert database format to frontend format
    const row = result.rows[0];
    const productResponse = {
      id: row.id.toString(),
      name: row.name,
      category: row.category,
      price: parseFloat(row.price),
      stock: row.stock,
      description: row.description,
      standardEquipment: typeof row.standard_equipment === 'string' ? JSON.parse(row.standard_equipment) : (row.standard_equipment || []),
      specs: typeof row.specs === 'string' ? JSON.parse(row.specs) : (row.specs || {}),
      images: row.images || [],
      options: typeof row.options === 'string' ? JSON.parse(row.options) : (row.options || []),
      displayOrder: row.display_order || 0,
      pdfPhoto: row.pdf_photo || null,
      specsColumns: row.specs_columns || 1
    };
    
    res.status(201).json(productResponse);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = req.body;
    
    // Get current product values if needed
    let displayOrder = product.displayOrder;
    
    if (displayOrder === undefined) {
      const currentProduct = await pool.query('SELECT display_order FROM products WHERE id = $1', [req.params.id]);
      if (currentProduct.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      displayOrder = currentProduct.rows[0].display_order || 0;
    }
    
    const result = await pool.query(`
      UPDATE products 
      SET name = $1, category = $2, price = $3, stock = $4, description = $5,
          standard_equipment = $6, specs = $7, images = $8, options = $9,
          display_order = $10, pdf_photo = $11, specs_columns = $12, updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
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
      displayOrder,
      null, // pdf_photo - no longer used, set to null
      product.specsColumns || 1,
      req.params.id
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Convert database format to frontend format
    const row = result.rows[0];
    const productResponse = {
      id: row.id.toString(),
      name: row.name,
      category: row.category,
      price: parseFloat(row.price),
      stock: row.stock,
      description: row.description,
      standardEquipment: typeof row.standard_equipment === 'string' ? JSON.parse(row.standard_equipment) : (row.standard_equipment || []),
      specs: typeof row.specs === 'string' ? JSON.parse(row.specs) : (row.specs || {}),
      images: row.images || [],
      options: typeof row.options === 'string' ? JSON.parse(row.options) : (row.options || []),
      displayOrder: row.display_order || 0,
      pdfPhoto: row.pdf_photo || null,
      specsColumns: row.specs_columns || 1
    };
    
    res.json(productResponse);
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

// Update product order (admin only)
app.patch('/api/admin/products/:id/order', authenticateAdmin, async (req, res) => {
  try {
    const { direction } = req.body; // 'up' or 'down'
    const productId = req.params.id;
    
    // Get current product
    const currentProduct = await pool.query('SELECT display_order FROM products WHERE id = $1', [productId]);
    if (currentProduct.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const currentOrder = currentProduct.rows[0].display_order;
    let newOrder;
    
    if (direction === 'up') {
      // Find the product with the next lower order
      const swapProduct = await pool.query(
        'SELECT id, display_order FROM products WHERE display_order < $1 ORDER BY display_order DESC LIMIT 1',
        [currentOrder]
      );
      
      if (swapProduct.rows.length === 0) {
        return res.json({ message: 'Product is already at the top' });
      }
      
      newOrder = swapProduct.rows[0].display_order;
      const swapId = swapProduct.rows[0].id;
      
      // Swap orders
      await pool.query('UPDATE products SET display_order = $1 WHERE id = $2', [newOrder, productId]);
      await pool.query('UPDATE products SET display_order = $2 WHERE id = $1', [swapId, currentOrder]);
    } else if (direction === 'down') {
      // Find the product with the next higher order
      const swapProduct = await pool.query(
        'SELECT id, display_order FROM products WHERE display_order > $1 ORDER BY display_order ASC LIMIT 1',
        [currentOrder]
      );
      
      if (swapProduct.rows.length === 0) {
        return res.json({ message: 'Product is already at the bottom' });
      }
      
      newOrder = swapProduct.rows[0].display_order;
      const swapId = swapProduct.rows[0].id;
      
      // Swap orders
      await pool.query('UPDATE products SET display_order = $1 WHERE id = $2', [newOrder, productId]);
      await pool.query('UPDATE products SET display_order = $2 WHERE id = $1', [swapId, currentOrder]);
    } else {
      return res.status(400).json({ error: 'Invalid direction. Use "up" or "down"' });
    }
    
    res.json({ message: 'Product order updated successfully' });
  } catch (error) {
    console.error('Error updating product order:', error);
    res.status(500).json({ error: 'Failed to update product order' });
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
          // Check if product already exists by name (since we're not preserving old IDs)
          const existing = await pool.query(
            'SELECT id FROM products WHERE name = $1 AND category = $2',
            [product.name, product.category]
          );
          if (existing.rows.length === 0) {
            // Let database generate new ID (BIGSERIAL)
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
            // Try to find product by name if productId is too large
            let productId = null;
            if (order.productId) {
              try {
                const productIdNum = parseInt(order.productId);
                // Check if it's a valid integer range
                if (!isNaN(productIdNum) && productIdNum > 0 && productIdNum < 2147483647) {
                  const productResult = await pool.query('SELECT id FROM products WHERE id = $1', [productIdNum]);
                  if (productResult.rows.length > 0) {
                    productId = productIdNum;
                  }
                }
                // If ID is too large or not found, try to find by name
                if (!productId && order.productName) {
                  const productByName = await pool.query('SELECT id FROM products WHERE name = $1 LIMIT 1', [order.productName]);
                  if (productByName.rows.length > 0) {
                    productId = productByName.rows[0].id;
                  }
                }
              } catch (e) {
                // Ignore errors, productId will remain null
              }
            }
            
            await pool.query(`
              INSERT INTO orders (
                order_number, product_id, product_name, product_brand, product_price,
                selected_options, price_breakdown, total_excl_vat, total_incl_vat,
                customer_info, product_images, product_description, product_specs,
                product_standard_equipment, status, date
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            `, [
              order.orderNumber,
              productId,
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
