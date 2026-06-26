# 3AMMM App - Offline-First Architecture

## Overview

This app now functions seamlessly **online and offline**:
- When **online**: Automatically syncs data from the server
- When **offline**: Works with cached data stored locally
- **Automatic sync**: Detects network changes and syncs automatically every 5 minutes

## Key Features Implemented

### 1. Offline-First Architecture
- **Local Database**: Uses AsyncStorage for offline data storage
- **Automatic Sync**: Syncs songs, setlists, and favorites when online
- **Network Detection**: Automatically detects online/offline status
- **Offline Indicator**: Shows users when they're offline

### 2. Improved Song Search
- **Character-by-character matching**: Precise search algorithm
- **Multiple search strategies**:
  - Exact substring match (highest priority)
  - Word-by-word matching (word starts with query)
  - Fuzzy character matching
- **Works offline**: All search is performed locally

### 3. Production-Ready Configuration
- **Environment-based API URLs**: Dev vs Production
- **Proper error handling**: Graceful fallback to offline cache
- **Timeouts**: 10-second request timeout to prevent hanging
- **Retry logic**: Automatic retry on failures (server-side)

## File Structure

### Client Files
```
src/lib/
├── api.ts          # API with offline fallback
├── db.ts           # Offline database service
├── env.ts          # Environment configuration
├── network.ts      # Network status detection
├── sync.ts         # Sync service
└── AppContext.tsx  # Updated with sync initialization
```

### Server Files
```
src/routes/
├── songs.js        # Improved search algorithm
```

## Configuration

### For Development
File: `src/lib/env.ts`
```typescript
const API_URLS = {
  development: 'http://192.168.1.6:5000',  // Your local IP
  production: 'https://api.3ammm.com',     // Your production URL
};
```

### For Production
1. Update production API URL in `env.ts`
2. Set up your production MongoDB database
3. Deploy server to cloud (Heroku, AWS, etc.)
4. Build APK with `expo build:android` or `eas build --platform android`

## How It Works

### Online Mode
1. App loads and initializes sync service
2. Fetches data from server
3. Caches data locally for offline access
4. Every 5 minutes (or when network reconnects), syncs with server
5. Updates songs, setlists, and favorites

### Offline Mode
1. Network goes down, app detects it
2. Shows "Offline mode - Using cached data" indicator
3. All data is served from local cache
4. Search works with cached songs
5. User can add to favorites (stored locally)

### Reconnect
1. Network comes back online
2. App automatically triggers sync
3. Fetches latest data from server
4. Updates local cache
5. Removes offline indicator

## API Endpoints Still Required

The following endpoints remain the same:
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `GET /api/songs`
- `GET /api/songs/singers`
- `GET /api/songs/:id`
- `GET /api/setlists`
- `GET /api/favorites/ids`
- `POST /api/favorites/:songId`

## Testing

### Test Offline Functionality
1. Load the app with internet on
2. Verify songs load and cache
3. Turn off WiFi/data
4. Verify songs still work
5. Verify search works offline
6. Turn internet back on
7. Verify automatic sync happens

### Test Search
1. Try searching for song titles
2. Try searching for parts of titles
3. Try searching for lyrics
4. Test fuzzy search (missing letters)
5. Test offline search

## Known Limitations

- Favorites are synced, but not fully persistent across devices (depends on server implementation)
- Large databases (10k+ songs) may take time to sync
- Search is client-side only (good for offline, but not ideal for very large databases)

## Performance Tips

- First sync may take 10-30 seconds depending on data size
- Subsequent syncs only fetch new/updated data
- Search is instant (runs locally)
- Cache persists until app is uninstalled

## Troubleshooting

### App not syncing
- Check network connectivity
- Check server is running
- Check API_URL is correct
- Check console for errors

### Search not working
- Make sure songs are loaded in cache
- Try clearing search and trying again
- Check offline indicator status

### Offline mode not working
- Make sure internet is actually off
- Check if data was cached (load at least once online)
- Check AsyncStorage permissions in app settings

## Next Steps

1. Build and test on Android
2. Monitor sync performance
3. Add analytics to track offline usage
4. Consider adding IndexedDB for larger datasets
5. Add push notifications for sync updates
