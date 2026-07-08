import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_PREFIX = '3ammm_db_';
const GUEST_SESSION_KEY = 'guest_session_active';

export interface LyricSection {
  s: string; // section name e.g. "ቁጥር 1"
  t: string; // section text/lyrics
}

export interface Song {
  _id: string;
  title: string;
  key: string;
  tempo?: string;
  singerName: string;
  category?: string;
  // ✅ lyrics is an array of sections, NOT a plain string
  lyrics: LyricSection[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Setlist {
  _id: string;
  name?: string;
  title?: string;
  description?: string;
  date?: string;
  songs?: string[];
  songIds?: Song[];
  createdAt?: string;
  updatedAt?: string;
}

export const db = {
  session: {
    async getGuestSessionActive(): Promise<boolean> {
      try {
        return (await AsyncStorage.getItem(GUEST_SESSION_KEY)) === 'true';
      } catch (err) {
        console.error('DB Error (session.getGuestSessionActive):', err);
        return false;
      }
    },

    async setGuestSessionActive(active: boolean): Promise<void> {
      try {
        await AsyncStorage.setItem(GUEST_SESSION_KEY, active ? 'true' : 'false');
      } catch (err) {
        console.error('DB Error (session.setGuestSessionActive):', err);
      }
    },

    async clearGuestSessionActive(): Promise<void> {
      try {
        await AsyncStorage.removeItem(GUEST_SESSION_KEY);
      } catch (err) {
        console.error('DB Error (session.clearGuestSessionActive):', err);
      }
    },
  },

  songs: {
    async getAll(): Promise<Song[]> {
      try {
        const data = await AsyncStorage.getItem(`${DB_PREFIX}songs`);
        return data ? JSON.parse(data) : [];
      } catch (err) {
        console.error('DB Error (songs.getAll):', err);
        return [];
      }
    },

    async getById(id: string): Promise<Song | null> {
      try {
        const songs = await this.getAll();
        return songs.find(s => s._id === id) || null;
      } catch (err) {
        console.error('DB Error (songs.getById):', err);
        return null;
      }
    },

    async search(query: string): Promise<Song[]> {
      try {
        const songs = await this.getAll();
        if (!query) return songs;
        const lowerQuery = query.toLowerCase();
        return songs.filter(s => {
          // ✅ search through lyrics array correctly
          const lyricsText = Array.isArray(s.lyrics)
            ? s.lyrics.map(l => `${l.s} ${l.t}`).join(' ').toLowerCase()
            : '';
          return (
            s.title.toLowerCase().includes(lowerQuery) ||
            lyricsText.includes(lowerQuery)
          );
        });
      } catch (err) {
        console.error('DB Error (songs.search):', err);
        return [];
      }
    },

    async save(songs: Song[]): Promise<void> {
      try {
        await AsyncStorage.setItem(`${DB_PREFIX}songs`, JSON.stringify(songs));
      } catch (err) {
        console.error('DB Error (songs.save):', err);
      }
    },

    async upsert(song: Song): Promise<void> {
      try {
        const songs = await this.getAll();
        const idx = songs.findIndex(s => s._id === song._id);
        if (idx >= 0) {
          songs[idx] = song;
        } else {
          songs.push(song);
        }
        await this.save(songs);
      } catch (err) {
        console.error('DB Error (songs.upsert):', err);
      }
    },

    async delete(id: string): Promise<void> {
      try {
        const songs = await this.getAll();
        await this.save(songs.filter(s => s._id !== id));
      } catch (err) {
        console.error('DB Error (songs.delete):', err);
      }
    },

    async clear(): Promise<void> {
      try {
        await AsyncStorage.removeItem(`${DB_PREFIX}songs`);
      } catch (err) {
        console.error('DB Error (songs.clear):', err);
      }
    },

    async getSingers(): Promise<string[]> {
      try {
        const songs = await this.getAll();
        const singers = [...new Set(songs.map(s => s.singerName).filter(Boolean))];
        return singers.sort();
      } catch (err) {
        console.error('DB Error (songs.getSingers):', err);
        return [];
      }
    },
  },

  setlists: {
    async getAll(): Promise<Setlist[]> {
      try {
        const data = await AsyncStorage.getItem(`${DB_PREFIX}setlists`);
        return data ? JSON.parse(data) : [];
      } catch (err) {
        console.error('DB Error (setlists.getAll):', err);
        return [];
      }
    },

    async getById(id: string): Promise<Setlist | null> {
      try {
        const setlists = await this.getAll();
        return setlists.find(s => s._id === id) || null;
      } catch (err) {
        console.error('DB Error (setlists.getById):', err);
        return null;
      }
    },

    async save(setlists: Setlist[]): Promise<void> {
      try {
        await AsyncStorage.setItem(`${DB_PREFIX}setlists`, JSON.stringify(setlists));
      } catch (err) {
        console.error('DB Error (setlists.save):', err);
      }
    },

    async upsert(setlist: Setlist): Promise<void> {
      try {
        const setlists = await this.getAll();
        const idx = setlists.findIndex(s => s._id === setlist._id);
        if (idx >= 0) {
          setlists[idx] = setlist;
        } else {
          setlists.push(setlist);
        }
        await this.save(setlists);
      } catch (err) {
        console.error('DB Error (setlists.upsert):', err);
      }
    },

    async delete(id: string): Promise<void> {
      try {
        const setlists = await this.getAll();
        await this.save(setlists.filter(s => s._id !== id));
      } catch (err) {
        console.error('DB Error (setlists.delete):', err);
      }
    },

    async clear(): Promise<void> {
      try {
        await AsyncStorage.removeItem(`${DB_PREFIX}setlists`);
      } catch (err) {
        console.error('DB Error (setlists.clear):', err);
      }
    },
  },

  favorites: {
    async getAll(): Promise<string[]> {
      try {
        const data = await AsyncStorage.getItem(`${DB_PREFIX}favorites`);
        return data ? JSON.parse(data) : [];
      } catch (err) {
        console.error('DB Error (favorites.getAll):', err);
        return [];
      }
    },

    async has(songId: string): Promise<boolean> {
      try {
        const favorites = await this.getAll();
        return favorites.includes(songId);
      } catch (err) {
        console.error('DB Error (favorites.has):', err);
        return false;
      }
    },

    async toggle(songId: string): Promise<boolean> {
      try {
        const favorites = await this.getAll();
        const idx = favorites.indexOf(songId);
        if (idx >= 0) {
          favorites.splice(idx, 1);
        } else {
          favorites.push(songId);
        }
        await this.save(favorites);
        return idx < 0; // true = now favorited
      } catch (err) {
        console.error('DB Error (favorites.toggle):', err);
        return false;
      }
    },

    async save(favorites: string[]): Promise<void> {
      try {
        await AsyncStorage.setItem(`${DB_PREFIX}favorites`, JSON.stringify(favorites));
      } catch (err) {
        console.error('DB Error (favorites.save):', err);
      }
    },

    async clear(): Promise<void> {
      try {
        await AsyncStorage.removeItem(`${DB_PREFIX}favorites`);
      } catch (err) {
        console.error('DB Error (favorites.clear):', err);
      }
    },
  },

  sync: {
    async getLastSync(entity: string): Promise<number> {
      try {
        const timestamp = await AsyncStorage.getItem(`${DB_PREFIX}sync_${entity}`);
        return timestamp ? parseInt(timestamp, 10) : 0;
      } catch (err) {
        console.error('DB Error (sync.getLastSync):', err);
        return 0;
      }
    },

    async setLastSync(entity: string, timestamp: number): Promise<void> {
      try {
        await AsyncStorage.setItem(`${DB_PREFIX}sync_${entity}`, timestamp.toString());
      } catch (err) {
        console.error('DB Error (sync.setLastSync):', err);
      }
    },

    async clearAllSync(): Promise<void> {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const syncKeys = keys.filter(k => k.includes('sync_'));
        if (syncKeys.length > 0) {
          await AsyncStorage.multiRemove(syncKeys);
        }
      } catch (err) {
        console.error('DB Error (sync.clearAllSync):', err);
      }
    },
  },

  async clear(): Promise<void> {
    try {
      await Promise.all([
        this.songs.clear(),
        this.setlists.clear(),
        this.favorites.clear(),
        this.sync.clearAllSync(),
      ]);
    } catch (err) {
      console.error('DB Error (clear):', err);
    }
  },
};