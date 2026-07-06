# 3AMMM — Worship App (React Native + MongoDB)

Two folders in this zip:
- **`3ammm-server/`** — Node.js / Express REST API backed by MongoDB Atlas
- **`3ammm-app/`** — Expo React Native app that talks to that API

---

## Architecture

```
Phone (Expo App)
     │  HTTP/JSON requests
     ▼
Express API  (your computer or a cloud server)
     │  Mongoose ODM
     ▼
MongoDB Atlas  (free cloud database)
```

---

## Step 1 — Create MongoDB Atlas (free, 5 min)

1. Go to **https://www.mongodb.com/atlas** → Create a free account
2. Click **Build a Database** → choose **Free (M0)** tier → Create
3. **Security Quickstart:**
   - Create a DB user: username + strong password → **Create User**
   - Add IP `0.0.0.0/0` (allow all) for development → **Add Entry**
4. Click **Connect** → **Drivers** → copy the connection string  
   It looks like: `mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/`

---

## Step 2 — Set up the server

```bash
cd 3ammm-server

# Copy the env template
cp .env.example .env
```

Open `.env` and fill in:

```env
MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/3ammm?retryWrites=true&w=majority
JWT_SECRET=any_long_random_string_here
PORT=5000
```

Then:

```bash
npm install

# Seed the database with admin + 6 sample songs
node src/seed.js

# Start the server
npm run dev
```

You should see:
```
✅ MongoDB connected: cluster0.xxxxx.mongodb.net
🚀 3AMMM API running on port 5000
```

Test it: open **http://localhost:5000/health** in your browser → should return `{"status":"ok"}`

---

## Step 3 — Find your computer's IP address

The phone needs to reach your computer over WiFi. Find your local IP:

- **Windows:** Open Command Prompt → `ipconfig` → look for **IPv4 Address** (e.g. `192.168.1.45`)
- **Mac:** Open Terminal → `ipconfig getifaddr en0` (e.g. `192.168.1.45`)

Make sure your phone and computer are on the **same WiFi network**.

---

## Step 4 — Update the app's API URL

Open `3ammm-app/src/lib/api.ts` and change:

```ts
export const API_URL = 'http://192.168.1.100:5000';
```

to your actual IP:

```ts
export const API_URL = 'http://192.168.1.45:5000';  // ← your IP here
```

---

## Step 5 — Run the app on your phone

```bash
cd 3ammm-app
npm install
npx expo start
```

- Scan the QR code with **Expo Go** app
- Login: `admin@3ammm.com` / `admin123`

---

## Project Structure

### Server (`3ammm-server/`)
```
src/
├── index.js              ← Express app entry
├── config/db.js          ← MongoDB connection (with retries)
├── models/
│   ├── User.js           ← User schema (password + Google OAuth)
│   ├── Song.js           ← Song + lyrics schema
│   ├── Setlist.js        ← Setlist schema
│   ├── Favorite.js       ← Favorites + Notifications
│   └── Feedback.js       ← User feedback
├── routes/
│   ├── auth.js           ← POST /login, /register, /google, GET /me
│   ├── songs.js          ← Full CRUD (admin write, all read)
│   ├── setlists.js       ← Full CRUD (admin write, all read)
│   ├── favorites.js      ← Toggle favorites per user
│   ├── users.js          ← Admin: list members + stats
│   └── feedback.js       ← Submit + admin view feedback
├── middleware/auth.js    ← JWT protect + adminOnly guards
└── seed.js               ← Creates admin + sample songs + setlists
api/index.js              ← Vercel serverless entry
vercel.json               ← Vercel routing config
```

### App (`3ammm-app/`)
```
src/
├── lib/
│   ├── api.ts            ← All API calls (fetch wrapper + token)
│   ├── AppContext.tsx    ← Auth state, language toggle
│   └── i18n.ts           ← English + Amharic translations
├── theme/index.ts        ← Brand colors (#043954, #87ceeb, #fbb040)
├── components/
│   ├── UI.tsx            ← Buttons, inputs, stat cards, etc.
│   └── (SongRow, SetlistCard in screens)
├── screens/
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   ├── LyricsScreen.tsx  ← Full-screen lyrics + heart toggle
│   ├── admin/
│   │   ├── AdminDashboard.tsx   ← Stats + tabs
│   │   ├── AdminSongsTab.tsx    ← Add/edit/delete songs
│   │   └── AdminSetlistsTab.tsx ← Build/edit/delete setlists
│   └── worshiper/
│       ├── HomeTab.tsx
│       ├── SongsTab.tsx
│       └── OtherTabs.tsx  ← Setlists, Favorites, Notifications
└── navigation/WorshiperApp.tsx  ← Bottom tab nav
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Login → returns JWT |
| GET | /api/auth/me | ✅ | Get current user |
| GET | /api/songs | ✅ | All songs (filter by singer/search) |
| GET | /api/songs/singers | ✅ | Unique singer names |
| POST | /api/songs | Admin | Create song |
| PUT | /api/songs/:id | Admin | Edit song |
| DELETE | /api/songs/:id | Admin | Delete song |
| GET | /api/setlists | ✅ | All setlists (with songs) |
| POST | /api/setlists | Admin | Create setlist |
| PUT | /api/setlists/:id | Admin | Edit setlist |
| DELETE | /api/setlists/:id | Admin | Delete setlist |
| GET | /api/favorites | ✅ | My favorite songs |
| POST | /api/favorites/:songId | ✅ | Toggle favorite |
| GET | /api/notifications | ✅ | All notifications |
| GET | /api/users | Admin | All members |
| GET | /api/users/stats | Admin | Dashboard stats |

---

## Deploying to the cloud (so team can use anywhere)

Deploy the server to **Vercel** (free tier). See **`VERCEL_DEPLOYMENT.md`** for full steps.

1. Go to [vercel.com/new](https://vercel.com/new) → Import GitHub repo
2. Set **Root Directory** to `3ammm-server`
3. Add environment variables (`MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`)
4. Deploy and copy your URL (e.g. `https://3ammm-api.vercel.app`)
5. Update `3ammm-app/src/lib/env.ts` with that URL
6. Rebuild with `eas build`

---

## Building for Play Store / App Store

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android   # .aab for Play Store
eas build --platform ios       # .ipa for App Store
```
