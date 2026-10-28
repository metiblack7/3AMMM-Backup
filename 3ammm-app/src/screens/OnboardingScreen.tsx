import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../lib/AppContext";
import { useTheme } from "../lib/useTheme";

interface OnboardingScreenProps {
  onComplete: () => Promise<void>;
}

const SLIDES = [
  {
    icon: "music" as const,
    headlineKey: "onboarding1Title" as const,
    subtitleKey: "onboarding1Subtitle" as const,
    colors: ["#010f18", "#021624", "#043954"] as const,
  },
  {
    icon: "list" as const,
    headlineKey: "onboarding2Title" as const,
    subtitleKey: "onboarding2Subtitle" as const,
    colors: ["#010f18", "#032538", "#010f18"] as const,
  },
  {
    icon: "heart" as const,
    headlineKey: "onboarding3Title" as const,
    subtitleKey: "onboarding3Subtitle" as const,
    colors: ["#021624", "#010f18", "#000c14"] as const,
  },
];

export default function OnboardingScreen({
  onComplete,
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { t } = useApp();
  const { C, isDark } = useTheme();
  const listRef = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const iconOpacity = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const dotWidths = useRef(
    SLIDES.map((_, index) => new Animated.Value(index === 0 ? 24 : 8)),
  ).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    iconOpacity.setValue(0);
    iconScale.setValue(0.85);
    Animated.parallel([
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(iconScale, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    Animated.parallel(
      dotWidths.map((dotWidth, index) =>
        Animated.spring(dotWidth, {
          toValue: activeIndex === index ? 24 : 8,
          useNativeDriver: false,
          tension: 80,
          friction: 12,
        }),
      ),
    ).start();
  }, [activeIndex, dotWidths, iconOpacity, iconScale]);

  const finish = async () => {
    if (completing) return;
    setCompleting(true);
    setError("");
    try {
      await onComplete();
    } catch (finishError) {
      console.error("Could not save onboarding completion:", finishError);
      setError(t.onboardingSaveError);
      setCompleting(false);
    }
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (nextIndex !== activeIndex) setActiveIndex(nextIndex);
  };

  const goToNextSlide = () => {
    listRef.current?.scrollToIndex({
      index: activeIndex + 1,
      animated: true,
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.bg }]}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(slide) => slide.headlineKey}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <View style={[styles.slide, { width, height }]}>
            <LinearGradient
              colors={
                isDark ? item.colors : [C.bg, C.bgDeep, C.surfaceHigh]
              }
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View
              style={[
                styles.skipArea,
                { paddingTop: insets.top + 12, paddingRight: 24 },
              ]}>
              {index < SLIDES.length - 1 ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={finish}
                  disabled={completing}
                  hitSlop={12}>
                  <Text style={[styles.skipText, { color: C.text2 }]}>
                    {t.skip}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View
              style={[
                styles.content,
                {
                  paddingTop: insets.top + 44,
                  paddingBottom: Math.max(insets.bottom, 16) + 32,
                },
              ]}>
              <Animated.View
                style={[
                  styles.iconHalo,
                  {
                    backgroundColor: C.skyPale,
                    borderColor: C.skyBorder,
                    opacity: activeIndex === index ? iconOpacity : 1,
                    transform: [
                      {
                        scale: activeIndex === index ? iconScale : 1,
                      },
                    ],
                  },
                ]}>
                <Feather name={item.icon} size={80} color={C.sky} />
              </Animated.View>

              <Text style={[styles.headline, { color: C.text }]}>
                {t[item.headlineKey]}
              </Text>
              <Text style={[styles.subtitle, { color: C.text2 }]}>
                {t[item.subtitleKey]}
              </Text>
              <View style={[styles.goldLine, { backgroundColor: C.gold }]} />

              <View style={styles.footer}>
                {error ? (
                  <Text style={[styles.errorText, { color: C.danger }]}>
                    {error}
                  </Text>
                ) : null}
                {index < SLIDES.length - 1 ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.buttonWrap}
                    onPress={goToNextSlide}
                    disabled={completing}
                    activeOpacity={0.85}>
                    <LinearGradient
                      colors={[C.sky, C.skyDeep]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.nextButton}>
                      <View style={styles.buttonSheen} />
                      <Text style={styles.nextButtonText}>{t.next}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.buttonWrap, styles.startButtonWrap]}
                    onPress={finish}
                    disabled={completing}
                    activeOpacity={0.85}>
                    <LinearGradient
                      colors={[C.gold, C.goldDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.nextButton, styles.startButton]}>
                      <View style={styles.buttonSheen} />
                      {completing ? (
                        <ActivityIndicator color="#010f18" />
                      ) : (
                        <Text style={styles.startButtonText}>
                          {t.startWorshipping}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                <View style={styles.dots}>
                  {SLIDES.map((slide, dotIndex) => (
                    <Animated.View
                      key={slide.headlineKey}
                      style={[
                        styles.dot,
                        {
                          width: dotWidths[dotIndex],
                          backgroundColor:
                            activeIndex === dotIndex
                              ? C.sky
                              : C.skyPale,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#010f18" },
  slide: { flex: 1 },
  skipArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    alignItems: "flex-end",
  },
  skipText: {
    color: "rgba(135,206,235,0.55)",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconHalo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(135,206,235,0.10)",
    borderWidth: 1,
    borderColor: "rgba(135,206,235,0.20)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  headline: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  subtitle: {
    color: "rgba(135,206,235,0.70)",
    fontSize: 16,
    lineHeight: 26,
    textAlign: "center",
    paddingHorizontal: 16,
    marginTop: 16,
  },
  goldLine: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#fbb040",
    alignSelf: "center",
    marginTop: 20,
  },
  footer: {
    width: "100%",
    alignItems: "center",
    marginTop: "auto",
  },
  errorText: {
    color: "#ff8b8b",
    textAlign: "center",
    fontSize: 13,
    marginBottom: 10,
  },
  buttonWrap: { borderRadius: 999 },
  startButtonWrap: {
    minWidth: 270,
    ...({
      shadowColor: "#fbb040",
      shadowOpacity: 0.45,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    } as const),
  },
  nextButton: {
    borderRadius: 999,
    paddingHorizontal: 40,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  startButton: { paddingHorizontal: 56 },
  buttonSheen: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  nextButtonText: {
    color: "#010f18",
    fontSize: 16,
    fontWeight: "700",
  },
  startButtonText: {
    color: "#010f18",
    fontSize: 16,
    fontWeight: "800",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
