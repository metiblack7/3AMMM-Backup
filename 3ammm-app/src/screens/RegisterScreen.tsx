import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useApp } from "../lib/AppContext";
import { useTheme } from "../lib/useTheme";
// Make sure these are correctly imported in your actual project
// import { Spacing, Radius } from "../theme";

const translations = {
  en: {
    appSub: "Saba Wolaitegna Songs Lyrics App",
    switchLang: "አማርኛ", // Button shows the *other* language
    join: "Join",
    joinSub: "Join Saba Wolaitegna Songs Lyrics App",
    fullName: "Full Name",
    email: "Email",
    password: "Password",
    singerName: "Singer Name",
    fillAll: "Please fill all fields",
    creatingAcc: "Creating Account...",
    btnCreate: "Create Account",
    haveAcc: "Already have an account?",
    signIn: "Sign In",
    namePlaceholder: "Your full name",
    emailPlaceholder: "your@email.com",
    passwordPlaceholder: "••••••••",
    singerPlaceholder: "e.g. Daniel Damtew",
  },
  am: {
    appSub: "የሳባ ወላይትኛ መዝሙር ግጥሞች መተግበሪያ",
    switchLang: "English",
    join: "ይመዝገቡ",
    joinSub: "የሳባ ወላይትኛ መዝሙር ግጥሞች መተግበሪያን ይቀላቀሉ",
    fullName: "ሙሉ ስም",
    email: "ኢሜይል",
    password: "የይለፍ ቃል",
    singerName: "የዘማሪ ስም",
    fillAll: "እባክዎ ሁሉንም መስኮች ይሙሉ",
    creatingAcc: "መለያ በመፍጠር ላይ...",
    btnCreate: "መለያ ፍጠር",
    haveAcc: "ቀደም ብሎ መለያ አለዎት?",
    signIn: "ግባ",
    namePlaceholder: "ሙሉ ስምዎን ያስገቡ",
    emailPlaceholder: "የእርስዎን ኢሜይል",
    passwordPlaceholder: "••••••••",
    singerPlaceholder: "ለምሳሌ፦ ዳንኤል ዳምጠው",
  },
};

function GlassField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  C,
  isDark,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  C: any;
  isDark: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "600",
          color: isDark ? C.text3 : C.text2,
          letterSpacing: 1.0,
          textTransform: "uppercase",
          marginBottom: 8,
          paddingLeft: 2,
        }}>
        {label}
      </Text>
      <View
        style={[
          gf.input,
          {
            borderColor: focused
              ? isDark
                ? C.skyBorder
                : C.skyBorder
              : isDark
                ? C.glassBorder
                : C.border,
          },
        ]}>
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: focused
                ? isDark
                  ? C.skyGlowSoft
                  : C.skyPale
                : isDark
                  ? C.glass
                  : C.surface,
              borderRadius: 14,
            },
          ]}
        />
        <View
          style={[
            gf.topEdge,
            {
              backgroundColor: focused
                ? isDark
                  ? "rgba(135,206,235,0.35)"
                  : "rgba(42,138,184,0.25)"
                : isDark
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(255,255,255,0.80)",
            },
          ]}
        />
        <TextInput
          style={[gf.textInput, { color: isDark ? C.text : C.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.text3}
          secureTextEntry={secureTextEntry && !revealed}
          keyboardType={keyboardType}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setRevealed((r) => !r)}
            style={gf.eyeBtn}
            activeOpacity={0.7}>
            <Feather
              name={revealed ? "eye-off" : "eye"}
              size={18}
              color={revealed ? C.sky : C.text3}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const gf = StyleSheet.create({
  input: {
    borderRadius: 14,
    borderWidth: 0.6,
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    overflow: "hidden",
  },
  topEdge: {
    position: "absolute",
    top: 0,
    left: 10,
    right: 10,
    height: 0.6,
    zIndex: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 0,
    letterSpacing: 0.3,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default function RegisterScreen({
  onGoLogin,
}: {
  onGoLogin: () => void;
}) {
  const { signUp } = useApp(); // Extracted signUp from useApp
  const { C, isDark } = useTheme();

  // Language State (defaults to English)
  const [lang, setLang] = useState<"en" | "am">("en");
  const dict = translations[lang];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [singerName, setSingerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      setError(dict.fillAll);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signUp(name, email, password, singerName || name);
    } catch (err: any) {
      setError(err.message || dict.fillAll);
    } finally {
      setLoading(false);
    }
  }

  // Toggle language function
  const toggleLanguage = () => {
    setLang((prev) => (prev === "en" ? "am" : "en"));
  };

  const TOP = Platform.OS === "ios" ? 52 : (StatusBar.currentHeight ?? 24) + 8;

  const heroGradient: [string, string] = isDark
    ? [C.bgDeep, C.bg]
    : [C.bgDeep, C.bg];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        {/* ── HERO — clean, no orbs ──────────────── */}
        <LinearGradient
          colors={heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[s.hero, { paddingTop: TOP + 24 }]}>
          <Text
            style={[
              s.brand,
              {
                color: C.sky,
                textShadowColor: isDark ? C.skyGlow : "transparent",
              },
            ]}>
            SABA
          </Text>
          <Text style={[s.brandSub, { color: C.text2 }]}>{dict.appSub}</Text>

          <TouchableOpacity
            onPress={toggleLanguage}
            style={[
              s.langPill,
              {
                borderColor: C.skyBorder,
                backgroundColor: isDark ? C.glass : C.surface,
              },
            ]}
            activeOpacity={0.8}>
            <Text style={[s.langPillText, { color: C.text2 }]}>
              {dict.switchLang}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── GLASS CARD ───────────────────────── */}
        <View
          style={[
            s.cardOuter,
            {
              borderColor: isDark ? C.glassBorder : C.border,
            },
          ]}>
          {isDark && (
            <BlurView
              intensity={45}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          )}
          <LinearGradient
            colors={
              isDark
                ? [C.glass, C.navyGlow, "rgba(2,20,35,0.28)"]
                : [C.surface, C.bg, C.bgDeep]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(255,255,255,0.25)", C.skyGlowSoft, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.cardTopEdge}
          />

          <View style={s.cardInner}>
            <Text style={[s.cardTitle, { color: C.text }]}>{dict.join}</Text>
            <Text style={[s.cardSub, { color: C.text3 }]}>{dict.joinSub}</Text>

            <GlassField
              label={dict.fullName}
              value={name}
              onChangeText={setName}
              placeholder={dict.namePlaceholder}
              C={C}
              isDark={isDark}
            />
            <GlassField
              label={dict.email}
              value={email}
              onChangeText={setEmail}
              placeholder={dict.emailPlaceholder}
              C={C}
              isDark={isDark}
              keyboardType="email-address"
            />
            <GlassField
              label={dict.password}
              value={password}
              onChangeText={setPassword}
              placeholder={dict.passwordPlaceholder}
              C={C}
              isDark={isDark}
              secureTextEntry
            />
            <GlassField
              label={dict.singerName}
              value={singerName}
              onChangeText={setSingerName}
              placeholder={dict.singerPlaceholder}
              C={C}
              isDark={isDark}
            />

            {error ? (
              <View style={s.errorWrap}>
                <Feather name="alert-circle" size={13} color={C.danger} />
                <Text style={[s.errorText, { color: C.danger }]}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={s.signInBtn}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}>
              <LinearGradient
                colors={
                  loading
                    ? ["rgba(251,176,64,0.4)", "rgba(212,146,14,0.4)"]
                    : [C.gold, C.goldDark ?? "#d4920e"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.signInBtnGrad}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0.00)"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 0.5 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                />
                <Text
                  style={[
                    s.signInBtnText,
                    { color: isDark ? C.bgDeep : "#fff" },
                  ]}>
                  {loading ? dict.creatingAcc : dict.btnCreate}
                </Text>
                {!loading && (
                  <Feather
                    name="arrow-right"
                    size={18}
                    color={isDark ? C.bgDeep : "#fff"}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={s.switchRow}>
              <Text style={[s.switchText, { color: C.text3 }]}>
                {dict.haveAcc}{" "}
              </Text>
              <TouchableOpacity onPress={onGoLogin} activeOpacity={0.7}>
                <Text style={[s.switchLink, { color: C.sky }]}>
                  {dict.signIn}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingBottom: 36,
    paddingHorizontal: 24,
    position: "relative",
    overflow: "hidden",
  },
  brand: {
    fontSize: 46,
    fontWeight: "800",
    letterSpacing: 8,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    marginBottom: 8,
  },
  brandSub: { fontSize: 13, letterSpacing: 0.5, marginBottom: 20 },
  langPill: {
    borderRadius: 20,
    borderWidth: 0.8,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  langPillText: { fontSize: 13, fontWeight: "500", letterSpacing: 0.3 },
  cardOuter: {
    marginHorizontal: 20,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 0.6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 16 },
    }),
  },
  cardTopEdge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 2,
  },
  cardInner: { padding: 28 },
  cardTitle: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  cardSub: { fontSize: 13, marginBottom: 24, letterSpacing: 0.2 },
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  errorText: { fontSize: 13, flex: 1 },
  signInBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#e8960a",
        shadowOpacity: 0.55,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 5 },
      },
      android: { elevation: 8 },
    }),
  },
  signInBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  signInBtnText: { fontSize: 16, fontWeight: "700", letterSpacing: 0.4 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  switchText: { fontSize: 14 },
  switchLink: { fontSize: 14, fontWeight: "600" },
});
