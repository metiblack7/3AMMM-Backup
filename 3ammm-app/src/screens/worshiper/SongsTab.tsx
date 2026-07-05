import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  MutableRefObject,
} from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Text,
  RefreshControl,
  Platform,
  StatusBar,
  Animated,
  Easing,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewToken,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useApp } from "../../lib/AppContext";
import { useTheme } from "../../lib/useTheme";
import { useNetworkStatus } from "../../lib/network";
import { EmptyState } from "../../components/UI";
import { Spacing } from "../../theme";
import { Song } from "../LyricsScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  onOpenSong: (song: Song) => void;
  /**
   * A ref owned by WorshiperApp that stores the raw pixel scroll offset.
   * Using a ref (not state) means writing to it never causes a re-render,
   * and reading from it is always fresh — no race conditions.
   */
  scrollOffsetRef: MutableRefObject<number>;
}

type NumberedSong = Song & { pageNumber: number };

const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList<NumberedSong>,
);

const STAGGER_CAP = 280;
const STAGGER_STEP = 45;

// Height of the collapsible header (search box + singer pills).
const HEADER_HEIGHT = 118;

// Must match the row-advance value used in getItemLayout below.
const CARD_ROW_HEIGHT = 92;

function staggerDelay(index: number) {
  return Math.min((index % 10) * STAGGER_STEP, STAGGER_CAP);
}

// ── Animated song card (mount stagger + iOS-notification-style
//    edge squish, active only while scrolling) ──────────────────
const AnimatedSongCard = React.memo(function AnimatedSongCard({
  item,
  index,
  isDark,
  C,
  cardGradients,
  onOpenSong,
  isEdge,
  scrollActive,
}: {
  item: NumberedSong;
  index: number;
  isDark: boolean;
  C: ReturnType<typeof useTheme>["C"];
  cardGradients: (category: string) => [string, string];
  onOpenSong: (song: Song) => void;
  isEdge: boolean;
  scrollActive: Animated.Value;
}) {
  const mountOpacity = useRef(new Animated.Value(0)).current;
  const mountTranslateY = useRef(new Animated.Value(22)).current;
  const mountScale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    mountOpacity.setValue(0);
    mountTranslateY.setValue(22);
    mountScale.setValue(0.96);

    const delay = staggerDelay(index);
    Animated.parallel([
      Animated.timing(mountOpacity, {
        toValue: 1,
        duration: 340,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(mountTranslateY, {
        toValue: 0,
        duration: 380,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(mountScale, {
        toValue: 1,
        speed: 18,
        bounciness: 4,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [item._id, index, mountOpacity, mountTranslateY, mountScale]);

  // ── Edge squish: 0 = normal, 1 = fully compressed. Eases toward
  // 1 only when this card becomes the first/last visible card on
  // screen (isEdge). Combined below with scrollActive so it only
  // ever shows while the list is actually being scrolled.
  const edgeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(edgeAnim, {
      toValue: isEdge ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isEdge, edgeAnim]);

  const squish = useMemo(
    () => Animated.multiply(edgeAnim, scrollActive),
    [edgeAnim, scrollActive],
  );

  const squishScale = useMemo(
    () => squish.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] }),
    [squish],
  );

  const squishOpacity = useMemo(
    () => squish.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }),
    [squish],
  );

  const combinedScale = useMemo(
    () => Animated.multiply(mountScale, squishScale),
    [mountScale, squishScale],
  );

  const combinedOpacity = useMemo(
    () => Animated.multiply(mountOpacity, squishOpacity),
    [mountOpacity, squishOpacity],
  );

  const [g1, g2] = cardGradients(item.category);

  return (
    <Animated.View
      style={{
        opacity: combinedOpacity,
        transform: [{ translateY: mountTranslateY }, { scale: combinedScale }],
      }}>
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
              ...Platform.select({
                ios: { shadowColor: isDark ? C.sky : C.navy },
                android: {},
              }),
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
              <Text style={[ss.songTitle, { color: C.text }]}>
                {item.title}
              </Text>
              <Text style={[ss.songMeta, { color: C.text2 }]}>
                {item.singerName}
              </Text>
            </View>

            <Feather name="chevron-right" size={18} color={C.text3} />
          </View>

          <View
            style={[
              ss.songFooter,
              { borderTopColor: isDark ? C.glassBorder : C.border },
            ]}>
            <Text style={[ss.songNumber, { color: C.text3 }]}>
              {item.pageNumber}
            </Text>
            <View style={[ss.keyChip, { backgroundColor: C.goldDeep }]}>
              <Text style={[ss.keyChipText, { color: C.gold }]}>
                {item.key}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ── Pulsing skeleton while songs load ────────────────────────────
function SongsLoadingSkeleton({
  topPadding,
  bg,
  surface,
  border,
}: {
  topPadding: number;
  bg: string;
  surface: string;
  border: string;
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
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <Animated.View
          style={[
            ss.skeletonSearch,
            { backgroundColor: surface, borderColor: border, opacity: pulse },
          ]}
        />
      </View>
      <View style={ss.skeletonPills}>
        {[72, 88, 64, 96].map((w, i) => (
          <Animated.View
            key={i}
            style={[
              ss.skeletonPill,
              {
                width: w,
                backgroundColor: surface,
                borderColor: border,
                opacity: pulse,
              },
            ]}
          />
        ))}
      </View>
      <View style={ss.skeletonList}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              ss.skeletonCard,
              { backgroundColor: surface, borderColor: border, opacity: pulse },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function SongsTabComponent({ onOpenSong, scrollOffsetRef }: Props) {
  const { t } = useApp();
  const { C, isDark } = useTheme();
  const isOnline = useNetworkStatus();
  const insets = useSafeAreaInsets();

  // ── Data ─────────────────────────────────────────────────────
  const [songs, setSongs] = useState<Song[]>([]);
  const [singers, setSingers] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [singerFilter, setSingerFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ── Page-number search ───────────────────────────────────────
  const [pageInputVisible, setPageInputVisible] = useState(false);
  const [pageQuery, setPageQuery] = useState("");
  const [pageError, setPageError] = useState(false);
  const pageShake = useRef(new Animated.Value(0)).current;
  const pageInputRef = useRef<TextInput>(null);

  // ── List fade on filter change ───────────────────────────────
  const listFade = useRef(new Animated.Value(1)).current;

  // ── Keyboard lift for floating search ────────────────────────
  const keyboardLift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent as any, (e: any) => {
      const keyboardHeight = e?.endCoordinates?.height ?? 0;
      Animated.timing(keyboardLift, {
        toValue: -(keyboardHeight - 28),
        duration: Platform.OS === "ios" ? 220 : 180,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent as any, () => {
      Animated.timing(keyboardLift, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardLift]);

  // ── List ref ─────────────────────────────────────────────────
  const listRef = useRef<FlatList>(null);
  /**
   * Track whether we have already done the initial scroll restoration
   * for this mount. We only want to do it once per data-load, not on
   * every re-render.
   */
  const restoredRef = useRef(false);

  // ── Collapsing header scroll value ────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;
  const diffClampScroll = useRef(
    Animated.diffClamp(scrollY, 0, HEADER_HEIGHT),
  ).current;

  const headerTranslateY = diffClampScroll.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT],
    extrapolate: "clamp",
  });

  const headerOpacity = diffClampScroll.interpolate({
    inputRange: [0, HEADER_HEIGHT * 0.6, HEADER_HEIGHT],
    outputRange: [1, 0.4, 0],
    extrapolate: "clamp",
  });

  // ── "Is actively scrolling" driver for the card edge-squish ───
  // 0 = idle, 1 = actively dragging/decelerating. Cards only squish
  // while this is > 0, so the effect never lingers once you stop.
  const scrollActive = useRef(new Animated.Value(0)).current;

  const onScrollBeginDrag = useCallback(() => {
    Animated.timing(scrollActive, {
      toValue: 1,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [scrollActive]);

  const onMomentumScrollEnd = useCallback(() => {
    Animated.timing(scrollActive, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [scrollActive]);

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      // If there's no residual velocity, onMomentumScrollEnd may not
      // fire — catch that case here so the squish always relaxes.
      const v = e.nativeEvent.velocity?.y ?? 0;
      if (Math.abs(v) < 0.05) {
        Animated.timing(scrollActive, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    },
    [scrollActive],
  );

  // ── First/last visible card tracking (drives which cards squish) ──
  const [edgeIndices, setEdgeIndices] = useState<{
    first: number | null;
    last: number | null;
  }>({ first: null, last: null });

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 55 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return;
      const first = viewableItems[0].index;
      const last = viewableItems[viewableItems.length - 1].index;
      setEdgeIndices((prev) =>
        prev.first === first && prev.last === last ? prev : { first, last },
      );
    },
  ).current;

  // ── Load ─────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [songsData, singersData] = await Promise.all([
        api.songs.getAll(),
        api.songs.getSingers(),
      ]);
      setSongs(songsData);
      setSingers(["All", ...singersData]);
    } catch (err: any) {
      setError(err.message || "Failed to load songs");
    } finally {
      setLoading(false);
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

  // ── Numbered songs (global page numbers, never changes with filter) ──
  const songsWithNumbers = useMemo<NumberedSong[]>(
    () => songs.map((s, i) => ({ ...s, pageNumber: i + 1 })),
    [songs],
  );

  // ── Filter ───────────────────────────────────────────────────
  const performSearch = useCallback(
    (list: NumberedSong[], q: string, singer: string): NumberedSong[] => {
      if (!q && singer === "All") return list;
      return list.filter((song) => {
        if (singer !== "All" && song.singerName !== singer) return false;
        if (!q) return true;
        const lq = q.toLowerCase();
        const title = song.title.toLowerCase();
        const lyrics = song.lyrics
          .map((l: any) => l.s || l.t || "")
          .join(" ")
          .toLowerCase();

        if (title.includes(lq) || lyrics.includes(lq)) return true;
        if (title.split(/\s+/).some((w) => w.startsWith(lq))) return true;
        if (lyrics.split(/\s+/).some((w) => w.startsWith(lq))) return true;

        let idx = 0;
        for (const ch of lq) {
          idx = title.indexOf(ch, idx);
          if (idx === -1) return false;
          idx++;
        }
        return true;
      });
    },
    [],
  );

  const filtered = useMemo(
    () => performSearch(songsWithNumbers, query, singerFilter),
    [songsWithNumbers, query, singerFilter, performSearch],
  );

  useEffect(() => {
    listFade.setValue(0.45);
    Animated.timing(listFade, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [query, singerFilter, listFade]);

  // ── Scroll save (pixel-accurate, no re-render cost) ──────────
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
    },
    [scrollOffsetRef],
  );

  // Drives scrollY (header collapse) on the native thread AND still
  // calls handleScroll so the pixel-accurate ref keeps working.
  const onListScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: handleScroll,
      }),
    [scrollY, handleScroll],
  );

  // ── Scroll restore ───────────────────────────────────────────
  useEffect(() => {
    if (loading || songs.length === 0 || restoredRef.current) return;
    restoredRef.current = true;
    const offset = scrollOffsetRef.current;
    if (offset > 0) {
      scrollY.setValue(offset);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset, animated: true });
      });
    }
  }, [loading, songs, scrollOffsetRef, scrollY]);

  // ── Card gradient ────────────────────────────────────────────
  const cardGradients = useCallback(
    (_category: string): [string, string] => {
      if (isDark) {
        return ["#082f41", "#00121e"];
      }

      return ["#DFF5FF", "#F7FCFF"];
    },
    [isDark],
  );

  // ── Page-number search ───────────────────────────────────────
  const shakeAnimation = useCallback(() => {
    Animated.sequence([
      Animated.timing(pageShake, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(pageShake, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(pageShake, {
        toValue: 6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(pageShake, {
        toValue: -6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(pageShake, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pageShake]);

  const handlePageSearch = useCallback(() => {
    const num = parseInt(pageQuery.trim(), 10);
    const target = songsWithNumbers.find((s) => s.pageNumber === num);

    if (!target) {
      setPageError(true);
      shakeAnimation();
      setTimeout(() => setPageError(false), 2000);
      return;
    }

    setPageInputVisible(false);
    setPageQuery("");
    Keyboard.dismiss();
    onOpenSong(target);
  }, [pageQuery, songsWithNumbers, onOpenSong, shakeAnimation]);

  const togglePageInput = useCallback(() => {
    setPageInputVisible((v) => {
      if (!v) {
        setPageQuery("");
        setPageError(false);
        setTimeout(() => pageInputRef.current?.focus(), 100);
      } else {
        Keyboard.dismiss();
      }
      return !v;
    });
  }, []);

  // ── Render song card ─────────────────────────────────────────
  const renderSongItem = useCallback(
    ({ item, index }: { item: NumberedSong; index: number }) => (
      <AnimatedSongCard
        item={item}
        index={index}
        isDark={isDark}
        C={C}
        cardGradients={cardGradients}
        onOpenSong={onOpenSong}
        isEdge={index === edgeIndices.first || index === edgeIndices.last}
        scrollActive={scrollActive}
      />
    ),
    [C, isDark, cardGradients, onOpenSong, edgeIndices, scrollActive],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: CARD_ROW_HEIGHT,
      offset: CARD_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const TOP_PADDING = insets.top;

  // ── Early returns (after all hooks) ─────────────────────────
  if (loading) {
    return (
      <SongsLoadingSkeleton
        topPadding={TOP_PADDING}
        bg={C.bg}
        surface={C.surface}
        border={C.border}
      />
    );
  }

  if (error && songs.length === 0) {
    return (
      <View
        style={[
          es.errorWrap,
          { backgroundColor: C.bg, paddingTop: TOP_PADDING },
        ]}>
        <Feather
          name={isOnline ? "alert-circle" : "wifi-off"}
          size={40}
          color={C.text3}
        />
        <Text style={[es.errorTitle, { color: C.text }]}>
          {isOnline ? "Could not load songs" : "You are offline"}
        </Text>
        <Text style={[es.errorMsg, { color: C.danger }]}>{error}</Text>
        <TouchableOpacity
          style={[es.retryBtn, { backgroundColor: C.sky }]}
          onPress={load}>
          <Text style={[es.retryText, { color: C.bg }]}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── COLLAPSING HEADER: search + singer pills ─────────── */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          hs.headerWrap,
          {
            paddingTop: TOP_PADDING,
            backgroundColor: C.bg,
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
          },
        ]}>
        {/* ── SEARCH ────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: Spacing.lg,
            paddingTop: Spacing.md,
            paddingBottom: 6,
          }}>
          <View
            style={[
              ss.searchBox,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                ...Platform.select({
                  ios: {
                    shadowColor: isDark ? C.sky : C.navy,
                    shadowOpacity: isDark ? 0.1 : 0.06,
                  },
                  android: {},
                }),
              },
            ]}>
            <Feather name="search" size={17} color={C.sky} />
            <TextInput
              style={[ss.searchInput, { color: C.text }]}
              value={query}
              onChangeText={setQuery}
              placeholder={t.search}
              placeholderTextColor={C.text3}
            />
            {query ? (
              <TouchableOpacity
                onPress={() => setQuery("")}
                activeOpacity={0.7}>
                <Feather name="x" size={16} color={C.text3} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ── SINGER PILLS ──────────────────────── */}
        <View style={{ paddingTop: 10, paddingBottom: 6 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={ss.pillsContent}>
            {singers.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  ss.pill,
                  {
                    borderColor:
                      singerFilter === s ? "transparent" : C.skyBorder,
                    backgroundColor:
                      singerFilter === s
                        ? "transparent"
                        : isDark
                          ? C.glass
                          : C.surface,
                  },
                ]}
                onPress={() => setSingerFilter(s)}
                activeOpacity={0.75}>
                {singerFilter === s ? (
                  <LinearGradient
                    colors={[C.sky, C.skyDeep]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={ss.pillGradient}>
                    <Text style={[ss.pillTextOn, { color: C.bg }]}>{s}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={[ss.pillText, { color: C.text2 }]}>{s}</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>

      {/* ── SONG LIST ─────────────────────────── */}
      <AnimatedFlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={renderSongItem}
        style={{ opacity: listFade }}
        ListEmptyComponent={
          <EmptyState
            icon={<Feather name="music" size={22} color={C.sky} />}
            text="No songs found."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.sky}
            progressViewOffset={TOP_PADDING + HEADER_HEIGHT}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          ss.listContent,
          { paddingTop: TOP_PADDING + HEADER_HEIGHT + Spacing.sm },
        ]}
        removeClippedSubviews={Platform.OS === "android"}
        maxToRenderPerBatch={12}
        windowSize={11}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
        getItemLayout={getItemLayout}
        onScroll={onListScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        decelerationRate="normal"
        overScrollMode="always"
        bounces
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index: info.highestMeasuredFrameIndex,
              animated: true,
            });
          }, 100);
        }}
      />

      {/* ── FLOATING PAGE-NUMBER SEARCH ───────── */}
      <Animated.View
        style={[
          ps.fabArea,
          {
            transform: [{ translateY: keyboardLift }],
          },
        ]}
        pointerEvents="box-none">
        {pageInputVisible && (
          <Animated.View
            style={[
              ps.pageInputBox,
              {
                backgroundColor: C.surface,
                borderColor: pageError ? C.danger : C.skyBorder,
                transform: [{ translateX: pageShake }],
              },
            ]}>
            <Feather
              name="hash"
              size={18}
              color={pageError ? C.danger : C.sky}
              style={{ marginRight: 10 }}
            />

            <TextInput
              ref={pageInputRef}
              style={[ps.pageInput, { color: C.text }]}
              value={pageQuery}
              onChangeText={(v) => {
                setPageQuery(v.replace(/[^0-9]/g, ""));
                setPageError(false);
              }}
              placeholder="Song Number"
              placeholderTextColor={C.text3}
              keyboardType="number-pad"
              returnKeyType="go"
              maxLength={4}
              onSubmitEditing={handlePageSearch}
            />

            <TouchableOpacity
              onPress={handlePageSearch}
              activeOpacity={0.8}
              style={[
                ps.goBtn,
                {
                  backgroundColor: C.sky,
                },
              ]}>
              <Feather name="arrow-right" size={18} color={C.bg} />
            </TouchableOpacity>

            {pageError && (
              <View
                style={[
                  ps.errorBubble,
                  {
                    backgroundColor: C.danger,
                  },
                ]}>
                <Text style={ps.errorBubbleText}>Song not found</Text>
              </View>
            )}
          </Animated.View>
        )}

        <TouchableOpacity
          onPress={togglePageInput}
          activeOpacity={0.85}
          style={ps.fabWrap}>
          <LinearGradient
            colors={
              pageInputVisible ? [C.navy, C.navyLight] : [C.sky, C.skyDeep]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={ps.fab}>
            <Feather
              name={pageInputVisible ? "x" : "hash"}
              size={20}
              color={C.bg}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default React.memo(SongsTabComponent);

// ─────────────────────────────────────────────────────────────────────────────
// StyleSheets
// ─────────────────────────────────────────────────────────────────────────────

const hs = StyleSheet.create({
  headerWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
});

const ss = StyleSheet.create({
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 2 },
    }),
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "500", paddingVertical: 0 },

  pillsContent: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
    paddingBottom: 4,
    alignItems: "center",
  },

  pill: {
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 38,
    justifyContent: "center",
    flexShrink: 0,
    alignSelf: "flex-start",
  },

  pillGradient: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  pillText: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 18,
    paddingVertical: 9,
    flexShrink: 0,
    textAlign: "center",
  },

  pillTextOn: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 0,
    textAlign: "center",
  },

  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 160,
    gap: Spacing.md,
  },

  songCardWrap: { borderRadius: 16, overflow: "hidden" },
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
  songHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
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

  skeletonSearch: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  skeletonPills: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: 8,
    paddingVertical: 10,
  },
  skeletonPill: {
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
  },
  skeletonList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  skeletonCard: {
    height: 92,
    borderRadius: 16,
    borderWidth: 1,
  },
});

const es = StyleSheet.create({
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 12,
  },
  errorTitle: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  errorMsg: { fontSize: 13, textAlign: "center" },
  retryBtn: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  retryText: { fontSize: 14, fontWeight: "700" },
});

const ps = StyleSheet.create({
  fabArea: {
    position: "absolute",
    bottom: 118,
    right: 20,
    alignItems: "flex-end",
    gap: 12,
    pointerEvents: "box-none",
  } as any,

  pageInputBox: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 180,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 8,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.18,
        shadowRadius: 15,
        shadowOffset: {
          width: 0,
          height: 5,
        },
      },
      android: {
        elevation: 10,
      },
    }),
  },

  pageInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
    paddingVertical: 0,
  },

  goBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  errorBubble: {
    position: "absolute",
    top: -42,
    right: 0,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  errorBubbleText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  fabWrap: {
    borderRadius: 30,
  },

  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: {
          width: 0,
          height: 5,
        },
      },
      android: {
        elevation: 12,
      },
    }),
  },
});

const ns = StyleSheet.create({
  offlineBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  offlineText: { fontSize: 12, fontWeight: "600", color: "#fff" },
});
