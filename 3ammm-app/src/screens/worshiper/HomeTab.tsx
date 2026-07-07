import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useApp } from "../../lib/AppContext";
import { useTheme } from "../../lib/useTheme";
import { Spacing, Radius } from "../../theme";
import { Song } from "../LyricsScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Setlist {
  _id: string;
  title: string;
  date: string;
  songIds: Song[];
}

interface Props {
  onOpenSong: (song: Song) => void;
  onNavigateTab?: (tab: "songs" | "favs") => void;
}

function HomeTabComponent({ onOpenSong, onNavigateTab }: Props) {
  const insets = useSafeAreaInsets();
  const { profile, t } = useApp();
  const { C, isDark } = useTheme();

  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [favCount, setFavCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // Fetch songs and setlists normally. For favorites count, prefer
      // local cached favorites for guests/offline; for authenticated
      // users attempt server, but fall back to local on error.
      const [songsData, setlistsData] = await Promise.all([
        api.songs.getAll().catch(async () => {
          // fallback to cache when server unreachable
          return await (await import("../../lib/db")).db.songs.getAll();
        }),
        api.setlists.getAll().catch(async () => {
          return await (await import("../../lib/db")).db.setlists.getAll();
        }),
      ]);

      setSongs(songsData);
      setSetlists(setlistsData);

      // favorites count: prefer local cache for guests/offline; otherwise use server
      const isGuest =
        !!profile && String(profile._id || "").startsWith("guest_");

      if (isGuest || !profile) {
        const localFavs = await (
          await import("../../lib/db")
        ).db.favorites.getAll();
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
          const localFavs = await (
            await import("../../lib/db")
          ).db.favorites.getAll();
          setFavCount(localFavs.length);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

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
  const nextSongs: Song[] = useMemo(
    () => (nextSetlist ? (nextSetlist.songIds || []).filter(Boolean) : []),
    [nextSetlist],
  );

  const heroGradient: [string, string] = isDark
    ? [C.surface, C.bg]
    : [C.bgDeep, C.bg];

  const isGuestProfile =
    !!profile && String(profile._id || "").startsWith("guest_");
  const homeTitle = isGuestProfile
    ? t.homeTitle
    : profile?.name?.split(" ")[0] || t.homeTitle;

  const card1Gradient: [string, string] = isDark
    ? [C.navyLight, C.navy]
    : [C.surface, C.bgDeep];

  const card2Gradient: [string, string] = isDark
    ? [C.surfaceHigh, C.surface]
    : [C.surface, C.bgDeep];

  const setlistGradient: [string, string] = isDark
    ? [C.surfaceHigh, C.bg]
    : [C.surface, C.bgDeep];

  const s = makeStyles(C, isDark, insets.top);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.sky}
          />
        }>
        {/* HERO */}
        <LinearGradient
          colors={heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={s.hero}>
          <Text style={s.greet}>{t.greeting}</Text>
          <Text style={s.name}>{homeTitle}</Text>
          <Text style={s.verse}>{t.verse}</Text>
        </LinearGradient>

        {/* QUICK STATS */}
        <View style={s.cardsRow}>
          {/* ALL SONGS CARD */}
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.85}
            onPress={() => handleNavigateTab("songs")}>
            <LinearGradient
              colors={card1Gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.card, s.cardLeft]}>
              <View style={s.cardIconBox}>
                <Feather name="music" size={24} color={C.sky} />
              </View>
              <Text style={s.cardNum}>{songs.length}</Text>
              <Text style={s.cardLabel}>{t.allSongs}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* FAVORITES CARD */}
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.85}
            onPress={() => handleNavigateTab("favs")}>
            <LinearGradient
              colors={card2Gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.card, s.cardRight]}>
              <View style={s.cardIconBox}>
                <Feather name="heart" size={24} color={C.sky} />
              </View>
              <Text style={s.cardNum}>{favCount}</Text>
              <Text style={s.cardLabel}>{t.myFavs}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* NEXT SETLIST */}
        {nextSetlist && (
          <>
            <View style={s.secHdr}>
              <Feather name="calendar" size={18} color={C.sky} />
              <Text style={s.secTitle}>{t.nextSat}</Text>
            </View>

            <View style={s.nextSlCardWrap}>
              <LinearGradient
                colors={setlistGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.nextSlCard}>
                <View style={s.nextSlHdr}>
                  <View
                    style={[
                      s.dateBadge,
                      {
                        backgroundColor: C.skyPale,
                        borderWidth: 1,
                        borderColor: C.skyBorder,
                      },
                    ]}>
                    <Text style={[s.dateText, { color: C.sky }]}>
                      {nextSetlist.date}
                    </Text>
                  </View>

                  <Text style={s.slTheme} numberOfLines={1}>
                    {nextSetlist.title}
                  </Text>

                  <View style={s.slCountBadge}>
                    <Text style={[s.slCountText, { color: C.sky }]}>
                      {nextSongs.length}
                    </Text>
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
                    activeOpacity={0.7}>
                    <Text style={[s.slNum, { color: C.sky }]}>{i + 1}</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.slName} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={s.slSinger} numberOfLines={1}>
                        {song.singerName}
                      </Text>
                    </View>
                    <View
                      style={[s.slKeyChip, { backgroundColor: C.goldDeep }]}>
                      <Text style={[s.slKeyText, { color: C.gold }]}>
                        {song.key}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </LinearGradient>
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

export default React.memo(HomeTabComponent);

const makeStyles = (C: any, isDark: boolean, topInset: number) =>
  StyleSheet.create({
    hero: {
      paddingHorizontal: Spacing.lg,
      paddingTop: topInset + Spacing.xl,
      paddingBottom: Spacing.xxl,
      borderBottomWidth: 0.5,
      borderBottomColor: C.border,
    },
    greet: {
      fontSize: 13,
      fontWeight: "600",
      color: C.sky,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    name: {
      fontSize: 32,
      fontWeight: "700",
      color: C.text,
      marginBottom: Spacing.md,
    },
    verse: {
      fontSize: 12,
      color: C.text2,
      lineHeight: 18,
      fontStyle: "italic",
    },
    cardsRow: {
      flexDirection: "row",
      gap: Spacing.md,
      paddingHorizontal: Spacing.lg,
      marginTop: -12,
      marginBottom: Spacing.xl,
    },
    card: {
      flex: 1,
      borderRadius: Radius.lg,
      borderWidth: isDark ? 0.5 : 1,
      borderColor: isDark ? C.glassBorder : C.border,
      padding: Spacing.lg,
      alignItems: "center",
    },
    cardLeft: { borderBottomLeftRadius: Radius.lg },
    cardRight: { borderBottomRightRadius: Radius.lg },
    cardIconBox: {
      width: 48,
      height: 48,
      borderRadius: Radius.md,
      backgroundColor: isDark ? C.skyGlowSoft : C.skyPale,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: Spacing.md,
    },
    cardNum: {
      fontSize: 28,
      fontWeight: "700",
      color: C.text,
    },
    cardLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: C.text2,
      textAlign: "center",
    },
    secHdr: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
    },
    secTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: C.text,
      flex: 1,
    },
    nextSlCardWrap: {
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.lg,
      borderRadius: Radius.lg,
      overflow: "hidden",
    },
    nextSlCard: {
      borderRadius: Radius.lg,
      borderWidth: isDark ? 0.5 : 1,
      borderColor: C.border,
    },
    nextSlHdr: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: C.border,
    },
    dateBadge: {
      borderRadius: Radius.xs,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    dateText: {
      fontSize: 11,
      fontWeight: "700",
    },
    slTheme: {
      fontSize: 15,
      fontWeight: "700",
      color: C.text,
      flex: 1,
      marginLeft: 10,
    },
    slCountBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    slCountText: {
      fontSize: 12,
      fontWeight: "700",
    },
    slSong: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    slSongBorder: {
      borderBottomWidth: 0.5,
      borderBottomColor: C.border,
    },
    slNum: {
      fontSize: 12,
      fontWeight: "700",
      width: 18,
    },
    slName: {
      fontSize: 14,
      fontWeight: "600",
      color: C.text,
    },
    slSinger: {
      fontSize: 12,
      color: C.text2,
    },
    slKeyChip: {
      borderRadius: Radius.xs,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    slKeyText: {
      fontSize: 10,
      fontWeight: "700",
    },
  });
