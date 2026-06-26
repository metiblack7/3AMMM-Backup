import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useApp } from "../../lib/AppContext";
import { useTheme } from "../../lib/useTheme";
import { Loader } from "../../components/UI";
import AdminSongsTab from "./AdminSongsTab";
import AdminSetlistsTab from "./AdminSetlistsTab";
import { Spacing, Radius } from "../../theme";

type AdminTab = "songs" | "setlists" | "members";

// ── Compact horizontal stat card — matches reference: small, dark, sky icon dot ──
function StatCard({
  num,
  label,
  icon,
  C,
}: {
  num: number;
  label: string;
  icon: string;
  C: any;
}) {
  return (
    <View
      style={[sc.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[sc.iconDot, { backgroundColor: C.skyPale }]}>
        <Feather name={icon as any} size={14} color={C.sky} />
      </View>
      <View>
        <Text style={[sc.num, { color: C.text }]}>{num}</Text>
        <Text style={[sc.label, { color: C.text3 }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 118,
  },
  iconDot: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  num: { fontSize: 16, fontWeight: "700" },
  label: { fontSize: 10, fontWeight: "500", marginTop: 1 },
});

export default function AdminDashboard() {
  const { profile, t, toggleLang, lang, signOut } = useApp();
  const { C, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<AdminTab>("songs");
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalWorshipers: 0,
    totalSingers: 0,
    totalSetlists: 0,
  });
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function loadStats() {
    try {
      setStats(await api.users.getStats());
    } catch (err) {
      console.error("Stats error:", err);
    }
  }

  async function loadMembers() {
    setLoadingMembers(true);
    try {
      setMembers(await api.users.getAll());
    } catch (err) {
      console.error("Members error:", err);
    } finally {
      setLoadingMembers(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);
  useEffect(() => {
    if (activeTab === "members") loadMembers();
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const langLabel = lang === "en" ? "አማ" : "EN";
  const TOP = Platform.OS === "ios" ? 56 : (StatusBar.currentHeight ?? 24) + 8;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* ── HEADER — minimal ───────────────────────────── */}
      <View style={[s.headerTop, { paddingTop: TOP, backgroundColor: C.bg }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: C.text }]}>{t.appName}</Text>
          <Text style={[s.headerSub, { color: C.text2 }]}>
            {t.adminDash ?? "Admin Dashboard"}
          </Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity
            onPress={toggleLang}
            style={[
              s.langPill,
              { borderColor: C.sky, backgroundColor: C.skyPale },
            ]}
            activeOpacity={0.75}>
            <Text style={[s.langPillText, { color: C.sky }]}>{langLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={signOut}
            style={[s.avatar, { backgroundColor: C.sky }]}
            activeOpacity={0.8}>
            <Text style={[s.avatarText, { color: C.bg }]}>
              {(profile?.name ?? "A")
                .split(" ")
                .map((w: string) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── STATS — small horizontal cards, like reference ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingVertical: 10,
          gap: 8,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.sky}
          />
        }>
        <StatCard
          num={stats.totalSongs}
          label={t.totalSongs ?? "Songs"}
          icon="music"
          C={C}
        />
        <StatCard
          num={stats.totalWorshipers}
          label={t.totalWorshipers ?? "Worshipers"}
          icon="users"
          C={C}
        />
        <StatCard
          num={stats.totalSingers}
          label={t.totalSingers ?? "Singers"}
          icon="mic"
          C={C}
        />
        <StatCard
          num={stats.totalSetlists}
          label={t.totalSetlists ?? "Setlists"}
          icon="calendar"
          C={C}
        />
      </ScrollView>

      {/* ── TAB BAR — underline, minimal ──────────────── */}
      <View style={[s.tabBar, { borderBottomColor: C.border }]}>
        {(["songs", "setlists", "members"] as AdminTab[]).map((tab) => {
          const active = activeTab === tab;
          const icon =
            tab === "songs"
              ? "music"
              : tab === "setlists"
                ? "calendar"
                : "users";
          return (
            <TouchableOpacity
              key={tab}
              style={[s.tabItem, active && { borderBottomColor: C.sky }]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}>
              <Feather
                name={icon as any}
                size={14}
                color={active ? C.sky : C.text3}
              />
              <Text
                style={[
                  s.tabLabel,
                  { color: active ? C.sky : C.text3 },
                  active && { fontWeight: "700" },
                ]}>
                {tab === "songs"
                  ? t.songs
                  : tab === "setlists"
                    ? t.setlists
                    : (t.members ?? "Members")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── CONTENT ─────────────────────────────────────── */}
      <View style={{ flex: 1 }}>
        {activeTab === "songs" && <AdminSongsTab />}
        {activeTab === "setlists" && <AdminSetlistsTab />}
        {activeTab === "members" &&
          (loadingMembers ? (
            <Loader />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ paddingVertical: Spacing.lg }}>
                <View style={[s.membersHdr, { borderBottomColor: C.border }]}>
                  <Feather name="users" size={16} color={C.sky} />
                  <Text style={[s.membersHdrText, { color: C.text }]}>
                    {t.allMembers ?? "All Members"}
                  </Text>
                  <View style={[s.countBadge, { backgroundColor: C.skyPale }]}>
                    <Text style={[s.countBadgeText, { color: C.sky }]}>
                      {members.length}
                    </Text>
                  </View>
                </View>

                {members.map((m: any) => {
                  const isAdmin = m.role === "admin";
                  return (
                    <View
                      key={m._id}
                      style={[s.memberRow, { borderBottomColor: C.border }]}>
                      <View
                        style={[
                          s.memberAv,
                          {
                            backgroundColor: isAdmin ? C.sky : C.surface,
                            borderColor: C.border,
                          },
                        ]}>
                        <Text
                          style={[
                            s.memberAvText,
                            { color: isAdmin ? C.bg : C.text2 },
                          ]}>
                          {m.name
                            .split(" ")
                            .map((w: string) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.memberName, { color: C.text }]}>
                          {m.name}
                        </Text>
                        <Text style={[s.memberSub, { color: C.text2 }]}>
                          {m.singerName || m.email}
                        </Text>
                      </View>
                      <View
                        style={[
                          s.roleTag,
                          {
                            backgroundColor: isAdmin
                              ? C.skyPale
                              : "transparent",
                            borderColor: C.border,
                          },
                        ]}>
                        <Text
                          style={[
                            s.roleTagText,
                            { color: isAdmin ? C.sky : C.text3 },
                          ]}>
                          {isAdmin ? "ADMIN" : "USER"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  headerTop: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", letterSpacing: 0.2 },
  headerSub: { fontSize: 11, marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  langPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  langPillText: { fontSize: 10, fontWeight: "700" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 11, fontWeight: "700" },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginRight: 16,
  },
  tabLabel: { fontSize: 12, fontWeight: "500" },

  membersHdr: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
  },
  membersHdrText: { fontSize: 14, fontWeight: "700", flex: 1 },
  countBadge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  countBadgeText: { fontSize: 11, fontWeight: "700" },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberAv: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvText: { fontSize: 12, fontWeight: "700" },
  memberName: { fontSize: 13, fontWeight: "600" },
  memberSub: { fontSize: 11, marginTop: 1 },
  roleTag: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleTagText: { fontSize: 10, fontWeight: "700" },
});
