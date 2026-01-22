# AndecoMarine.shop

E-commerce platform for AndecoMarine.shop built with Node.js, Express, PostgreSQL, and vanilla JavaScript.

## Features

- Product catalog with brand management
- Customer order system
- Admin panel with authentication
- PDF order generation
- Responsive design

## Setup Instructions

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials:
```
DATABASE_URL=postgresql://user:password@localhost:5432/andecoshop
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

4. Start the server:
```bash
npm start
```

5. Initialize the database and admin user:
```bash
node init-db.js
```

6. Open http://localhost:3000 in your browser

### Deployment to Railway

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Project Structure

```
.
├── server.js          # Express server and API routes
├── package.json       # Dependencies and scripts
├── public/            # Frontend files (HTML, CSS, JS)
│   ├── index.html
│   ├── admin.html
│   ├── login.html
│   ├── js/
│   │   ├── api.js     # API client functions
│   │   ├── data.js    # Data layer (uses API)
│   │   └── ...
│   └── styles/
└── DEPLOYMENT.md      # Deployment guide
```

## API Endpoints

### Public Endpoints
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/brands` - Get all brands
- `GET /api/brands/name/:name` - Get brand by name
- `GET /api/settings/logo` - Get shop logo
- `POST /api/orders` - Create new order

### Admin Endpoints (Requires Authentication)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/orders` - Get all orders
- `PATCH /api/admin/orders/:id/status` - Update order status
- `DELETE /api/admin/orders/:id` - Delete order
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `POST /api/admin/brands` - Create brand
- `PUT /api/admin/brands/:id` - Update brand
- `DELETE /api/admin/brands/:id` - Delete brand
- `PUT /api/admin/settings/logo` - Update shop logo

## Database Schema

- `products` - Product information
- `brands` - Brand information
- `orders` - Customer orders
- `settings` - Shop settings
- `admin_users` - Admin authentication

## Security Notes

- Admin panel requires authentication
- Change default admin password after first deployment
- Use environment variables for sensitive data
- Never commit `.env` file to version control

## License

ISC
