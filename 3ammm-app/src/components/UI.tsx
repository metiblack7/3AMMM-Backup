import React, { ReactNode } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import { Colors, Typography, Spacing, Radius, AppStyles } from "../theme";

// ── SCREEN HEADER ──────────────────────────────────────────────
export function Header({
  title,
  subtitle,
  rightContent,
}: {
  title: string;
  subtitle?: string;
  rightContent?: ReactNode;
}) {
  return (
    <View style={AppStyles.header}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <View style={AppStyles.headerInner}>
        <View style={{ flex: 1 }}>
          <Text style={AppStyles.headerTitle}>{title}</Text>
          {subtitle ? (
            <Text style={AppStyles.headerSub}>{subtitle}</Text>
          ) : null}
        </View>
        {rightContent}
      </View>
    </View>
  );
}

// ── AVATAR ─────────────────────────────────────────────────────
export function Avatar({
  name,
  size = 34,
  onPress,
  bgColor,
}: {
  name: string;
  size?: number;
  onPress?: () => void;
  bgColor?: string;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const bg = bgColor || Colors.gold;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        AppStyles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}
      activeOpacity={0.8}>
      <Text style={[AppStyles.avatarText, { fontSize: size * 0.35 }]}>
        {initials}
      </Text>
    </TouchableOpacity>
  );
}

// ── LANG TOGGLE ────────────────────────────────────────────────
export function LangToggle({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={AppStyles.langToggle}
      onPress={onPress}
      activeOpacity={0.8}>
      <Text style={AppStyles.langToggleText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── KEY CHIP ───────────────────────────────────────────────────
export function KeyChip({ keyName }: { keyName: string }) {
  return (
    <View style={AppStyles.keyChip}>
      <Text style={AppStyles.keyChipText}>{keyName}</Text>
    </View>
  );
}

// ── SECTION LABEL ──────────────────────────────────────────────
export function SectionLabel({ text }: { text: string }) {
  return <Text style={AppStyles.sectionLabel}>{text}</Text>;
}

// ── DIVIDER ────────────────────────────────────────────────────
export function Divider() {
  return <View style={AppStyles.divider} />;
}

// ── PRIMARY BUTTON ─────────────────────────────────────────────
export function PrimaryButton({
  label,
  onPress,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  style?: object;
}) {
  return (
    <TouchableOpacity
      style={[AppStyles.primaryBtn, style]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={loading}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={AppStyles.primaryBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── OUTLINE BUTTON ─────────────────────────────────────────────
export function OutlineButton({
  label,
  onPress,
  style,
  danger,
}: {
  label: string;
  onPress: () => void;
  style?: object;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[AppStyles.outlineBtn, danger && AppStyles.dangerBtn, style]}
      onPress={onPress}
      activeOpacity={0.85}>
      <Text
        style={[AppStyles.outlineBtnText, danger && AppStyles.dangerBtnText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── TEXT INPUT ─────────────────────────────────────────────────
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <View style={AppStyles.fieldWrap}>
      <View style={AppStyles.fieldLabelRow}>
        <Text style={AppStyles.fieldLabel}>{label}</Text>
        {hint ? <Text style={AppStyles.fieldHint}>{hint}</Text> : null}
      </View>
      <TextInput
        style={[AppStyles.input, multiline && AppStyles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.text3}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={multiline ? 5 : 1}
        autoCapitalize={secureTextEntry ? "none" : "sentences"}
        autoCorrect={!secureTextEntry}
      />
    </View>
  );
}

// ── ICON BUTTON ────────────────────────────────────────────────
export function IconButton({
  onPress,
  danger,
  children,
}: {
  onPress: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <TouchableOpacity
      style={[AppStyles.iconBtn, danger && AppStyles.iconBtnDanger]}
      onPress={onPress}
      activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
}

// ── STAT CARD ──────────────────────────────────────────────────
export function StatCard({
  num,
  label,
}: {
  num: number | string;
  label: string;
}) {
  return (
    <View style={AppStyles.statCard}>
      <Text style={AppStyles.statNum}>{num}</Text>
      <Text style={AppStyles.statLabel}>{label}</Text>
    </View>
  );
}

// ── EMPTY STATE ────────────────────────────────────────────────
export function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={AppStyles.emptyWrap}>
      <View style={AppStyles.emptyIcon}>{icon}</View>
      <Text style={AppStyles.emptyText}>{text}</Text>
    </View>
  );
}

// ── LOADER ─────────────────────────────────────────────────────
export function Loader() {
  return (
    <View style={AppStyles.loader}>
      <ActivityIndicator color={Colors.navy} size="large" />
    </View>
  );
}
