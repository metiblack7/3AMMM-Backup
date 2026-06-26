import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../lib/AppContext";
import { DarkColors, LightColors } from "../theme";

// ─────────────────────────────────────────────────────
// Glass Input Field
// ─────────────────────────────────────────────────────
function GlassField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  colors,
}: {
  label: string;
  icon: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  colors: typeof DarkColors;
}) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isDark = colors === DarkColors;

  return (
    <View style={f.wrap}>
      <Text style={[f.label, { color: colors.text3 }]}>{label}</Text>
      <View
        style={[
          f.inputWrap,
          {
            backgroundColor: isDark
              ? "rgba(2,22,36,0.90)"
              : "rgba(255,255,255,0.95)",
            borderColor: focused ? colors.sky : colors.border,
          },
          focused && {
            shadowColor: colors.sky,
            shadowOpacity: 0.2,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
            elevation: 4,
          },
        ]}>
        {focused && (
          <View style={[f.focusLine, { backgroundColor: colors.sky }]} />
        )}
        <View style={f.iconWrap}>
          <Feather
            name={icon as any}
            size={17}
            color={focused ? colors.sky : colors.text3}
          />
        </View>
        <TextInput
          style={[f.input, { color: colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text3}
          secureTextEntry={secureTextEntry && !revealed}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setRevealed((r) => !r)}
            style={f.eyeBtn}
            activeOpacity={0.7}>
            <Feather
              name={revealed ? "eye-off" : "eye"}
              size={17}
              color={revealed ? colors.sky : colors.text3}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const f = StyleSheet.create({
  wrap: { marginBottom: 18 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    paddingLeft: 2,
  },
  inputWrap: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    overflow: "hidden",
    position: "relative",
  },
  focusLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    zIndex: 2,
  },
  iconWrap: {
    width: 50,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    letterSpacing: 0.2,
    paddingRight: 14,
  },
  eyeBtn: {
    width: 48,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─────────────────────────────────────────────────────
// Login Screen
// ─────────────────────────────────────────────────────
export default function LoginScreen({
  onGoRegister,
}: {
  onGoRegister: () => void;
}) {
  const { signIn, t, toggleLang, darkMode } = useApp();
  const insets = useSafeAreaInsets();
  const C = darkMode ? DarkColors : LightColors;
  const isDark = darkMode;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError(t.fillAll);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(err.message || t.invalidCreds);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── FULL SCREEN BACKGROUND — clean, no orbs ──── */}
      <LinearGradient
        colors={
          isDark
            ? ["#000c14", "#010f18", "#021624"]
            : ["#e8f5fc", "#f4fafd", "#eaf6ff"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            s.scrollContent,
            {
              paddingTop: insets.top + 16,
              paddingBottom: Math.max(insets.bottom + 24, 40),
            },
          ]}>
          {/* ── LANG TOGGLE ──────────────────────────── */}
          <View style={s.topRow}>
            <TouchableOpacity
              onPress={toggleLang}
              style={[
                s.langPill,
                {
                  borderColor: C.skyBorder,
                  backgroundColor: isDark
                    ? "rgba(135,206,235,0.08)"
                    : "rgba(135,206,235,0.14)",
                },
              ]}
              activeOpacity={0.8}>
              <Feather name="globe" size={13} color={C.sky} />
              <Text style={[s.langPillText, { color: C.sky }]}>
                {t.switchLang}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── HERO ─────────────────────────────────── */}
          <View style={s.hero}>
            {/* Icon circle */}
            <View
              style={[
                s.iconCircle,
                {
                  borderColor: C.skyBorder,
                  backgroundColor: isDark
                    ? "rgba(135,206,235,0.10)"
                    : "rgba(135,206,235,0.18)",
                },
              ]}>
              <Feather name="music" size={30} color={C.sky} />
            </View>

            {/* Wordmark */}
            <Text
              style={[
                s.brand,
                {
                  color: C.sky,
                  textShadowColor: isDark
                    ? "rgba(135,206,235,0.40)"
                    : "rgba(4,57,84,0.12)",
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 18,
                },
              ]}>
              SABA
            </Text>

            {/* Tagline */}
            <Text style={[s.tagline, { color: C.text2 }]}>
              Wolaitegna Songs Lyrics App
            </Text>

            {/* Divider */}
            <LinearGradient
              colors={[
                "transparent",
                isDark ? "rgba(135,206,235,0.40)" : "rgba(4,57,84,0.18)",
                "transparent",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.heroDivider}
            />
          </View>

          {/* ── LOGIN CARD ───────────────────────────── */}
          <View
            style={[
              s.card,
              {
                backgroundColor: isDark
                  ? "rgba(2,25,40,0.75)"
                  : "rgba(255,255,255,0.92)",
                borderColor: isDark
                  ? "rgba(135,206,235,0.12)"
                  : "rgba(4,57,84,0.10)",
              },
            ]}>
            {/* Card inner top sheen */}
            <LinearGradient
              colors={[
                isDark ? "rgba(135,206,235,0.08)" : "rgba(255,255,255,1.00)",
                "rgba(255,255,255,0.00)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.cardSheen}
            />

            <Text style={[s.cardTitle, { color: C.text }]}>{t.signIn}</Text>
            <Text style={[s.cardSub, { color: C.text3 }]}>
              Welcome back to your worship space
            </Text>

            <GlassField
              label={t.email}
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              colors={C}
            />
            <GlassField
              label={t.password}
              icon="lock"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              colors={C}
            />

            {/* Error */}
            {error ? (
              <View
                style={[
                  s.errorWrap,
                  {
                    backgroundColor: C.dangerBg,
                    borderColor: C.danger,
                  },
                ]}>
                <Feather name="alert-circle" size={14} color={C.danger} />
                <Text style={[s.errorText, { color: C.danger }]}>{error}</Text>
              </View>
            ) : null}

            {/* Sign in button */}
            <TouchableOpacity
              style={[s.btnWrap, { opacity: loading ? 0.78 : 1 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}>
              <LinearGradient
                colors={
                  loading
                    ? [C.goldDark, C.goldDark]
                    : ["#fcc55a", "#fbb040", "#d4920e"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.btn}>
                <View style={s.btnSheen} />
                <Text style={s.btnText}>
                  {loading ? t.signingIn : t.btnSignIn}
                </Text>
                {!loading && (
                  <Feather name="arrow-right" size={18} color="#010f18" />
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Switch to register */}
            <View style={s.switchRow}>
              <Text style={[s.switchText, { color: C.text3 }]}>{t.noAcc} </Text>
              <TouchableOpacity onPress={onGoRegister} activeOpacity={0.7}>
                <Text style={[s.switchLink, { color: C.sky }]}>
                  {t.createAcc}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── FOOTER ───────────────────────────────── */}
          <View style={s.footer}>
            <View style={[s.footerLine, { backgroundColor: C.border }]} />
            <Text style={[s.footerText, { color: C.text3 }]}>
              Developed by 3AMMM Media and Communication Dep't
            </Text>
            <View style={[s.footerLine, { backgroundColor: C.border }]} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },

  // ── Top row ─────────────────────────────────────────
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // ── Hero ────────────────────────────────────────────
  hero: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 28,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  brand: {
    fontSize: 46,
    fontWeight: "800",
    letterSpacing: 10,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 20,
  },
  heroDivider: {
    width: 80,
    height: 1.5,
    borderRadius: 1,
  },

  // ── Card ────────────────────────────────────────────
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    overflow: "hidden",
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 10 },
    }),
  },
  cardSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 2,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 24,
  },

  // ── Error ───────────────────────────────────────────
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },

  // ── Button ──────────────────────────────────────────
  btnWrap: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#fbb040",
        shadowOpacity: 0.5,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 8 },
    }),
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 16,
    position: "relative",
  },
  btnSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  btnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#010f18",
    letterSpacing: 0.6,
  },

  // ── Switch ──────────────────────────────────────────
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  switchText: {
    fontSize: 14,
    fontWeight: "500",
  },
  switchLink: {
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Footer ──────────────────────────────────────────
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 32,
    marginBottom: 8,
  },
  footerLine: {
    flex: 1,
    height: 1,
  },
  footerText: {
    fontSize: 11,
    flexShrink: 1,
    textAlign: "center",
    letterSpacing: 0.3,
  },
});
