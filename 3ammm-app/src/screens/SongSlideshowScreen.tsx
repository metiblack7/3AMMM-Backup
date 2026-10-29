import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  BackHandler,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import * as NavigationBar from "expo-navigation-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../lib/useTheme";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface SongSlideshowProps {
  song: {
    _id: string;
    title: string;
    singerName: string;
    key: string;
    lyrics: { s: string; t: string }[];
  };
  songs?: SongSlideshowProps["song"][];
  onNavigateToSong?: (songId: string) => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const AUTO_ADVANCE_MS = 5000;
const CONTROLS_HIDE_MS = 3500;
const FADE_DURATION = 260;
const SKY = "#87ceeb";
const GOLD = "#fbb040";
const GOLD_DARK = "#d4920e";
const WHITE = "#ffffff";
const BLACK = "#000000";
const WHITE_60 = "rgba(255,255,255,0.60)";
const WHITE_10 = "rgba(255,255,255,0.10)";
const WHITE_14 = "rgba(255,255,255,0.14)";
const WHITE_20 = "rgba(255,255,255,0.20)";
const SKY_15 = "rgba(135,206,235,0.15)";
const SKY_30 = "rgba(135,206,235,0.30)";
const SKY_60 = "rgba(135,206,235,0.60)";
const SURFACE = "rgba(4,10,18,0.82)";
const FONT_MIN = 18;
const FONT_MAX = 52;
const FONT_LANDSCAPE_DEFAULT = 32;
const FONT_PORTRAIT_DEFAULT = 22;
const FONT_STEP = 2;

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function SongSlideshowScreen({
  song,
  songs = [],
  onNavigateToSong,
  onClose,
}: SongSlideshowProps) {
  const totalSlides = song.lyrics.length;
  const insets = useSafeAreaInsets();
  const { C, isDark } = useTheme();

  // ── State ──────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const [dims, setDims] = useState(Dimensions.get("window"));
  const [fontSize, setFontSize] = useState(FONT_PORTRAIT_DEFAULT);
  const [fontSizeLocked, setFontSizeLocked] = useState(false); // true = user manually changed

  // ── Refs ───────────────────────────────────────────────────
  const flatListRef = useRef<FlatList>(null);
  const currentIndexRef = useRef(0);
  const autoAdvanceRef = useRef(false);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Animated values ────────────────────────────────────────
  const slideFade = useRef(new Animated.Value(1)).current;
  const controlsFade = useRef(new Animated.Value(1)).current;
  const fontScaleAnim = useRef(new Animated.Value(1)).current;

  // ─────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────
  const clearAutoTimer = () => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };
  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const fadeControls = (toValue: number, cb?: () => void) => {
    Animated.timing(controlsFade, {
      toValue,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start(cb);
  };

  // Font size bump animation
  const animateFontChange = () => {
    fontScaleAnim.setValue(1.18);
    Animated.spring(fontScaleAnim, {
      toValue: 1,
      tension: 260,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const increaseFontSize = useCallback(() => {
    setFontSizeLocked(true);
    animateFontChange();
    setFontSize((prev) => Math.min(prev + FONT_STEP, FONT_MAX));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontSizeLocked(true);
    animateFontChange();
    setFontSize((prev) => Math.max(prev - FONT_STEP, FONT_MIN));
  }, []);

  // ─────────────────────────────────────────────────────────
  // Orientation + Navigation bar
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const enterFullscreen = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
        );
      } catch {
        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE,
          );
        } catch {}
      }
      if (Platform.OS === "android") {
        try {
          await NavigationBar.setVisibilityAsync("hidden");
          await NavigationBar.setBehaviorAsync("inset-swipe");
        } catch {}
      }
    };

    const exitFullscreen = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
      } catch {
        try {
          await ScreenOrientation.unlockAsync();
        } catch {}
      }
      if (Platform.OS === "android") {
        try {
          await NavigationBar.setVisibilityAsync("visible");
        } catch {}
      }
    };

    enterFullscreen();

    // Listen for orientation changes
    const sub = ScreenOrientation.addOrientationChangeListener((evt) => {
      const o = evt.orientationInfo.orientation;
      const landscape =
        o === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        o === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      if (mounted) {
        setIsLandscape(landscape);
        // Auto-adjust font size only if user hasn't manually changed it
        if (!fontSizeLocked) {
          setFontSize(
            landscape ? FONT_LANDSCAPE_DEFAULT : FONT_PORTRAIT_DEFAULT,
          );
        }
      }
    });

    return () => {
      mounted = false;
      ScreenOrientation.removeOrientationChangeListener(sub);
      exitFullscreen();
    };
  }, [fontSizeLocked]);

  // ── Dimension listener ─────────────────────────────────────
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setDims(window);
      const landscape = window.width > window.height;
      setIsLandscape(landscape);
    });
    return () => sub.remove();
  }, []);

  // Set initial landscape state
  useEffect(() => {
    const { width, height } = Dimensions.get("window");
    setIsLandscape(width > height);
  }, []);

  // ── StatusBar ─────────────────────────────────────────────
  useEffect(() => {
    StatusBar.setHidden(true, "fade");
    return () => StatusBar.setHidden(false, "fade");
  }, []);

  // ── Hardware back ─────────────────────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  // ── Auto-advance ──────────────────────────────────────────
  const startAutoAdvance = useCallback(() => {
    clearAutoTimer();
    if (totalSlides < 2) {
      autoAdvanceRef.current = false;
      setAutoAdvance(false);
      return;
    }
    autoAdvanceRef.current = true;
    autoTimerRef.current = setInterval(() => {
      if (!autoAdvanceRef.current) return;
      const next = (currentIndexRef.current + 1) % totalSlides;
      goToSlide(next);
    }, AUTO_ADVANCE_MS);
  }, [totalSlides]);

  const stopAutoAdvance = useCallback(() => {
    autoAdvanceRef.current = false;
    clearAutoTimer();
  }, []);

  const toggleAutoAdvance = useCallback(() => {
    setAutoAdvance((prev) => {
      const next = !prev;
      if (next) startAutoAdvance();
      else stopAutoAdvance();
      return next;
    });
  }, [startAutoAdvance, stopAutoAdvance]);

  // ── Controls hide ─────────────────────────────────────────
  const scheduleHideControls = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      fadeControls(0);
    }, CONTROLS_HIDE_MS);
  }, []);

  const showControls = useCallback(() => {
    clearHideTimer();
    setControlsVisible(true);
    fadeControls(1, () => {
      scheduleHideControls();
    });
  }, [scheduleHideControls]);

  useEffect(() => {
    scheduleHideControls();
    return () => {
      clearHideTimer();
      clearAutoTimer();
    };
  }, []);

  // ── Slide navigation ──────────────────────────────────────
  const goToSlide = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, totalSlides - 1));
      if (clamped === currentIndexRef.current) return;
      currentIndexRef.current = clamped;
      setCurrentIndex(clamped);
      slideFade.stopAnimation();
      Animated.timing(slideFade, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start(() => {
        flatListRef.current?.scrollToIndex({ index: clamped, animated: false });
        Animated.timing(slideFade, {
          toValue: 1,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }).start();
      });
    },
    [totalSlides, slideFade],
  );

  const handlePrev = useCallback(() => {
    if (totalSlides === 0) return;
    const prev =
      currentIndexRef.current === 0
        ? totalSlides - 1
        : currentIndexRef.current - 1;
    goToSlide(prev);
    showControls();
  }, [goToSlide, showControls, totalSlides]);

  const handleNext = useCallback(() => {
    if (totalSlides === 0) return;
    const next = (currentIndexRef.current + 1) % totalSlides;
    goToSlide(next);
    showControls();
  }, [goToSlide, showControls, totalSlides]);

  const navigateSong = useCallback(
    (direction: -1 | 1) => {
      const songIndex = songs.findIndex((item) => item._id === song._id);
      const nextSong = songs[songIndex + direction];
      if (nextSong) onNavigateToSong?.(nextSong._id);
      showControls();
    },
    [onNavigateToSong, showControls, song._id, songs],
  );

  useEffect(() => {
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    if (autoAdvanceRef.current) {
      startAutoAdvance();
    }
  }, [song._id, song.lyrics.length, startAutoAdvance]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing =
        !!target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (isEditing || event.altKey || event.ctrlKey || event.metaKey) return;

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          handlePrev();
          break;
        case "ArrowDown":
          event.preventDefault();
          handleNext();
          break;
        case "ArrowLeft":
          event.preventDefault();
          navigateSong(-1);
          break;
        case "ArrowRight":
          event.preventDefault();
          navigateSong(1);
          break;
        case "Escape":
        case "f":
        case "F":
          event.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, navigateSong, onClose]);

  const handleTap = useCallback(
    (side: "left" | "right" | "center") => {
      if (side === "left") handlePrev();
      else if (side === "right") handleNext();
      else showControls();
    },
    [handlePrev, handleNext, showControls],
  );

  // ── FlatList helpers ──────────────────────────────────────
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: dims.width,
      offset: dims.width * index,
      index,
    }),
    [dims.width],
  );

  // ── Render slide ──────────────────────────────────────────
  const renderSlide = useCallback(
    ({ item }: { item: { s: string; t: string } }) => {
      const sectionLabel = (item.s ?? "").trim().toUpperCase() || "♪";
      const isLandscapeNow = dims.width > dims.height;

      return (
        <View
          style={[
            ss.slide,
            { width: dims.width, height: dims.height, backgroundColor: C.bg },
          ]}>
          {/* Subtle radial glow behind text */}
          <View style={[ss.slideGlow, { backgroundColor: C.skyGlowSoft }]} />

          <Animated.View
            style={[
              ss.slideInner,
              {
                width: dims.width,
                height: dims.height,
                opacity: slideFade,
                paddingHorizontal: isLandscapeNow ? 80 : 36,
                paddingTop: isLandscapeNow ? 44 : 52,
                paddingBottom: isLandscapeNow ? 116 : 140,
              },
            ]}>
            {/* Section label row */}
            <View style={ss.labelRow}>
              <View style={[ss.labelBar, { backgroundColor: C.skyBorder }]} />
              <Text style={[ss.sectionLabel, { color: C.sky }]}>
                {sectionLabel}
              </Text>
              <View style={[ss.labelBar, { backgroundColor: C.skyBorder }]} />
            </View>

            {/* Lyrics text — bold in landscape/fullscreen */}
            <Animated.Text
              style={[
                ss.lyricsText,
                {
                  color: C.text,
                  fontSize: fontSize,
                  lineHeight: fontSize * 1.55,
                  fontWeight: isLandscapeNow ? "700" : "300",
                  transform: [{ scale: fontScaleAnim }],
                },
              ]}
              adjustsFontSizeToFit={false}>
              {item.t}
            </Animated.Text>
          </Animated.View>
        </View>
      );
    },
    [dims, slideFade, fontSize, fontScaleAnim, C],
  );

  // ── Progress width ────────────────────────────────────────
  const progressPct =
    totalSlides > 1 ? `${((currentIndex + 1) / totalSlides) * 100}%` : "100%";

  const isLandscapeNow = dims.width > dims.height;

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <View style={[ss.container, { backgroundColor: C.bg }]}>
      {/* ── SLIDE CAROUSEL ───────────────────────────────── */}
      <FlatList
        ref={flatListRef}
        data={song.lyrics}
        renderItem={renderSlide}
        keyExtractor={(_, i) => `slide-${i}`}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: Math.min(info.highestMeasuredFrameIndex, info.index),
              animated: false,
            });
          }, 100);
        }}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews
      />

      {/* ── INVISIBLE TAP ZONES ──────────────────────────── */}
      <TouchableOpacity
        style={ss.tapLeft}
        onPress={() => handleTap("left")}
        activeOpacity={1}
      />
      <TouchableOpacity
        style={ss.tapRight}
        onPress={() => handleTap("right")}
        activeOpacity={1}
      />
      <TouchableOpacity
        style={ss.tapCenter}
        onPress={() => handleTap("center")}
        activeOpacity={1}
      />

      {/* ── ANIMATED CONTROLS OVERLAY ────────────────────── */}
      <Animated.View
        style={[ss.overlay, { opacity: controlsFade }]}
        pointerEvents={controlsVisible ? "box-none" : "none"}>
        {/* TOP BAR */}
        <LinearGradient
          colors={
            isDark
              ? ["rgba(0,0,0,0.70)", "rgba(0,0,0,0.00)"]
              : ["rgba(244,250,253,0.94)", "rgba(244,250,253,0.00)"]
          }
          style={ss.topBar}>
          {/* Progress bar */}
          <View
            style={[
              ss.progressTrack,
              { backgroundColor: isDark ? WHITE_10 : C.border2 },
            ]}>
            <Animated.View
              style={[ss.progressFill, { width: progressPct as any }]}
            />
          </View>

          {/* Counter */}
          <View
            style={[
              ss.counterPill,
              {
                backgroundColor: C.glass,
                borderColor: C.border,
              },
            ]}>
            <Text style={[ss.counterText, { color: C.text2 }]}>
              {currentIndex + 1} / {totalSlides}
            </Text>
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={ss.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}>
            <View
              style={[
                ss.closeBtnInner,
                { borderColor: C.border },
              ]}>
              <LinearGradient
                colors={
                  isDark
                    ? ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.08)"]
                    : ["rgba(4,57,84,0.08)", "rgba(4,57,84,0.02)"]
                }
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[
                  ss.closeBtnSheen,
                  { backgroundColor: isDark ? WHITE_20 : C.borderBright },
                ]}
              />
              <Feather name="x" size={20} color={C.text} />
            </View>
          </TouchableOpacity>
        </LinearGradient>

        {/* BOTTOM BAR */}
        <LinearGradient
          colors={
            isDark
              ? ["rgba(0,0,0,0.00)", "rgba(0,0,0,0.80)"]
              : ["rgba(244,250,253,0.00)", "rgba(244,250,253,0.96)"]
          }
          style={[
            ss.bottomBar,
            {
              paddingHorizontal: dims.width < 390 ? 10 : 16,
              paddingBottom: isLandscapeNow
                ? 12
                : Math.max(insets.bottom + 8, 14),
            },
          ]}>
          <View style={ss.bottomFontControls}>
            {/* Decrease */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Decrease lyric font size"
              style={[
                ss.fontBtn,
                ss.bottomFontBtn,
                dims.width < 360 && ss.compactFontBtn,
                { borderColor: C.border },
                fontSize <= FONT_MIN && ss.fontBtnDisabled,
              ]}
              onPress={decreaseFontSize}
              activeOpacity={0.8}
              disabled={fontSize <= FONT_MIN}>
              <View
                style={[
                  StyleSheet.absoluteFill,
                  ss.fontBtnBg,
                  { backgroundColor: C.glass, borderColor: C.border },
                ]}
              />
              <View
                style={[ss.fontBtnSheen, { backgroundColor: C.borderBright }]}
              />
              <Text style={[ss.fontBtnMinus, { color: C.text }]}>−</Text>
            </TouchableOpacity>

            <Text
              style={[
                ss.bottomFontValue,
                dims.width < 360 && ss.compactFontValue,
                { color: C.text },
              ]}>
              {fontSize}
            </Text>

            {/* Increase */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Increase lyric font size"
              style={[
                ss.fontBtn,
                ss.bottomFontBtn,
                dims.width < 360 && ss.compactFontBtn,
                { borderColor: C.border },
                fontSize >= FONT_MAX && ss.fontBtnDisabled,
              ]}
              onPress={increaseFontSize}
              activeOpacity={0.8}
              disabled={fontSize >= FONT_MAX}>
              <View
                style={[
                  StyleSheet.absoluteFill,
                  ss.fontBtnBg,
                  { backgroundColor: C.glass, borderColor: C.border },
                ]}
              />
              <View
                style={[ss.fontBtnSheen, { backgroundColor: C.borderBright }]}
              />
              <Text style={[ss.fontBtnPlus, { color: C.text }]}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={[ss.bottomSongInfo, dims.width < 360 && ss.compactSongInfo]}>
            <Text
              style={[
                ss.songTitle,
                dims.width < 360 && ss.compactSongTitle,
                { color: C.text },
              ]}
              numberOfLines={2}>
              {song.title}
            </Text>
            <Text
              style={[
                ss.songMeta,
                dims.width < 360 && ss.compactSongMeta,
                { color: C.text3 },
              ]}
              numberOfLines={1}>
              {song.singerName}
            </Text>
          </View>

          <View style={ss.bottomNavControls}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Previous lyric section"
              style={[
                ss.navBtn,
                ss.bottomNavBtn,
                dims.width < 360 && ss.compactNavBtn,
                { borderColor: C.border },
              ]}
              onPress={handlePrev}
              activeOpacity={0.8}>
              <View
                style={[
                  StyleSheet.absoluteFill,
                  ss.navBtnBg,
                  { backgroundColor: C.glass, borderColor: C.border },
                ]}
              />
              <View
                style={[ss.navBtnSheen, { backgroundColor: C.borderBright }]}
              />
              <Feather name="chevron-left" size={22} color={C.sky} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Next lyric section"
              style={[
                ss.navBtn,
                ss.bottomNavBtn,
                dims.width < 360 && ss.compactNavBtn,
                { borderColor: C.border },
              ]}
              onPress={handleNext}
              activeOpacity={0.8}>
              <View
                style={[
                  StyleSheet.absoluteFill,
                  ss.navBtnBg,
                  { backgroundColor: C.glass, borderColor: C.border },
                ]}
              />
              <View
                style={[ss.navBtnSheen, { backgroundColor: C.borderBright }]}
              />
              <Feather name="chevron-right" size={22} color={C.sky} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={autoAdvance ? "Stop auto-play" : "Start auto-play"}
              accessibilityState={{ checked: autoAdvance }}
              style={[
                ss.autoBtn,
                ss.bottomAutoBtn,
                dims.width < 360 && ss.compactAutoBtn,
                autoAdvance && ss.autoBtnActive,
                !autoAdvance && {
                  borderColor: C.skyBorder,
                  backgroundColor: C.skyPale,
                },
              ]}
              onPress={toggleAutoAdvance}
              activeOpacity={0.8}>
              {autoAdvance && (
                <LinearGradient
                  colors={[GOLD, GOLD_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <View
                style={[
                  ss.autoBtnSheen,
                  { backgroundColor: C.borderBright },
                ]}
              />
              <Feather
                name={autoAdvance ? "pause" : "play"}
                size={14}
                color={autoAdvance ? BLACK : C.sky}
              />
              <Text
                style={[
                  ss.autoBtnText,
                  dims.width < 360 && ss.compactAutoText,
                  autoAdvance && ss.autoBtnTextActive,
                  !autoAdvance && { color: C.sky },
                ]}>
                Auto
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLACK,
  },

  // ── Slide ────────────────────────────────────────────────
  slide: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BLACK,
  },
  slideGlow: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(135,206,235,0.04)",
    alignSelf: "center",
    top: "20%",
  },
  slideInner: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Section label
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  labelBar: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(135,206,235,0.18)",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3.5,
    color: SKY_60,
    textTransform: "uppercase",
  },

  // Lyrics
  lyricsText: {
    color: WHITE,
    textAlign: "center",
    letterSpacing: 0.3,
  },

  // ── Tap zones ────────────────────────────────────────────
  tapLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: "28%",
    zIndex: 10,
  },
  tapRight: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "28%",
    zIndex: 10,
  },
  tapCenter: {
    position: "absolute",
    top: 0,
    left: "28%",
    right: "28%",
    bottom: 0,
    zIndex: 9,
  },

  // ── Controls overlay ─────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    justifyContent: "space-between",
    pointerEvents: "box-none",
  } as any,

  // ── Top bar ──────────────────────────────────────────────
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 16 : 14,
    paddingBottom: 20,
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: WHITE_10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: SKY,
    borderRadius: 2,
  },
  counterPill: {
    backgroundColor: WHITE_10,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: WHITE_20,
  },
  counterText: {
    fontSize: 12,
    fontWeight: "600",
    color: WHITE_60,
    letterSpacing: 0.5,
  },
  closeBtn: { zIndex: 30 },
  closeBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: WHITE_20,
  },
  closeBtnSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: WHITE_20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  // ── Bottom bar ───────────────────────────────────────────
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    gap: 8,
  },
  bottomFontControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
    flexShrink: 0,
  },
  bottomFontBtn: {
    width: 36,
    height: 38,
    borderRadius: 11,
  },
  compactFontBtn: {
    width: 30,
    height: 34,
    borderRadius: 10,
  },
  bottomFontValue: {
    minWidth: 22,
    textAlign: "center",
    color: WHITE,
    fontSize: 12,
    fontWeight: "700",
  },
  compactFontValue: {
    minWidth: 18,
    fontSize: 11,
  },
  bottomSongInfo: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  compactSongInfo: {
    paddingHorizontal: 0,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: WHITE,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  compactSongTitle: {
    fontSize: 12,
  },
  songMeta: {
    fontSize: 10,
    color: WHITE_60,
    marginTop: 3,
    textAlign: "center",
  },
  compactSongMeta: {
    display: "none",
  },

  // ── Font size controls ───────────────────────────────────
  fontControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  fontBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: WHITE_20,
    position: "relative",
  },
  fontBtnDisabled: { opacity: 0.3 },
  fontBtnBg: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 13,
  },
  fontBtnSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: WHITE_20,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  fontBtnMinus: {
    fontSize: 24,
    fontWeight: "300",
    color: WHITE,
    lineHeight: 28,
    marginTop: -2,
  },
  fontBtnPlus: {
    fontSize: 22,
    fontWeight: "400",
    color: WHITE,
    lineHeight: 26,
  },
  fontSizeDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 3,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    overflow: "hidden",
    position: "relative",
    minWidth: 80,
    ...Platform.select({
      ios: {
        shadowColor: SKY,
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 6 },
    }),
  },
  fontSizeSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.30)",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  fontSizeText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#010f18",
    letterSpacing: -0.5,
  },
  fontSizePt: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(1,15,24,0.70)",
    marginBottom: 2,
  },

  // ── Nav row ──────────────────────────────────────────────
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  bottomNavControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexShrink: 0,
  },
  bottomNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  compactNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  bottomAutoBtn: {
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  compactAutoBtn: {
    width: 34,
    minWidth: 34,
    height: 34,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: "center",
  },
  compactAutoText: {
    display: "none",
  },
  autoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: SKY_15,
    backgroundColor: SKY_15,
    overflow: "hidden",
    position: "relative",
  },
  autoBtnActive: {
    borderColor: "rgba(251,176,64,0.45)",
  },
  autoBtnSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: WHITE_14,
  },
  autoBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: SKY,
    letterSpacing: 0.2,
  },
  autoBtnTextActive: { color: BLACK },
  navBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    borderWidth: 0.5,
    borderColor: WHITE_20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 5 },
    }),
  },
  navBtnBg: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 26,
  },
  navBtnSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: WHITE_20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
});
