# Step-by-Step Deployment Guide

Follow these steps in order to deploy your AndecoMarine.shop website.

## 📋 Prerequisites Checklist

Before starting, make sure you have:
- [ ] Node.js installed (version 18 or higher) - Download from https://nodejs.org
- [ ] Git installed - Download from https://git-scm.com
- [ ] A GitHub account - Sign up at https://github.com
- [ ] A Railway account - Sign up at https://railway.app

---

## Step 1: Organize Your Project Files

### 1.1 Run the Setup Script

**On Windows:**
1. Open Command Prompt or PowerShell in your project folder
2. Run: `setup.bat`

**On Mac/Linux:**
1. Open Terminal in your project folder
2. Run:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

This will create a `public` folder and move all your HTML, JS, CSS files there.

### 1.2 Verify the Structure

After running the script, your folder should look like this:
```
AndecoShop/
├── public/
│   ├── *.html (all HTML files)
│   ├── js/
│   └── styles/
├── server.js
├── package.json
└── ... (other files)
```

---

## Step 2: Install Dependencies

1. Open Terminal/Command Prompt in your project folder
2. Run:
   ```bash
   npm install
   ```

This will install all required packages (Express, PostgreSQL client, etc.)

**Expected output:** You should see packages being downloaded. Wait until it finishes.

---

## Step 3: Test Locally (Optional but Recommended)

### 3.1 Create Local Database (Optional)

If you want to test locally first, you'll need PostgreSQL installed. Otherwise, skip to Step 4.

### 3.2 Create .env File

1. Copy the example file:
   ```bash
   # Windows
   copy .env.example .env
   
   # Mac/Linux
   cp .env.example .env
   ```

2. Open `.env` in a text editor and update it:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/andecoshop
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_secure_password_here
   NODE_ENV=development
   PORT=3000
   ```

   **Important:** Replace `your_secure_password_here` with a strong password!

### 3.3 Initialize Database

Run:
```bash
node init-db.js
```

**Expected output:** 
```
Database connected successfully
Database tables initialized
Admin user created
Admin credentials: admin / your_secure_password_here
```

### 3.4 Start the Server

Run:
```bash
npm start
```

**Expected output:**
```
Database connected successfully
Server running on port 3000
```

### 3.5 Test Your Website

1. Open your browser
2. Go to: `http://localhost:3000`
3. Try accessing admin: `http://localhost:3000/login.html`
4. Login with:
   - Username: `admin`
   - Password: (the password you set in .env)

If everything works, you're ready to deploy!

---

## Step 4: Push to GitHub

### 4.1 Initialize Git (if not already done)

1. Open Terminal/Command Prompt in your project folder
2. Run:
   ```bash
   git init
   ```

### 4.2 Create .gitignore (if not exists)

Make sure `.gitignore` includes:
```
node_modules/
.env
.DS_Store
*.log
```

### 4.3 Add and Commit Files

```bash
git add .
git commit -m "Initial commit - Ready for deployment"
```

### 4.4 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `andecoshop` (or any name you prefer)
3. **DO NOT** check "Initialize with README"
4. Click "Create repository"

### 4.5 Push to GitHub

GitHub will show you commands. Use these (replace `YOUR_USERNAME`):

```bash
git remote add origin https://github.com/YOUR_USERNAME/andecoshop.git
git branch -M main
git push -u origin main
```

You'll be asked for your GitHub username and password (or token).

**Expected output:** Files uploading to GitHub.

---

## Step 5: Deploy to Railway

### 5.1 Create Railway Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub (if first time)
5. Select your repository (`andecoshop`)

Railway will start deploying automatically.

### 5.2 Add PostgreSQL Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"**
3. Select **"Add PostgreSQL"**

Railway will create a PostgreSQL database for you.

### 5.3 Get Database URL

1. Click on the **PostgreSQL** service (the database you just created)
2. Go to the **"Variables"** tab
3. Find `DATABASE_URL`
4. **Copy the entire value** (it looks like: `postgresql://user:pass@host:port/dbname`)

### 5.4 Configure Environment Variables

1. Go back to your main service (the web service, not the database)
2. Click on it
3. Go to **"Variables"** tab
4. Click **"+ New Variable"**
5. Add these variables one by one:

   **Variable 1:**
   - Name: `DATABASE_URL`
   - Value: (paste the DATABASE_URL you copied)
   - Click "Add"

   **Variable 2:**
   - Name: `NODE_ENV`
   - Value: `production`
   - Click "Add"

   **Variable 3:**
   - Name: `ADMIN_USERNAME`
   - Value: `admin`
   - Click "Add"

   **Variable 4:**
   - Name: `ADMIN_PASSWORD`
   - Value: (choose a STRONG password - different from local!)
   - Click "Add"

   **Variable 5:**
   - Name: `PORT`
   - Value: `3000`
   - Click "Add"

### 5.5 Wait for Deployment

1. Go to the **"Deployments"** tab
2. Wait for the deployment to finish (green checkmark)
3. This may take 2-5 minutes

### 5.6 Initialize Database

1. Go to your web service
2. Click **"Settings"** tab
3. Scroll down to **"Run Command"** section
4. In the command box, type: `node init-db.js`
5. Click **"Run"**

**Expected output:**
```
Database connected successfully
Database tables initialized
Admin user created
Admin credentials: admin / (your password)
```

### 5.7 Get Your Website URL

1. Go to your web service
2. Click **"Settings"** tab
3. Scroll to **"Domains"** section
4. You'll see a URL like: `your-app.railway.app`
5. Click on it or copy it

---

## Step 6: Test Your Deployed Website

### 6.1 Test Public Pages

1. Visit your Railway URL: `https://your-app.railway.app`
2. Check if the homepage loads
3. Try browsing products

### 6.2 Test Admin Login

1. Go to: `https://your-app.railway.app/login.html`
2. Login with:
   - Username: `admin`
   - Password: (the password you set in Railway environment variables)
3. You should be redirected to the admin panel

### 6.3 Test Admin Functions

1. Try adding a product
2. Try adding a brand
3. Check if orders appear (create a test order from the public site)

---

## Step 7: Custom Domain (Optional)

### 7.1 Add Custom Domain in Railway

1. In Railway, go to your web service
2. Click **"Settings"**
3. Scroll to **"Domains"**
4. Click **"Custom Domain"**
5. Enter your domain (e.g., `andecoshop.com`)
6. Follow Railway's DNS instructions

### 7.2 Configure DNS

Railway will give you DNS records to add. Add them to your domain registrar.

---

## 🎉 You're Done!

Your website is now live! 

### Important Reminders:

1. **Keep your admin password safe** - You set it in Railway environment variables
2. **Don't share your Railway dashboard** - It has admin access
3. **Backup your database** - Railway provides automatic backups
4. **Monitor your usage** - Railway has free tier limits

---

## 🔧 Troubleshooting

### Website shows "Cannot GET /"
- Make sure all HTML files are in the `public` folder
- Check Railway logs for errors

### Database connection error
- Verify `DATABASE_URL` is correct in Railway variables
- Make sure the database service is running

### Admin login not working
- Make sure you ran `node init-db.js` in Railway
- Check that `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set correctly
- Try running `node init-db.js` again

### API errors
- Check Railway logs (click on your service → "Logs" tab)
- Verify database tables were created
- Make sure environment variables are set

### Need Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check Railway logs for specific error messages

---

## 📝 Quick Reference

**Your Admin Credentials:**
- Username: `admin`
- Password: (set in Railway environment variables)

**Important URLs:**
- Website: `https://your-app.railway.app`
- Admin Login: `https://your-app.railway.app/login.html`
- Admin Panel: `https://your-app.railway.app/admin.html`

**To Update Your Site:**
1. Make changes to your code
2. Commit: `git add . && git commit -m "Update"`
3. Push: `git push`
4. Railway will automatically redeploy

---

Good luck with your deployment! 🚀
