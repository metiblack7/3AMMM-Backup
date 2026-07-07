import React, { useState, useRef, useEffect } from "react";
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
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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
  onFocusScroll,
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
  onFocusScroll?: () => void;
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
          autoCorrect={false}
          returnKeyType="done"
          blurOnSubmit={false}
          onFocus={() => {
            setFocused(true);
            onFocusScroll?.();
          }}
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
  const { signIn, signInWithGoogle, loginAsGuest, t, toggleLang, darkMode } =
    useApp();
  const insets = useSafeAreaInsets();
  const C = darkMode ? DarkColors : LightColors;
  const isDark = darkMode;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  // ── Unified loading state ─────────────────────────────────────
  // Prevents two auth actions running at once and ensures each
  // button only shows its own spinner / disabled state.
const [authLoading, setAuthLoading] = useState<
  "email" | "google" | "guest" | null
>(null);
  const isEmailLoading = authLoading === "email";
  const isGoogleLoading = authLoading === "google";
  const isGuestLoading = authLoading === "guest";
  const isAnyLoading = authLoading !== null;

  const scrollRef = useRef<ScrollView>(null);

  // ── Web autofill style fix ────────────────────────────────────
  // Browsers force a yellow background on autofilled inputs; this
  // overrides it to match our dark/light theme. The style tag is
  // scoped by id and cleaned up on unmount to avoid leaks.
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const styleId = "login-autofill-fix";
    const existing = document.getElementById(styleId);
    if (existing) existing.remove(); // remove stale tag on theme change

    const bg = isDark ? "rgb(2,22,36)" : "rgb(255,255,255)";
    const text = isDark ? "rgb(236,244,250)" : "rgb(10,30,46)";

    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus {
        -webkit-text-fill-color: ${text} !important;
        -webkit-box-shadow: 0 0 0px 1000px ${bg} inset !important;
        box-shadow: 0 0 0px 1000px ${bg} inset !important;
        transition: background-color 9999s ease-in-out 0s;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, [isDark]);

  function scrollToInputs() {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }

  // ── Handlers ──────────────────────────────────────────────────
  async function handleEmailLogin() {
    if (isAnyLoading) return;
    if (!email || !password) {
      setError(t.fillAll);
      return;
    }
    setAuthLoading("email");
    setError("");
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      const message = err.message || t.invalidCreds;
      if (message.includes("Database connection failed")) {
        setError(
          "Server cannot reach the database. Check Vercel env vars (MONGODB_URI) and redeploy.",
        );
      } else {
        setError(message);
      }
    } finally {
      setAuthLoading(null);
    }
  }

  async function handleGoogleSignIn() {
    if (isAnyLoading) return;
    setAuthLoading("google");
    setError("");
    try {
      await signInWithGoogle();
      // signInWithGoogle resolves on cancel too (no-op) so no need
      // to special-case it here — errors are real failures only.
    } catch (err: any) {
      const message: string = err?.message || "Google sign-in failed";
      const code: string = err?.code || "";

      // User closed the sheet on purpose — not an error
      const wasCancelled =
        /cancel/i.test(message) ||
        /dismiss/i.test(message) ||
        /cancel/i.test(code);

      if (!wasCancelled) {
        if (message.includes("redirect_uri")) {
          setError(
            "Google OAuth not configured for this environment. Use email login instead.",
          );
        } else if (message.includes("invalid_client")) {
          setError("Invalid Google Client ID. Please check configuration.");
        } else {
          setError(message);
        }
      }
    } finally {
      setAuthLoading(null);
    }
  }

  async function handleContinueGuest() {
    if (isAnyLoading) return;
    setAuthLoading("guest");
    setError("");
    try {
      await loginAsGuest();
    } catch (err: any) {
      setError(err.message || "Guest login failed");
    } finally {
      setAuthLoading(null);
    }
  }

  function handleToggleEmailLogin() {
    if (isAnyLoading) return;
    setError("");
    setShowEmailLogin((v) => !v);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Fix: respect theme in status bar */}
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 10 : 0}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            s.scrollContent,
            {
              paddingTop: insets.top + 16,
              paddingBottom: Math.max(insets.bottom + 60, 100),
            },
          ]}>
          {/* ── LANG TOGGLE ──────────────────────────── */}
          <View style={s.topRow}>
            <TouchableOpacity
              onPress={toggleLang}
              disabled={isAnyLoading}
              style={[
                s.langPill,
                {
                  borderColor: C.skyBorder,
                  backgroundColor: isDark
                    ? "rgba(135,206,235,0.08)"
                    : "rgba(135,206,235,0.14)",
                  opacity: isAnyLoading ? 0.5 : 1,
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
            <Image
              source={require("../../assets/favicon.png")}
              style={s.logoImage}
              resizeMode="contain"
            />
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
              Access your worship space
            </Text>

            {/* ── GOOGLE SIGN-IN ────────────────────────── */}
            <TouchableOpacity
              style={[
                s.socialBtnWrap,
                {
                  borderColor: C.border,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(255,255,255,0.5)",
                  opacity: isAnyLoading ? 0.6 : 1,
                },
              ]}
              onPress={handleGoogleSignIn}
              disabled={isAnyLoading}
              activeOpacity={0.85}>
              <MaterialCommunityIcons name="google" size={18} color={C.sky} />
              <Text style={[s.socialBtnText, { color: C.text }]}>
                {isGoogleLoading ? "Signing in..." : "Continue with Google"}
              </Text>
            </TouchableOpacity>

            {/* ── GUEST LOGIN ───────────────────────────── */}
            <TouchableOpacity
              style={[
                s.socialBtnWrap,
                {
                  borderColor: C.border,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(255,255,255,0.5)",
                  opacity: isAnyLoading ? 0.6 : 1,
                },
              ]}
              onPress={handleContinueGuest}
              disabled={isAnyLoading}
              activeOpacity={0.85}>
              <Feather name="user" size={18} color={C.text2} />
              <Text style={[s.socialBtnText, { color: C.text }]}>
                {isGuestLoading ? "Please wait..." : "Continue without login"}
              </Text>
            </TouchableOpacity>

            {/* ── DIVIDER ──────────────────────────────── */}
            <View style={s.dividerWrap}>
              <View style={[s.dividerLine, { backgroundColor: C.border }]} />
              <Text style={[s.dividerText, { color: C.text3 }]}>OR</Text>
              <View style={[s.dividerLine, { backgroundColor: C.border }]} />
            </View>

            {/* ── ERROR ────────────────────────────────── */}
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

            {/* ── TOGGLE EMAIL LOGIN ────────────────────── */}
            <TouchableOpacity
              style={[s.toggleLoginBtn, { opacity: isAnyLoading ? 0.5 : 1 }]}
              onPress={handleToggleEmailLogin}
              disabled={isAnyLoading}
              activeOpacity={0.7}>
              <Text style={[s.toggleLoginText, { color: C.sky }]}>
                {showEmailLogin ? "Hide Email Login" : "Use Email & Password"}
              </Text>
              <Feather
                name={showEmailLogin ? "chevron-up" : "chevron-down"}
                size={16}
                color={C.sky}
              />
            </TouchableOpacity>

            {/* ── EMAIL / PASSWORD FIELDS ───────────────── */}
            {showEmailLogin && (
              <>
                <GlassField
                  label={t.email}
                  icon="mail"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  keyboardType="email-address"
                  colors={C}
                  onFocusScroll={scrollToInputs}
                />

                <GlassField
                  label={t.password}
                  icon="lock"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  colors={C}
                  onFocusScroll={scrollToInputs}
                />

                <TouchableOpacity
                  style={[s.btnWrap, { opacity: isAnyLoading ? 0.78 : 1 }]}
                  onPress={handleEmailLogin}
                  disabled={isAnyLoading}
                  activeOpacity={0.88}>
                  <LinearGradient
                    colors={
                      isEmailLoading
                        ? [C.goldDark, C.goldDark]
                        : ["#fcc55a", "#fbb040", "#d4920e"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.btn}>
                    <View style={s.btnSheen} />
                    <Text style={s.btnText}>
                      {isEmailLoading ? t.signingIn : t.btnSignIn}
                    </Text>
                    {!isEmailLoading && (
                      <Feather name="arrow-right" size={18} color="#010f18" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

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
  hero: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 28,
  },
  logoImage: {
    width: 110,
    height: 110,
    marginBottom: 18,
  },
  heroDivider: {
    width: 80,
    height: 1.5,
    borderRadius: 1,
  },
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
  socialBtnWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  dividerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  toggleLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginBottom: 12,
  },
  toggleLoginText: {
    fontSize: 13,
    fontWeight: "600",
  },
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
