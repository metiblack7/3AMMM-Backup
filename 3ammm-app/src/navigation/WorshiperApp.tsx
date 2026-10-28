import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/useTheme";
import HomeTab from "../screens/worshiper/HomeTab";
import SongsTab from "../screens/worshiper/SongsTab";
import { SetlistsTab, FavoritesTab } from "../screens/worshiper/OtherTabs";
import { SettingsTab } from "../screens/worshiper/SettingsTab";
import LyricsScreen, { Song } from "../screens/LyricsScreen";
import LoginScreen from "../screens/LoginScreen";
import AdminDashboard from "../screens/admin/AdminDashboard";
import { useApp } from "../lib/AppContext";

type WTab = "home" | "songs" | "setlists" | "favs" | "settings";

type TabIconName = React.ComponentProps<typeof FontAwesome5>["name"];

const TABS: { key: WTab; icon: TabIconName }[] = [
  { key: "home", icon: "home" },
  { key: "songs", icon: "music" },
  { key: "setlists", icon: "calendar-alt" },
  { key: "favs", icon: "heart" },
  { key: "settings", icon: "cog" },
];

const TAB_BAR_TABS = TABS;
const TAB_BAR_HEIGHT = 72;
const TAB_BAR_MARGIN = 12;

export default function WorshiperApp() {
  const { C, isDark } = useTheme();
  const { isAdmin, t } = useApp();
  const insets = useSafeAreaInsets();
  const tabBarBlurTarget = useRef<View | null>(null);
  const [adminRoute, setAdminRoute] = useState<
    "closed" | "login" | "dashboard"
  >("closed");

  // ── allSongs is loaded by SongsTab and shared with FavoritesTab
  // so favorites can show the same page numbers as the songs list.
  const [allSongs, setAllSongs] = useState<Song[]>([]);

  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [activePageNumber, setActivePageNumber] = useState<number>(1);
  const songsScrollOffset = useRef(0);

  const [activeTab, setActiveTab] = useState<WTab>("home");
  const [tabLayouts, setTabLayouts] = useState<
    Partial<Record<WTab, { x: number; width: number }>>
  >({});
  const activeIndicatorX = useRef(new Animated.Value(0)).current;
  const hasPositionedIndicator = useRef(false);
  const tabIconScale = useRef(
    TABS.map(() => new Animated.Value(1)),
  ).current;
  const tabOpacity = useRef(
    TABS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0)),
  ).current;
  const tabTranslate = useRef(
    TABS.map((_, i) => new Animated.Value(i === 0 ? 0 : 14)),
  ).current;

  React.useEffect(() => {
    const activeLayout = tabLayouts[activeTab];
    if (!activeLayout) return;

    const targetX = activeLayout.x + (activeLayout.width - 44) / 2;
    if (!hasPositionedIndicator.current) {
      activeIndicatorX.setValue(targetX);
      hasPositionedIndicator.current = true;
      return;
    }

    activeIndicatorX.stopAnimation();
    Animated.spring(activeIndicatorX, {
      toValue: targetX,
      tension: 90,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [activeIndicatorX, activeTab, tabLayouts]);

  React.useEffect(() => {
    const activeIndex = TAB_BAR_TABS.findIndex(
      (tab) => tab.key === activeTab,
    );
    if (activeIndex === -1) return;

    const activeScale = tabIconScale[activeIndex];
    activeScale.setValue(0.7);
    Animated.sequence([
      Animated.timing(activeScale, {
        toValue: 1.2,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.spring(activeScale, {
        toValue: 1,
        tension: 150,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab, tabIconScale]);

  const openSong = useCallback(
    (song: Song) => {
      const index = allSongs.findIndex((s) => s._id === song._id);
      const page = index !== -1 ? index + 1 : 1;
      setActivePageNumber(page);
      setActiveSong(song);
    },
    [allSongs],
  );

  const closeSong = useCallback(() => setActiveSong(null), []);

  const navigateToSong = useCallback(
    (song: Song) => {
      openSong(song);
    },
    [openSong],
  );

  const handleTabPress = useCallback(
    (tab: WTab, index: number) => {
      if (tab === activeTab) return;

      const prevIndex = TABS.findIndex((t) => t.key === activeTab);
      if (prevIndex !== -1) {
        Animated.parallel([
          Animated.timing(tabOpacity[prevIndex], {
            toValue: 0,
            duration: 220,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(tabTranslate[prevIndex], {
            toValue: -10,
            duration: 220,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }

      tabTranslate[index].setValue(14);
      Animated.parallel([
        Animated.timing(tabOpacity[index], {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(tabTranslate[index], {
          toValue: 0,
          speed: 16,
          bounciness: 4,
          useNativeDriver: true,
        }),
      ]).start();

      setActiveTab(tab);
    },
    [activeTab, tabOpacity, tabTranslate],
  );

  if (adminRoute === "dashboard" && isAdmin) {
    return <AdminDashboard />;
  }

  if (adminRoute === "login") {
    return (
      <LoginScreen
        adminOnly
        onBack={() => setAdminRoute("closed")}
        onAdminLoginSuccess={() => setAdminRoute("dashboard")}
      />
    );
  }

  const tabBarBottom = TAB_BAR_MARGIN + insets.bottom;

  return (
    <View style={[styles.screen, { backgroundColor: C.bg }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <BlurTargetView ref={tabBarBlurTarget} style={styles.content}>
        <View style={{ flex: 1 }}>
          {TABS.map((tab, index) => {
            const isActive = activeTab === tab.key;
            return (
              <Animated.View
                key={tab.key}
                pointerEvents={isActive ? "auto" : "none"}
                style={[
                  styles.tabLayer,
                  {
                    opacity: tabOpacity[index],
                    transform: [{ translateY: tabTranslate[index] }],
                    zIndex: isActive ? 2 : 1,
                  },
                ]}>
                {tab.key === "home" && (
                  <HomeTab
                    onOpenSong={openSong}
                    onNavigateTab={(nextTab) => {
                      const nextIndex = TABS.findIndex(
                        (t) => t.key === nextTab,
                      );
                      if (nextIndex !== -1) handleTabPress(nextTab, nextIndex);
                    }}
                  />
                )}
                {tab.key === "songs" && (
                  <SongsTab
                    onOpenSong={openSong}
                    scrollOffsetRef={songsScrollOffset}
                    onSongsLoaded={setAllSongs}
                  />
                )}
                {tab.key === "setlists" && <SetlistsTab onOpenSong={openSong} />}
                {tab.key === "favs" && (
                  <FavoritesTab
                    onOpenSong={openSong}
                    allSongs={allSongs}
                    onBackToSongs={() =>
                      handleTabPress(
                        "songs",
                        TABS.findIndex((item) => item.key === "songs"),
                      )
                    }
                  />
                )}
                {tab.key === "settings" && (
                  <SettingsTab
                    onBackToSongs={() =>
                      handleTabPress(
                        "songs",
                        TABS.findIndex((item) => item.key === "songs"),
                      )
                    }
                    onAdminLogin={() => setAdminRoute("login")}
                  />
                )}
              </Animated.View>
            );
          })}
        </View>
      </BlurTargetView>

      {/* ── TAB BAR ───────────────────────────────────────────── */}
      <View
        style={[styles.tabBarOuter, { bottom: tabBarBottom }]}
        pointerEvents="box-none">
        <View style={styles.tabBarPillShadow}>
          <View style={styles.tabBarPill}>
            <BlurView
              blurTarget={tabBarBlurTarget}
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

            <View style={styles.tabBarRow}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.activeIndicator,
                  { transform: [{ translateX: activeIndicatorX }] },
                ]}>
                <LinearGradient
                  colors={
                    isDark
                      ? [
                          "rgba(135,206,235,0.22)",
                          "rgba(91,184,224,0.12)",
                        ]
                      : [
                          "rgba(42,138,184,0.18)",
                          "rgba(91,184,224,0.10)",
                        ]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>

              {TAB_BAR_TABS.map((tab, index) => {
                const isActive = activeTab === tab.key;
                const label =
                  tab.key === "home"
                    ? t.home
                    : tab.key === "songs"
                      ? t.songs
                      : tab.key === "setlists"
                        ? t.setlists
                        : tab.key === "favs"
                          ? t.favs
                          : t.settings;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={styles.tabItem}
                    onLayout={(event) => {
                      const { x, width } = event.nativeEvent.layout;
                      setTabLayouts((layouts) => {
                        const current = layouts[tab.key];
                        if (current?.x === x && current.width === width) {
                          return layouts;
                        }
                        return { ...layouts, [tab.key]: { x, width } };
                      });
                    }}
                    onPress={() => handleTabPress(tab.key, index)}
                    accessibilityRole="tab"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: isActive }}
                    activeOpacity={0.7}>
                    <Animated.View
                      style={[
                        styles.tabIconWrap,
                        { transform: [{ scale: tabIconScale[index] }] },
                      ]}>
                      <FontAwesome5
                        name={tab.icon}
                        size={18}
                        color={isActive ? C.sky : C.text2}
                      />
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* ── LYRICS OVERLAY ────────────────────────────────────── */}
      {activeSong && (
        <View style={styles.lyricsOverlay}>
          <LyricsScreen
            song={activeSong}
            onBack={closeSong}
            pageNumber={activePageNumber}
            allSongs={allSongs}
            onNavigateToSong={navigateToSong}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1 },
  tabLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBehind: {
    zIndex: 0,
    pointerEvents: "none",
  } as any,
  lyricsOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  tabBarOuter: {
    position: "absolute",
    left: 18,
    right: 18,
    zIndex: 100,
    elevation: 100,
  },
  tabBarPillShadow: {
    height: TAB_BAR_HEIGHT,
    borderRadius: 34,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.22,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 10 },
    }),
  },
  tabBarPill: {
    height: TAB_BAR_HEIGHT,
    borderRadius: 34,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(135,206,235,0.28)",
  },
  activeIndicator: {
    position: "absolute",
    top: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
  },
  tabBarRow: {
    position: "relative",
    flexDirection: "row",
    height: TAB_BAR_HEIGHT,
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
