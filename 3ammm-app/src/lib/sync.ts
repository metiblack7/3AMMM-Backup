import { db, Song, Setlist } from './db';
import { api, getToken } from './api';
import { getNetworkStatus, subscribeToNetworkStatus } from './network';
import { SYNC_CONFIG, log, logError } from './env';

/**
 * Synchronization Service
 * Automatically syncs offline cache with server when online
 */

export interface SyncState {
  isSyncing: boolean;
  lastError: string | null;
  pendingChanges: number;
}

let syncState: SyncState = {
  isSyncing: false,
  lastError: null,
  pendingChanges: 0,
};

let syncListeners: ((state: SyncState) => void)[] = [];
let syncInterval: ReturnType<typeof setInterval> | null = null;

// ── Listeners ────────────────────────────────────────────────────────
export function subscribeSyncStatus(callback: (state: SyncState) => void): () => void {
  syncListeners.push(callback);
  callback(syncState);
  return () => {
    syncListeners = syncListeners.filter(l => l !== callback);
  };
}

function broadcastSyncState() {
  syncListeners.forEach(l => l(syncState));
}

// ── Sync Logic ───────────────────────────────────────────────────────
async function syncSongs() {
  try {
    log('Syncing songs...');
    const songs = await api.songs.getAll();
    await db.songs.save(songs as Song[]);
    await db.sync.setLastSync('songs', Date.now());
    log('Songs synced:', songs.length);
  } catch (err: any) {
    logError('Failed to sync songs:', err.message);
    throw err;
  }
}

async function syncSetlists() {
  try {
    log('Syncing setlists...');
    const setlists = await api.setlists.getAll();
    await db.setlists.save(setlists as Setlist[]);
    await db.sync.setLastSync('setlists', Date.now());
    log('Setlists synced:', setlists.length);
  } catch (err: any) {
    logError('Failed to sync setlists:', err.message);
    throw err;
  }
}

async function syncFavorites() {
  try {
    log('Syncing favorites...');
    const response = await api.favorites.getIds();
    // Normalise: server may return a plain string[] or { ids: [...] }
    const ids: string[] = Array.isArray(response) ? response : (response?.ids ?? []);
    await db.favorites.save(ids);
    await db.sync.setLastSync('favorites', Date.now());
    log('Favorites synced:', ids.length);
  } catch (err: any) {
    logError('Failed to sync favorites:', err.message);
    throw err;
  }
}

export async function syncAll(force = false) {
  if (syncState.isSyncing) {
    log('Sync already in progress');
    return;
  }

  if (!getNetworkStatus()) {
    log('Offline - skipping sync');
    return;
  }

  // Guest sessions and the pre-login state have no JWT at all — every
  // one of these endpoints requires auth, so attempting sync here just
  // produces a burst of 401s across songs/setlists/favorites/singers
  // in parallel. Skip entirely until there's a real signed-in session.
  const token = await getToken();
  if (!token) {
    log('Skipping sync - no authenticated session');
    return;
  }

  // Check if enough time has passed since last sync
  if (!force) {
    const lastSync = await db.sync.getLastSync('songs');
    const timeSinceSync = Date.now() - lastSync;
    if (timeSinceSync < SYNC_CONFIG.INTERVAL_MS) {
      log(`Last sync was ${timeSinceSync}ms ago, skipping`);
      return;
    }
  }

  syncState.isSyncing = true;
  syncState.lastError = null;
  broadcastSyncState();

  try {
    await Promise.all([syncSongs(), syncSetlists(), syncFavorites()]);
    log('All data synced successfully');
  } catch (err: any) {
    syncState.lastError = err.message;
    logError('Sync failed:', err);
  } finally {
    syncState.isSyncing = false;
    broadcastSyncState();
  }
}

// ── Auto-sync on Network Status Change ───────────────────────────────
subscribeToNetworkStatus((online) => {
  if (online) {
    log('Network online - triggering sync');
    syncAll(true);
  }
});

// ── Periodic Sync ────────────────────────────────────────────────────
export function startAutoSync() {
  if (syncInterval) return; // Already started

  log('Starting auto-sync');
  syncInterval = setInterval(() => {
    if (getNetworkStatus()) {
      syncAll();
    }
  }, SYNC_CONFIG.INTERVAL_MS);
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    log('Stopped auto-sync');
  }
}

// ── Get Sync State ───────────────────────────────────────────────────
export function getSyncState(): SyncState {
  return { ...syncState };
}

// ── Manual trigger ───────────────────────────────────────────────────
export async function manualSync() {
  log('Manual sync triggered');
  await syncAll(true);
}