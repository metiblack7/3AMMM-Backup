# Google Authentication Integration Guide

## Overview
Your Saba app now has Google Sign-In integration with two main login options:
1. **Sign in with Google** - OAuth-based authentication
2. **Continue without login** - Guest access to browse content

## What Was Implemented

### Frontend Changes

#### 1. **Environment Configuration** (`src/lib/env.ts`)
- Added `GOOGLE_AUTH_CLIENT_ID` with your Web Client ID
- Client ID: `204274728519-mjf0vtp5jj8gjltcff1ts8g5dv4lsn9v.apps.googleusercontent.com`

#### 2. **Google Auth Utility** (`src/lib/googleAuth.ts`)
- New utility module for handling Google OAuth flow
- Implements OAuth 2.0 with PKCE (Proof Key for Code Exchange) for security
- Handles authorization URL generation and browser-based auth flow
- Uses `expo-web-browser` and `expo-crypto` for secure authentication

#### 3. **AppContext Updates** (`src/lib/AppContext.tsx`)
- Added `signInWithGoogle()` method to authentication context
- Integrates Google OAuth flow with your existing auth system
- Automatically creates/links user accounts based on Google email
- Handles profile saving and token management

#### 4. **API Integration** (`src/lib/api.ts`)
- Added `api.auth.googleAuth()` endpoint for backend communication
- Sends authorization code to backend for token exchange

#### 5. **Login Screen Redesign** (`src/screens/LoginScreen.tsx`)
- Primary buttons:
  - "Continue with Google" - OAuth login
  - "Continue without login" - Guest access
- Collapsible email/password login section ("Use Email & Password" toggle)
- Clean, modern UI matching your existing design
- Proper error handling and loading states

### Backend Changes

#### 1. **User Model Updates** (`3ammm-server/src/models/User.js`)
- Added optional Google OAuth fields:
  - `googleId` - Google's user ID
  - `googleEmail` - Email used for Google auth
- Made password field optional for OAuth users
- Updated pre-save hook to only hash passwords if provided

#### 2. **Google Auth Endpoint** (`3ammm-server/src/routes/auth.js`)
- New `POST /api/auth/google` endpoint
- Handles OAuth authorization code exchange
- Fetches user information from Google
- Creates or links user accounts
- Returns JWT token for authenticated requests

## Production Setup Required

### 1. **Google Cloud Console Configuration**
You need to set up your Google OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application type)
5. Add your redirect URIs:
   - Development: `com.ammm.worship://` (for Expo development)
   - Production: Your actual app scheme

### 2. **Environment Variables for Backend**
Add these to your `.env` file in `3ammm-server/`:

```env
GOOGLE_CLIENT_ID=204274728519-mjf0vtp5jj8gjltcff1ts8g5dv4lsn9v.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret_from_google_console
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
```

### 3. **App Configuration** (`app.json`)
Update your app scheme in `app.json`:

```json
{
  "expo": {
    "scheme": "com.ammm.worship",
    "plugins": [
      ["expo-auth-session", {
        "googleClientId": "204274728519-mjf0vtp5jj8gjltcff1ts8g5dv4lsn9v.apps.googleusercontent.com"
      }]
    ]
  }
}
```

## Testing the Implementation

### Local Development
```bash
# Frontend
cd 3ammm-app
npx expo start

# Backend
cd 3ammm-server
npm start
```

### Test Flow
1. Launch the app
2. On LoginScreen, tap "Continue with Google"
3. Browser opens with Google login
4. User authenticates with Google account
5. Redirects back to app with JWT token
6. User is logged in with their Google account

## OAuth Flow Diagram

```
User App
  ↓
Click "Sign in with Google"
  ↓
Open Browser (OAuth Authorization URL)
  ↓
User logs in to Google
  ↓
Google redirects with Authorization Code
  ↓
Frontend sends code to Backend
  ↓
Backend exchanges code for Access Token + ID Token
  ↓
Backend fetches user info from Google
  ↓
Backend creates/links user account
  ↓
Backend returns JWT token
  ↓
Frontend stores token & creates session
  ↓
User is authenticated ✅
```

## Guest Login Implementation

The "Continue without login" button is prepared but needs implementation in AppContext. To enable it:

1. Add guest mode state to AppContext
2. Create temporary guest profile
3. Allow browsing without authentication
4. Show prompt to sign in/register when user tries to save favorites

## Security Notes

- ✅ PKCE (Proof Key for Code Exchange) implemented for client authentication
- ✅ OAuth code exchange happens server-side (secure)
- ✅ JWT tokens stored in AsyncStorage with expiration
- ✅ Optional password-based login still available as fallback
- ⚠️ TODO: Implement HTTPS redirect URI for production
- ⚠️ TODO: Add state parameter validation for CSRF protection
- ⚠️ TODO: Implement token refresh logic

## File Changes Summary

**Created:**
- `3ammm-app/src/lib/googleAuth.ts` - OAuth utility module

**Modified:**
- `3ammm-app/src/lib/env.ts` - Added Google Client ID
- `3ammm-app/src/lib/AppContext.tsx` - Added Google sign-in
- `3ammm-app/src/lib/api.ts` - Added googleAuth API method
- `3ammm-app/src/screens/LoginScreen.tsx` - Redesigned UI
- `3ammm-server/src/models/User.js` - Added OAuth fields
- `3ammm-server/src/routes/auth.js` - Added /api/auth/google endpoint

## Next Steps

1. **Get Google Client Secret:**
   - Go back to Google Cloud Console
   - Get your OAuth 2.0 Client Secret
   - Add to backend `.env` as `GOOGLE_CLIENT_SECRET`

2. **Configure Redirect URI:**
   - Update `GOOGLE_REDIRECT_URI` in backend `.env`
   - Should match your app's scheme

3. **Implement Guest Mode:**
   - Add guest profile to AppContext
   - Handle guest-only features (favorites, setlists)

4. **Testing:**
   - Test on Android and iOS
   - Test account linking (existing user with Google)
   - Test error scenarios

5. **Deploy:**
   - Build production APK with configured credentials
   - Update backend environment variables
   - Test with production Google OAuth credentials

## Troubleshooting

**"Invalid Google token"**
- Verify Google Client Secret in backend `.env`
- Check redirect URI matches configured URI in Google Console

**"Failed to exchange authorization code"**
- Check Google Client ID matches in frontend and backend
- Verify authorization code hasn't expired (very short-lived)
- Check backend network access to `oauth2.googleapis.com`

**OAuth redirect not working**
- Ensure `expo-web-browser` is properly installed
- Check app scheme is configured in `app.json`
- Verify redirect URI format matches expectations

## Support Resources

- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)
- [Expo Auth Session Docs](https://docs.expo.dev/guides/authentication/)
- [OAuth 2.0 PKCE](https://tools.ietf.org/html/rfc7636)
