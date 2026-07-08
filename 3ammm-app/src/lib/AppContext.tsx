import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, saveToken, getToken, clearToken } from "./api";
import {
  useGoogleAuth,
  fetchGoogleUserInfo,
  getAccessTokenFromResponse,
} from "./googleAuth";
import { startAutoSync, syncAll } from "./sync";
import { useNetworkStatus } from "./network";
import translations, { LangKey } from "./i18n";
import { DarkColors, LightColors } from "../theme";
import {
  registerForPushNotificationsOnSignUp,
  scheduleWelcomeNotification,
} from "./notifications";
import * as Notifications from "expo-notifications";
import { db } from "./db";

export type ThemeColors = typeof DarkColors;

export interface Profile {
  _id: string;
  name: string;
  singerName: string;
  role: "admin" | "worshiper";
  email: string;
}

const PROFILE_KEY = "3ammm_profile";
const SPLASH_HOLD_MS = 2500;
const GUEST_SESSION_KEY = "guest_session_active";
const WELCOME_NOTIF_KEY = "welcome_notif_sent";

// ── App font scale ────────────────────────────────────────────
export type AppFontScale = "small" | "medium" | "large";
const FONT_SCALE_MAP: Record<AppFontScale, number> = {
  small: 0.85,
  medium: 1.0,
  large: 1.18,
};

export interface AppContextType {
  profile: Profile | null;
  lang: LangKey;
  t: Record<string, string>;
  toggleLang: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
    singerName?: string,
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  authError: string;
  fontSize: number;
  setFontSize: (size: number) => Promise<void>;
  lineSpacing: number;
  setLineSpacing: (spacing: number) => Promise<void>;
  boldLyrics: boolean;
  setBoldLyrics: (bold: boolean) => Promise<void>;
  toggleBoldLyrics: () => Promise<void>;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => Promise<void>;
  toggleTheme: () => Promise<void>;
  C: ThemeColors;
  darkMode: boolean;
  // App-wide font scale (separate from lyrics font size)
  appFontScale: AppFontScale;
  setAppFontScale: (scale: AppFontScale) => Promise<void>;
  fs: (base: number) => number;
}

const AppContext = createContext<AppContextType | null>(null);

interface AppProviderProps {
  children?: ReactNode;
}

// ── Splash overlay ────────────────────────────────────────────
function SplashOverlay({
  loading,
  onExitComplete,
}: {
  loading: boolean;
  onExitComplete: () => void;
}) {
  const { width } = useWindowDimensions();

  const logoAspectRatio = 200 / 200;
  const logoWidth = Math.min(width * 0.3, 185);
  const logoHeight = logoWidth / logoAspectRatio;

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(1.18)).current;
  const logoTranslateY = useRef(new Animated.Value(18)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(28)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(34)).current;

  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitingRef = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(subtitleTranslateY, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    logoScale,
    logoTranslateY,
    titleOpacity,
    titleTranslateY,
    subtitleOpacity,
    subtitleTranslateY,
  ]);

  useEffect(() => {
    if (loading) return;

    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

    exitTimerRef.current = setTimeout(() => {
      if (exitingRef.current) return;
      exitingRef.current = true;

      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 0.92,
          duration: 420,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoTranslateY, {
          toValue: -24,
          duration: 420,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: -14,
          duration: 420,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(subtitleOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: -10,
          duration: 420,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 380,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onExitComplete();
      });
    }, SPLASH_HOLD_MS);

    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [
    loading,
    logoScale,
    logoTranslateY,
    titleOpacity,
    titleTranslateY,
    subtitleOpacity,
    subtitleTranslateY,
    containerOpacity,
    onExitComplete,
  ]);

  return (
    <Animated.View
      style={[styles.splashContainer, { opacity: containerOpacity }]}>
      <BlurView
        intensity={55}
        tint="dark"
        style={StyleSheet.absoluteFillObject}>
        <View style={styles.blurTint} />
      </BlurView>

      <Animated.View
        style={[
          styles.splashContent,
          {
            transform: [{ translateY: logoTranslateY }, { scale: logoScale }],
          },
        ]}>
        <Image
          source={require("../../assets/splash.png")}
          style={[styles.logo, { width: logoWidth, height: logoHeight }]}
          resizeMode="contain"
        />

        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}>
          Saba App
        </Animated.Text>

        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}>
          ሳባ ወላይትኛ መዝሙሮች
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

// ── Welcome push notification (Task 6) ───────────────────────
async function maybeSendWelcomeNotification(lang: LangKey) {
  try {
    await scheduleWelcomeNotification(lang);
  } catch (err) {
    console.error("Welcome notification error:", err);
  }
}

// ── AppProvider ───────────────────────────────────────────────
export function AppProvider({ children }: AppProviderProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lang, setLang] = useState<LangKey>("en");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [lineSpacing, setLineSpacing] = useState(1.6);
  const [boldLyrics, setBoldLyrics] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [showSplash, setShowSplash] = useState(true);
  const [appFontScale, setAppFontScaleState] = useState<AppFontScale>("medium");

  const isOnline = useNetworkStatus();

  const t = translations[lang];
  const C = theme === "dark" ? DarkColors : LightColors;
  const darkMode = theme === "dark";

  // fs() helper — multiplies a base size by the active font scale
  const fs = (base: number) => base * FONT_SCALE_MAP[appFontScale];

  // ── Google auth hook ──────────────────────────────────────
  const { request, response: googleResponse, promptAsync } = useGoogleAuth();
  const googlePromiseRef = useRef<{
    resolve: () => void;
    reject: (err: Error) => void;
  } | null>(null);

  // ── Handle Google auth response ───────────────────────────
  useEffect(() => {
    if (!googleResponse) return;

    const settle = googlePromiseRef.current;
    googlePromiseRef.current = null;

    (async () => {
      try {
        if (
          googleResponse.type === "cancel" ||
          googleResponse.type === "dismiss"
        ) {
          settle?.resolve();
          return;
        }

        if (googleResponse.type !== "success") {
          throw new Error("Google sign-in failed.");
        }

        const accessToken = getAccessTokenFromResponse(googleResponse);
        if (!accessToken) {
          throw new Error("No access token returned from Google.");
        }

        const googleUser = await fetchGoogleUserInfo(accessToken);

        const { token, user } = await api.auth.googleAuth(
          accessToken,
          googleUser.id,
          googleUser.email,
        );

        await saveToken(token);
        setProfile(user);
        await registerForPushNotificationsOnSignUp(user.name).catch(() => {});
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));

        settle?.resolve();
      } catch (err: any) {
        const message = err?.message || "Google sign-in failed";
        setAuthError(message);
        settle?.reject(new Error(message));
      }
    })();
  }, [googleResponse]);

  // ── App initialisation ────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        startAutoSync();

        const token = await getToken();

        // ── Task 1: Restore guest session ─────────────────
        const guestActive = await db.session.getGuestSessionActive();
        if (!token && guestActive) {
          const guestProfile = {
            _id: "guest_persistent",
            role: "worshiper",
            name: "Guest",
          } as Profile;
          if (mounted) setProfile(guestProfile);
        }

        if (token) {
          const savedProfile = await AsyncStorage.getItem(PROFILE_KEY);
          if (savedProfile && mounted) {
            setProfile(JSON.parse(savedProfile));
          }
        }

        if (token) {
          try {
            const { user } = await api.auth.me();
            if (mounted) {
              setProfile(user);
              await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));
            }
          } catch (err: any) {
            const message: string = err?.message || "";
            if (
              message.includes("Invalid or expired token") ||
              message.includes("Unauthorized") ||
              message.includes("jwt")
            ) {
              await clearToken();
              await AsyncStorage.removeItem(PROFILE_KEY);
              if (mounted) setProfile(null);
            }
          }
        }

        const [
          savedFS,
          savedLS,
          savedBL,
          savedTheme,
          savedLang,
          savedFontScale,
        ] = await Promise.all([
          AsyncStorage.getItem("pref_font_size"),
          AsyncStorage.getItem("pref_line_spacing"),
          AsyncStorage.getItem("pref_bold_lyrics"),
          AsyncStorage.getItem("pref_theme"),
          AsyncStorage.getItem("pref_lang"),
          AsyncStorage.getItem("pref_app_font_scale"),
        ]);

        if (mounted) {
          if (savedFS) setFontSize(parseFloat(savedFS));
          if (savedLS) setLineSpacing(parseFloat(savedLS));
          if (savedBL) setBoldLyrics(savedBL === "true");
          if (savedTheme) setTheme(savedTheme as "light" | "dark");
          if (savedLang) setLang(savedLang as LangKey);
          if (savedFontScale)
            setAppFontScaleState(savedFontScale as AppFontScale);
        }

        if (isOnline) {
          syncAll(true).catch((err) =>
            console.error("Initial sync failed:", err),
          );
        }
      } catch (err) {
        console.error("Initialization error:", err);
        await clearToken();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOnline]);

  // ── Auth functions ────────────────────────────────────────
  async function signIn(email: string, password: string) {
    setAuthError("");
    try {
      const { token, user } = await api.auth.login(email, password);
      await saveToken(token);
      setProfile(user);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));
    } catch (err: any) {
      setAuthError(err.message || "Sign in failed");
      throw err;
    }
  }

  async function signUp(
    name: string,
    email: string,
    password: string,
    singerName?: string,
  ) {
    setAuthError("");
    try {
      const { token, user } = await api.auth.register(
        name,
        email,
        password,
        singerName,
      );
      await saveToken(token);
      setProfile(user);
      await registerForPushNotificationsOnSignUp(user.name).catch(() => {});
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));
    } catch (err: any) {
      setAuthError(err.message || "Sign up failed");
      throw err;
    }
  }

  async function signInWithGoogle() {
    setAuthError("");

    if (!request) {
      throw new Error("Google sign-in is not ready yet. Please try again.");
    }

    return new Promise<void>((resolve, reject) => {
      googlePromiseRef.current = { resolve, reject };
      promptAsync().catch((err) => {
        googlePromiseRef.current = null;
        reject(err);
      });
    });
  }

  async function loginAsGuest() {
    setAuthError("");
    try {
      await clearToken();

      const guestProfile = {
        _id: "guest_" + Date.now(),
        role: "worshiper",
        name: "Guest",
      } as Profile;
      setProfile(guestProfile);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(guestProfile));

      // ── Task 1: Persist guest session ─────────────────────
      await db.session.setGuestSessionActive(true);

      // ── Task 6: Welcome notification ──────────────────────
      const currentLang =
        ((await AsyncStorage.getItem("pref_lang")) as LangKey) ?? lang;
      await maybeSendWelcomeNotification(currentLang);
    } catch (err: any) {
      setAuthError(err.message || "Guest login failed");
      throw err;
    }
  }

  async function signOut() {
    await clearToken();
    setProfile(null);
    await AsyncStorage.removeItem(PROFILE_KEY);
    // ── Task 1: Clear guest session so login screen shows ──
    await db.session.clearGuestSessionActive();
  }

  function toggleLang() {
    const next: LangKey = lang === "en" ? "am" : "en";
    setLang(next);
    AsyncStorage.setItem("pref_lang", next).catch(() => {});
  }

  async function handleSetFontSize(size: number) {
    setFontSize(size);
    await AsyncStorage.setItem("pref_font_size", size.toString());
  }

  async function handleSetLineSpacing(spacing: number) {
    setLineSpacing(spacing);
    await AsyncStorage.setItem("pref_line_spacing", spacing.toString());
  }

  async function handleSetBoldLyrics(bold: boolean) {
    setBoldLyrics(bold);
    await AsyncStorage.setItem("pref_bold_lyrics", bold.toString());
  }

  async function handleSetTheme(themeValue: "light" | "dark") {
    setTheme(themeValue);
    await AsyncStorage.setItem("pref_theme", themeValue);
  }

  async function handleToggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    await AsyncStorage.setItem("pref_theme", newTheme);
  }

  async function handleToggleBoldLyrics() {
    const newValue = !boldLyrics;
    setBoldLyrics(newValue);
    await AsyncStorage.setItem("pref_bold_lyrics", newValue.toString());
  }

  // ── Task 5: App font scale ────────────────────────────────
  async function handleSetAppFontScale(scale: AppFontScale) {
    setAppFontScaleState(scale);
    await AsyncStorage.setItem("pref_app_font_scale", scale);
  }

  return (
    <AppContext.Provider
      value={{
        profile,
        lang,
        t,
        toggleLang,
        signIn,
        signUp,
        signInWithGoogle,
        loginAsGuest,
        signOut,
        isAdmin: profile?.role === "admin",
        isAuthenticated: !!profile && !loading,
        loading,
        authError,
        fontSize,
        setFontSize: handleSetFontSize,
        lineSpacing,
        setLineSpacing: handleSetLineSpacing,
        boldLyrics,
        setBoldLyrics: handleSetBoldLyrics,
        toggleBoldLyrics: handleToggleBoldLyrics,
        theme,
        setTheme: handleSetTheme,
        toggleTheme: handleToggleTheme,
        C,
        darkMode,
        appFontScale,
        setAppFontScale: handleSetAppFontScale,
        fs,
      }}>
      {children}

      {showSplash && (
        <SplashOverlay
          loading={loading}
          onExitComplete={() => setShowSplash(false)}
        />
      )}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#021620",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  blurTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7, 11, 20, 0.28)",
  },
  splashContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    marginBottom: 14,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 0.4,
    textAlign: "center",
    opacity: 0.92,
  },
});
