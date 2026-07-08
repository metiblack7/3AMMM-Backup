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
} from "react-native";
import { useApp } from "../lib/AppContext";
import { useTheme } from "../lib/useTheme";
import { Feather } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import * as NavigationBar from "expo-navigation-bar";

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
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const AUTO_ADVANCE_MS = 5000;
const CONTROLS_HIDE_MS = 3000;
const FADE_DURATION = 280;
const SKY = "#87ceeb";
const GOLD = "#fbb040";
const WHITE = "#ffffff";
const BLACK = "#000000";
const WHITE_60 = "rgba(255,255,255,0.60)";
const WHITE_12 = "rgba(255,255,255,0.12)";
const SKY_20 = "rgba(135,206,235,0.20)";
const SKY_60 = "rgba(135,206,235,0.60)";

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function SongSlideshowScreen({
  song,
  onClose,
}: SongSlideshowProps) {
  const totalSlides = song.lyrics.length;

  // ── State ─────────────────────────────────────────────────
  const { fontSize, lineSpacing, boldLyrics } = useApp();
  const { C, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [dims, setDims] = useState(Dimensions.get("window"));
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    dims.width > dims.height ? "landscape" : "portrait",
  );

  // ── Refs ──────────────────────────────────────────────────
  const flatListRef = useRef<FlatList>(null);
  const currentIndexRef = useRef(0); // mirror of state — for interval closure
  const autoAdvanceRef = useRef(false);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Animated values ───────────────────────────────────────
  const slideFade = useRef(new Animated.Value(1)).current;
  const controlsFade = useRef(new Animated.Value(1)).current;

  // ── Helpers ───────────────────────────────────────────────
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

  // ── Orientation + Navigation bar ─────────────────────────
  // ── Orientation + Navigation bar (Task 2) ─────────────────
  useEffect(() => {
    const syncLayoutFromWindow = () => {
      const nextDims = Dimensions.get("window");
      setDims(nextDims);
      setOrientation(
        nextDims.width > nextDims.height ? "landscape" : "portrait",
      );
    };

    const setup = async () => {
      StatusBar.setHidden(true);

      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.ALL,
        );
      } catch {
        try {
          await ScreenOrientation.unlockAsync();
        } catch {}
      }

      syncLayoutFromWindow();

      if (Platform.OS === "android") {
        try {
          await NavigationBar.setVisibilityAsync("hidden");
          await NavigationBar.setBehaviorAsync("inset-swipe");
        } catch {}
      }
    };

    const orientationSub = ScreenOrientation.addOrientationChangeListener(
      () => {
        syncLayoutFromWindow();
      },
    );

    setup();

    return () => {
      orientationSub?.remove?.();
      StatusBar.setHidden(false);
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch(() => {});

      if (Platform.OS === "android") {
        NavigationBar.setVisibilityAsync("visible").catch(() => {});
      }
    };
  }, []);

  // ── Hardware back button ──────────────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  // ── Auto-advance ──────────────────────────────────────────
  // Uses refs so interval never needs recreation
  const startAutoAdvance = useCallback(() => {
    clearAutoTimer();
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

  // ── Controls auto-hide ────────────────────────────────────
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

  // Show controls on mount, then auto-hide
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

      // Fade out → scroll → fade in
      Animated.timing(slideFade, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start(() => {
        currentIndexRef.current = clamped;
        setCurrentIndex(clamped);

        flatListRef.current?.scrollToIndex({
          index: clamped,
          animated: false,
        });

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
    const prev =
      currentIndexRef.current === 0
        ? totalSlides - 1
        : currentIndexRef.current - 1;
    goToSlide(prev);
    showControls();
  }, [goToSlide, showControls, totalSlides]);

  const handleNext = useCallback(() => {
    const next = (currentIndexRef.current + 1) % totalSlides;
    goToSlide(next);
    showControls();
  }, [goToSlide, showControls, totalSlides]);

  const handleTap = useCallback(
    (side: "left" | "right" | "center") => {
      if (side === "left") handlePrev();
      else if (side === "right") handleNext();
      else showControls();
    },
    [handlePrev, handleNext, showControls],
  );

  // ── FlatList getItemLayout ────────────────────────────────
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
    ({ item }: { item: { s: string; t: string } }) => (
      <View
        style={[
          styles.slide,
          {
            width: dims.width,
            height: dims.height,
            backgroundColor: isDark ? "#010f18" : C.bg,
          },
        ]}>
        <Animated.View
          style={[
            styles.slideInner,
            { opacity: slideFade, width: dims.width, height: dims.height },
          ]}>
          {/* Section label — subtle, above lyrics */}
          <View style={styles.sectionLabelRow}>
            <View style={[styles.sectionBar, { backgroundColor: GOLD }]} />
            <Text style={[styles.sectionLabel, { color: SKY }]}>
              {(item.s ?? "").trim().toUpperCase() || "♪"}
            </Text>
          </View>

          {/* Lyrics — large, centered */}
          <Text
            style={[
              styles.lyricsText,
              {
                color: isDark ? WHITE : C.text,
                fontSize: fontSize,
                lineHeight: fontSize * lineSpacing,
                fontWeight: boldLyrics ? "600" : "300",
              },
            ]}
            adjustsFontSizeToFit
            numberOfLines={12}>
            {item.t}
          </Text>
        </Animated.View>
      </View>
    ),
    [dims, slideFade, isDark, C.bg, C.text, fontSize, lineSpacing, boldLyrics],
  );

  // ── Progress bar width ────────────────────────────────────
  const progressWidth =
    totalSlides > 1 ? `${((currentIndex + 1) / totalSlides) * 100}%` : "100%";

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ── SLIDE CAROUSEL ────────────────────────────────── */}
      <FlatList
        ref={flatListRef}
        data={song.lyrics}
        renderItem={renderSlide}
        keyExtractor={(_, i) => `s-${i}`}
        horizontal
        pagingEnabled
        scrollEnabled={false} // navigation is via goToSlide — no manual scroll
        showsHorizontalScrollIndicator={false}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={(info) => {
          // Safe fallback — scroll to highest measured frame
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

      {/* ── INVISIBLE TAP ZONES ───────────────────────────── */}
      {/* Left zone — previous */}
      <TouchableOpacity
        style={styles.tapZoneLeft}
        onPress={() => handleTap("left")}
        activeOpacity={1}
      />
      {/* Right zone — next */}
      <TouchableOpacity
        style={styles.tapZoneRight}
        onPress={() => handleTap("right")}
        activeOpacity={1}
      />
      {/* Center zone — toggle controls */}
      <TouchableOpacity
        style={styles.tapZoneCenter}
        onPress={() => handleTap("center")}
        activeOpacity={1}
      />

      {/* ── ANIMATED CONTROLS OVERLAY ─────────────────────── */}
      <Animated.View
        style={[styles.controlsOverlay, { opacity: controlsFade }]}
        pointerEvents={controlsVisible ? "box-none" : "none"}>
        {/* Top bar — progress + counter + close */}
        <View style={styles.topBar}>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: progressWidth as any }]}
            />
          </View>

          {/* Counter */}
          <Text style={styles.counter}>
            {currentIndex + 1} / {totalSlides}
          </Text>

          {/* Close */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}>
            <View style={styles.closeBtnInner}>
              <Feather name="x" size={20} color={WHITE} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom bar — song info + auto toggle */}
        <View style={styles.bottomBar}>
          {/* Song info */}
          <View style={styles.songInfo}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={styles.songSinger} numberOfLines={1}>
              {song.singerName} · Key {song.key}
            </Text>
          </View>

          {/* Auto-advance toggle */}
          <TouchableOpacity
            style={[styles.autoBtn, autoAdvance && styles.autoBtnActive]}
            onPress={toggleAutoAdvance}
            activeOpacity={0.8}>
            <Feather
              name={autoAdvance ? "pause" : "play"}
              size={14}
              color={autoAdvance ? BLACK : SKY}
            />
            <Text
              style={[
                styles.autoBtnText,
                autoAdvance && styles.autoBtnTextActive,
              ]}>
              Auto
            </Text>
          </TouchableOpacity>

          {/* Prev / Next buttons */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={handlePrev}
              activeOpacity={0.75}>
              <Feather name="chevron-left" size={26} color={SKY} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={handleNext}
              activeOpacity={0.75}>
              <Feather name="chevron-right" size={26} color={SKY} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
// Import Platform separately since we use it in styles
import { Platform } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLACK,
  },

  // ── Slide ───────────────────────────────────────────────
  slide: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BLACK,
  },
  slideInner: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 64,
    paddingVertical: 48,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    gap: 10,
  },
  sectionBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
  },
  lyricsText: {
    fontWeight: "300",
    textAlign: "center",
    letterSpacing: 0.3,
  },

  // ── Tap zones — invisible, cover left/center/right thirds ──
  tapZoneLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "28%",
    bottom: 0,
    zIndex: 10,
  },
  tapZoneRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "28%",
    bottom: 0,
    zIndex: 10,
  },
  tapZoneCenter: {
    position: "absolute",
    top: 0,
    left: "28%",
    right: "28%",
    bottom: 0,
    zIndex: 9,
  },

  // ── Controls overlay ─────────────────────────────────────
  controlsOverlay: {
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
    paddingTop: Platform.OS === "ios" ? 16 : 12,
    paddingBottom: 10,
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.40)",
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: WHITE_12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: SKY,
    borderRadius: 2,
  },
  counter: {
    fontSize: 12,
    fontWeight: "600",
    color: WHITE_60,
    letterSpacing: 0.5,
    minWidth: 40,
    textAlign: "right",
  },
  closeBtn: {
    zIndex: 30,
  },
  closeBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WHITE_12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.20)",
  },

  // ── Bottom bar ───────────────────────────────────────────
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 20 : 14,
    paddingTop: 10,
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.40)",
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: WHITE,
    letterSpacing: 0.2,
  },
  songSinger: {
    fontSize: 12,
    color: WHITE_60,
    marginTop: 2,
  },

  // Auto-advance button
  autoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SKY_20,
    backgroundColor: SKY_20,
  },
  autoBtnActive: {
    backgroundColor: SKY,
    borderColor: SKY,
  },
  autoBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: SKY,
  },
  autoBtnTextActive: {
    color: BLACK,
  },

  // Prev / Next nav buttons
  navRow: {
    flexDirection: "row",
    gap: 4,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE_12,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.15)",
  },
});
