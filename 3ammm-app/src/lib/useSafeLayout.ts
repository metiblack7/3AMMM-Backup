import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

export function useSafeLayout() {
  const insets = useSafeAreaInsets();

  return {
    // Top padding for screens that need to clear the status bar
    topPad: insets.top,
    // Bottom padding for screens that need to clear the home indicator
    bottomPad: insets.bottom,
    // Full safe insets if needed
    insets,
  };
}