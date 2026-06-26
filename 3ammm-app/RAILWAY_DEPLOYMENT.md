# 🚀 Railway Deployment Guide

## Prerequisites
- Railway account (https://railway.app - free)
- GitHub account with your code pushed
- MongoDB Atlas account (https://mongodb.com/cloud/atlas - free tier)

---

## Step 1: Set Up MongoDB Atlas

1. Go to https://mongodb.com/cloud/atlas
2. Create a free account
3. Create a new project named "3ammm"
4. Create a free tier cluster
5. Add IP address `0.0.0.0/0` (allow all) for development
6. Create a database user with strong password
7. Click "Connect" → "Connect your application"
8. Copy the connection string
9. Replace `<password>` with your password

Example: `mongodb+srv://username:password@cluster.mongodb.net/3ammm?retryWrites=true&w=majority`

---

## Step 2: Push Code to GitHub

```bash
cd 3ammm-mongodb
git init
git add .
git commit -m "Initial commit - ready for Railway"
git remote add origin https://github.com/YOUR_USERNAME/3ammm-mongodb.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Railway

### Option A: Using Railway Dashboard (Easiest)

1. Go to https://railway.app/dashboard
2. Click "+ New Project"
3. Click "Deploy from GitHub repo"
4. Select your `3ammm-mongodb` repository
5. Select the `3ammm-server` directory (important!)
6. Railway will auto-detect `Procfile` and deploy

### Option B: Using Railway CLI

```bash
npm install -g @railway/cli
railway login
cd 3ammm-server
railway init
railway up
```

---

## Step 4: Configure Environment Variables

### In Railway Dashboard:

1. Go to your project
2. Click on the service
3. Click "Variables"
4. Add these environment variables:

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/3ammm?retryWrites=true&w=majority
JWT_SECRET=generate-with: openssl rand -base64 32
CORS_ORIGIN=https://your-production-domain.com
```

5. Click "Deploy"

---

## Step 5: Get Your API URL

1. In Railway dashboard, click your service
2. Click "Deployments" tab
3. Find the live deployment
4. The URL will be shown like: `https://3ammm-server-prod.up.railway.app`

---

## Step 6: Update App Configuration

Edit `3ammm-app/src/lib/env.ts`:

```typescript
const API_URLS = {
  development: 'http://192.168.1.6:5000',
  production: 'https://3ammm-server-prod.up.railway.app',  // Your Railway URL
};
```

---

## Step 7: Test the Connection

```bash
curl https://your-railway-url/health
```

Should return:
```json
{
  "status": "ok",
  "app": "3AMMM API",
  "environment": "production",
  "timestamp": "2026-05-28T..."
}
```

---

## Step 8: Build APK

```bash
cd 3ammm-app

# Make sure you've updated src/lib/env.ts with production URL

# Build for production
eas build --platform android --profile production
```

---

## Troubleshooting

### Deployment fails
- Check `git log` to ensure code is pushed
- Verify `Procfile` exists in `3ammm-server` directory
- Check Railway logs for errors

### API not responding
- Verify environment variables are set
- Check MongoDB connection string is correct
- Check CORS_ORIGIN is set correctly

### Network issues
- Ensure `0.0.0.0/0` IP is allowed in MongoDB Atlas
- Check firewall isn't blocking Railway
- Verify API URL has no typos

### Database connection error
- Test MongoDB URI locally first
- Verify password has no special characters (or is URL encoded)
- Check database user has right permissions

---

## Monitoring Your API

### View Logs
In Railway dashboard → Service → Logs tab

### Check Uptime
Railway automatically monitors and shows uptime

### Scaling (if needed)
Railway automatically scales - no configuration needed for free tier

---

## Cost

- **Railway**: Free tier (~$5 credit/month) includes:
  - Node.js server
  - PostgreSQL/MongoDB add-ons (limited)
  
- **MongoDB Atlas**: Free tier includes:
  - 512MB storage
  - Shared cluster

Total cost for this setup: **FREE** (or ~$5-10/month if you exceed free tier)

---

## Next Steps

1. ✅ Set up MongoDB Atlas
2. ✅ Push code to GitHub
3. ✅ Deploy to Railway
4. ✅ Update app configuration
5. ✅ Build APK
6. ✅ Test on device
7. ✅ Release to Play Store

---

## Useful Commands

```bash
# View deployment status
railway status

# View logs
railway logs

# Redeploy
railway up

# View environment variables
railway variables

# View project info
railway info
```

---

**Your API is now live on the internet!** 🎉

Update your app's production API URL and you're ready to deploy the APK.
