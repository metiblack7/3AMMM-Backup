import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar,
  ScrollView,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useApp } from "../../lib/AppContext";
import { useTheme } from "../../lib/useTheme";
import { Loader } from "../../components/UI";
import AdminSongsTab from "./AdminSongsTab";
import AdminSetlistsTab from "./AdminSetlistsTab";
import { Spacing } from "../../theme";

type AdminTab = "songs" | "setlists" | "members";

// ─────────────────────────────────────────────────────
// Module-level memory: survives this component
// unmounting/remounting (e.g. navigating away and back)
// within the same app session — not lost on tab switches.
// ─────────────────────────────────────────────────────
const dashboardMemory: { activeTab: AdminTab } = { activeTab: "songs" };

// ─────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────
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
        <Feather name={icon as any} size={15} color={C.sky} />
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
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 128,
  },
  iconDot: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  num: { fontSize: 18, fontWeight: "800" },
  label: { fontSize: 10.5, fontWeight: "600", marginTop: 1 },
});

export default function AdminDashboard() {
  const { profile, t, toggleLang, lang, signOut } = useApp();
  const { C, isDark } = useTheme();

  // Restore last active tab instead of always defaulting to "songs"
  const [activeTab, setActiveTab] = useState<AdminTab>(
    dashboardMemory.activeTab,
  );
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalWorshipers: 0,
    totalSingers: 0,
    totalSetlists: 0,
  });
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const hasLoadedMembers = useRef(false);

  function selectTab(tab: AdminTab) {
    dashboardMemory.activeTab = tab;
    setActiveTab(tab);
  }

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
    // Only fetch members the first time that tab is opened, not every switch
    if (activeTab === "members" && !hasLoadedMembers.current) {
      hasLoadedMembers.current = true;
      loadMembers();
    }
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    if (activeTab === "members") await loadMembers();
    setRefreshing(false);
  };

  const filteredMembers = members.filter((m) => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.singerName?.toLowerCase().includes(q)
    );
  });

  const langLabel = lang === "en" ? "አማ" : "EN";
  const TOP = Platform.OS === "ios" ? 56 : (StatusBar.currentHeight ?? 24) + 8;

  const TABS: { key: AdminTab; label: string; icon: string }[] = [
    { key: "songs", label: t.songs, icon: "music" },
    { key: "setlists", label: t.setlists, icon: "calendar" },
    { key: "members", label: t.members ?? "Members", icon: "users" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* ── HEADER ─────────────────────────────────────── */}
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

      {/* ── STATS ──────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingVertical: 12,
          gap: 10,
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

      {/* ── SEGMENTED TAB BAR ──────────────────────────── */}
      <View
        style={[
          s.segmentWrap,
          { backgroundColor: C.surface, borderColor: C.border },
        ]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                s.segmentItem,
                active && {
                  backgroundColor: C.sky,
                  shadowColor: C.sky,
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                },
              ]}
              onPress={() => selectTab(tab.key)}
              activeOpacity={0.8}>
              <Feather
                name={tab.icon as any}
                size={14}
                color={active ? C.bg : C.text3}
              />
              <Text
                style={[
                  s.segmentLabel,
                  { color: active ? C.bg : C.text3 },
                  active && { fontWeight: "700" },
                ]}
                numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── CONTENT ────────────────────────────────────
          IMPORTANT: all three tabs stay mounted at all
          times. We just hide the inactive ones with
          display:"none". This is what preserves scroll
          position, filters, and any in-progress edits
          when switching tabs — nothing gets torn down. */}
      <View style={{ flex: 1 }}>
        <View style={[{ flex: 1 }, activeTab !== "songs" && s.hiddenTab]}>
          <AdminSongsTab />
        </View>

        <View style={[{ flex: 1 }, activeTab !== "setlists" && s.hiddenTab]}>
          <AdminSetlistsTab />
        </View>

        <View style={[{ flex: 1 }, activeTab !== "members" && s.hiddenTab]}>
          {loadingMembers ? (
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
                      {filteredMembers.length}
                    </Text>
                  </View>
                </View>

                {/* Search */}
                <View
                  style={{ paddingHorizontal: Spacing.lg, marginBottom: 12 }}>
                  <View
                    style={[
                      s.searchWrap,
                      { backgroundColor: C.bg, borderColor: C.border },
                    ]}>
                    <Feather name="search" size={15} color={C.text3} />
                    <TextInput
                      style={[s.searchInput, { color: C.text }]}
                      placeholder="Search members..."
                      placeholderTextColor={C.text3}
                      value={memberQuery}
                      onChangeText={setMemberQuery}
                    />
                    {memberQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setMemberQuery("")}>
                        <Feather name="x" size={15} color={C.text3} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {filteredMembers.length === 0 ? (
                  <View style={s.emptyWrap}>
                    <Feather name="users" size={28} color={C.text3} />
                    <Text style={[s.emptyText, { color: C.text3 }]}>
                      No members found
                    </Text>
                  </View>
                ) : (
                  filteredMembers.map((m: any) => {
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
                  })
                )}
              </View>
            </ScrollView>
          )}
        </View>
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

  segmentWrap: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginBottom: 10,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentLabel: { fontSize: 12, fontWeight: "500" },

  // Keeps the tab mounted (preserving its internal state)
  // but visually and interactively removed from the screen.
  hiddenTab: {
    display: "none",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: { fontSize: 13, fontWeight: "500" },

  membersHdr: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    marginBottom: 12,
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
