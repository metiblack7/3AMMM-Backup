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

      if (Array.isArray(songsData) && songsData.length > 0) {
        setSongs(songsData);
        try {
          await db.songs.save(songsData as any);
        } catch {
          // ignore cache write failures
        }
      }

      if (Array.isArray(setlistsData) && setlistsData.length > 0) {
        setSetlists(setlistsData);
        try {
          await db.setlists.save(setlistsData as any);
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

  const s = makeStyles();

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
            tintColor="#87ceeb"
          />
        }>
        {/* HERO BANNER */}
        <LinearGradient
          colors={["#021624", "#032538"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroBanner}>
          <View style={s.heroDecoration} />
          <Feather
            name="music"
            size={64}
            color="rgba(135,206,235,0.15)"
            style={s.heroIcon}
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
                <Feather name="music" size={20} color="#87ceeb" />
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
                <Feather name="heart" size={20} color="#87ceeb" />
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

const makeStyles = () =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#010f18" },
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
      backgroundColor: "rgba(135,206,235,0.06)",
    },
    heroText: {
      marginLeft: 70,
      zIndex: 1,
    },
    heroEyebrow: {
      color: "#87ceeb",
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 2,
      marginBottom: 3,
    },
    heroTitle: {
      color: "#ffffff",
      fontWeight: "800",
      lineHeight: 36,
    },
    heroTitleAccent: { color: "#87ceeb" },
    heroWelcome: {
      fontWeight: "400",
      lineHeight: 32,
    },
    heroGoldLine: {
      width: 40,
      height: 2,
      borderRadius: 1,
      backgroundColor: "#fbb040",
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
      borderColor: "rgba(135,206,235,0.10)",
      backgroundColor: "#021624",
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
      backgroundColor: "rgba(135,206,235,0.05)",
    },
    cardIconBox: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(135,206,235,0.10)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    cardNum: {
      fontWeight: "700",
      color: "#ffffff",
    },
    cardLabel: {
      fontWeight: "600",
      color: "rgba(135,206,235,0.75)",
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
      color: "#ffffff",
      flex: 1,
    },
    seeAll: {
      color: "rgba(135,206,235,0.65)",
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
      borderColor: "rgba(135,206,235,0.10)",
      backgroundColor: "#021624",
    },
    nextSlHdr: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: "rgba(251,176,64,0.15)",
      backgroundColor: "rgba(251,176,64,0.08)",
    },
    dateBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: "rgba(251,176,64,0.14)",
    },
    dateText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#fbb040",
    },
    slTheme: {
      fontWeight: "700",
      color: "#ffffff",
      flex: 1,
      marginLeft: 10,
    },
    slCountBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: "rgba(251,176,64,0.12)",
    },
    slCountText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#fbb040",
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
      borderBottomColor: "rgba(135,206,235,0.06)",
    },
    slNum: {
      fontWeight: "700",
      width: 18,
      color: "#fbb040",
    },
    slName: {
      fontWeight: "600",
      color: "#ffffff",
    },
    slSinger: {
      fontSize: 12,
      color: "#87ceeb",
    },
  });
