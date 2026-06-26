import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, saveToken, getToken, clearToken } from "./api";
import { startAutoSync, syncAll } from "./sync";
import { useNetworkStatus } from "./network";
import translations, { LangKey } from "./i18n";
import { DarkColors, LightColors } from "../theme";
import { registerForPushNotificationsOnSignUp } from "./notifications";
export type ThemeColors = typeof DarkColors;

export interface Profile {
  _id: string;
  name: string;
  singerName: string;
  role: "admin" | "worshiper";
  email: string;
}

const PROFILE_KEY = "3ammm_profile";

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
}

const AppContext = createContext<AppContextType | null>(null);

interface AppProviderProps {
  children?: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lang, setLang] = useState<LangKey>("en");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [lineSpacing, setLineSpacing] = useState(1.6);
  const [boldLyrics, setBoldLyrics] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const isOnline = useNetworkStatus();

  const t = translations[lang];
  const C = theme === "dark" ? DarkColors : LightColors;
  const darkMode = theme === "dark";

  useEffect(() => {
    (async () => {
      try {
        startAutoSync();

        // ── OPTIMISTIC RESTORE: Load profile from AsyncStorage instantly
        const token = await getToken();
        if (token) {
          const savedProfile = await AsyncStorage.getItem(PROFILE_KEY);
          if (savedProfile) {
            const parsed = JSON.parse(savedProfile);
            setProfile(parsed);
          }
        }

        // ── THEN: Verify/update from network
        if (token) {
          try {
            const { user } = await api.auth.me();
            setProfile(user);
            // Save updated profile to AsyncStorage
            await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));
          } catch (err) {
            console.error("Failed to fetch fresh profile:", err);
            // Keep the optimistically restored profile
          }
        }

        const [savedFS, savedLS, savedBL, savedTheme] = await Promise.all([
          AsyncStorage.getItem("pref_font_size"),
          AsyncStorage.getItem("pref_line_spacing"),
          AsyncStorage.getItem("pref_bold_lyrics"),
          AsyncStorage.getItem("pref_theme"),
        ]);

        if (savedFS) setFontSize(parseFloat(savedFS));
        if (savedLS) setLineSpacing(parseFloat(savedLS));
        if (savedBL) setBoldLyrics(savedBL === "true");
        if (savedTheme) setTheme(savedTheme as "light" | "dark");

        if (isOnline) {
          syncAll(true).catch((err) =>
            console.error("Initial sync failed:", err),
          );
        }
      } catch (err) {
        console.error("Initialization error:", err);
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, [isOnline]);

  async function signIn(email: string, password: string) {
    setAuthError("");
    const { token, user } = await api.auth.login(email, password);
    await saveToken(token);
    setProfile(user);
    // Save profile to AsyncStorage for optimistic restore on next launch
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));
  }

  async function signUp(
    name: string,
    email: string,
    password: string,
    singerName?: string,
  ) {
    setAuthError("");
    const { token, user } = await api.auth.register(
      name,
      email,
      password,
      singerName,
    );
    await saveToken(token);
    setProfile(user);

    await registerForPushNotificationsOnSignUp(user.name).catch(() => {});

    // Save profile to AsyncStorage for optimistic restore on next launch
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));
  }

  async function signOut() {
    await clearToken();
    setProfile(null);
    // Clear saved profile from AsyncStorage
    await AsyncStorage.removeItem(PROFILE_KEY);
  }

  function toggleLang() {
    setLang((prev: LangKey) => (prev === "en" ? "am" : "en"));
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

  return (
    <AppContext.Provider
      value={{
        profile,
        lang,
        t,
        toggleLang,
        signIn,
        signUp,
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
      }}>
      {children}
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
