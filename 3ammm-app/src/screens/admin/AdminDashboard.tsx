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
import { Loader, EmptyState } from "../../components/UI";
import AdminSongsTab from "./AdminSongsTab";
import AdminSetlistsTab from "./AdminSetlistsTab";
import { Spacing } from "../../theme";

type AdminTab = "songs" | "setlists" | "members";

const dashboardMemory: { activeTab: AdminTab } = { activeTab: "songs" };

function StatCard({
  value,
  label,
  icon,
  C,
}: {
  value: number;
  label: string;
  icon: string;
  C: any;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
      <View style={[styles.statIcon, { backgroundColor: C.skyPale }]}> 
        <Feather name={icon as any} size={16} color={C.sky} />
      </View>
      <View>
        <Text style={[styles.statValue, { color: C.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: C.text3 }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function AdminDashboard() {
  const { profile, t, toggleLang, lang, signOut } = useApp();
  const { C, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<AdminTab>(dashboardMemory.activeTab);
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

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === "members" && !hasLoadedMembers.current) {
      hasLoadedMembers.current = true;
      loadMembers();
    }
  }, [activeTab]);

  async function loadStats() {
    try {
      setStats(await api.users.getStats());
    } catch (error) {
      console.error("Admin stats failed", error);
    }
  }

  async function loadMembers() {
    setLoadingMembers(true);
    try {
      setMembers(await api.users.getAll());
    } catch (error) {
      console.error("Member load failed", error);
    } finally {
      setLoadingMembers(false);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    if (activeTab === "members") {
      await loadMembers();
    }
    setRefreshing(false);
  };

  const filteredMembers = members.filter((member) => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      member.name?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.singerName?.toLowerCase().includes(query)
    );
  });

  const langLabel = lang === "en" ? "አማ" : "EN";
  const topInset = Platform.OS === "ios" ? 56 : (StatusBar.currentHeight ?? 24) + 8;

  const tabs: { key: AdminTab; label: string; icon: string }[] = [
    { key: "songs", label: t.songs, icon: "music" },
    { key: "setlists", label: t.setlists, icon: "calendar" },
    { key: "members", label: t.members ?? "Members", icon: "users" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 22 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.sky} />}
      >
        <View style={[styles.header, { paddingTop: topInset, backgroundColor: C.bg }]}> 
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: C.text }]}>{t.appName}</Text>
            <Text style={[styles.subtitle, { color: C.text2 }]}>{t.adminDash ?? "Admin Dashboard"}</Text>
          </View>

          <View style={styles.headerControls}>
            <TouchableOpacity onPress={toggleLang} style={[styles.langChip, { borderColor: C.sky }]} activeOpacity={0.85}>
              <Text style={[styles.langChipText, { color: C.sky }]}>{langLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={[styles.iconChip, { borderColor: C.border }]} activeOpacity={0.85}>
              <Feather name="refresh-cw" size={18} color={C.sky} />
            </TouchableOpacity>
            <TouchableOpacity onPress={signOut} style={[styles.avatar, { backgroundColor: C.sky }]} activeOpacity={0.85}>
              <Text style={[styles.avatarText, { color: C.bg }]}>
                {(profile?.name ?? "A").split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.statsContainer, { backgroundColor: C.surface, borderColor: C.border }]}> 
          <StatCard value={stats.totalSongs} label={t.totalSongs ?? "Songs"} icon="music" C={C} />
          <StatCard value={stats.totalWorshipers} label={t.totalWorshipers ?? "Worshipers"} icon="users" C={C} />
          <StatCard value={stats.totalSingers} label={t.totalSingers ?? "Singers"} icon="mic" C={C} />
          <StatCard value={stats.totalSetlists} label={t.totalSetlists ?? "Setlists"} icon="calendar" C={C} />
        </View>

        <View style={[styles.segmentControl, { backgroundColor: C.surface, borderColor: C.border }]}> 
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  dashboardMemory.activeTab = tab.key;
                  setActiveTab(tab.key);
                }}
                activeOpacity={0.85}
                style={[styles.tabButton, active && { backgroundColor: C.sky, shadowColor: C.sky, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 7, elevation: 3 }]}
              >
                <Feather name={tab.icon as any} size={14} color={active ? C.bg : C.text3} />
                <Text style={[styles.tabText, active ? { color: C.bg, fontWeight: "700" } : { color: C.text3 }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.tabPanel}> 
          <View style={activeTab !== "songs" ? styles.hidden : undefined}><AdminSongsTab /></View>
          <View style={activeTab !== "setlists" ? styles.hidden : undefined}><AdminSetlistsTab /></View>
          <View style={activeTab !== "members" ? styles.hidden : undefined}> 
            <View style={styles.membersSection}>
              <View style={[styles.membersHeader, { backgroundColor: C.surface, borderColor: C.border }]}> 
                <View>
                  <Text style={[styles.membersTitle, { color: C.text }]}>{t.members ?? "Members"}</Text>
                  <Text style={[styles.membersSubtitle, { color: C.text2 }]}>{t.manageMembers ?? "Review and manage accounts."}</Text>
                </View>
                <View style={[styles.membersBadge, { backgroundColor: C.skyPale }]}> 
                  <Text style={[styles.membersBadgeText, { color: C.sky }]}>{filteredMembers.length}</Text>
                </View>
              </View>

              <View style={[styles.searchRow, { backgroundColor: C.bg, borderColor: C.border }]}> 
                <Feather name="search" size={16} color={C.text3} />
                <TextInput
                  style={[styles.searchInput, { color: C.text }]}
                  placeholder={t.searchMembers ?? "Search members..."}
                  placeholderTextColor={C.text3}
                  value={memberQuery}
                  onChangeText={setMemberQuery}
                />
                {memberQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setMemberQuery("")}>
                    <Feather name="x" size={16} color={C.text3} />
                  </TouchableOpacity>
                )}
              </View>

              {loadingMembers ? (
                <Loader />
              ) : filteredMembers.length === 0 ? (
                <View style={styles.emptyState}> 
                  <Feather name="users" size={28} color={C.text3} />
                  <Text style={[styles.emptyText, { color: C.text3 }]}>{memberQuery ? "No members match." : "No members yet."}</Text>
                </View>
              ) : (
                <View style={styles.memberList}> 
                  {filteredMembers.map((member) => {
                    const isAdmin = member.role === "admin";
                    return (
                      <View key={member._id} style={[styles.memberItem, { backgroundColor: C.surface, borderColor: C.border }]}> 
                        <View style={[styles.memberAvatar, { backgroundColor: isAdmin ? C.sky : C.bg, borderColor: C.border }]}> 
                          <Text style={[styles.memberAvatarText, { color: isAdmin ? C.bg : C.text2 }]}>{member.name.split(" ").map((piece: string) => piece[0]).join("").slice(0, 2).toUpperCase()}</Text>
                        </View>
                        <View style={styles.memberDetails}> 
                          <Text style={[styles.memberName, { color: C.text }]}>{member.name}</Text>
                          <Text style={[styles.memberEmail, { color: C.text2 }]} numberOfLines={1}>{member.email}</Text>
                        </View>
                        <View style={[styles.roleTag, { backgroundColor: isAdmin ? C.skyPale : C.surface, borderColor: C.border }]}> 
                          <Text style={[styles.roleText, { color: isAdmin ? C.sky : C.text3 }]}>{isAdmin ? "ADMIN" : "USER"}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 4, lineHeight: 18 },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  langChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  langChipText: { fontSize: 11, fontWeight: "700" },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "800" },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginTop: 18,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 132,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  segmentControl: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginTop: 18,
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tabText: { fontSize: 12, fontWeight: "600" },
  tabPanel: { flex: 1, minHeight: 520 },
  hidden: { display: "none" },
  membersSection: { marginTop: 18 },
  membersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: Spacing.lg,
  },
  membersTitle: { fontSize: 16, fontWeight: "700" },
  membersSubtitle: { fontSize: 12, marginTop: 4 },
  membersBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  membersBadgeText: { fontSize: 12, fontWeight: "700" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: Spacing.lg,
    marginTop: 14,
  },
  searchInput: { flex: 1, fontSize: 14 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
    marginHorizontal: Spacing.lg,
  },
  emptyText: { fontSize: 13, fontWeight: "600" },
  memberList: {
    marginTop: 14,
    marginHorizontal: Spacing.lg,
    gap: 10,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: { fontSize: 12, fontWeight: "800" },
  memberDetails: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 14, fontWeight: "700" },
  memberEmail: { fontSize: 12, marginTop: 2 },
  roleTag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleText: { fontSize: 11, fontWeight: "700" },
});
