# How to Get External Database URL from Railway

The internal URL (`postgres.railway.internal`) only works inside Railway's network. For local migration, you need the **external/public** URL.

## Steps:

1. Go to your Railway project: https://railway.app
2. Click on your **PostgreSQL** service (the database)
3. Go to **"Variables"** tab
4. Look for `DATABASE_URL` - there might be two:
   - One with `.internal` (internal - won't work locally)
   - One WITHOUT `.internal` (external - use this one!)

5. The external URL should look like:
   ```
   postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
   ```
   OR
   ```
   postgresql://postgres:password@monorail.proxy.rlwy.net:5432/railway
   ```

6. Copy that external URL and update your `.env` file

## Alternative: Use Railway CLI

If you have Railway CLI installed:
```bash
railway variables
```

This will show all variables including the external DATABASE_URL.
