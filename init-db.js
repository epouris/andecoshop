// Script to initialize admin user
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initAdmin() {
  try {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'changeme123';
    
    // Check if admin exists
    const checkResult = await pool.query(
      'SELECT * FROM admin_users WHERE username = $1',
      [username]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('Admin user already exists');
      // Update password
      await pool.query(
        'UPDATE admin_users SET password_hash = $1 WHERE username = $2',
        [password, username]
      );
      console.log('Admin password updated');
    } else {
      // Create admin user
      await pool.query(
        'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)',
        [username, password]
      );
      console.log('Admin user created');
    }
    
    console.log(`Admin credentials: ${username} / ${password}`);
    console.log('IMPORTANT: Change these credentials in production!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error initializing admin:', error);
    process.exit(1);
  }
}

initAdmin();
