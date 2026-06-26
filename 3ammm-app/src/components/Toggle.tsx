import React, { useState, useEffect } from "react";
import { View, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { useTheme } from "../lib/useTheme";

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export default function Toggle({ value, onValueChange }: ToggleProps) {
  const { C } = useTheme();
  const [thumbPosition] = useState(new Animated.Value(value ? 20 : 2));

  useEffect(() => {
    Animated.spring(thumbPosition, {
      toValue: value ? 20 : 2,
      tension: 80,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [value, thumbPosition]);

  const handlePress = () => {
    onValueChange(!value);
  };

  // Track color: sky when ON, rgba(sky, 0.20) when OFF
  const trackColor = value ? C.sky : "rgba(135, 206, 235, 0.20)";

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: trackColor }]}
      onPress={handlePress}
      activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.thumb,
          {
            transform: [{ translateX: thumbPosition }],
          },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 28,
    borderRadius: 28,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
