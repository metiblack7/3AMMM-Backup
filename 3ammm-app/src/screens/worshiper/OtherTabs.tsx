import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useApp } from "../../lib/AppContext";
import { Loader, EmptyState } from "../../components/UI";
import { Spacing, Radius } from "../../theme";
import { useTheme } from "../../lib/useTheme";
import { Song } from "../LyricsScreen";

interface Setlist {
  _id: string;
  title: string;
  date: string;
  songIds: Song[];
}

interface Notif {
  _id: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
}

type FavoriteSong = Song;

interface SongProps {
  onOpenSong: (song: Song) => void;
  onBackToSongs?: () => void;
}

const STAGGER_CAP = 360;
const STAGGER_STEP = 60;

function staggerDelay(index: number) {
  return Math.min(index * STAGGER_STEP, STAGGER_CAP);
}

// ── Cross-platform blur container ─────────────────────────────
// BlurView works on iOS and web but renders transparent on Android.
// On Android we simulate the frosted-glass look with a semi-opaque
// View using the card's own background color.
function GlassContainer({
  children,
  isDark,
  style,
  intensity = 80,
}: {
  children: React.ReactNode;
  isDark: boolean;
  style?: object;
  intensity?: number;
}) {
  if (Platform.OS === "android") {
    return (
      <View
        style={[
          styles.blurContainer,
          {
            backgroundColor: isDark
              ? "rgba(2, 18, 30, 0.92)"
              : "rgba(255, 255, 255, 0.92)",
          },
          style,
        ]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} style={[styles.blurContainer, style]}>
      {children}
    </BlurView>
  );
}

function FadeSlideIn({
  index,
  children,
  style,
}: {
  index: number;
  children: React.ReactNode;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(24);

    const delay = staggerDelay(index);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        speed: 14,
        bounciness: 5,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

function TabLoadingSkeleton({
  bg,
  surface,
  border,
  topPadding,
  cardHeight = 120,
  count = 4,
}: {
  bg: string;
  surface: string;
  border: string;
  topPadding: number;
  cardHeight?: number;
  count?: number;
}) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: topPadding }}>
      <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
        {Array.from({ length: count }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.skeletonCard,
              {
                height: cardHeight,
                backgroundColor: surface,
                borderColor: border,
                opacity: pulse,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ── SETLISTS TAB ──────────────────────────────────────────────
function SetlistsTabComponent({ onOpenSong }: SongProps) {
  const { t } = useApp();
  const { C, isDark } = useTheme();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const contentFade = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    try {
      setSetlists(await api.setlists.getAll());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading) return;
    contentFade.setValue(0);
    Animated.timing(contentFade, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [loading, contentFade]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <TabLoadingSkeleton
        bg={C.bg}
        surface={C.surface}
        border={C.border}
        topPadding={
          Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 24) + 8
        }
        cardHeight={140}
      />
    );
  }

  const TOP_PADDING =
    Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 24) + 8;

  const cardGradient: [string, string, string] = isDark
    ? [C.surfaceHigh, C.surface, C.bg]
    : [C.surface, C.bgDeep, C.bg];

  return (
    <Animated.ScrollView
      style={{
        flex: 1,
        backgroundColor: C.bg,
        paddingTop: TOP_PADDING,
        opacity: contentFade,
      }}
      showsVerticalScrollIndicator={false}
      decelerationRate="normal"
      overScrollMode="always"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={C.sky}
        />
      }>
      <View style={{ height: 8 }} />

      {setlists.length === 0 ? (
        <EmptyState
          icon={<Feather name="list" size={24} color={C.sky} />}
          text="No setlists yet."
        />
      ) : (
        setlists.map((sl, slIndex) => {
          const songs = sl.songIds || [];

          return (
            <FadeSlideIn key={sl._id} index={slIndex} style={styles.cardWrap}>
              <GlassContainer isDark={isDark} intensity={isDark ? 85 : 60}>
                <LinearGradient
                  colors={cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.card,
                    {
                      borderColor: isDark ? C.glassBorder : C.border,
                      ...Platform.select({
                        ios: { shadowColor: C.sky },
                        android: {},
                      }),
                    },
                  ]}>
                  <View
                    style={[
                      styles.cardHdr,
                      {
                        borderBottomColor: isDark ? C.glassBorder : C.border,
                      },
                    ]}>
                    <View
                      style={[
                        styles.dateBadge,
                        {
                          backgroundColor: C.skyPale,
                          borderWidth: 1,
                          borderColor: C.skyBorder,
                        },
                      ]}>
                      <Text style={[styles.dateText, { color: C.sky }]}>
                        {sl.date}
                      </Text>
                    </View>

                    <Text
                      style={[styles.cardTheme, { color: C.text }]}
                      numberOfLines={1}>
                      {sl.title}
                    </Text>

                    <View
                      style={[
                        styles.songCountBadge,
                        {
                          backgroundColor: isDark ? C.skyMid : C.skyPale,
                        },
                      ]}>
                      <Text style={[styles.songCountText, { color: C.sky }]}>
                        {songs.length}
                      </Text>
                    </View>
                  </View>

                  {songs.map((song, i) => (
                    <TouchableOpacity
                      key={song._id}
                      style={[
                        styles.songRow,
                        i < songs.length - 1 && [
                          styles.songBorder,
                          {
                            borderBottomColor: isDark
                              ? C.glassBorder
                              : C.border,
                          },
                        ],
                      ]}
                      onPress={() => onOpenSong(song)}
                      activeOpacity={0.7}>
                      <Text style={[styles.songNum, { color: C.sky }]}>
                        {i + 1}
                      </Text>

                      <Text
                        style={[styles.songName, { color: C.text }]}
                        numberOfLines={1}>
                        {song.title}
                      </Text>

                      <Text
                        style={[styles.songSinger, { color: C.text2 }]}
                        numberOfLines={1}>
                        {song.singerName}
                      </Text>

                      <View
                        style={[
                          styles.keyChip,
                          { backgroundColor: C.goldDeep },
                        ]}>
                        <Text style={[styles.keyChipText, { color: C.gold }]}>
                          {song.key}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </LinearGradient>
              </GlassContainer>
            </FadeSlideIn>
          );
        })
      )}

      <View style={{ height: 20 }} />
    </Animated.ScrollView>
  );
}

export const SetlistsTab = React.memo(SetlistsTabComponent);

// ── FAVORITES TAB ─────────────────────────────────────────────
type FavoriteProps = {
  onOpenSong: (song: Song) => void;
  onBackToSongs?: () => void;
  allSongs: Song[];
};

function FavoritesTabComponent({
  onOpenSong,
  onBackToSongs,
  allSongs,
}: FavoriteProps) {
  const { t } = useApp();
  const { C, isDark } = useTheme();
  const [songs, setSongs] = useState<FavoriteSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const contentFade = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    try {
      setSongs((await api.favorites.getAll()) as FavoriteSong[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading) return;
    contentFade.setValue(0);
    Animated.timing(contentFade, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [loading, contentFade]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const getPageNumber = useCallback(
    (song: FavoriteSong, index: number) => {
      const matchIndex = allSongs.findIndex((s) => s._id === song._id);
      if (matchIndex !== -1) return matchIndex + 1;
      return index + 1;
    },
    [allSongs],
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View
          style={[
            styles.favHeaderBar,
            {
              paddingTop:
                Platform.OS === "ios"
                  ? 50
                  : (StatusBar.currentHeight ?? 24) + 8,
              backgroundColor: C.bg,
              borderBottomColor: isDark ? C.glassBorder : C.border,
            },
          ]}>
          <View style={[styles.backButton, { opacity: 0.35 }]} />
          <Text style={[styles.favHeaderTitle, { color: C.text3 }]}>
            {t.favs}
          </Text>
          <View style={styles.headerRightSpace} />
        </View>
        <TabLoadingSkeleton
          bg={C.bg}
          surface={C.surface}
          border={C.border}
          topPadding={Spacing.md}
          cardHeight={110}
        />
      </View>
    );
  }

  const TOP_PADDING =
    Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 24) + 8;

  const favGradient: [string, string, string] = isDark
    ? [C.navyLight, C.surface, C.bg]
    : [C.surface, C.bgDeep, C.bg];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View
        style={[
          styles.favHeaderBar,
          {
            paddingTop: TOP_PADDING,
            backgroundColor: C.bg,
            borderBottomColor: isDark ? C.glassBorder : C.border,
          },
        ]}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onBackToSongs}
          disabled={!onBackToSongs}
          accessibilityRole="button"
          accessibilityLabel={t.songs}
          style={[
            styles.backButton,
            {
              backgroundColor: isDark ? C.navyLight : C.surface,
              borderColor: isDark ? C.glassBorder : C.border,
              opacity: onBackToSongs ? 1 : 0.5,
            },
          ]}>
          <Feather name="chevron-left" size={22} color={C.sky} />
        </TouchableOpacity>

        <Text style={[styles.favHeaderTitle, { color: C.text }]}>{t.favs}</Text>

        <View style={styles.headerRightSpace} />
      </View>

      <Animated.ScrollView
        style={{ flex: 1, backgroundColor: C.bg, opacity: contentFade }}
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
        overScrollMode="always"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.sky}
          />
        }>
        {songs.length === 0 ? (
          <EmptyState
            icon={<Feather name="heart" size={24} color={C.sky} />}
            text={t.noFavs}
          />
        ) : (
          <View
            style={{
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.md,
              gap: Spacing.md,
            }}>
            {songs.map((song, index) => {
              const pageNumber = getPageNumber(song, index);

              return (
                <FadeSlideIn
                  key={song._id}
                  index={index}
                  style={styles.favCardWrap}>
                  <TouchableOpacity
                    onPress={() => onOpenSong(song)}
                    activeOpacity={0.7}>
                    <GlassContainer
                      isDark={isDark}
                      intensity={isDark ? 85 : 60}>
                      <LinearGradient
                        colors={favGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.favCard,
                          {
                            borderColor: isDark ? C.glassBorder : C.border,
                            ...Platform.select({
                              ios: {
                                shadowColor: isDark ? C.sky : C.navy,
                              },
                              android: {},
                            }),
                          },
                        ]}>
                        <View style={styles.favRow}>
                          <View style={styles.favPageWrap}>
                            <Text style={[styles.favPage, { color: C.sky }]}>
                              {pageNumber}
                            </Text>
                          </View>

                          <View style={styles.favMain}>
                            <View style={styles.favTopRow}>
                              <View
                                style={[
                                  styles.favIcon,
                                  {
                                    backgroundColor: isDark
                                      ? C.skyGlowSoft
                                      : C.skyPale,
                                    borderColor: C.skyBorder,
                                  },
                                ]}>
                                <Feather name="heart" size={20} color={C.sky} />
                              </View>

                              <View style={styles.favInfo}>
                                <Text
                                  style={[styles.favTitle, { color: C.text }]}
                                  numberOfLines={1}>
                                  {song.title}
                                </Text>
                                <Text
                                  style={[styles.favMeta, { color: C.text2 }]}
                                  numberOfLines={1}>
                                  {song.singerName}
                                </Text>
                              </View>
                            </View>

                            <View
                              style={[
                                styles.favFooter,
                                {
                                  borderTopColor: isDark
                                    ? C.glassBorder
                                    : C.border,
                                },
                              ]}>
                              <View style={{ flex: 1 }} />
                              <View
                                style={[
                                  styles.keyChip,
                                  { backgroundColor: C.goldDeep },
                                ]}>
                                <Text
                                  style={[
                                    styles.keyChipText,
                                    { color: C.gold },
                                  ]}>
                                  {song.key}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <Feather
                            name="chevron-right"
                            size={18}
                            color={C.text3}
                          />
                        </View>
                      </LinearGradient>
                    </GlassContainer>
                  </TouchableOpacity>
                </FadeSlideIn>
              );
            })}
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

export const FavoritesTab = React.memo(FavoritesTabComponent);

// ── NOTIFICATIONS TAB ─────────────────────────────────────────
function NotificationsTabComponent() {
  const { t } = useApp();
  const { C, isDark } = useTheme();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.notifications
      .getAll()
      .then((data) => setNotifs(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const TOP_PADDING =
    Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 24) + 8;

  const notifGradients = (type: string): [string, string] => {
    if (isDark) {
      const map: Record<string, [string, string]> = {
        setlist: [C.navyLight, C.navy],
        song: [C.surfaceHigh, C.surface],
        alert: [C.surface, C.bg],
      };
      return map[type] ?? [C.surface, C.bg];
    } else {
      const map: Record<string, [string, string]> = {
        setlist: [C.surface, C.bgDeep],
        song: [C.surface, C.bg],
        alert: [C.surface, C.surfaceHigh],
      };
      return map[type] ?? [C.surface, C.bg];
    }
  };

  const iconMap: Record<string, string> = {
    setlist: "list",
    song: "music",
    alert: "bell",
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg, paddingTop: TOP_PADDING }}
      showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.notifHdrWrap,
          { borderBottomColor: isDark ? C.glassBorder : C.border },
        ]}>
        <Feather name="bell" size={20} color={C.sky} />
        <Text style={[styles.notifHdrText, { color: C.text }]}>
          {t.notifTitle}
        </Text>

        {notifs.length > 0 && (
          <View
            style={[
              styles.notifCount,
              { backgroundColor: isDark ? C.skyMid : C.skyPale },
            ]}>
            <Text style={[styles.notifCountText, { color: C.sky }]}>
              {notifs.length}
            </Text>
          </View>
        )}
      </View>

      {notifs.length === 0 ? (
        <EmptyState
          icon={<Feather name="inbox" size={24} color={C.sky} />}
          text="No notifications."
        />
      ) : (
        <View
          style={{
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
            gap: Spacing.md,
          }}>
          {notifs.map((n) => {
            const [g1, g2] = notifGradients(n.type);

            return (
              <TouchableOpacity
                key={n._id}
                activeOpacity={0.7}
                style={styles.notifCardWrap}>
                <GlassContainer isDark={isDark} intensity={isDark ? 85 : 60}>
                  <LinearGradient
                    colors={[g1, g2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.notifCard,
                      {
                        borderColor: isDark ? C.glassBorder : C.border,
                        ...Platform.select({
                          ios: {
                            shadowColor: isDark ? C.sky : C.navy,
                          },
                          android: {},
                        }),
                      },
                    ]}>
                    <View
                      style={[
                        styles.notifIconBox,
                        {
                          backgroundColor: isDark ? C.skyGlowSoft : C.skyPale,
                          borderColor: C.skyBorder,
                        },
                      ]}>
                      <Feather
                        name={iconMap[n.type] as any}
                        size={18}
                        color={C.sky}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notifItemTitle, { color: C.text }]}>
                        {n.title}
                      </Text>
                      <Text
                        style={[styles.notifItemBody, { color: C.text2 }]}
                        numberOfLines={2}>
                        {n.body}
                      </Text>
                      <Text style={[styles.notifTime, { color: C.text3 }]}>
                        {new Date(n.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </LinearGradient>
                </GlassContainer>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

export const NotificationsTab = React.memo(NotificationsTabComponent);

// ─────────────────────────────────────────────────────────────────────────────
// StyleSheets
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  blurContainer: {
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  // ── SETLIST ─────────────────────────
  cardWrap: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
    borderRadius: Radius.lg,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 6 },
    }),
  },
  cardHdr: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
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
  cardTheme: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  songCountBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  songCountText: {
    fontSize: 12,
    fontWeight: "700",
  },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: Spacing.sm,
  },
  songBorder: {
    borderBottomWidth: 1,
  },
  songNum: {
    fontSize: 12,
    fontWeight: "700",
    width: 18,
  },
  songName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  songSinger: {
    fontSize: 12,
  },
  keyChip: {
    borderRadius: Radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  keyChipText: {
    fontSize: 10,
    fontWeight: "700",
  },

  // ── FAVORITES ──────────────────────
  favHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  favHeaderTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  headerRightSpace: {
    width: 42,
    height: 42,
  },
  favCardWrap: {
    overflow: "hidden",
  },
  favCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 4 },
    }),
  },
  favRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  favPageWrap: {
    width: 28,
    alignItems: "flex-start",
    justifyContent: "center",
    marginRight: 10,
  },
  favPage: {
    fontSize: 15,
    fontWeight: "700",
  },
  favMain: {
    flex: 1,
    minWidth: 0,
  },
  favTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  favIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  favInfo: {
    flex: 1,
    minWidth: 0,
  },
  favTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  favMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  favFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },

  // ── NOTIFICATIONS ──────────────────
  notifHdrWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  notifHdrText: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  notifCount: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  notifCountText: {
    fontSize: 12,
    fontWeight: "700",
  },
  notifCardWrap: {
    overflow: "hidden",
  },
  notifCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
    }),
  },
  notifIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  notifItemTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  notifItemBody: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    marginTop: 6,
  },
  skeletonCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
});
