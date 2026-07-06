# 🚀 Vercel Deployment Guide

Deploy the 3AMMM API from the **`3ammm-server`** folder.

## Prerequisites

- [Vercel account](https://vercel.com) (free tier works)
- GitHub repo with this project pushed
- [MongoDB Atlas](https://mongodb.com/cloud/atlas) cluster (free tier)

---

## Step 1 — MongoDB Atlas

1. Create a free cluster at MongoDB Atlas
2. Add database user + password
3. Allow network access: `0.0.0.0/0` (required for Vercel serverless)
4. Copy your connection string, e.g.  
   `mongodb+srv://user:password@cluster.mongodb.net/3ammm?retryWrites=true&w=majority`

---

## Step 2 — Deploy to Vercel

### Option A: Vercel Dashboard (recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. **Root Directory:** set to `3ammm-server`
4. **Framework Preset:** Other
5. Add environment variables:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | Long random string (`openssl rand -base64 32`) |
| `JWT_EXPIRES_IN` | `30d` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `*` (or your app domain) |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth secret |
| `GOOGLE_REDIRECT_URI` | `com.ammm.worship://` |

6. Click **Deploy**

### Option B: Vercel CLI

```bash
npm install -g vercel
cd 3ammm-server
vercel login
vercel
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel --prod
```

---

## Step 3 — Test the deployment

After deploy, Vercel gives you a URL like `https://3ammm-api.vercel.app`.

```bash
curl https://YOUR-PROJECT.vercel.app/health
```

Expected response:

```json
{
  "status": "ok",
  "app": "3AMMM API",
  "environment": "production",
  "timestamp": "..."
}
```

---

## Step 4 — Update the mobile app

Edit `3ammm-app/src/lib/env.ts`:

```typescript
const API_URLS = {
  development: 'http://localhost:5000',
  production: 'https://YOUR-PROJECT.vercel.app',
};
```

Or set at build time via EAS:

```bash
EXPO_PUBLIC_API_URL=https://YOUR-PROJECT.vercel.app eas build --platform android
```

---

## Local development

Vercel is for production. Run locally with:

```bash
cd 3ammm-server
cp .env.example .env
npm install
npm run dev
```

---

## Troubleshooting

### 500 on first request (cold start)
Normal on serverless — MongoDB connects on first invocation. Retry after a few seconds.

### Database connection failed
- Check `MONGODB_URI` in Vercel → Settings → Environment Variables
- Ensure Atlas allows `0.0.0.0/0`
- URL-encode special characters in the password

### CORS errors
Set `CORS_ORIGIN=*` or your exact frontend origin in Vercel env vars.

### Function timeout
The `vercel.json` sets `maxDuration: 30`. Upgrade Vercel plan if you need longer.

---

## Project layout

```
3ammm-server/
├── api/index.js      ← Vercel serverless entry
├── vercel.json       ← Vercel routing config
├── src/index.js      ← Express app (also used locally)
└── src/config/db.js  ← MongoDB with serverless connection cache
```

---

**Your API is live on Vercel.** Update the app's production URL and rebuild the APK.
