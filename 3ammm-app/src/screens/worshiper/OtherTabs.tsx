import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { BlurTargetView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useApp } from "../../lib/AppContext";
import { useTheme } from "../../lib/useTheme";
import { Loader, EmptyState } from "../../components/UI";
import PlatformBlur from "../../components/PlatformBlur";
import { Spacing, Radius } from "../../theme";
import { Song } from "../LyricsScreen";
import { favoritesService } from "../../lib/favoritesService";
import { subscribe } from "../../lib/pubsub";
import { api } from "../../lib/api";
import { db, Setlist as DBSetlist } from "../../lib/db";
import GlassHeader from "../../components/GlassHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSongCard, NumberedSong } from "./SongsTab";

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
// ── SETLISTS TAB ──────────────────────────────────────────────
export function SetlistsTab({ onOpenSong }: SongProps) {
  const { t } = useApp();
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const setlistsBlurTarget = React.useRef<View | null>(null);
  const [setlists, setSetlists] = useState<LocalSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await api.setlists.getAll();
      if (Array.isArray(data)) {
        const normalized = data.map((item) => ({
          ...item,
          title: item.title ?? item.name ?? "Untitled setlist",
        })) as LocalSetlist[];
        setSetlists(normalized);
        try {
          await db.setlists.save(data);
        } catch {}
      }
    } catch {
      try {
        const cached = await db.setlists.getAll();
        if (Array.isArray(cached)) {
          setSetlists(
            cached.map((item) => ({
              ...item,
              title: item.title ?? item.name ?? "Untitled setlist",
            })) as LocalSetlist[],
          );
        }
      } catch {}
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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <GlassHeader
        title={t.setlists}
        blurTarget={setlistsBlurTarget}
        style={styles.floatingGlassHeader}
      />

      <BlurTargetView ref={setlistsBlurTarget} style={styles.scrollTarget}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          bounces={false}
          scrollEventThrottle={0}
          contentContainerStyle={{
            paddingTop: insets.top + 88,
            paddingBottom: 100 + insets.bottom,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.sky}
            />
          }>
        {setlists.length === 0 ? (
          <EmptyState
            icon={<Feather name="calendar" size={22} color={C.sky} />}
            text={t.noSetlists}
          />
        ) : (
          setlists.map((sl) => {
            const songs: Song[] = sl.songIds || [];
            return (
              <PlatformBlur
                key={sl._id}
                style={[s.card, { borderColor: C.border }]}
                isDark={isDark}
                borderRadius={Radius.md}
                gradientColors={
                  isDark ? [C.surfaceHigh, C.surface] : [C.surface, C.bgDeep]
                }
                gradientOpacity={0.36}>
                <View
                  style={[
                    s.cardHdr,
                    {
                      borderBottomColor: C.border,
                      backgroundColor: C.skyPale,
                    },
                  ]}>
                  <View style={[s.dateBadge, { backgroundColor: C.sky }]}>
                    <Text style={[s.dateText, { color: C.bg }]}>{sl.date}</Text>
                  </View>
                  <Text
                    style={[s.cardTheme, { color: C.text }]}
                    numberOfLines={1}>
                    {sl.title === "Untitled setlist"
                      ? t.untitledSetlist
                      : sl.title}
                  </Text>
                  <Text style={[s.cardCnt, { color: C.text2 }]}>
                    {songs.length} {t.songs2}
                  </Text>
                </View>

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
                    activeOpacity={0.75}
                    {...({ android_ripple: null } as any)}>
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
              </PlatformBlur>
            );
          })
        )}
        <View style={{ height: 20 }} />
        </ScrollView>
      </BlurTargetView>
    </View>
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
  const insets = useSafeAreaInsets();
  const favoritesBlurTarget = React.useRef<View | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadRequestRef = React.useRef(0);

  const CARD_HEIGHT = 120;
  const CARD_GAP = Spacing.md;

  const load = useCallback(async (refreshServer = true) => {
    const requestId = ++loadRequestRef.current;
    try {
      const localSongs = await favoritesService.getLocalSongs(allSongs);
      if (requestId === loadRequestRef.current) {
        setSongs(localSongs);
        setLoading(false);
      }

      if (refreshServer && profile) {
        const serverSongs = await favoritesService.refreshFromServer(profile);
        if (serverSongs !== null && requestId === loadRequestRef.current) {
          setSongs(serverSongs ?? []);
        }
      }
    } catch (err) {
      console.error("FavoritesTab load error:", err);
    } finally {
      setLoading(false);
    }
  }, [allSongs, profile]);

  useEffect(() => {
    load();
    const unsub = subscribe("favorites:changed", () => {
      void load(false);
    });
    return () => unsub();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleRemoveFavorite = useCallback(
    async (songId: string) => {
      try {
        const { favorited } = await favoritesService.toggle(songId, profile);
        if (!favorited) {
          setSongs((current) => current.filter((song) => song._id !== songId));
        }
      } catch (error) {
        console.error("Could not remove favorite:", error);
        Alert.alert(t.error, t.favoriteUpdateError);
      }
    },
    [profile, t],
  );

  if (loading) return <Loader />;

  // Use global song list order for page numbers (same as SongsTab)
  const numberedSongs: NumberedSong[] = songs.map((song, index) => {
    const globalIndex = allSongs.findIndex((s) => s._id === song._id);
    return {
      ...song,
      pageNumber: globalIndex !== -1 ? globalIndex + 1 : index + 1,
    };
  });

  const getItemLayout = (_: unknown, index: number) => ({
    length: CARD_HEIGHT,
    offset: (CARD_HEIGHT + CARD_GAP) * index,
    index,
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <GlassHeader
        title={t.favs}
        onBack={onBackToSongs}
        backAccessibilityLabel={t.back}
        blurTarget={favoritesBlurTarget}
        style={styles.floatingGlassHeader}
      />

      {/* Task 3: plain FlatList, no scroll animation */}
      <BlurTargetView ref={favoritesBlurTarget} style={styles.scrollTarget}>
        <FlatList
          data={numberedSongs}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <AnimatedSongCard
              item={item}
              index={index}
              isDark={isDark}
              C={C}
              onOpenSong={onOpenSong}
              onRemoveFavorite={() => void handleRemoveFavorite(item._id)}
              removeFavoriteLabel={t.removeFav}
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
          overScrollMode="never"
          bounces={false}
          scrollEventThrottle={0}
          contentContainerStyle={{
            paddingTop: insets.top + 88,
            paddingHorizontal: Spacing.lg,
            paddingBottom: 100 + insets.bottom,
          }}
          getItemLayout={getItemLayout}
          removeClippedSubviews={false}
          maxToRenderPerBatch={12}
          windowSize={11}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
        />
      </BlurTargetView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollTarget: {
    flex: 1,
  },
  floatingGlassHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
  },
});

// ── NOTIFICATIONS TAB ─────────────────────────────────────────
export function NotificationsTab() {
  const { t } = useApp();
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

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
    // Task 3: plain ScrollView, no animation
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
      bounces={false}
      scrollEventThrottle={0}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: 100 + insets.bottom,
      }}>
      {notifs.length === 0 ? (
        <EmptyState
          icon={<Feather name="bell" size={22} color={C.sky} />}
          text={t.noNotifications}
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
    </ScrollView>
  );
}

// ── STYLES ────────────────────────────────────────────────────

const s = StyleSheet.create({
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

const ns = StyleSheet.create({
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
