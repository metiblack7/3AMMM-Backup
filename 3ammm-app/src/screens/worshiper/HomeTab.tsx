import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useApp } from "../../lib/AppContext";
import { useTheme } from "../../lib/useTheme";
import { Spacing } from "../../theme";
import { Song } from "../LyricsScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Setlist {
  _id: string;
  title?: string;
  date?: string;
  songIds?: Array<Song | string | null | undefined>;
}

interface Props {
  onOpenSong: (song: Song) => void;
  onNavigateTab?: (tab: "songs" | "favs") => void;
}

function HomeTabComponent({
  onOpenSong,
  onNavigateTab,
}: Props) {
  const insets = useSafeAreaInsets();
  const { profile, t, fs } = useApp();
  const { C, isDark } = useTheme();

  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [favCount, setFavCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { db } = await import("../../lib/db");

    try {
      const cachedSongs = await db.songs.getAll();
      const cachedSetlists = await db.setlists.getAll();
      if (cachedSongs.length > 0 || cachedSetlists.length > 0) {
        setSongs(cachedSongs);
        setSetlists(
          (cachedSetlists || []).map((item: any) => ({
            _id: String(item?._id ?? item?.id ?? ""),
            title: item?.title ?? item?.name ?? "Untitled",
            date: item?.date ?? "",
            songIds: Array.isArray(item?.songIds)
              ? item.songIds
              : Array.isArray(item?.songs)
                ? item.songs
                : [],
          })),
        );
      }
    } catch {
      // ignore cached-read errors and continue to remote fetch
    }

    try {
      const [songsData, setlistsData] = await Promise.all([
        api.songs.getAll().catch(() => []),
        api.setlists.getAll().catch(() => []),
      ]);

      const normalizedSongs = Array.isArray(songsData) ? songsData : [];
      const normalizedSetlists = Array.isArray(setlistsData) ? setlistsData : [];

      if (normalizedSongs.length > 0) {
        setSongs(normalizedSongs);
        try {
          await db.songs.save(normalizedSongs as any);
        } catch {
          // ignore cache write failures
        }
      }

      if (normalizedSetlists.length > 0) {
        setSetlists(normalizedSetlists);
        try {
          await db.setlists.save(normalizedSetlists as any);
        } catch {
          // ignore cache write failures
        }
      }

      // favorites count: prefer local cache for guests/offline; otherwise use server
      const isGuest =
        !!profile && String(profile._id || "").startsWith("guest_");

      if (isGuest || !profile) {
        const localFavs = await db.favorites.getAll();
        setFavCount(localFavs.length);
      } else {
        try {
          const favIds = await api.favorites.getIds();
          setFavCount(
            Array.isArray(favIds)
              ? favIds.length
              : (favIds?.ids ?? []).length || 0,
          );
        } catch (err) {
          const localFavs = await db.favorites.getAll();
          setFavCount(localFavs.length);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleNavigateTab = useCallback(
    (tab: "songs" | "favs") => {
      onNavigateTab?.(tab);
    },
    [onNavigateTab],
  );

  const nextSetlist = useMemo(() => setlists[0], [setlists]);
  const nextSongs = useMemo(
    () =>
      (nextSetlist?.songIds ?? []).flatMap((entry): Song[] => {
        if (typeof entry === "string") {
          const song = songs.find((item) => item._id === entry);
          return song ? [song] : [];
        }
        return entry ? [entry] : [];
      }),
    [nextSetlist, songs],
  );

  const s = makeStyles(C);

  return (
    <View style={s.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: 100 + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.sky}
          />
        }>
        {/* HERO BANNER */}
        <LinearGradient
          colors={
            isDark
              ? [C.surface, C.surfaceHigh]
              : [C.bgDeep, C.surfaceHigh]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroBanner}>
          <View style={s.heroDecoration} />
          <Feather
            name="music"
            size={64}
            color={C.sky}
            style={[s.heroIcon, { opacity: isDark ? 0.15 : 0.12 }]}
          />
          <View style={s.heroText}>
            <Text style={s.heroEyebrow}>{t.homeHeroDay}</Text>
            <Text style={[s.heroTitle, { fontSize: fs(32) }]}>
              {t.homeHeroWorship}
            </Text>
            <Text
              style={[
                s.heroTitle,
                s.heroTitleAccent,
                s.heroWelcome,
                { fontSize: fs(26) },
              ]}>
              {t.homeHeroService}
            </Text>
            <View style={s.heroGoldLine} />
          </View>
        </LinearGradient>

        {/* QUICK STATS */}
        <View style={s.cardsRow}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.85}
            onPress={() => handleNavigateTab("songs")}>
            <View style={s.card}>
              <View style={s.cardDecoration} />
              <View style={s.cardIconBox}>
                <Feather name="music" size={20} color={C.sky} />
              </View>
              <Text style={[s.cardNum, { fontSize: fs(28) }]}>
                {songs.length}
              </Text>
              <Text style={[s.cardLabel, { fontSize: fs(12) }]}>
                {t.allSongs}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.85}
            onPress={() => handleNavigateTab("favs")}>
            <View style={s.card}>
              <View style={s.cardDecoration} />
              <View style={s.cardIconBox}>
                <Feather name="heart" size={20} color={C.sky} />
              </View>
              <Text style={[s.cardNum, { fontSize: fs(28) }]}>{favCount}</Text>
              <Text style={[s.cardLabel, { fontSize: fs(12) }]}>
                {t.myFavs}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* NEXT SETLIST */}
        {nextSetlist && (
          <>
            <View style={s.secHdr}>
              <Text style={[s.secTitle, { fontSize: fs(16) }]}>
                {t.nextSat}
              </Text>
              <Text style={s.seeAll}>{t.seeAll}</Text>
            </View>

            <View style={s.nextSlCardWrap}>
              <View style={s.nextSlCard}>
                <View style={s.nextSlHdr}>
                  <View style={s.dateBadge}>
                    <Text style={s.dateText}>{nextSetlist.date}</Text>
                  </View>

                  <Text
                    style={[s.slTheme, { fontSize: fs(15) }]}
                    numberOfLines={1}>
                    {nextSetlist.title}
                  </Text>

                  <View style={s.slCountBadge}>
                    <Text style={s.slCountText}>{nextSongs.length}</Text>
                  </View>
                </View>

                {nextSongs.map((song, i) => (
                  <TouchableOpacity
                    key={song._id}
                    style={[
                      s.slSong,
                      i < nextSongs.length - 1 && s.slSongBorder,
                    ]}
                    onPress={() => onOpenSong(song)}
                    activeOpacity={0.7}
                    {...({ android_ripple: null } as any)}>
                    <Text style={[s.slNum, { fontSize: fs(12) }]}>
                      {i + 1}
                    </Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[s.slName, { fontSize: fs(14) }]}
                        numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={s.slSinger} numberOfLines={1}>
                        {song.singerName}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default React.memo(HomeTabComponent);

const makeStyles = (C: ReturnType<typeof useTheme>["C"]) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    heroBanner: {
      height: 200,
      margin: Spacing.lg,
      marginTop: 6,
      borderRadius: 20,
      overflow: "hidden",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
    },
    heroIcon: {
      position: "absolute",
      left: 18,
    },
    heroDecoration: {
      position: "absolute",
      width: 120,
      height: 120,
      borderRadius: 60,
      bottom: -34,
      right: -24,
      backgroundColor: C.skyPale,
    },
    heroText: {
      marginLeft: 70,
      zIndex: 1,
    },
    heroEyebrow: {
      color: C.text2,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 2,
      marginBottom: 3,
    },
    heroTitle: {
      color: C.text,
      fontWeight: "800",
      lineHeight: 36,
    },
    heroTitleAccent: { color: C.sky },
    heroWelcome: {
      fontWeight: "400",
      lineHeight: 32,
    },
    heroGoldLine: {
      width: 40,
      height: 2,
      borderRadius: 1,
      backgroundColor: C.gold,
      marginTop: 10,
    },
    cardsRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: Spacing.lg,
      marginBottom: 20,
    },
    card: {
      minHeight: 148,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      padding: 16,
      overflow: "hidden",
    },
    cardDecoration: {
      position: "absolute",
      width: 60,
      height: 60,
      borderRadius: 30,
      top: -16,
      right: -16,
      backgroundColor: C.skyPale,
    },
    cardIconBox: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.skyMid,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    cardNum: {
      fontWeight: "700",
      color: C.text,
    },
    cardLabel: {
      fontWeight: "600",
      color: C.text2,
    },
    secHdr: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 12,
    },
    secTitle: {
      fontWeight: "600",
      color: C.text,
      flex: 1,
    },
    seeAll: {
      color: C.text2,
      fontSize: 12,
    },
    nextSlCardWrap: {
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.lg,
      borderRadius: 20,
      overflow: "hidden",
    },
    nextSlCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    nextSlHdr: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: C.goldBorder,
      backgroundColor: C.goldDeep,
    },
    dateBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: C.goldDeep,
    },
    dateText: {
      fontSize: 11,
      fontWeight: "700",
      color: C.gold,
    },
    slTheme: {
      fontWeight: "700",
      color: C.text,
      flex: 1,
      marginLeft: 10,
    },
    slCountBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: C.goldDeep,
    },
    slCountText: {
      fontSize: 12,
      fontWeight: "700",
      color: C.gold,
    },
    slSong: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
    },
    slSongBorder: {
      borderBottomWidth: 0.5,
      borderBottomColor: C.border,
    },
    slNum: {
      fontWeight: "700",
      width: 18,
      color: C.gold,
    },
    slName: {
      fontWeight: "600",
      color: C.text,
    },
    slSinger: {
      fontSize: 12,
      color: C.text2,
    },
  });
