# Railway Setup - Environment Variables

## Database URL

You have the internal URL. For your web service, you need the **external/public** DATABASE_URL.

### How to get the external DATABASE_URL:

1. In Railway, click on your **PostgreSQL** service
2. Go to **"Variables"** tab
3. Look for `DATABASE_URL` (there might be two - use the one that does NOT have `.internal` in it)
4. It should look like: `postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway`

**OR** if Railway only shows one DATABASE_URL, you can use the internal one you have, but you might need to ensure both services are in the same project.

## Environment Variables to Set

Go to your **web service** (not the database) → **Variables** tab → Add these:

### 1. DATABASE_URL
```
postgresql://postgres:cgkdPmKSqEvcLhjlTbJEZcJuZiOyoQGP@postgres.railway.internal:5432/railway
```
*(Use the external URL if available, otherwise this internal one should work)*

### 2. NODE_ENV
```
production
```

### 3. ADMIN_USERNAME
```
admin
```

### 4. ADMIN_PASSWORD
```
[Choose a STRONG password - write it down!]
```
**Example:** `MySecurePass123!@#`

### 5. PORT
```
3000
```

## After Setting Variables

1. Wait for deployment to finish
2. Go to web service → Settings → Run Command
3. Run: `node init-db.js`
4. Check the output - it should show admin credentials

## Your Admin Login

After running `init-db.js`, you'll be able to login at:
- URL: `https://your-app.railway.app/login.html`
- Username: `admin`
- Password: (the one you set in ADMIN_PASSWORD)
