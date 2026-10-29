import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  BackHandler,
  Share,
  Animated,
  Switch,
  PanResponder,
  LayoutChangeEvent,
  TextInput,
  Keyboard,
  Alert,
} from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { db } from "../lib/db";
import { favoritesService } from "../lib/favoritesService";
import { subscribe } from "../lib/pubsub";
import { useApp } from "../lib/AppContext";
import { useTheme } from "../lib/useTheme";
import { Spacing } from "../theme";
import SongSlideshowScreen from "./SongSlideshowScreen";

export interface Song {
  _id: string;
  title: string;
  key: string;
  tempo?: string;
  singerName: string;
  category?: string;
  lyrics: { s: string; t: string }[];
}

function MiniSlider({
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step,
  C,
}: {
  value: number;
  onValueChange: (v: number) => void;
  minimumValue: number;
  maximumValue: number;
  step: number;
  C: any;
}) {
  const trackWidth = useRef(0);
  const range = maximumValue - minimumValue;
  const pct = (value - minimumValue) / range;

  const clampStep = (raw: number) => {
    const stepped = Math.round(raw / step) * step;
    return parseFloat(
      Math.max(minimumValue, Math.min(maximumValue, stepped)).toFixed(10),
    );
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const raw =
          minimumValue + (e.nativeEvent.locationX / trackWidth.current) * range;
        onValueChange(clampStep(raw));
      },
      onPanResponderMove: (e) => {
        const raw =
          minimumValue + (e.nativeEvent.locationX / trackWidth.current) * range;
        onValueChange(clampStep(raw));
      },
    }),
  ).current;

  return (
    <View
      style={msl.wrap}
      onLayout={(e: LayoutChangeEvent) => {
        trackWidth.current = e.nativeEvent.layout.width;
      }}
      {...pan.panHandlers}>
      <View style={[msl.track, { backgroundColor: C.border }]}>
        <View
          style={[msl.fill, { width: `${pct * 100}%`, backgroundColor: C.sky }]}
        />
      </View>
      <View
        style={[msl.thumb, { left: `${pct * 100}%`, backgroundColor: C.sky }]}
        pointerEvents="none"
      />
    </View>
  );
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  const display = (label ?? "").trim() || "♪";
  return (
    <View style={sls.row}>
      <View style={sls.bar} />
      <Text style={[sls.label, { color }]} numberOfLines={1}>
        {display.toUpperCase()}
      </Text>
    </View>
  );
}

function FAB({
  icon,
  onPress,
  active,
  activeColor,
  btnBase,
  btnBorder,
  btnSheen,
  iconColor,
}: {
  icon: string;
  onPress: () => void;
  active?: boolean;
  activeColor: string;
  btnBase: string;
  btnBorder: string;
  btnSheen: string;
  iconColor: string;
}) {
  return (
    <TouchableOpacity
      style={fabStyles.fab}
      onPress={onPress}
      activeOpacity={0.85}>
      <View
        style={[
          StyleSheet.absoluteFill,
          fabStyles.fabBorder,
          {
            backgroundColor: active ? "rgba(135,206,235,0.14)" : btnBase,
            borderColor: active ? activeColor : btnBorder,
          },
        ]}
      />
      <LinearGradient
        colors={[btnSheen, "rgba(255,255,255,0.03)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          fabStyles.fabSheen,
          {
            backgroundColor: active ? "rgba(135,206,235,0.35)" : btnSheen,
          },
        ]}
      />
      <Feather
        name={icon as any}
        size={18}
        color={active ? activeColor : iconColor}
      />
    </TouchableOpacity>
  );
}

export default function LyricsScreen({
  song,
  onBack,
  pageNumber,
  allSongs = [],
  onNavigateToSong,
}: {
  song?: Song;
  onBack: () => void;
  pageNumber?: number;
  allSongs?: Song[];
  onNavigateToSong?: (song: Song) => void;
}) {
  const {
    isAuthenticated,
    fontSize,
    setFontSize,
    lineSpacing,
    setLineSpacing,
    boldLyrics,
    setBoldLyrics,
    t,
  } = useApp();
  const { profile } = useApp();
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [favoriteState, setFavoriteState] = useState<{
    songId: string;
    isFavorite: boolean;
  } | null>(null);
  const [toggling, setToggling] = useState(false);
  const [favoriteReadySongId, setFavoriteReadySongId] = useState<string | null>(
    null,
  );
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const [pageInputVisible, setPageInputVisible] = useState(false);
  const [pageQuery, setPageQuery] = useState("");
  const [pageError, setPageError] = useState(false);

  const adjustAnim = useRef(new Animated.Value(0)).current;
  const fabOpacity = useRef(new Animated.Value(1)).current;
  const pageShake = useRef(new Animated.Value(0)).current;
  const keyboardLift = useRef(new Animated.Value(0)).current;
  const lyricsBlurTarget = useRef<View | null>(null);
  const favoriteProgress = useRef(new Animated.Value(0)).current;
  const favoriteSongIdRef = useRef(song?._id);
  const favoriteToggleInFlight = useRef(false);
  const favoriteMutationVersionRef = useRef(0);
  favoriteSongIdRef.current = song?._id;
  const isFav =
    !!song?._id &&
    favoriteState?.songId === song._id &&
    favoriteState.isFavorite;
  const favoriteStatusReady = favoriteReadySongId === song?._id;
  const setIsFav = (isFavorite: boolean) => {
    if (song?._id) setFavoriteState({ songId: song._id, isFavorite });
  };

  const scrollRef = useRef<ScrollView>(null);
  const pageInputRef = useRef<TextInput>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const currentIndex = useMemo(
    () => (song?._id ? allSongs.findIndex((s) => s._id === song._id) : -1),
    [allSongs, song?._id],
  );

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < allSongs.length - 1;

  const goToSong = useCallback(
    (s: Song) => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      onNavigateToSong?.(s);
    },
    [onNavigateToSong],
  );

  const SWIPE_DISTANCE = 70;
  const SWIPE_VELOCITY = 0.35;

  const swipePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, g) => {
          if (adjustOpen || showSlideshow || pageInputVisible) return false;

          const horizontal = Math.abs(g.dx) > 12;
          const clearlyHorizontal = Math.abs(g.dx) > Math.abs(g.dy) * 1.6;

          return horizontal && clearlyHorizontal;
        },
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_, g) => {
          const fastEnough = Math.abs(g.vx) >= SWIPE_VELOCITY;
          const longEnough = Math.abs(g.dx) >= SWIPE_DISTANCE;

          if (g.dx < 0 && canGoNext && (longEnough || fastEnough)) {
            goToSong(allSongs[currentIndex + 1]);
            return;
          }

          if (g.dx > 0 && canGoPrev && (longEnough || fastEnough)) {
            goToSong(allSongs[currentIndex - 1]);
          }
        },
      }),
    [
      adjustOpen,
      showSlideshow,
      pageInputVisible,
      canGoNext,
      canGoPrev,
      goToSong,
      allSongs,
      currentIndex,
    ],
  );

  useEffect(() => {
    if (!song?._id) return;
    let active = true;
    const requestVersion = favoriteMutationVersionRef.current;
    setIsFav(false);
    setFavoriteReadySongId(null);

    (async () => {
      try {
        const hasLocal = await db.favorites.has(song._id);
        if (active) {
          setIsFav(hasLocal);
          setFavoriteReadySongId(song._id);
        }

        const isGuest =
          !!profile && String(profile._id || "").startsWith("guest_");
        if (!isAuthenticated || isGuest) return;

        const response = await api.favorites.getIds();
        const ids: string[] = Array.isArray(response)
          ? response
          : (response?.ids ?? []);
        if (favoriteMutationVersionRef.current !== requestVersion) return;
        if (active) setIsFav(ids.includes(song._id));
      } catch (error) {
        console.warn("Could not refresh favorite status:", error);
      }
    })();

    const unsubscribe = subscribe("favorites:changed", () => {
      favoriteMutationVersionRef.current += 1;
      void db.favorites.has(song._id).then((hasFavorite) => {
        if (active && favoriteSongIdRef.current === song._id) {
          setIsFav(hasFavorite);
          setFavoriteReadySongId(song._id);
        }
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [song?._id, isAuthenticated, profile]);

  useEffect(() => {
    Animated.timing(favoriteProgress, {
      toValue: isFav ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [favoriteProgress, isFav]);

  const closeAdjustPanel = useCallback(() => {
    Animated.timing(adjustAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setAdjustOpen(false));
  }, [adjustAnim]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (pageInputVisible) {
        setPageInputVisible(false);
        setPageQuery("");
        setPageError(false);
        Keyboard.dismiss();
        return true;
      }

      if (adjustOpen) {
        closeAdjustPanel();
        return true;
      }

      onBack();
      return true;
    });

    return () => sub.remove();
  }, [onBack, adjustOpen, pageInputVisible, closeAdjustPanel]);

  useEffect(() => {
    if (!pageInputVisible) return;
    const tmr = setTimeout(() => {
      pageInputRef.current?.focus();
    }, 120);
    return () => clearTimeout(tmr);
  }, [pageInputVisible]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent as any, (e: any) => {
      const keyboardHeight = e?.endCoordinates?.height ?? 0;

      Animated.timing(keyboardLift, {
        toValue: -keyboardHeight,
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

  const showFabs = useCallback(() => {
    clearTimeout(scrollTimer.current);
    Animated.timing(fabOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fabOpacity]);

  const dimFabs = useCallback(() => {
    clearTimeout(scrollTimer.current);
    Animated.timing(fabOpacity, {
      toValue: 0.25,
      duration: 300,
      useNativeDriver: true,
    }).start();
    scrollTimer.current = setTimeout(() => {
      Animated.timing(fabOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 1200);
  }, [fabOpacity]);

  const toggleFav = useCallback(async () => {
    if (
      favoriteToggleInFlight.current ||
      toggling ||
      !favoriteStatusReady ||
      !song?._id
    ) {
      return;
    }

    const songId = song._id;
    favoriteToggleInFlight.current = true;
    favoriteMutationVersionRef.current += 1;
    const previousIsFav = isFav;
    setIsFav(!previousIsFav);
    setToggling(true);
    try {
      if (!previousIsFav) {
        await db.songs.upsert(song);
      }
      const { favorited } = await favoritesService.toggle(songId, profile);
      if (favoriteSongIdRef.current === songId) setIsFav(favorited);
    } catch (error) {
      console.error("Could not update favorite:", error);
      if (favoriteSongIdRef.current === songId) setIsFav(previousIsFav);
      Alert.alert(t.error, t.favoriteUpdateError);
    } finally {
      favoriteToggleInFlight.current = false;
      if (favoriteSongIdRef.current === songId) setToggling(false);
    }
  }, [
    isFav,
    toggling,
    favoriteStatusReady,
    song,
    profile,
    t,
  ]);

  const handleShare = useCallback(async () => {
    if (!song) return;
    try {
      await Share.share({
        message: `🎵 ${song.title}\n🎤 ${song.singerName}\n🎼 Key of ${song.key}\n\n${song.lyrics
          .map((l) => l.t)
          .join("\n\n")}\n\n${
          t.sharedFromApp ?? "Shared from 3AMMM Worship App"
        }`,
        title: song.title,
      });
    } catch {
      /* silent */
    }
  }, [song, t]);

  const openAdjustPanel = useCallback(() => {
    setAdjustOpen(true);
    Animated.spring(adjustAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }).start();
  }, [adjustAnim]);

  const togglePageInput = useCallback(() => {
    setPageError(false);

    if (pageInputVisible) {
      setPageInputVisible(false);
      setPageQuery("");
      Keyboard.dismiss();
      return;
    }

    setPageQuery("");
    setPageInputVisible(true);
  }, [pageInputVisible]);

  const shakePageInput = useCallback(() => {
    pageShake.setValue(0);
    Animated.sequence([
      Animated.timing(pageShake, {
        toValue: -8,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(pageShake, {
        toValue: 8,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(pageShake, {
        toValue: -6,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(pageShake, {
        toValue: 6,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(pageShake, {
        toValue: 0,
        duration: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pageShake]);

  const handlePageSearch = useCallback(() => {
    const page = parseInt(pageQuery, 10);

    if (
      Number.isNaN(page) ||
      page < 1 ||
      page > allSongs.length ||
      !allSongs[page - 1]
    ) {
      setPageError(true);
      shakePageInput();
      return;
    }

    setPageError(false);
    setPageQuery("");
    setPageInputVisible(false);
    Keyboard.dismiss();

    goToSong(allSongs[page - 1]);
  }, [allSongs, goToSong, pageQuery, shakePageInput]);

  useEffect(() => {
    if (Platform.OS !== "web" || showSlideshow || !song || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isEditable = (element: EventTarget | null) =>
        element instanceof HTMLElement &&
        (element.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName));
      const isEditing =
        isEditable(event.target) || isEditable(document.activeElement);
      if (isEditing || event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (canGoNext) goToSong(allSongs[currentIndex + 1]);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (canGoPrev) goToSong(allSongs[currentIndex - 1]);
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        setShowSlideshow(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    allSongs,
    canGoNext,
    canGoPrev,
    currentIndex,
    goToSong,
    showSlideshow,
    song,
  ]);

  if (!song) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: C.bg,
        }}>
        <Text style={{ color: C.text, fontSize: 16 }}>
          {t.loading ?? "Loading..."}
        </Text>
      </View>
    );
  }

  if (showSlideshow) {
    return (
      <SongSlideshowScreen
        song={song}
        songs={allSongs}
        onNavigateToSong={(songId) => {
          const nextSong = allSongs.find((item) => item._id === songId);
          if (nextSong) goToSong(nextSong);
        }}
        onClose={() => setShowSlideshow(false)}
      />
    );
  }

  const TOP = insets.top;
  const scrollBg = C.bg;
  const iconColor = C.text;
  const LABEL_COLOR = C.sky;
  const btnBase = isDark ? "rgba(255,255,255,0.06)" : "rgba(4,57,84,0.04)";
  const btnBorder = C.border;
  const headerSheenColors: [string, string, string] = isDark
    ? [
        "rgba(135,206,235,0.10)",
        "rgba(135,206,235,0.00)",
        "rgba(135,206,235,0.04)",
      ]
    : [
        "rgba(42,138,184,0.08)",
        "rgba(255,255,255,0.00)",
        "rgba(42,138,184,0.04)",
      ];
  const headerEdgeColors: [string, string, string] = isDark
    ? [
        "rgba(135,206,235,0.00)",
        "rgba(135,206,235,0.18)",
        "rgba(135,206,235,0.00)",
      ]
    : [
        "rgba(42,138,184,0.00)",
        "rgba(42,138,184,0.10)",
        "rgba(42,138,184,0.00)",
      ];

  return (
    <View style={[s.wrap, { backgroundColor: scrollBg }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <View style={s.body} {...swipePan.panHandlers}>
        <BlurTargetView ref={lyricsBlurTarget} style={s.scroll}>
          <ScrollView
            ref={scrollRef}
            style={s.scroll}
            contentContainerStyle={[
              s.lyricsContent,
              {
                paddingTop: TOP + (adjustOpen ? 324 : 118),
                paddingBottom: insets.bottom + 14,
              },
            ]}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScrollBeginDrag={dimFabs}
            onScrollEndDrag={showFabs}
            onMomentumScrollBegin={dimFabs}
            onMomentumScrollEnd={showFabs}>
            <View style={{ height: 12 }} />

            {song.lyrics.map((section, i) => (
              <View key={i} style={s.section}>
                {i > 0 && (
                  <View
                    style={{
                      height: (fontSize ?? 20) * (lineSpacing ?? 1.9) * 2,
                    }}
                  />
                )}
                <SectionLabel label={section.s} color={LABEL_COLOR} />
                <Text
                  style={[
                    s.lyricsText,
                    {
                      color: C.text,
                      fontSize: fontSize ?? 20,
                      lineHeight: (fontSize ?? 20) * (lineSpacing ?? 1.9),
                      fontWeight: boldLyrics ? "600" : "300",
                    },
                  ]}>
                  {section.t}
                </Text>
              </View>
            ))}
            <View style={{ height: 180 }} />
          </ScrollView>
        </BlurTargetView>

        <Animated.View
          style={[
            fabStyles.fabContainer,
            {
              opacity: fabOpacity,
              bottom: Platform.OS === "ios" ? 110 : 90,
              transform: [{ translateY: keyboardLift }],
            },
          ]}
          pointerEvents="box-none">
          {pageInputVisible && (
            <Animated.View
              style={[
                pageStyles.pageInputBox,
                {
                  backgroundColor: C.surface,
                  borderColor: pageError ? C.danger : (C.skyBorder ?? C.border),
                  transform: [{ translateX: pageShake }],
                },
              ]}>
              <Feather
                name="hash"
                size={16}
                color={pageError ? C.danger : C.sky}
                style={{ marginRight: 8 }}
              />
              <TextInput
                ref={pageInputRef}
                style={[pageStyles.pageInput, { color: C.text }]}
                value={pageQuery}
                onChangeText={(v) => {
                  setPageQuery(v.replace(/[^0-9]/g, ""));
                  setPageError(false);
                }}
                placeholder={
                  t.songNumberPlaceholder ?? `1-${allSongs.length || 0}`
                }
                placeholderTextColor={C.text3}
                keyboardType="number-pad"
                returnKeyType="go"
                maxLength={4}
                onSubmitEditing={handlePageSearch}
              />
              <TouchableOpacity
                onPress={handlePageSearch}
                activeOpacity={0.8}
                style={[pageStyles.goBtn, { backgroundColor: C.sky }]}>
                <Feather name="arrow-right" size={16} color={C.bg} />
              </TouchableOpacity>
              {pageError && (
                <View
                  style={[
                    pageStyles.errorBubble,
                    { backgroundColor: C.danger },
                  ]}>
                  <Text style={pageStyles.errorBubbleText}>
                    {t.songNotFound ?? "Song not found"}
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          <FAB
            icon={pageInputVisible ? "x" : "hash"}
            onPress={togglePageInput}
            active={pageInputVisible}
            activeColor={C.sky}
            btnBase={isDark ? "rgba(5,14,24,0.75)" : "rgba(255,255,255,0.85)"}
            btnBorder={isDark ? "rgba(255,255,255,0.14)" : "rgba(4,57,84,0.12)"}
            btnSheen={
              isDark ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.95)"
            }
            iconColor={iconColor}
          />
        </Animated.View>
      </View>

      <View
        style={[
          s.header,
          {
            marginTop: TOP + 8,
            borderColor: C.border,
          },
        ]}>
        <BlurView
          blurTarget={lyricsBlurTarget}
          blurMethod="dimezisBlurView"
          intensity={42}
          tint={isDark ? "dark" : "light"}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? "rgba(2,22,36,0.10)"
                : "rgba(244,250,253,0.16)",
            },
          ]}
        />
        <LinearGradient
          colors={headerSheenColors}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View
          style={[
            s.headerTopSheen,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.16)"
                : "rgba(255,255,255,0.75)",
            },
          ]}
          pointerEvents="none"
        />
        <LinearGradient
          colors={headerEdgeColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.headerBottomEdge}
          pointerEvents="none"
        />
        <View style={s.row1}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t.back}
            style={[
              s.actionBtn,
              s.backAction,
              { backgroundColor: btnBase, borderColor: btnBorder },
            ]}
            onPress={onBack}
            activeOpacity={0.75}>
            <Feather name="chevron-left" size={19} color={iconColor} />
          </TouchableOpacity>

          <View style={s.titleBlock}>
            <Text style={[s.title, { color: C.text }]} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={[s.singer, { color: C.text2 }]} numberOfLines={1}>
              {song.singerName}
            </Text>
          </View>

          <View style={s.keyWrap}>
            <LinearGradient
              colors={[C.sky, C.skyDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.keyBadge}>
              <Text style={[s.keyText, { color: C.bg }]}>{song.key}</Text>
            </LinearGradient>
          </View>
        </View>

        <View style={s.row2}>
          <View style={s.actionGroup}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t.fontSize ?? "Adjust text"}
              style={[
                s.actionBtn,
                { backgroundColor: btnBase, borderColor: btnBorder },
                adjustOpen && {
                  backgroundColor: C.skyMid,
                  borderColor: C.skyBorder,
                },
              ]}
              onPress={adjustOpen ? closeAdjustPanel : openAdjustPanel}
              activeOpacity={0.75}>
              <Feather
                name="type"
                size={14}
                color={adjustOpen ? C.sky : iconColor}
              />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isFav ? t.removeFav : t.addFav}
              accessibilityState={{ checked: isFav }}
              style={[
                s.actionBtn,
                { backgroundColor: btnBase, borderColor: btnBorder },
              ]}
              onPress={toggleFav}
              disabled={toggling || !favoriteStatusReady}
              activeOpacity={0.75}>
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  s.favoriteActiveBackground,
                  {
                    backgroundColor: C.goldDeep,
                    opacity: favoriteProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.3],
                    }),
                  },
                ]}
              />
              <View style={s.favoriteIcon}>
                <Feather name="heart" size={14} color={iconColor} />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    s.favoriteFilledIcon,
                    { opacity: favoriteProgress },
                  ]}>
                  <Feather
                    name="heart"
                    size={14}
                    color={C.gold}
                    fill={C.gold}
                  />
                </Animated.View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t.share ?? "Share"}
              style={[
                s.actionBtn,
                { backgroundColor: btnBase, borderColor: btnBorder },
              ]}
              onPress={handleShare}
              activeOpacity={0.75}>
              <Feather name="share-2" size={14} color={iconColor} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t.fullscreen ?? "Fullscreen"}
              style={[
                s.actionBtn,
                { backgroundColor: btnBase, borderColor: btnBorder },
              ]}
              onPress={() => setShowSlideshow(true)}
              activeOpacity={0.75}>
              <Feather name="maximize-2" size={14} color={iconColor} />
            </TouchableOpacity>
          </View>

          {pageNumber !== undefined && (
            <LinearGradient
              colors={["#fcc55a", "#fbb040", "#d4920e"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.pageBadge}>
              <View style={s.pageBadgeSheen} />
              <Text style={s.pageNum}>{pageNumber}</Text>
            </LinearGradient>
          )}
        </View>

        {adjustOpen && (
          <Animated.View
            style={[
              s.adjustPanel,
              {
                backgroundColor: C.surfaceHigh,
                borderColor: C.border,
                opacity: adjustAnim,
                transform: [
                  {
                    translateY: adjustAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-6, 0],
                    }),
                  },
                ],
              },
            ]}>
            <View style={s.adjustRow}>
              <View style={s.adjustLeft}>
                <Feather name="type" size={13} color={C.sky} />
                <Text style={[s.adjustLabel, { color: C.text2 }]}>
                  {t.fontSize ?? "Font Size"}
                </Text>
              </View>
              <Text style={[s.adjustVal, { color: C.sky }]}>
                {Math.round(fontSize)}
              </Text>
            </View>
            <MiniSlider
              value={fontSize}
              onValueChange={setFontSize}
              minimumValue={14}
              maximumValue={26}
              step={1}
              C={C}
            />

            <View style={[s.adjustRow, { marginTop: 12 }]}>
              <View style={s.adjustLeft}>
                <Feather name="align-left" size={13} color={C.sky} />
                <Text style={[s.adjustLabel, { color: C.text2 }]}>
                  {t.lineSpacing ?? "Line Spacing"}
                </Text>
              </View>
              <Text style={[s.adjustVal, { color: C.sky }]}>
                {lineSpacing.toFixed(1)}×
              </Text>
            </View>
            <MiniSlider
              value={lineSpacing}
              onValueChange={setLineSpacing}
              minimumValue={1.2}
              maximumValue={2.4}
              step={0.1}
              C={C}
            />

            <View style={[s.divider, { backgroundColor: C.border }]} />

            <View style={s.adjustRow}>
              <View style={s.adjustLeft}>
                <Feather name="bold" size={13} color={C.sky} />
                <Text style={[s.adjustLabel, { color: C.text2 }]}>
                  {t.boldLyrics ?? "Bold Lyrics"}
                </Text>
              </View>
              <Switch
                value={boldLyrics}
                onValueChange={setBoldLyrics}
                trackColor={{ false: C.border, true: "rgba(135,206,235,0.40)" }}
                thumbColor={boldLyrics ? C.sky : "#aaa"}
              />
            </View>
          </Animated.View>
        )}
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },

  header: {
    position: "absolute",
    top: 0,
    left: 10,
    right: 10,
    zIndex: 10,
    elevation: 10,
    overflow: "hidden",
    paddingHorizontal: Spacing.md,
    paddingTop: 9,
    paddingBottom: 7,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerTopSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  headerBottomEdge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 0.5,
  },
  row1: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 38,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
  singer: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
  },
  keyWrap: {
    borderRadius: 10,
    overflow: "hidden",
  },
  keyBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  keyText: {
    fontSize: 13,
    fontWeight: "700",
  },
  row2: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 6,
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  backAction: {
    width: 34,
    height: 34,
    borderRadius: 10,
    flexShrink: 0,
  },
  actionBtn: {
    width: 29,
    height: 29,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "rgba(135,206,235,0.15)",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  favoriteActiveBackground: {
    borderRadius: 8,
  },
  favoriteIcon: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteFilledIcon: {
    alignItems: "center",
    justifyContent: "center",
  },

  pageBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#fbb040",
        shadowOpacity: 0.45,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 4 },
    }),
  },
  pageBadgeSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
  pageNum: {
    fontSize: 11,
    fontWeight: "800",
    color: "#010f18",
    letterSpacing: 0.3,
  },

  adjustPanel: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 5 },
      },
      android: { elevation: 7 },
    }),
  },
  adjustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  adjustLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  adjustLabel: { fontSize: 13, fontWeight: "600" },
  adjustVal: { fontSize: 13, fontWeight: "700" },
  divider: { height: 1, marginVertical: 12 },

  body: {
    flex: 1,
    position: "relative",
  },
  scroll: { flex: 1 },
  lyricsContent: {
    paddingHorizontal: 22,
    paddingTop: 0,
  },
  section: { marginBottom: 14 },
  lyricsText: { letterSpacing: 0.2 },
});

const msl = StyleSheet.create({
  wrap: { width: "100%", height: 36, justifyContent: "center" },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  thumb: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    top: 7,
    marginLeft: -11,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 5 },
    }),
  },
});

const sls = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    minHeight: 22,
  },
  bar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#fbb040",
    flexShrink: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    flexShrink: 1,
  },
});

const pageStyles = StyleSheet.create({
  pageInputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    maxWidth: 300,
    minWidth: 230,
    alignSelf: "flex-end",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  pageInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 0,
    paddingHorizontal: 0,
    minWidth: 60,
  },
  goBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  errorBubble: {
    position: "absolute",
    right: 10,
    bottom: -34,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  errorBubbleText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});

const fabStyles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    right: 20,
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 12,
    zIndex: 99,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 10 },
    }),
  },
  fabBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 25,
    borderWidth: 0.6,
  },
  fabSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
});
