import { db } from './db';
import { api } from './api';
import { publish } from './pubsub';
import { Song } from '../screens/LyricsScreen';

async function getLocalIds(): Promise<string[]> {
  const ids = await db.favorites.getAll();
  return [...new Set(ids)];
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

  const ids = [...new Set(await getLocalIds())];
  const alreadyFavorited = ids.includes(songId);
  const favorited = !alreadyFavorited;
  const updatedIds = favorited
    ? [...ids, songId]
    : ids.filter((id) => id !== songId);

  await db.favorites.save(updatedIds);
  publish('favorites:changed');

  // Guest or unauthenticated — local only
  if (!profile || isGuest) {
    return { favorited };
  }

  // Update local state first so all screens respond without waiting for the server.
  try {
    const res = await api.favorites.toggle(songId);
    if (res.favorited !== favorited) {
      const local = [...new Set(await getLocalIds())];
      const reconciled = res.favorited
        ? [...local.filter((id) => id !== songId), songId]
        : local.filter((id) => id !== songId);
      await db.favorites.save(reconciled);
      publish('favorites:changed');
    }
    return { favorited: res.favorited };
  } catch (error) {
    console.warn(
      '[favoritesService] server toggle failed; keeping local change',
      error,
    );
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

function getSongIds(songs: unknown[]): string[] {
  return songs.flatMap((song) => {
    if (!song || typeof song !== 'object' || !('_id' in song)) return [];
    return typeof song._id === 'string' && song._id.length > 0
      ? [song._id]
      : [];
  });
}

async function refreshFromServer(profile: any): Promise<Song[] | null> {
  if (!profile) return null;
  const isGuest = String(profile._id || '').startsWith('guest_');
  if (isGuest) return null;

  try {
    // Get full song objects from server
    const server = await api.favorites.getAll();
    if (Array.isArray(server)) {
      const songIds = getSongIds(server);
      await db.favorites.save([...new Set(songIds)]);
      try {
        await db.songs.save(server.filter((s: any) => s && typeof s === 'object') as any);
      } catch {
        // ignore cache errors
      }
      publish('favorites:changed');
      return server;
    }
    if (Array.isArray(server?.songs)) {
      const songIds = getSongIds(server.songs);
      await db.favorites.save([...new Set(songIds)]);
      publish('favorites:changed');
      return server.songs;
    }
  } catch (error) {
    console.warn(
      '[favoritesService] server refresh failed; keeping local favorites',
      error,
    );
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