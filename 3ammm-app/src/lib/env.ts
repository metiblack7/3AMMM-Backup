/**
 * Environment configuration for offline-first app
 * Supports development and production modes
 */

export type Environment = 'development' | 'production';

const ENV: Environment = __DEV__ ? 'development' : 'production';
// Platform-aware default API host for development:
// - web -> localhost (typical for `npm start` with server on same machine)
// - android emulator -> 10.0.2.2 (Android emulator host loopback)
// - ios simulator / other -> localhost
import { Platform } from 'react-native';

const platformDefaultDevHost = (() => {
  if (Platform.OS === 'web') return 'http://localhost:5000';
  if (Platform.OS === 'android') return 'http://10.0.2.2:5000';
  // iOS simulator and other native platforms can usually reach host via localhost
  return 'http://localhost:5000';
})();

// ── API Configuration ────────────────────────────────────────────────
// In development: use local network IP
// In production: use your server's public IP/domain

const API_URLS = {
  development: process.env.EXPO_PUBLIC_API_URL || platformDefaultDevHost,
  production: process.env.EXPO_PUBLIC_API_URL || 'https://sabaserver.vercel.app',
} as const;

export const API_URL = API_URLS[ENV];
// ── Google Auth Configuration ────────────────────────────────────
// Web client ID for Google OAuth
export const GOOGLE_AUTH_CLIENT_ID =
  "991044441560-iop8dkjg2drcs0vi105fe8j2t71g6dc2.apps.googleusercontent.com";
// ── Feature Flags ────────────────────────────────────────────────────
export const FEATURES = {
  OFFLINE_MODE: true,
  AUTO_SYNC: true,
  DEBUG_LOGS: __DEV__,
};

// Dev-time notice about API URL — run after FEATURES is defined so `log()` can use FEATURES.DEBUG_LOGS
if (__DEV__ && !process.env.EXPO_PUBLIC_API_URL) {
  if (API_URL.includes('localhost') || API_URL.includes('10.0.2.2')) {
    log(
      'Development API URL not set via EXPO_PUBLIC_API_URL — using',
      API_URL,
      '\nNote: If you run the app on a physical device, set EXPO_PUBLIC_API_URL to your computer LAN IP so the device can reach the backend.',
    );
  } else {
    log('Using EXPO_PUBLIC_API_URL =', API_URL);
  }
}

// ── Sync Configuration ───────────────────────────────────────────────
export const SYNC_CONFIG = {
  INTERVAL_MS: 5 * 60 * 1000, // Sync every 5 minutes when online
  TIMEOUT_MS: 10000, // Request timeout
  RETRY_COUNT: 3,
  RETRY_DELAY_MS: 1000,
};

// ── Cache Configuration ──────────────────────────────────────────────
export const CACHE_CONFIG = {
  MAX_SONGS_CACHE: 5000,
  MAX_SETLISTS_CACHE: 500,
  CACHE_DURATION_MS: 24 * 60 * 60 * 1000, // 24 hours
};

// ── Logging Helper ──────────────────────────────────────────────────
export function log(...args: any[]) {
  if (FEATURES.DEBUG_LOGS) {
    console.log('[3AMMM]', ...args);
  }
}

export function logError(...args: any[]) {
  console.error('[3AMMM ERROR]', ...args);
}
