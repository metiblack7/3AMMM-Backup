import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { API_URL } from './env';

/**
 * Network Status Detection
 * Tracks online/offline status across the app
 */

let isOnline = true;
let listeners: ((online: boolean) => void)[] = [];

// ── Initialize Network Listener ──────────────────────────────────────
// Uses fetch to detect connectivity (works on React Native and web)
let statusCheckTimeout: ReturnType<typeof setTimeout> | null = null;

async function checkConnectivity(): Promise<boolean> {
  try {
    // On web, use the API health check (avoids CORS issues with third-party domains).
    // On native, use a lightweight third-party check.
    const endpoint = Platform.OS === 'web' ? `${API_URL}/health` : 'https://google.com/generate_204';
    
    const response = await fetch(endpoint, {
      method: 'HEAD',
      cache: 'no-store',
    });
    return response.ok || response.status === 204;
  } catch {
    return false;
  }
}

function broadcastStatus(online: boolean) {
  if (isOnline !== online) {
    isOnline = online;
    console.log(`[Network] Status: ${online ? 'ONLINE' : 'OFFLINE'}`);
    listeners.forEach(l => l(online));
  }
}

function startStatusChecking() {
  // Check every 10 seconds
  const interval = setInterval(async () => {
    const online = await checkConnectivity();
    broadcastStatus(online);
  }, 10000);

  return () => clearInterval(interval);
}

// Start checking on module load
startStatusChecking();

// ── Public API ───────────────────────────────────────────────────────
export function getNetworkStatus(): boolean {
  return isOnline;
}

export function subscribeToNetworkStatus(callback: (online: boolean) => void): () => void {
  listeners.push(callback);
  // Call immediately with current status
  callback(isOnline);
  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

// ── React Hook ───────────────────────────────────────────────────────
export function useNetworkStatus() {
  const [online, setOnline] = useState(isOnline);

  useEffect(() => {
    const unsubscribe = subscribeToNetworkStatus(setOnline);
    return unsubscribe;
  }, []);

  return online;
}
