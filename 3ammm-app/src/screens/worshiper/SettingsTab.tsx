import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  TextInput,
  Linking,
  Platform,
  Alert,
  PanResponder,
  LayoutChangeEvent,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FontAwesome5 } from "@expo/vector-icons";
import { useApp } from "../../lib/AppContext";
import { useTheme } from "../../lib/useTheme";
import { apiFetch } from "../../lib/api";
import { Spacing, Radius } from "../../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── TOGGLE ───────────────────────────────────────────────────
interface ToggleProps {
  value: boolean;
  onToggle: (v: boolean) => void;
  activeColor?: string;
}

function Toggle({ value, onToggle, activeColor = "#87ceeb" }: ToggleProps) {
  const translateX = useRef(new Animated.Value(value ? 22 : 2)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 22 : 2,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [value, translateX]);

  const trackColor = translateX.interpolate({
    inputRange: [2, 22],
    outputRange: ["rgba(135,206,235,0.20)", activeColor],
    extrapolate: "clamp",
  });

  return (
    <TouchableWithoutFeedback onPress={() => onToggle(!value)}>
      <Animated.View style={[tog.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[tog.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const tog = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 4 },
    }),
  },
});

// ── PRECISION SLIDER ─────────────────────────────────────────
function PrecisionSlider({
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

  const panResponder = useRef(
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

  const onLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  return (
    <View style={sl.wrap} onLayout={onLayout} {...panResponder.panHandlers}>
      <View style={[sl.track, { backgroundColor: C.border }]}>
        <View
          style={[sl.fill, { width: `${pct * 100}%`, backgroundColor: C.sky }]}
        />
      </View>
      <View
        style={[sl.thumb, { left: `${pct * 100}%`, backgroundColor: C.sky }]}
        pointerEvents="none"
      />
    </View>
  );
}

const sl = StyleSheet.create({
  wrap: {
    width: "100%",
    height: 40,
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  thumb: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    top: 8,
    marginLeft: -12,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 6 },
    }),
  },
});

// ── SETTINGS TAB ─────────────────────────────────────────────
export function SettingsTab() {
  const {
    t,
    lang,
    toggleLang,
    fontSize,
    setFontSize,
    lineSpacing,
    setLineSpacing,
    boldLyrics,
    setBoldLyrics,
    setTheme,
    signOut,
  } = useApp();

  const { isDark, C } = useTheme();
  const insets = useSafeAreaInsets();
  const TOP = insets.top;

  const PREVIEW = `ኪሊ ሳሉዋ ጋቲያ ጋዬ\nአሳ ናቱ ኡባ\nየሱሲ ኑ ዲኮ፣ ኤ ኢ ዲኮ`;

  const [feedbackText, setFeedbackText] = useState("");
  const [appVersion, setAppVersion] = useState("1.0.0");

  useEffect(() => {
    apiFetch("/api/app/version")
      .then((res: any) => setAppVersion(res?.version ?? "1.0.0"))
      .catch(() => {});
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      t.signOutTitle,
      t.confirmSignOut,
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.logout,
          style: "destructive",
          onPress: () => {
            signOut().catch((err: any) => {
              console.error("[SignOut] Error:", err);
              Alert.alert(t.error, t.couldNotSignOut);
            });
          },
        },
      ],
      { cancelable: true },
    );
  }, [signOut, t]);

  const handleFeedbackSubmit = useCallback(async () => {
    if (!feedbackText.trim()) {
      Alert.alert(t.emptyFeedbackTitle, t.writeMessageFirst);
      return;
    }

    const encodedText = encodeURIComponent(feedbackText.trim());
    const telegramUrl = `https://t.me/Threeammm7?text=${encodedText}`;

    try {
      await Linking.openURL(telegramUrl);
      setFeedbackText("");
    } catch {
      Alert.alert(t.error, t.telegramLaunchError);
    }
  }, [feedbackText, t]);

  const handleCheckForUpdates = useCallback(() => {
    Alert.alert(
      t.upToDate,
      `${t.runningVersion} ${appVersion} — ${t.latestVersion}`,
    );
  }, [appVersion, t]);

  const openUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      /* silent */
    }
  }, []);

  const openSocialUrl = useCallback(async (type: string) => {
    try {
      if (type === "facebook") {
        await Linking.openURL("fb://profile/3ammm7");
      } else if (type === "instagram") {
        await Linking.openURL("instagram://user?username=3ammm7");
      } else if (type === "email") {
        await Linking.openURL("mailto:3ammministry@gmail.com");
      }
    } catch {
      if (type === "facebook") {
        await Linking.openURL("https://www.facebook.com/3ammm7");
      } else if (type === "instagram") {
        await Linking.openURL("https://www.instagram.com/3ammm7");
      } else if (type === "email") {
        await Linking.openURL(
          "https://mail.google.com/mail/?view=cm&fs=1&to=3ammministry@gmail.com",
        );
      }
    }
  }, []);

  const card: any = {
    backgroundColor: C.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    marginBottom: 4,
  };

  const sectionTitle: any = {
    fontSize: 11,
    fontWeight: "700",
    color: C.text3,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: Spacing.xl,
    paddingLeft: 2,
  };

  const rowLabel: any = {
    fontSize: 15,
    fontWeight: "500",
    color: C.text,
  };

  const { appFontScale, setAppFontScale, fs } = useApp();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: TOP,
        paddingHorizontal: Spacing.lg,
        paddingBottom: 120,
      }}>
      {/* ── APPEARANCE ──────────────────────────── */}
      <Text style={[sectionTitle, { fontSize: fs(11) }]}>{t.appearance}</Text>
      <View style={card}>
        <View style={s.rowBetween}>
          <View style={s.rowLeft}>
            <MaterialCommunityIcons
              name={isDark ? "weather-night" : "weather-sunny"}
              size={20}
              color={C.sky}
            />
            <View>
              <Text style={[rowLabel, { fontSize: fs(15) }]}>{t.theme}</Text>
              <Text style={[s.subLabel, { color: C.text3 }]}>
                {isDark ? t.darkMode : t.lightMode}
              </Text>
            </View>
          </View>
          <Toggle
            value={isDark}
            onToggle={(val) => setTheme(val ? "dark" : "light")}
          />
        </View>

        <View style={[s.divider, { backgroundColor: C.border }]} />

        <View style={[s.rowBetween, { marginTop: Spacing.md }]}>
          <View style={s.rowLeft}>
            <MaterialCommunityIcons
              name="format-size"
              size={20}
              color={C.sky}
            />
            <Text style={[rowLabel, { fontSize: fs(15) }]}>{t.fontSize}</Text>
          </View>
          <View
            style={[
              s.valueChip,
              {
                backgroundColor: isDark ? C.skyMid : C.skyPale,
              },
            ]}>
            <Text style={[s.valueChipText, { color: C.sky }]}>
              {Math.round(fontSize)}
            </Text>
          </View>
        </View>

        <PrecisionSlider
          value={fontSize}
          onValueChange={setFontSize}
          minimumValue={14}
          maximumValue={22}
          step={1}
          C={C}
        />

        <View
          style={[
            s.previewBox,
            {
              backgroundColor: C.bgDeep,
              borderLeftColor: C.sky,
            },
          ]}>
          <Text style={[s.previewMeta, { color: C.text3 }]}>{t.preview}</Text>
          <Text
            style={{
              color: C.text,
              letterSpacing: 0.2,
              fontSize,
              lineHeight: fontSize * lineSpacing,
              fontWeight: boldLyrics ? "600" : "300",
            }}>
            {PREVIEW}
          </Text>
        </View>
      </View>

      {/* ── TEXT DISPLAY ────────────────────────── */}
      <Text style={[sectionTitle, { fontSize: fs(11) }]}>{t.textDisplay}</Text>
      <View style={card}>
        <View style={s.rowBetween}>
          <View style={s.rowLeft}>
            <MaterialCommunityIcons
              name="format-line-spacing"
              size={20}
              color={C.sky}
            />
            <Text style={[rowLabel, { fontSize: fs(15) }]}>
              {t.lineSpacing}
            </Text>
          </View>
          <View
            style={[
              s.valueChip,
              {
                backgroundColor: isDark ? C.skyMid : C.skyPale,
              },
            ]}>
            <Text style={[s.valueChipText, { color: C.sky }]}>
              {lineSpacing.toFixed(1)}×
            </Text>
          </View>
        </View>

        <PrecisionSlider
          value={lineSpacing}
          onValueChange={setLineSpacing}
          minimumValue={1.2}
          maximumValue={2.2}
          step={0.1}
          C={C}
        />

        <View style={[s.divider, { backgroundColor: C.border }]} />

        <View style={[s.rowBetween, { marginTop: Spacing.md }]}>
          <View style={s.rowLeft}>
            <MaterialCommunityIcons
              name="format-bold"
              size={20}
              color={C.sky}
            />
            <Text style={[rowLabel, { fontSize: fs(15) }]}>{t.boldLyrics}</Text>
          </View>
          <Toggle value={boldLyrics} onToggle={setBoldLyrics} />
        </View>
      </View>

      {/* ── LANGUAGE ────────────────────────────── */}
      <Text style={[sectionTitle, { fontSize: fs(11) }]}>{t.language}</Text>
      <View style={card}>
        <View style={s.pillRow}>
          {[
            { key: "en", label: t.english },
            { key: "am", label: t.amharic },
          ].map((item) => {
            const active = lang === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  s.pill,
                  { backgroundColor: C.surface, borderColor: C.border },
                  active && { backgroundColor: C.sky, borderColor: C.sky },
                ]}
                onPress={() => !active && toggleLang()}
                activeOpacity={0.75}>
                <Text
                  style={[
                    s.pillText,
                    { color: C.text2 },
                    active && { color: C.bg, fontWeight: "700" },
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── FEEDBACK ────────────────────────────── */}
      <Text style={[sectionTitle, { fontSize: fs(11) }]}>
        {t.feedbackComments}
      </Text>
      <View style={card}>
        <View style={[s.rowLeft, { marginBottom: Spacing.md }]}>
          <MaterialCommunityIcons
            name="comment-text-outline"
            size={19}
            color={C.sky}
          />
          <Text style={rowLabel}>{t.shareThoughts}</Text>
        </View>

        <TextInput
          style={[
            s.feedbackInput,
            {
              color: C.text,
              borderColor: C.border,
              backgroundColor: C.bgDeep,
            },
          ]}
          placeholder={t.writeFeedback}
          placeholderTextColor={C.text3}
          value={feedbackText}
          onChangeText={setFeedbackText}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[
            s.ctaBtn,
            {
              backgroundColor: C.sky,
            },
          ]}
          onPress={handleFeedbackSubmit}
          activeOpacity={0.8}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <FontAwesome5 name="telegram" size={24} color="black" />
            <Text style={[s.ctaBtnText, { color: C.bg }]}>
              {t.sendViaTelegram}
            </Text>
          </View>
        </TouchableOpacity>

        <View
          style={[
            s.divider,
            { backgroundColor: C.border, marginTop: Spacing.md },
          ]}
        />

        {/* Website */}
        <TouchableOpacity
          style={[s.rowBetween, { paddingVertical: Spacing.md }]}
          onPress={() => openUrl("https://3ammm.org")}
          activeOpacity={0.7}>
          <View style={s.rowLeft}>
            <MaterialCommunityIcons name="web" size={20} color={C.sky} />
            <Text style={rowLabel}>{t.visitWebsite}</Text>
          </View>
          <MaterialCommunityIcons
            name="open-in-new"
            size={16}
            color={C.text3}
          />
        </TouchableOpacity>

        <View style={[s.divider, { backgroundColor: C.border }]} />

        {/* Social */}
        <Text
          style={[
            s.subLabel,
            { color: C.text3, marginTop: Spacing.md, marginBottom: Spacing.md },
          ]}>
          {t.followUs}
        </Text>

        <View style={s.socialRow}>
          {[
            {
              name: "Facebook",
              icon: "facebook",
              url: "https://facebook.com/@3ammm7",
            },
            {
              name: "Instagram",
              icon: "instagram",
              url: "https://instagram.com/@3ammm7",
            },
            {
              name: "TikTok",
              icon: "tiktok",
              url: "https://tiktok.com/@3ammm7",
            },
            {
              name: "Telegram",
              icon: "telegram-plane",
              url: "https://t.me/ThreeAMM",
            },
          ].map((social) => (
            <TouchableOpacity
              key={social.name}
              style={[
                s.socialBtn,
                {
                  backgroundColor: isDark ? C.skyGlow : C.skyPale,
                  borderColor: C.border,
                },
              ]}
              onPress={() =>
                social.name === "Facebook"
                  ? openSocialUrl("facebook")
                  : social.name === "Instagram"
                    ? openSocialUrl("instagram")
                    : openUrl(social.url)
              }
              activeOpacity={0.7}>
              <FontAwesome5 name={social.icon as any} size={22} color={C.sky} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── CONTACT ─────────────────────────────── */}
      <Text style={sectionTitle}>{t.contactUs}</Text>
      <View style={card}>
        {[
          {
            icon: "envelope",
            label: t.email,
            sub: "3ammministry@gmail.com",
            url: "mailto:3ammministry@gmail.com",
          },
          {
            icon: "phone",
            label: `3AMMM ${t.office}`,
            sub: "0937 555 577",
            url: "tel:+251937555577",
          },
          {
            icon: "telegram-plane",
            label: t.telegram,
            sub: "@Threeammm7",
            url: "https://t.me/Threeammm7",
          },
        ].map((item, i, arr) => (
          <React.Fragment key={item.label}>
            <TouchableOpacity
              style={[s.rowBetween, { paddingVertical: Spacing.md }]}
              onPress={() =>
                item.label === t.email
                  ? openSocialUrl("email")
                  : openUrl(item.url)
              }
              activeOpacity={0.7}>
              <View style={s.rowLeft}>
                <FontAwesome5
                  name={item.icon as any}
                  size={18}
                  color={C.sky}
                  style={{ width: 22, textAlign: "center" }}
                />

                <View style={{ marginLeft: 8 }}>
                  <Text style={[rowLabel, { fontSize: fs(15) }]}>
                    {item.label}
                  </Text>
                  <Text style={[s.subLabel, { color: C.text3 }]}>
                    {item.sub}
                  </Text>
                </View>
              </View>

              <FontAwesome5 name="chevron-right" size={16} color={C.text3} />
            </TouchableOpacity>

            {i < arr.length - 1 && (
              <View style={[s.divider, { backgroundColor: C.border }]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* ── APP FONT SIZE (Task 5) ──────────────── */}
      <Text style={[sectionTitle, { fontSize: fs(11) }]}>App Font Size</Text>
      <View style={card}>
        <View style={s.pillRow}>
          {(["small", "medium", "large"] as const).map((scale) => {
            const active = appFontScale === scale;
            const label =
              scale === "small"
                ? "Small"
                : scale === "medium"
                  ? "Medium"
                  : "Large";
            return (
              <TouchableOpacity
                key={scale}
                style={[
                  s.pill,
                  { backgroundColor: C.surface, borderColor: C.border },
                  active && { backgroundColor: C.sky, borderColor: C.sky },
                ]}
                onPress={() => setAppFontScale(scale)}
                activeOpacity={0.75}
                {...({ android_ripple: null } as any)}>
                <Text
                  style={[
                    s.pillText,
                    { color: C.text2 },
                    active && { color: C.bg, fontWeight: "700" },
                  ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text
          style={[{ color: C.text3, fontSize: 12, marginBottom: Spacing.sm }]}>
          Controls text size across the whole app (not lyrics — use the slider
          above for lyrics).
        </Text>
      </View>

      {/* ── APP UPDATES ─────────────────────────── */}
      <Text style={[sectionTitle, { fontSize: fs(11) }]}>{t.appUpdates}</Text>
      <View style={card}>
        <TouchableOpacity
          style={[s.rowBetween, { paddingVertical: Spacing.sm }]}
          onPress={handleCheckForUpdates}
          activeOpacity={0.7}>
          <View style={s.rowLeft}>
            <MaterialCommunityIcons
              name="cloud-download-outline"
              size={20}
              color={C.sky}
            />
            <View>
              <Text style={[rowLabel, { fontSize: fs(15) }]}>
                {t.checkForUpdates}
              </Text>
              <Text style={[s.subLabel, { color: C.text3 }]}>
                v{appVersion}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={C.text3}
          />
        </TouchableOpacity>
      </View>

      {/* ── ACCOUNT ─────────────────────────────── */}
      <Text style={[sectionTitle, { fontSize: fs(11) }]}>{t.account}</Text>
      <View style={card}>
        <TouchableOpacity
          style={[
            s.logoutRow,
            {
              backgroundColor: C.dangerBg,
              borderColor: C.danger,
            },
          ]}
          onPress={handleSignOut}
          activeOpacity={0.8}>
          <MaterialCommunityIcons name="logout" size={18} color={C.danger} />
          <Text style={[s.logoutText, { color: C.danger }]}>{t.logout}</Text>
        </TouchableOpacity>
      </View>

      {/* ── FOOTER ──────────────────────────────── */}
      <View style={s.footer}>
        <View style={[s.footerLine, { backgroundColor: C.border }]} />
        <Text style={[s.footerText, { color: C.text3 }]}>{t.credit}</Text>
        <View style={[s.footerLine, { backgroundColor: C.border }]} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  divider: { height: 1, marginVertical: Spacing.md },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  subLabel: { fontSize: 12, fontWeight: "500" },
  valueChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    overflow: "hidden",
  },
  valueChipText: { fontSize: 13, fontWeight: "700" },
  previewBox: {
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
  },
  previewMeta: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  pillRow: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.md },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    minWidth: 92,
    flexShrink: 0,
  },
  pillText: { fontSize: 14, fontWeight: "600" },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 14,
  },
  ctaBtn: {
    borderRadius: Radius.sm,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  ctaBtnText: { fontSize: 14, fontWeight: "700" },
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.sm,
  },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  logoutText: { fontSize: 15, fontWeight: "700" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 36,
    marginBottom: 20,
  },
  footerLine: { flex: 1, height: 1 },
  footerText: { fontSize: 11, textAlign: "center", flexShrink: 1 },
});
