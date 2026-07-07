import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../../lib/AppContext";
import { useTheme } from "../../lib/useTheme";
import { Loader, EmptyState } from "../../components/UI";
import { Spacing, Radius } from "../../theme";
import { Song } from "../LyricsScreen";
import { favoritesService } from "../../lib/favoritesService";
import { subscribe } from "../../lib/pubsub";
import { api } from "../../lib/api";
import { db, Setlist as DBSetlist } from "../../lib/db";

interface LocalSetlist extends Pick<DBSetlist, "_id" | "date" | "songIds"> {
  title: string;
}

interface Notif {
  _id: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
}

interface SongProps {
  onOpenSong: (song: Song) => void;
  onBackToSongs?: () => void;
  allSongs?: Song[];
}

type NumberedSong = Song & { pageNumber: number };

function FavoriteSongCard({
  item,
  isDark,
  C,
  onOpenSong,
}: {
  item: NumberedSong;
  isDark: boolean;
  C: ReturnType<typeof useTheme>["C"];
  onOpenSong: (song: Song) => void;
}) {
  const [g1, g2] = isDark ? ["#082f41", "#00121e"] : ["#DFF5FF", "#F7FCFF"];

  return (
    <TouchableOpacity
      style={ss.songCardWrap}
      onPress={() => onOpenSong(item)}
      activeOpacity={0.75}>
      <LinearGradient
        colors={[g1, g2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          ss.songCard,
          {
            borderColor: isDark ? C.glassBorder : C.border,
          },
        ]}>
        <View style={ss.songHeader}>
          <View
            style={[
              ss.artContainer,
              {
                backgroundColor: isDark ? C.skyGlowSoft : C.skyPale,
                borderColor: C.skyBorder,
              },
            ]}>
            <Feather name="music" size={20} color={isDark ? C.sky : C.navy} />
          </View>

          <View style={ss.songInfo}>
            <Text style={[ss.songTitle, { color: C.text }]}>{item.title}</Text>
            <Text style={[ss.songMeta, { color: C.text2 }]}>{item.singerName}</Text>
          </View>

          <Feather name="chevron-right" size={18} color={C.text3} />
        </View>

        <View
          style={[
            ss.songFooter,
            { borderTopColor: isDark ? C.glassBorder : C.border },
          ]}>
          <Text style={[ss.songNumber, { color: C.text3 }]}>{item.pageNumber}</Text>
          <View style={[ss.keyChip, { backgroundColor: C.goldDeep ?? C.skyPale }]}> 
            <Text style={[ss.keyChipText, { color: C.gold ?? C.sky }]}> {item.key} </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── SETLISTS TAB ─────────────────────────────────────────────
export function SetlistsTab({ onOpenSong }: SongProps) {
  const { t } = useApp();
  const { C } = useTheme();
  const [setlists, setSetlists] = useState<LocalSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const TOP = Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 24) + 8;

  async function load() {
    try {
      // Try server first
      const data = await api.setlists.getAll();
      if (Array.isArray(data)) {
        const normalized = data.map((item) => ({
          ...item,
          title: item.title ?? item.name ?? "Untitled setlist",
        })) as LocalSetlist[];
        setSetlists(normalized);
        try {
          await db.setlists.save(data);
        } catch {
          /* ignore */
        }
      }
    } catch {
      // Fallback to local cache
      try {
        const cached = await db.setlists.getAll();
        if (Array.isArray(cached)) {
          const normalized = cached.map((item) => ({
            ...item,
            title: item.title ?? item.name ?? "Untitled setlist",
          })) as LocalSetlist[];
          setSetlists(normalized);
        }
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <Loader />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: TOP }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={C.sky}
        />
      }>
      <View
        style={[
          s.headerBar,
          { borderBottomColor: C.border, backgroundColor: C.surface },
        ]}>
        <Text style={[s.headerTitle, { color: C.text }]}>{t.setlists}</Text>
      </View>
      {setlists.length === 0 ? (
        <EmptyState
          icon={<Feather name="calendar" size={22} color={C.sky} />}
          text="No setlists yet."
        />
      ) : (
        setlists.map((sl) => {
          const songs: Song[] = sl.songIds || [];
          return (
            <View
              key={sl._id}
              style={[
                s.card,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}>
              {/* Card header */}
              <View
                style={[
                  s.cardHdr,
                  { borderBottomColor: C.border, backgroundColor: C.skyPale },
                ]}>
                <View style={[s.dateBadge, { backgroundColor: C.sky }]}>
                  <Text style={[s.dateText, { color: C.bg }]}>{sl.date}</Text>
                </View>
                <Text
                  style={[s.cardTheme, { color: C.text }]}
                  numberOfLines={1}>
                  {sl.title}
                </Text>
                <Text style={[s.cardCnt, { color: C.text2 }]}>
                  {songs.length} {t.songs2}
                </Text>
              </View>

              {/* Songs */}
              {songs.map((song, i) => (
                <TouchableOpacity
                  key={song._id}
                  style={[
                    s.songRow,
                    i < songs.length - 1 && [
                      s.songBorder,
                      { borderBottomColor: C.border },
                    ],
                  ]}
                  onPress={() => onOpenSong(song)}
                  activeOpacity={0.7}>
                  <Text style={[s.songNum, { color: C.sky }]}>{i + 1}</Text>
                  <Text
                    style={[s.songName, { color: C.text, flex: 1 }]}
                    numberOfLines={1}>
                    {song.title}
                  </Text>
                  <View style={[s.keyChip, { backgroundColor: C.skyPale }]}>
                    <Text style={[s.keyChipText, { color: C.sky }]}>
                      {song.key}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        })
      )}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// ── FAVORITES TAB ─────────────────────────────────────────────
export function FavoritesTab({
  onOpenSong,
  onBackToSongs,
  allSongs = [],
}: SongProps) {
  const { t, profile } = useApp();
  const { C, isDark } = useTheme();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const TOP = Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 24) + 8;
  const CARD_HEIGHT = 92;
  const CARD_GAP = Spacing.md;

  const load = useCallback(async () => {
    try {
      const localSongs = await favoritesService.getLocalSongs();
      if (localSongs.length > 0) {
        setSongs(localSongs);
        setLoading(false);
      }

      if (profile) {
        const serverSongs = await favoritesService.refreshFromServer(profile);
        if (serverSongs !== null) {
          setSongs(serverSongs ?? []);
        }
      }
    } catch (err) {
      console.error("FavoritesTab load error:", err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    load();
    const unsub = subscribe("favorites:changed", load);
    return () => unsub();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <Loader />;

  // ── Use the global song list order for page numbers ───────────
  // Match each favorite against allSongs by _id to get the same
  // page number shown in the Songs tab. Fall back to the favorite's
  // own position only if it can't be found in the global list
  // (e.g. song was deleted from server but still cached locally).
  const numberedSongs: NumberedSong[] = songs.map((song, index) => {
    const globalIndex = allSongs.findIndex((s) => s._id === song._id);
    return {
      ...song,
      pageNumber: globalIndex !== -1 ? globalIndex + 1 : index + 1,
    };
  });

  const getItemLayout = (_: any, index: number) => ({
    length: CARD_HEIGHT,
    offset: (CARD_HEIGHT + CARD_GAP) * index,
    index,
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View
        style={[
          ss.headerBar,
          { borderBottomColor: C.border, backgroundColor: C.surface },
        ]}>
        <TouchableOpacity
          onPress={() => onBackToSongs?.()}
          disabled={!onBackToSongs}
          activeOpacity={0.75}
          style={ss.glassBtn}>
          <View
            style={[
              StyleSheet.absoluteFill,
              ss.glassBtnBg,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(255,255,255,0.80)",
                borderColor: isDark
                  ? "rgba(255,255,255,0.13)"
                  : "rgba(4,57,84,0.10)",
              },
            ]}
          />
          <LinearGradient
            colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.03)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              ss.glassBtnSheen,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.20)"
                  : "rgba(255,255,255,0.95)",
              },
            ]}
          />
          <Feather
            name="chevron-left"
            size={19}
            color={isDark ? "rgba(240,248,255,0.94)" : "#12344d"}
          />
        </TouchableOpacity>
        <Text style={[ss.headerTitle, { color: C.text }]}>{t.favs}</Text>
        <View style={{ width: 10 }} />
      </View>

      <FlatList
        data={numberedSongs}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <FavoriteSongCard
            item={item}
            isDark={isDark}
            C={C}
            onOpenSong={onOpenSong}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Feather name="heart" size={22} color={C.sky} />}
            text={t.noFavs}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.sky}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 10,
          paddingHorizontal: Spacing.lg,
          paddingBottom: 160,
        }}
        getItemLayout={getItemLayout}
        removeClippedSubviews={Platform.OS === "android"}
        maxToRenderPerBatch={12}
        windowSize={11}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
}

// ── NOTIFICATIONS TAB ─────────────────────────────────────────
export function NotificationsTab() {
  const { t } = useApp();
  const { C } = useTheme();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const TOP = Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 24) + 8;

  useEffect(() => {
    api.notifications
      .getAll()
      .then((data: any) => {
        if (Array.isArray(data)) setNotifs(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const iconFor = (type: string) =>
    type === "setlist" ? "calendar" : type === "song" ? "music" : "bell";

  const bgFor = (type: string) =>
    type === "setlist" ? (C.goldDeep ?? C.skyPale) : C.skyPale;

  const colorFor = (type: string) =>
    type === "setlist" ? (C.goldDark ?? "#d4920e") : C.sky;

  if (loading) return <Loader />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: TOP }}>
      <View style={[ns.hdr, { borderBottomColor: C.border }]}>
        <Feather name="bell" size={16} color={C.sky} />
        <Text style={[ns.hdrText, { color: C.text }]}>{t.notifTitle}</Text>
      </View>

      {notifs.length === 0 ? (
        <EmptyState
          icon={<Feather name="bell" size={22} color={C.sky} />}
          text="No notifications yet."
        />
      ) : (
        notifs.map((n, i) => (
          <View
            key={n._id}
            style={[
              ns.item,
              i < notifs.length - 1 && [
                ns.itemBorder,
                { borderBottomColor: C.border },
              ],
            ]}>
            <View style={[ns.icon, { backgroundColor: bgFor(n.type) }]}>
              <Feather
                name={iconFor(n.type) as any}
                size={17}
                color={colorFor(n.type)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ns.title, { color: C.text }]}>{n.title}</Text>
              <Text style={[ns.body, { color: C.text2 }]}>{n.body}</Text>
              <Text style={[ns.time, { color: C.text3 }]}>
                {new Date(n.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {i < 2 && <View style={[ns.dot, { backgroundColor: C.sky }]} />}
          </View>
        ))
      )}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// ── STYLES ────────────────────────────────────────────────────

// Setlists
const s = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHdr: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dateBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  dateText: { fontSize: 11, fontWeight: "700" },
  cardTheme: { fontSize: 14, fontWeight: "600", flex: 1 },
  cardCnt: { fontSize: 11 },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  songBorder: { borderBottomWidth: 1 },
  songNum: { fontSize: 11, fontWeight: "700", width: 18 },
  songName: { fontSize: 13, fontWeight: "500" },
  keyChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  keyChipText: { fontSize: 10, fontWeight: "700" },
});

// Favorites
const ss = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  songCardWrap: { borderRadius: 16, overflow: "hidden", marginBottom: Spacing.md },
  songCard: {
    borderRadius: 16,
    borderWidth: 0.5,
    padding: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 4 },
    }),
  },
  songHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  artContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  songInfo: { flex: 1, minWidth: 0 },
  songTitle: { fontSize: 15, fontWeight: "700" },
  songMeta: { fontSize: 12, marginTop: 3 },
  songFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
  },
  songNumber: { fontSize: 18, fontWeight: "700", letterSpacing: 0.5 },
  keyChip: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  keyChipText: { fontSize: 11, fontWeight: "700" },
  glassBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  glassBtnBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  glassBtnSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
});

// Notifications
const ns = StyleSheet.create({
  hdr: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  hdrText: { fontSize: 15, fontWeight: "700", flex: 1 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    gap: 12,
  },
  itemBorder: { borderBottomWidth: 1 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 13, fontWeight: "600" },
  body: { fontSize: 12, marginTop: 3, lineHeight: 18 },
  time: { fontSize: 10, marginTop: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 4 },
});
