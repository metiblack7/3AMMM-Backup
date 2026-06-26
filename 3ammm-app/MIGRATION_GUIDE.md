# Migration Guide: Offline-First Architecture

## What Changed?

Your app now has:
1. **Offline support** - Works without internet using cached data
2. **Automatic sync** - Updates data when online
3. **Better search** - Precise character-by-character search
4. **Production ready** - Configuration for deployment

## Files Added

```
src/lib/
├── db.ts           # Offline database (AsyncStorage wrapper)
├── env.ts          # Environment configuration
├── network.ts      # Network status detection
└── sync.ts         # Auto-sync service

App Documentation:
├── OFFLINE_ARCHITECTURE.md      # How offline mode works
├── BUILD_FOR_PRODUCTION.md      # How to build APK
└── src/screens/worshiper/SongsTab.tsx  # Updated with offline UI

Server Documentation:
├── PRODUCTION.md   # Production deployment guide
```

## Files Modified

### Client (`3ammm-app`)
1. **src/lib/api.ts**
   - Added offline fallback
   - Uses local cache when API fails
   - Automatic caching of songs/setlists

2. **src/lib/AppContext.tsx**
   - Initializes sync service
   - Tracks online/offline status
   - Triggers initial sync

3. **src/screens/worshiper/SongsTab.tsx**
   - Added offline indicator
   - Improved search algorithm
   - Better error handling

### Server (`3ammm-server`)
1. **src/index.js**
   - Production CORS configuration
   - Environment-based setup
   - Better error handling

2. **src/routes/songs.js**
   - Precise search algorithm
   - Character-by-character matching
   - Multiple search strategies

## How to Use

### For Development

1. **Install dependencies:**
   ```bash
   cd 3ammm-app
   npm install
   cd ../3ammm-server
   npm install
   ```

2. **Start server:**
   ```bash
   cd 3ammm-server
   npm start
   ```
   Should output: `🚀 3AMMM API running on port 5000`

3. **Start app:**
   ```bash
   cd 3ammm-app
   npm start
   # Choose iOS or Android
   ```

4. **Test offline mode:**
   - Load app with internet on
   - Turn off WiFi/data
   - Verify songs still work
   - Turn internet back on
   - Verify automatic sync

### For Production

1. **Update API URL:**
   ```typescript
   // src/lib/env.ts
   const API_URLS = {
     production: 'https://your-api.com',  // Your production URL
   };
   ```

2. **Deploy server:**
   - Set environment variables
   - Deploy to cloud (Heroku, AWS, etc.)
   - Test endpoints

3. **Build APK:**
   ```bash
   eas build --platform android
   ```

## Offline Mode Details

### What works offline?
- ✅ View songs (from cache)
- ✅ Search songs (client-side)
- ✅ View setlists (from cache)
- ✅ Add to favorites (stored locally)
- ✅ Change settings (font size, theme)
- ✅ View lyrics

### What doesn't work offline?
- ❌ Login/Register (no new users offline)
- ❌ Upload new songs (requires admin + server)
- ❌ Admin functions (requires server)
- ❌ Real-time notifications (no network)

### Auto-sync behavior
- Syncs every 5 minutes when online
- Syncs immediately when network comes back
- Syncs on app start if online
- Shows sync status in UI

## Search Improvements

The search now uses three strategies:

1. **Exact substring** (most precise)
   - Query: "mery" matches "Merry Christmas"
   
2. **Word-by-word** (word starts with query)
   - Query: "joy" matches "Joy to the World"
   
3. **Fuzzy** (character-by-character)
   - Query: "jy" matches "Joy"

Works both online and offline!

## Configuration

### Development
- API points to your local IP
- Debug logs enabled
- CORS allows all origins

### Production
- API points to your server
- Debug logs disabled
- CORS restricted to allowed domains
- HTTPS required

## Database Schema Notes

The offline cache stores:
- **Songs**: title, lyrics, singerName, category, key
- **Setlists**: name, description, songs (array of IDs)
- **Favorites**: array of song IDs
- **Sync timestamps**: when data was last synced

Data persists until app is uninstalled.

## Monitoring

Check these things in production:

1. **Sync health:**
   - Monitor sync frequency
   - Track failed syncs
   - Alert on timeout

2. **Network detection:**
   - Verify online/offline status is accurate
   - Test on various networks
   - Test with network interruptions

3. **Cache size:**
   - Monitor AsyncStorage usage
   - Keep under 100MB
   - Consider data pagination

4. **API performance:**
   - Monitor endpoint response times
   - Track error rates
   - Monitor database queries

## Troubleshooting

### Offline mode doesn't work
- Make sure songs loaded at least once online
- Check if data was cached (use phone settings > app > storage)
- Try uninstall and reinstall

### Search doesn't work offline
- Verify songs are in cache
- Check if search query is valid
- Try simpler search terms

### Sync not happening
- Check network connection
- Verify API URL is correct
- Check server is running
- Look at console for errors

### App crashing
- Check for network errors in console
- Make sure server is online
- Check API endpoints respond
- Clear app cache and try again

## Next Steps

1. Test the app thoroughly offline
2. Deploy to production
3. Gather user feedback
4. Monitor performance
5. Consider enhancements:
   - IndexedDB for larger datasets
   - Background sync
   - Download manager
   - Sync scheduling

## Support

For issues:
1. Check console logs: `adb logcat | grep 3AMMM`
2. Check server logs: `tail -f server.log`
3. Verify network: Check `getNetworkStatus()` in console
4. Review error messages in offline indicator

## Questions?

Refer to:
- `OFFLINE_ARCHITECTURE.md` - How offline works
- `BUILD_FOR_PRODUCTION.md` - How to build APK
- `PRODUCTION.md` - Server deployment
- Console logs - For debugging
