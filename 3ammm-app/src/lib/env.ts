/**
 * Environment configuration for offline-first app
 * Supports development and production modes
 */

export type Environment = 'development' | 'production';

const ENV: Environment = __DEV__ ? 'development' : 'production';

// ── API Configuration ────────────────────────────────────────────────
// In development: use local network IP
// In production: use your server's public IP/domain

const API_URLS = {
  development: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000',
  production: process.env.EXPO_PUBLIC_API_URL || 'https://YOUR-PROJECT.vercel.app',
};

export const API_URL = API_URLS[ENV];
// ── Google Auth Configuration ────────────────────────────────────
// Web client ID for Google OAuth
export const GOOGLE_AUTH_CLIENT_ID = '204274728519-mjf0vtp5jj8gjltcff1ts8g5dv4lsn9v.apps.googleusercontent.com';
// ── Feature Flags ────────────────────────────────────────────────────
export const FEATURES = {
  OFFLINE_MODE: true,
  AUTO_SYNC: true,
  DEBUG_LOGS: __DEV__,
};

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
