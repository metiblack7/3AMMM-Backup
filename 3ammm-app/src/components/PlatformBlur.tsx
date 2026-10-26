import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

interface PlatformBlurProps {
  style?: any;
  isDark?: boolean;
  intensity?: number;
  children?: React.ReactNode;
  borderRadius?: number;
  gradientColors?: readonly [string, string];
  gradientOpacity?: number;
}

function PlatformBlur({
  style,
  isDark = false,
  intensity = 100,
  children,
  borderRadius,
  gradientColors,
  gradientOpacity = 0.35,
}: PlatformBlurProps) {
  const androidLayerStyle = {
    opacity: Math.max(0, Math.min(intensity, 100)) / 100,
  };

  return (
    <View
      style={[
        style,
        {
          overflow: "hidden",
          ...(borderRadius !== undefined ? { borderRadius } : {}),
        },
      ]}>
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={isDark ? 55 : 70}
          tint={isDark ? "systemChromeMaterialDark" : "systemMaterial"}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <>
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? "rgba(4,10,18,0.82)"
                  : "rgba(240,248,255,0.88)",
              },
              androidLayerStyle,
            ]}
          />
          <LinearGradient
            colors={
              isDark
                ? ["rgba(10,24,40,0.75)", "rgba(2,12,22,0.90)"]
                : ["rgba(255,255,255,0.70)", "rgba(240,248,255,0.85)"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, androidLayerStyle]}
          />
          <View
            style={[
              styles.topSheen,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.14)"
                  : "rgba(255,255,255,0.90)",
              },
              androidLayerStyle,
            ]}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? "rgba(135,206,235,0.04)"
                  : "rgba(4,57,84,0.03)",
              },
              androidLayerStyle,
            ]}
          />
        </>
      )}
      {gradientColors && (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: gradientOpacity }]}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  topSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 0.8,
  },
});

export default PlatformBlur;
