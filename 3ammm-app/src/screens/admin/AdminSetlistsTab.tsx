import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useApp } from "../../lib/AppContext";
import { useTheme } from "../../lib/useTheme";
import { Field, Loader, EmptyState } from "../../components/UI";
import { Spacing, Radius } from "../../theme";

type Song = {
  _id: string;
  title: string;
  key: string;
  singerName: string;
  category: string;
  tempo: string;
  lyrics: any[];
};

type Setlist = {
  _id: string;
  title: string;
  date: string;
  songIds: Song[];
};

export default function AdminSetlistsTab() {
  const { t } = useApp();
  const { C } = useTheme();

  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSetlist, setEditSetlist] = useState<Setlist | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [songsData, setlistsData] = await Promise.all([api.songs.getAll(), api.setlists.getAll()]);
      setSongs(songsData);
      setSetlists(setlistsData);
    } catch (error) {
      console.error("Setlists load failed", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  function openNewSetlist() {
    setEditSetlist(null);
    setFormTitle("");
    setFormDate("");
    setPickedIds([]);
    setModalOpen(true);
  }

  function openEditSetlist(setlist: Setlist) {
    setEditSetlist(setlist);
    setFormTitle(setlist.title);
    setFormDate(setlist.date);
    setPickedIds(setlist.songIds.map((song) => song._id));
    setModalOpen(true);
  }

  function toggleSongSelection(id: string) {
    setPickedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function handleSave() {
    if (!formTitle.trim() || !formDate.trim()) {
      Alert.alert("Missing details", "Please provide both a theme and date.");
      return;
    }
    setSaving(true);
    try {
      const payload = { title: formTitle.trim(), date: formDate.trim(), songIds: pickedIds };
      if (editSetlist && editSetlist._id) {
        await api.setlists.update(editSetlist._id, payload);
      } else {
        await api.setlists.create(payload);
      }
      setModalOpen(false);
      load();
    } catch (error: any) {
      Alert.alert("Save error", error?.message || "Could not save the setlist.");
    } finally {
      setSaving(false);
    }
  }

  const handleDelete = (setlist: Setlist) => {
    Alert.alert("Delete setlist", `Delete "${setlist.title}"?`, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await api.setlists.delete(setlist._id);
            load();
          } catch (error: any) {
            Alert.alert("Delete failed", error?.message || "Could not delete the setlist.");
          }
        },
      },
    ]);
  };

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.sky} />}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View style={styles.actionArea}>
          <TouchableOpacity style={[styles.newButton, { backgroundColor: C.sky }]} onPress={openNewSetlist} activeOpacity={0.85}>
            <Feather name="plus" size={18} color={C.bg} />
            <Text style={[styles.newButtonText, { color: C.bg }]}>{t.newSetlist}</Text>
          </TouchableOpacity>
        </View>

        {setlists.length === 0 ? (
          <EmptyState icon={<Feather name="calendar" size={22} color={C.sky} />} text={t.noSetlists ?? "No setlists have been created yet."} />
        ) : (
          <View style={styles.listWrapper}>
            {setlists.map((setlist) => (
              <View key={setlist._id} style={[styles.setlistCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
                <View style={[styles.setlistHeader, { borderBottomColor: C.border }]}> 
                  <View style={[styles.setlistDate, { backgroundColor: C.skyPale }]}> 
                    <Text style={[styles.setlistDateText, { color: C.sky }]}>{setlist.date}</Text>
                  </View>
                  <Text style={[styles.setlistTitle, { color: C.text }]} numberOfLines={1}>{setlist.title}</Text>
                  <Text style={[styles.setlistCount, { color: C.text2 }]}>{setlist.songIds.length} {t.songs2}</Text>
                </View>

                {setlist.songIds.map((song, index) => (
                  <View key={song._id || index} style={[styles.songRow, index < setlist.songIds.length - 1 && { borderBottomColor: C.border, borderBottomWidth: 1 }]}> 
                    <Text style={[styles.songIndex, { color: C.sky }]}>{index + 1}</Text>
                    <Text style={[styles.songTitle, { color: C.text }]} numberOfLines={1}>{song.title}</Text>
                    <Text style={[styles.songSinger, { color: C.text2 }]} numberOfLines={1}>{song.singerName}</Text>
                  </View>
                ))}

                <View style={[styles.footerRow, { borderTopColor: C.border }]}> 
                  <TouchableOpacity style={styles.footerButton} onPress={() => openEditSetlist(setlist)} activeOpacity={0.75}>
                    <Feather name="edit-2" size={13} color={C.sky} />
                    <Text style={[styles.footerText, { color: C.sky }]}>{t.editSetlist}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.footerButton} onPress={() => handleDelete(setlist)} activeOpacity={0.75}>
                    <Feather name="trash-2" size={13} color={C.danger} />
                    <Text style={[styles.footerText, { color: C.danger }]}>{t.deleteSetlist}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalHeader, { borderBottomColor: C.border, backgroundColor: C.surface }]}> 
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Text style={[styles.modalCancel, { color: C.text2 }]}>{t.cancel}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: C.text }]}>{editSetlist ? t.editSetlist : t.newSetlist}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, { color: C.sky, opacity: saving ? 0.5 : 1 }]}>{saving ? "Saving..." : t.save}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: Spacing.lg }} keyboardShouldPersistTaps="handled">
            <Field
              label={t.setlistTheme}
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder={t.setlistThemePlaceholder ?? "Theme or occasion"}
            />
            <Field
              label={t.setlistDate}
              value={formDate}
              onChangeText={setFormDate}
              placeholder={t.setlistDatePlaceholder ?? "Date e.g. Sat, May 24"}
            />
            <Text style={[styles.sectionLabel, { color: C.text2 }]}>{t.pickSongs ?? "Select songs"}</Text>
            {songs.map((song) => {
              const selected = pickedIds.includes(song._id);
              return (
                <TouchableOpacity
                  key={song._id}
                  style={[styles.songSelect, { borderColor: selected ? C.sky : C.border, backgroundColor: selected ? C.skyPale : C.bg }]}
                  onPress={() => toggleSongSelection(song._id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, { borderColor: selected ? C.sky : C.border, backgroundColor: selected ? C.sky : "transparent" }]}> 
                    {selected && <Feather name="check" size={12} color={C.bg} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.songSelectTitle, { color: C.text }]} numberOfLines={1}>{song.title}</Text>
                    <Text style={[styles.songSelectSinger, { color: C.text2 }]} numberOfLines={1}>{song.singerName}</Text>
                  </View>
                  <View style={[styles.keyChip, { backgroundColor: C.skyPale }]}> 
                    <Text style={[styles.keyChipText, { color: C.sky }]}>{song.key}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  actionArea: { padding: Spacing.lg, paddingBottom: 4 },
  newButton: {
    borderRadius: Radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  newButtonText: { fontSize: 14, fontWeight: "700" },
  listWrapper: { gap: 12, paddingHorizontal: Spacing.lg },
  setlistCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  setlistHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
  },
  setlistDate: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  setlistDateText: { fontSize: 11, fontWeight: "700" },
  setlistTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  setlistCount: { fontSize: 11, color: "#888" },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  songIndex: { width: 18, fontSize: 12, fontWeight: "700" },
  songTitle: { flex: 1, fontSize: 14, fontWeight: "600" },
  songSinger: { fontSize: 12 },
  footerRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 11,
    borderWidth: 1,
  },
  footerText: { fontSize: 12, fontWeight: "700" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === "ios" ? 54 : 14,
  },
  modalCancel: { fontSize: 15 },
  modalTitle: { fontSize: 15, fontWeight: "700" },
  modalSave: { fontSize: 15, fontWeight: "700" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  songSelect: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: 13,
    marginBottom: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  songSelectTitle: { fontSize: 14, fontWeight: "600" },
  songSelectSinger: { fontSize: 12, color: "#777" },
  keyChip: {
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  keyChipText: { fontSize: 11, fontWeight: "700" },
});
