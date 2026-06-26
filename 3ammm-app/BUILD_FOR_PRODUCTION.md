# Building for Production & APK Export

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli` (for easier building)

## Building APK

### Option 1: Using EAS Build (Recommended)

1. **Authenticate with Expo:**
   ```bash
   eas login
   ```

2. **Configure EAS:**
   ```bash
   eas build:configure
   ```

3. **Update API URL for Production:**
   Edit `src/lib/env.ts`:
   ```typescript
   const API_URLS = {
     development: 'http://192.168.1.6:5000',
     production: 'https://your-production-api.com',  // Replace with your API
   };
   ```

4. **Build APK:**
   ```bash
   eas build --platform android --profile preview
   ```
   Or for release:
   ```bash
   eas build --platform android --profile production
   ```

5. **Download APK:**
   After build completes, follow the link to download the APK.

### Option 2: Local Build with Expo

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Update API URL:**
   Edit `src/lib/env.ts` to point to your production API.

3. **Build APK:**
   ```bash
   expo build:android
   ```

4. **Wait for build:**
   The process takes 10-30 minutes. Check status with:
   ```bash
   expo build:status
   ```

## Production Checklist

Before releasing to production:

### App Configuration
- [ ] Update API_URL in `src/lib/env.ts`
- [ ] Update app version in `app.json`
- [ ] Test offline mode thoroughly
- [ ] Test search with production data
- [ ] Test sync behavior
- [ ] Verify app works on multiple Android versions
- [ ] Test on both WiFi and cellular networks

### API Server
- [ ] Deploy to production server
- [ ] Set all environment variables
- [ ] Test all endpoints
- [ ] Configure CORS for your domain
- [ ] Set up SSL/TLS (HTTPS)
- [ ] Configure database backups
- [ ] Set up monitoring and logging

### Before Release
- [ ] Get keystore for signing APK
- [ ] Set app icon and splash screen
- [ ] Increment version code
- [ ] Create release notes
- [ ] Test APK on real devices

## Environment Configuration

### Development (Local)
```typescript
const API_URL = 'http://192.168.1.6:5000';
```

### Production
```typescript
const API_URL = 'https://api.3ammm.com'; // Your actual production URL
```

## Testing on Production

1. **Install APK on device:**
   ```bash
   adb install app-release.apk
   ```

2. **Test offline mode:**
   - Turn off WiFi/data
   - Verify app still works with cached data
   - Verify search works offline
   - Turn internet back on
   - Verify automatic sync

3. **Test network conditions:**
   - Test on slow network
   - Test with network interruptions
   - Monitor sync behavior

## Troubleshooting

### Build fails
- Clear expo cache: `expo prebuild --clean`
- Update dependencies: `npm install`
- Check Node version: `node --version` (should be 18+)

### APK won't install
- Check Android version (API 24+)
- Uninstall old version first
- Clear app data if upgrading

### Connection issues
- Verify API_URL in env.ts
- Test API endpoint manually
- Check firewall/network settings

## Performance Tips

1. **Disable debug logs in production:**
   - The app detects `__DEV__` and disables logs automatically

2. **Monitor app size:**
   - Current baseline: ~50-80 MB
   - Reduce by removing unused assets

3. **Optimize database size:**
   - Limit cached songs to 5000
   - Implement data pagination for large datasets

## Uploading to Play Store

1. Create Google Play Developer account
2. Generate signing keystore
3. Upload APK through Google Play Console
4. Set up store listing, screenshots, etc.
5. Submit for review

See: https://reactnative.dev/docs/signed-apk-android

## Monitoring Production

- Check server logs for errors
- Monitor sync frequency
- Track offline usage patterns
- Monitor data size on devices
- Set up alerts for API failures
