import { db } from './db';
import { api } from './api';
import { publish } from './pubsub';
import { Song } from '../screens/LyricsScreen';
import { useNetworkStatus } from './network';

async function getLocalIds(): Promise<string[]> {
  return await db.favorites.getAll();
}

async function getLocalSongs(allSongs?: Song[]): Promise<Song[]> {
  const ids = await getLocalIds();
  const out: Song[] = [];
  for (const id of ids) {
    const found = (allSongs || []).find((s) => s._id === id) || (await db.songs.getById(id));
    if (found) out.push(found);
    else
      out.push({ _id: id, title: 'Unknown Song', key: '', singerName: '', lyrics: [] } as Song);
  }
  return out;
}

async function toggle(songId: string, profile?: any): Promise<{ favorited: boolean }>
{
  // If user is guest or not authenticated, toggle locally.
  const isGuest = !!profile && String(profile._id || '').startsWith('guest_');
  if (!profile || isGuest) {
    const ids = await db.favorites.getAll();
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

  // Authenticated: try server toggle first, fallback to local on error
  try {
    const res = await api.favorites.toggle(songId);
    // ensure local cache mirrors server state
    try {
      const local = await db.favorites.getAll();
      const idx = local.indexOf(songId);
      if (res.favorited && idx === -1) {
        local.push(songId);
      } else if (!res.favorited && idx !== -1) {
        local.splice(idx, 1);
      }
      await db.favorites.save(local);
      publish('favorites:changed');
    } catch (e) {
      // ignore local save errors
    }
    return { favorited: res.favorited };
  } catch (e) {
    // fallback to local toggle if server fails (network issues)
    const ids = await db.favorites.getAll();
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
  const ids = await db.favorites.getAll();
  if (!ids || !ids.length) return;
  try {
    await api.favorites.merge(ids);
    // refresh server favorites and persist locally
    const server = await api.favorites.getAll();
    if (Array.isArray(server)) {
      const sids = server.map((s: any) => s._id);
      await db.favorites.save(sids);
      try { await db.songs.save(server as any); } catch (e) {}
      publish('favorites:changed');
    }
  } catch (e) {
    console.warn('[favoritesService] merge failed', e);
  }
}

async function refreshFromServer(profile: any) {
  if (!profile) return;
  try {
    const server = await api.favorites.getAll();
    if (Array.isArray(server)) {
      const sids = server.map((s: any) => s._id);
      await db.favorites.save(sids);
      try { await db.songs.save(server as any); } catch (e) {}
      publish('favorites:changed');
      return server;
    }
  } catch (e) {
    // ignore network errors
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
