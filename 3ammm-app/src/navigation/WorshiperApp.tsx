import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Platform,
  StatusBar,
  TouchableOpacity,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/useTheme";
import { api } from "../lib/api";
import HomeTab from "../screens/worshiper/HomeTab";
import SongsTab from "../screens/worshiper/SongsTab";
import { SetlistsTab, FavoritesTab } from "../screens/worshiper/OtherTabs";
import { SettingsTab } from "../screens/worshiper/SettingsTab";
import LyricsScreen, { Song } from "../screens/LyricsScreen";

type WTab = "home" | "songs" | "setlists" | "favs" | "settings";

type TabIconName = React.ComponentProps<typeof FontAwesome5>["name"];

const TABS: { key: WTab; icon: TabIconName }[] = [
  { key: "home", icon: "home" },
  { key: "songs", icon: "music" },
  { key: "setlists", icon: "calendar-alt" },
  { key: "favs", icon: "heart" },
  { key: "settings", icon: "cog" },
];

const TAB_ICON_AREA = 62;
const TAB_BAR_MARGIN = 18;

export default function WorshiperApp() {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [singers, setSingers] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [activePageNumber, setActivePageNumber] = useState<number>(1);
  const songsScrollOffset = useRef(0);

  const [activeTab, setActiveTab] = useState<WTab>("home");
  const tabOpacity = useRef(
    TABS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0)),
  ).current;

  const loadSongs = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [songsData, singersData] = await Promise.all([
        api.songs.getAll(),
        api.songs.getSingers(),
      ]);
      setAllSongs(songsData);
      setSingers(["All", ...singersData]);
    } catch (err: any) {
      setError(err?.message || "Failed to load songs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

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
        Animated.timing(tabOpacity[prevIndex], {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }

      Animated.timing(tabOpacity[index], {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      setActiveTab(tab);
    },
    [activeTab, tabOpacity],
  );

  const pillGradient: [string, string] = isDark
    ? [C.glass, C.navyGlow]
    : [C.surface, C.bgDeep];

  const pillBorder = isDark ? C.glassBorder : C.border;

  const pillTopEdgeBg = isDark
    ? "rgba(255,255,255,0.20)"
    : "rgba(255,255,255,0.90)";

  const tabBarHeight = TAB_ICON_AREA + insets.bottom;
  const contentBottomPad = tabBarHeight + TAB_BAR_MARGIN + 8;
  const tabBarBottom = TAB_BAR_MARGIN + insets.bottom;

  return (
    <View style={[styles.screen, { backgroundColor: C.bg }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <View style={[styles.content, { paddingBottom: contentBottomPad }]}>
        {TABS.map((tab, index) => (
          <Animated.View
            key={tab.key}
            style={[
              styles.tabLayer,
              { opacity: tabOpacity[index] },
              activeTab !== tab.key && styles.tabBehind,
            ]}>
            {tab.key === "home" && (
              <HomeTab
                onOpenSong={openSong}
                onNavigateTab={(nextTab) => {
                  const idx = TABS.findIndex((t) => t.key === nextTab);
                  if (idx !== -1) handleTabPress(nextTab, idx);
                }}
              />
            )}

            {tab.key === "songs" && (
              <SongsTab
                songs={allSongs}
                singers={singers}
                loading={loading}
                error={error}
                refresh={loadSongs}
                onOpenSong={openSong}
                scrollOffsetRef={songsScrollOffset}
              />
            )}

            {tab.key === "setlists" && <SetlistsTab onOpenSong={openSong} />}
          {tab.key === "favs" && (
  <FavoritesTab
    onOpenSong={openSong}
    onBackToSongs={() => handleTabPress("songs", 1)}
    allSongs={allSongs}
  />
)}
            {tab.key === "settings" && <SettingsTab />}
          </Animated.View>
        ))}
      </View>

      <View
        style={[styles.tabBarOuter, { bottom: tabBarBottom }]}
        pointerEvents="box-none">
        <View style={[styles.tabBarPill, { borderColor: pillBorder }]}>
          <View style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={pillGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isDark
                    ? "rgba(3,10,18,0.40)"
                    : "rgba(240,248,255,0.28)",
                },
              ]}
            />
          </View>

          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 32,
                overflow: "hidden",
              },
            ]}>
            <BlurView
              intensity={isDark ? 38 : 55}
              tint={isDark ? "dark" : "light"}
              // Android blur is experimental in Expo and needs this enabled.
              experimentalBlurMethod={
                Platform.OS === "android" ? "dimezisBlurView" : undefined
              }
              // Helps keep the Android result closer to iOS.
              blurReductionFactor={4}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <View
            style={[
              styles.pillTopEdge,
              { backgroundColor: pillTopEdgeBg },
            ]}
          />

          <View style={styles.tabBarRow}>
            {TABS.map((tab, index) => {
              const isActive = activeTab === tab.key;

              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tabItem}
                  onPress={() => handleTabPress(tab.key, index)}
                  activeOpacity={0.7}>
                  {isActive ? (
                    <View style={styles.activeWrap}>
                      <LinearGradient
                        colors={[C.sky, C.skyDeep ?? "#5bb8e0"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: 23 }]}
                      />
                      <LinearGradient
                        colors={[
                          "rgba(255,255,255,0.35)",
                          "rgba(255,255,255,0.00)",
                        ]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 0.6 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: 23 }]}
                      />
                      <View style={styles.activeWrapSheen} />
                      <FontAwesome5 name={tab.icon} size={19} color="#010f18" />
                    </View>
                  ) : (
                    <FontAwesome5 name={tab.icon} size={19} color="#7f919e" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

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
    left: 16,
    right: 16,
    zIndex: 100,
  },
  tabBarPill: {
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 0.5,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 32,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 20 },
    }),
  },
  pillTopEdge: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: 0.8,
    zIndex: 2,
  },
  tabBarRow: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  activeWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 0.8,
    borderColor: "rgba(255,255,255,0.30)",
    ...Platform.select({
      ios: {
        shadowColor: "#87ceeb",
        shadowOpacity: 0.55,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 8 },
    }),
  },
  activeWrapSheen: {
    position: "absolute",
    top: 0,
    left: 6,
    right: 6,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.40)",
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
  },
});