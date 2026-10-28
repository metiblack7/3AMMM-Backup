import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../lib/AppContext";
import { useTheme } from "../lib/useTheme";

interface GlassHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backAccessibilityLabel?: string;
  rightContent?: React.ReactNode;
  children?: React.ReactNode;
  blurTarget?: React.RefObject<View | null>;
  style?: StyleProp<ViewStyle>;
}

export default function GlassHeader({
  title,
  subtitle,
  onBack,
  backAccessibilityLabel,
  rightContent,
  children,
  blurTarget,
  style,
}: GlassHeaderProps) {
  const insets = useSafeAreaInsets();
  const { t } = useApp();
  const { C, isDark } = useTheme();
  const sheenColors: [string, string, string] = isDark
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

  return (
    <View
      style={[
        styles.header,
        {
          marginTop: insets.top + 8,
          borderColor: C.border,
        },
        style,
      ]}>
      <BlurView
        blurTarget={blurTarget}
        blurMethod="dimezisBlurView"
        intensity={60}
        tint={isDark ? "systemUltraThinMaterialDark" : "default"}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={sheenColors}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topSheen} />
      <LinearGradient
        colors={
          isDark
            ? [
                "rgba(135,206,235,0.00)",
                "rgba(135,206,235,0.18)",
                "rgba(135,206,235,0.00)",
              ]
            : [
                "rgba(42,138,184,0.00)",
                "rgba(42,138,184,0.10)",
                "rgba(42,138,184,0.00)",
              ]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bottomEdge}
      />

      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel ?? t.back}
            onPress={onBack}
            activeOpacity={0.75}
            style={styles.backButton}>
            <View style={styles.backButtonBackground} />
            <LinearGradient
              colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.03)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.backButtonSheen} />
            <Feather name="chevron-left" size={19} color={C.text} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <View style={styles.subtitleRow}>
              <View style={[styles.subtitleDot, { backgroundColor: C.text2 }]} />
              <Text
                style={[styles.subtitle, { color: C.text2 }]}
                numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          ) : null}
        </View>
        {rightContent}
      </View>
      {children ? (
        <View style={styles.childrenContainer}>{children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "relative",
    overflow: "hidden",
    marginHorizontal: 12,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  topSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  bottomEdge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 0.5,
  },
  row: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  childrenContainer: { marginHorizontal: -16 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  backButtonBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(135,206,235,0.15)",
  },
  backButtonSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  titleBlock: { flex: 1, minWidth: 0, justifyContent: "center", gap: 2 },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  subtitle: {
    fontSize: 12,
    flexShrink: 1,
  },
  subtitleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(135,206,235,0.70)",
  },
});
