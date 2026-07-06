import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, SYNC_CONFIG, log, logError } from './env';
import { db } from './db';
import { getNetworkStatus } from './network';

const TOKEN_KEY = '3ammm_token';

// ── Cache layer ───────────────────────────────────────────────
interface CacheEntry {
  data: any;
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

export function clearCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

function getCacheKey(path: string): string {
  return path;
}

function getCachedData(cacheKey: string): any | null {
  const entry = cache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

function setCachedData(cacheKey: string, data: any) {
  cache.set(cacheKey, { data, ts: Date.now() });
}

function invalidateCacheForResource(path: string) {
  const resourceId = path.split('/').pop();
  for (const key of cache.keys()) {
    if (
      key.includes(path.split('/').slice(0, -1).join('/')) ||
      (resourceId && key.includes(resourceId))
    ) {
      cache.delete(key);
    }
  }
}

// ── Token helpers ─────────────────────────────────────────────
export async function saveToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}
export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ── Core fetch wrapper ────────────────────────────────────────
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const method = options.method || 'GET';
  const isRead = method === 'GET';
  const cacheKey = getCacheKey(path);

  if (isRead) {
    const cached = getCachedData(cacheKey);
    if (cached) {
      log(`Cache hit for ${path}`);
      return cached;
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SYNC_CONFIG.TIMEOUT_MS);

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const raw = await res.text();
    let data: any = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          res.ok
            ? 'Invalid server response.'
            : `Server error (${res.status}). Check that the API is deployed correctly.`,
        );
      }
    }

    if (!res.ok) {
      throw new Error(data?.message || `Request failed with status ${res.status}`);
    }

    if (isRead) {
      setCachedData(cacheKey, data);
    } else {
      invalidateCacheForResource(path);
    }

    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Check your internet connection.');
    }
    logError(`API Error at ${path}:`, err.message);
    throw err;
  }
}

// ── API ───────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

    register: (name: string, email: string, password: string, singerName?: string) =>
      apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, singerName }) }),

    googleAuth: (googleToken: string, googleEmail: string, googleName: string) =>
      apiFetch('/api/auth/google', { method: 'POST', body: JSON.stringify({ googleToken, googleEmail, googleName }) }),

    me: () => apiFetch('/api/auth/me'),
  },

  songs: {
    async getAll(params?: { search?: string; singer?: string }) {
      try {
        const q = new URLSearchParams();
        if (params?.search) q.set('search', params.search);
        if (params?.singer) q.set('singer', params.singer);
        const data = await apiFetch(`/api/songs${q.toString() ? '?' + q : ''}`);
        // ✅ only cache full unfiltered list
        if (!params?.search && !params?.singer) {
          await db.songs.save(data);
        }
        return data;
      } catch (err) {
        log('Using offline cache for songs');
        const allSongs = await db.songs.getAll();
        if (!params?.search && !params?.singer) return allSongs;
        // ✅ client-side filter searches through lyrics array correctly
        return allSongs.filter(s => {
          const matchesSinger = !params?.singer || s.singerName === params.singer;
          if (!params?.search) return matchesSinger;
          const q = params.search.toLowerCase();
          const lyricsText = Array.isArray(s.lyrics)
            ? s.lyrics.map(l => `${l.s} ${l.t}`).join(' ').toLowerCase()
            : '';
          return matchesSinger && (
            s.title.toLowerCase().includes(q) ||
            lyricsText.includes(q)
          );
        });
      }
    },

    async getSingers() {
      try {
        return await apiFetch('/api/songs/singers');
      } catch (err) {
        log('Using offline cache for singers');
        return await db.songs.getSingers();
      }
    },

    async getOne(id: string) {
      try {
        const data = await apiFetch(`/api/songs/${id}`);
        await db.songs.upsert(data);
        return data;
      } catch (err) {
        log('Using offline cache for single song');
        return await db.songs.getById(id);
      }
    },

    create: (data: object) =>
      apiFetch('/api/songs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) =>
      apiFetch(`/api/songs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiFetch(`/api/songs/${id}`, { method: 'DELETE' }),
  },

  setlists: {
    async getAll() {
      try {
        const data = await apiFetch('/api/setlists');
        await db.setlists.save(data);
        return data;
      } catch (err) {
        log('Using offline cache for setlists');
        return await db.setlists.getAll();
      }
    },

    async getOne(id: string) {
      try {
        const data = await apiFetch(`/api/setlists/${id}`);
        await db.setlists.upsert(data);
        return data;
      } catch (err) {
        log('Using offline cache for single setlist');
        return await db.setlists.getById(id);
      }
    },

    create: (data: object) =>
      apiFetch('/api/setlists', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) =>
      apiFetch(`/api/setlists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiFetch(`/api/setlists/${id}`, { method: 'DELETE' }),
  },

  favorites: {
    async getAll() {
      try {
        return await apiFetch('/api/favorites');
      } catch (err) {
        log('Using offline cache for favorites');
        return await db.favorites.getAll();
      }
    },

    // ✅ always returns a plain string[] — never wrapped in { ids }
    async getIds(): Promise<string[]> {
      try {
        const data = await apiFetch('/api/favorites/ids');
        // server may return { ids: [...] } or plain array — normalise both
        const ids: string[] = Array.isArray(data) ? data : (data.ids ?? []);
        await db.favorites.save(ids);
        return ids;
      } catch (err) {
        log('Using offline cache for favorite IDs');
        return await db.favorites.getAll();
      }
    },

    async toggle(songId: string) {
      try {
        const result = await apiFetch(`/api/favorites/${songId}`, { method: 'POST' });
        await db.favorites.toggle(songId);
        // ✅ normalise response — server returns { favorited } or { isFavorite }
        return {
          favorited: result.favorited ?? result.isFavorite ?? false,
        };
      } catch (err) {
        log('Toggling favorite locally');
        const favorited = await db.favorites.toggle(songId);
        return { favorited };
      }
    },
  },

  notifications: {
    async getAll() {
      try {
        return await apiFetch('/api/notifications');
      } catch (err) {
        log('Failed to get notifications');
        return [];
      }
    },
  },

  users: {
    getAll: () => apiFetch('/api/users'),
    getStats: () => apiFetch('/api/users/stats'),
  },
};

export { API_URL };