# Deployment Instructions for AndecoMarine.shop

This guide will help you deploy your e-commerce website to Railway with PostgreSQL database.

## Prerequisites

1. A GitHub account
2. A Railway account (sign up at https://railway.app)
3. Git installed on your computer

## Step 1: Prepare Your Project

### 1.1 Move files to public folder

**On Windows:**
```bash
setup.bat
```

**On Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**Or manually:**
Create a `public` folder and move all your frontend files there:

```bash
mkdir public
move *.html public/        # Windows
# or
mv *.html public/          # Mac/Linux
move js public/            # Windows
# or
mv js public/              # Mac/Linux
move styles public/        # Windows
# or
mv styles public/          # Mac/Linux
```

### 1.2 Install dependencies

```bash
npm install
```

## Step 2: Set Up GitHub Repository

### 2.1 Initialize Git (if not already done)

```bash
git init
git add .
git commit -m "Initial commit"
```

### 2.2 Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `andecoshop`)
3. **DO NOT** initialize with README, .gitignore, or license

### 2.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/andecoshop.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Step 3: Deploy to Railway

### 3.1 Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub
5. Select your repository (`andecoshop`)

### 3.2 Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create a PostgreSQL database
4. Click on the database service
5. Go to the "Variables" tab
6. Copy the `DATABASE_URL` value (you'll need this)

### 3.3 Configure Environment Variables

1. Click on your web service (the one that's not the database)
2. Go to "Variables" tab
3. Add the following environment variables:

```
DATABASE_URL=<paste the DATABASE_URL from your database service>
NODE_ENV=production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<choose a strong password>
PORT=3000
```

**IMPORTANT**: 
- Replace `<choose a strong password>` with a secure password
- Keep your admin credentials safe!

### 3.4 Deploy

Railway will automatically detect your `package.json` and deploy your application. The deployment should start automatically.

## Step 4: Initialize Database and Admin User

### 4.1 Wait for Deployment

Wait for Railway to finish deploying (check the "Deployments" tab).

### 4.2 Run Database Initialization

1. Go to your web service in Railway
2. Click on the service
3. Go to "Settings" tab
4. Scroll down to "Run Command"
5. Run: `node init-db.js`

This will:
- Create all necessary database tables
- Create your admin user with the credentials you set

### 4.3 Verify Deployment

1. Go to your Railway project
2. Click on your web service
3. Click "Settings"
4. Find your domain (e.g., `your-app.railway.app`)
5. Visit the URL in your browser

## Step 5: Access Admin Panel

1. Visit `https://your-domain.railway.app/login.html`
2. Login with:
   - Username: `admin` (or what you set in ADMIN_USERNAME)
   - Password: The password you set in ADMIN_PASSWORD

## Step 6: Custom Domain (Optional)

1. In Railway, go to your web service
2. Click "Settings"
3. Scroll to "Domains"
4. Click "Generate Domain" or add your custom domain
5. Follow Railway's instructions for DNS configuration

## Troubleshooting

### Database Connection Issues

- Make sure `DATABASE_URL` is correctly set in environment variables
- Check that the database service is running in Railway
- Verify the connection string format: `postgresql://user:password@host:port/database`

### Admin Login Not Working

- Make sure you ran `node init-db.js` after deployment
- Check that `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set correctly
- Try running the init script again: `node init-db.js`

### Frontend Not Loading

- Make sure all HTML, JS, and CSS files are in the `public` folder
- Check Railway logs for any errors
- Verify the server is running on the correct port

### API Errors

- Check Railway logs for backend errors
- Verify database tables were created (check logs during initialization)
- Make sure CORS is enabled (it should be in server.js)

## Security Notes

1. **Change Default Admin Password**: After first login, consider implementing a password change feature
2. **Use Environment Variables**: Never commit `.env` file to GitHub
3. **HTTPS**: Railway provides HTTPS by default
4. **Database Backups**: Railway provides automatic backups for PostgreSQL

## Updating Your Site

1. Make changes to your code
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your update message"
   git push
   ```
3. Railway will automatically redeploy

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

## Database Schema

The following tables are automatically created:

- `products` - Product information
- `brands` - Brand information
- `orders` - Customer orders
- `settings` - Shop settings (logo, etc.)
- `admin_users` - Admin authentication

All tables are created automatically when the server starts.
