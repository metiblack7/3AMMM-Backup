import { db } from './db';
import { api } from './api';
import { publish } from './pubsub';
import { Song } from '../screens/LyricsScreen';

async function getLocalIds(): Promise<string[]> {
  try {
    const ids = await db.favorites.getAll();
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

async function getLocalSongs(allSongs?: Song[]): Promise<Song[]> {
  const ids = await getLocalIds();
  if (!ids.length) return [];
  const out: Song[] = [];
  for (const id of ids) {
    const found =
      (allSongs || []).find((s) => s._id === id) ||
      (await db.songs.getById(id).catch(() => null));
    if (found) {
      out.push(found);
    }
  }
  return out;
}

async function toggle(
  songId: string,
  profile?: any,
): Promise<{ favorited: boolean }> {
  const isGuest =
    !!profile && String(profile._id || '').startsWith('guest_');

  // Guest or unauthenticated — local only
  if (!profile || isGuest) {
    const ids = await getLocalIds();
    const idx = ids.indexOf(songId);
    let favorited = false;
    if (idx === -1) {
      ids.push(songId);
      favorited = true;
    } else {
      ids.splice(idx, 1);
      favorited = false;
    }
    await db.favorites.save(ids);
    publish('favorites:changed');
    return { favorited };
  }

  // Authenticated — server first, local mirror after
  try {
    const res = await api.favorites.toggle(songId);
    // Mirror server state to local immediately
    const local = await getLocalIds();
    const idx = local.indexOf(songId);
    if (res.favorited && idx === -1) {
      local.push(songId);
    } else if (!res.favorited && idx !== -1) {
      local.splice(idx, 1);
    }
    await db.favorites.save(local);
    publish('favorites:changed');
    return { favorited: res.favorited };
  } catch {
    // Network down — toggle locally so UI stays responsive
    const ids = await getLocalIds();
    const idx = ids.indexOf(songId);
    let favorited = false;
    if (idx === -1) {
      ids.push(songId);
      favorited = true;
    } else {
      ids.splice(idx, 1);
      favorited = false;
    }
    await db.favorites.save(ids);
    publish('favorites:changed');
    return { favorited };
  }
}

async function mergeLocalOnSignIn(profile: any) {
  if (!profile) return;
  const ids = await getLocalIds();
  if (!ids.length) return;
  try {
    // POST local ids to server so they get merged
    // uses the toggle endpoint one by one since merge may not exist
    for (const id of ids) {
      try {
        await api.favorites.toggle(id);
      } catch {
        // ignore individual failures
      }
    }
    // Now refresh from server to get the definitive list
    await refreshFromServer(profile);
  } catch (e) {
    console.warn('[favoritesService] merge failed', e);
  }
}

async function refreshFromServer(profile: any): Promise<Song[] | null> {
  if (!profile) return null;
  const isGuest = String(profile._id || '').startsWith('guest_');
  if (isGuest) return null;

  try {
    // Get full song objects from server
    const server = await api.favorites.getAll();
    if (Array.isArray(server)) {
      // Save IDs locally
      const sids = server.map((s: any) => s._id).filter(Boolean);
      await db.favorites.save(sids);
      // Cache song data locally
      try {
        await db.songs.save(server as any);
      } catch {
        // ignore cache errors
      }
      publish('favorites:changed');
      return server;
    }
  } catch {
    // Network down — silently use local cache
  }
  return null;
}

export const favoritesService = {
  getLocalIds,
  getLocalSongs,
  toggle,
  mergeLocalOnSignIn,
  refreshFromServer,
};