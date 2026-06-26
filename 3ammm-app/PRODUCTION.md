# Production Environment Configuration

## Server Configuration

For production deployment, configure these environment variables:

### Database
```bash
MONGODB_URI=your_mongodb_connection_string
```

### Server
```bash
PORT=5000
NODE_ENV=production
```

### CORS (for allowing your deployed domain)
```bash
CORS_ORIGIN=https://yourdomain.com
```

### JWT Secret
```bash
JWT_SECRET=your_very_long_random_secret_key_min_32_chars
```

## Client Configuration

Update `src/lib/env.ts` in your React Native app:

```typescript
const API_URLS = {
  development: 'http://192.168.1.6:5000',
  production: 'https://your-production-api-url.com',
};
```

Replace `https://your-production-api-url.com` with your actual production API URL.

## Production Deployment Checklist

### Backend (Server)
- [ ] Set NODE_ENV=production
- [ ] Use a proper MongoDB database (Atlas, self-hosted, etc.)
- [ ] Set a strong JWT_SECRET (use `openssl rand -base64 32`)
- [ ] Configure CORS_ORIGIN to your frontend domain
- [ ] Use HTTPS for API endpoints
- [ ] Set up proper logging and monitoring
- [ ] Configure rate limiting
- [ ] Enable database backups
- [ ] Use environment variables (not hardcoded secrets)

### Mobile App (APK)
- [ ] Update API_URL in env.ts to production URL
- [ ] Build with `expo build:android` or `eas build --platform android`
- [ ] Test offline mode thoroughly
- [ ] Verify sync works with production server
- [ ] Test search functionality with production data
- [ ] Set app version and build number
- [ ] Enable code obfuscation/minification

## Testing the Offline-First Architecture

1. **Initial Load**: Connect to the internet, load the app
2. **Offline Mode**: Turn off internet, verify:
   - Songs are still accessible from cache
   - Search works with cached data
   - Favorites work locally
3. **Sync on Reconnect**: Turn internet back on
   - App automatically syncs data
   - Any local changes sync to server
4. **Network Detection**: Watch for:
   - Offline indicator when disconnected
   - Automatic refresh when online

## Notes

- The app uses AsyncStorage for offline cache
- Sync happens every 5 minutes when online
- Sync also triggers when network status changes from offline to online
- All data is automatically cached on first load
- Search is performed client-side for better offline support
