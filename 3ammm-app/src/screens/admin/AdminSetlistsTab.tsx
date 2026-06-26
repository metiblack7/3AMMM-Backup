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

interface Song {
  _id: string;
  title: string;
  key: string;
  singerName: string;
  category: string;
  tempo: string;
  lyrics: any[];
}
interface Setlist {
  _id: string;
  title: string;
  date: string;
  songIds: Song[];
}

export default function AdminSetlistsTab() {
  const { t } = useApp();
  const { C } = useTheme();

  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSetlist, setEditSetlist] = useState<Setlist | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [songsData, setlistsData] = await Promise.all([
        api.songs.getAll(),
        api.setlists.getAll(),
      ]);
      setSongs(songsData);
      setSetlists(setlistsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);
  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  function openNew() {
    setEditSetlist(null);
    setFormTitle("");
    setFormDate("");
    setPickedIds([]);
    setModalOpen(true);
  }
  function openEdit(sl: Setlist) {
    setEditSetlist(sl);
    setFormTitle(sl.title);
    setFormDate(sl.date);
    setPickedIds(sl.songIds.map((s) => s._id));
    setModalOpen(true);
  }
  function togglePick(id: string) {
    setPickedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    if (!formTitle || !formDate) {
      Alert.alert("Missing info", "Please fill in both theme and date.");
      return;
    }
    setSaving(true);
    try {
      const payload = { title: formTitle, date: formDate, songIds: pickedIds };
      if (editSetlist) await api.setlists.update(editSetlist._id, payload);
      else await api.setlists.create(payload);
      setModalOpen(false);
      load();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sl: Setlist) {
    Alert.alert("Delete setlist", `Delete "${sl.title}"?`, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.delete,
        style: "destructive",
        onPress: async () => {
          await api.setlists.delete(sl._id);
          load();
        },
      },
    ]);
  }

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.sky}
          />
        }>
        {/* Add button — same flat style as user-side primary actions */}
        <View style={{ padding: Spacing.lg, paddingBottom: 8 }}>
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: C.sky }]}
            onPress={openNew}
            activeOpacity={0.85}>
            <Feather name="plus" size={18} color={C.bg} />
            <Text style={[s.addBtnText, { color: C.bg }]}>{t.newSetlist}</Text>
          </TouchableOpacity>
        </View>

        {setlists.length === 0 ? (
          <EmptyState
            icon={<Feather name="calendar" size={22} color={C.sky} />}
            text="No setlists yet."
          />
        ) : (
          setlists.map((sl) => {
            const slSongs = sl.songIds || [];
            return (
              <View
                key={sl._id}
                style={[
                  s.card,
                  { backgroundColor: C.surface, borderColor: C.border },
                ]}>
                {/* Card header */}
                <View style={[s.cardHdr, { borderBottomColor: C.border }]}>
                  <View style={[s.dateBadge, { backgroundColor: C.skyPale }]}>
                    <Text style={[s.dateText, { color: C.sky }]}>
                      {sl.date}
                    </Text>
                  </View>
                  <Text
                    style={[s.cardTheme, { color: C.text }]}
                    numberOfLines={1}>
                    {sl.title}
                  </Text>
                  <Text style={[s.cardCnt, { color: C.text2 }]}>
                    {slSongs.length} {t.songs2}
                  </Text>
                </View>

                {/* Songs */}
                {slSongs.map((song: any, i: number) => (
                  <View
                    key={song._id || i}
                    style={[
                      s.songRow,
                      i < slSongs.length - 1 && [
                        s.songBorder,
                        { borderBottomColor: C.border },
                      ],
                    ]}>
                    <Text style={[s.songNum, { color: C.sky }]}>{i + 1}</Text>
                    <Text
                      style={[s.songName, { color: C.text, flex: 1 }]}
                      numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={[s.songSinger, { color: C.text2 }]}>
                      {song.singerName}
                    </Text>
                  </View>
                ))}

                {/* Actions — simple row, no danger borders */}
                <View style={[s.cardActions, { borderTopColor: C.border }]}>
                  <TouchableOpacity
                    style={s.actionBtn}
                    onPress={() => openEdit(sl)}
                    activeOpacity={0.7}>
                    <Feather name="edit-2" size={13} color={C.sky} />
                    <Text style={[s.actionBtnText, { color: C.sky }]}>
                      {t.editSetlist}
                    </Text>
                  </TouchableOpacity>
                  <View
                    style={[s.actionDivider, { backgroundColor: C.border }]}
                  />
                  <TouchableOpacity
                    style={s.actionBtn}
                    onPress={() => handleDelete(sl)}
                    activeOpacity={0.7}>
                    <Feather name="trash-2" size={13} color={C.danger} />
                    <Text style={[s.actionBtnText, { color: C.danger }]}>
                      {t.deleteSetlist}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── MODAL — clean, simple, matches user lyrics screen feel ── */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: C.bg }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View
            style={[
              s.modalHdr,
              { borderBottomColor: C.border, backgroundColor: C.surface },
            ]}>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Text style={[s.modalCancel, { color: C.text2 }]}>
                {t.cancel}
              </Text>
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: C.text }]}>
              {editSetlist ? t.editSetlist : t.newSetlist}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text
                style={[
                  s.modalSave,
                  { color: C.sky },
                  saving && { opacity: 0.5 },
                ]}>
                {saving ? "Saving..." : t.save}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1, backgroundColor: C.bg }}
            contentContainerStyle={{ padding: Spacing.lg }}>
            <Field
              label={t.setlistTheme}
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder="Morning of Praise"
            />
            <Field
              label={t.setlistDate}
              value={formDate}
              onChangeText={setFormDate}
              placeholder="Sat, May 24"
            />

            <Text style={[s.pickLabel, { color: C.text2 }]}>{t.pickSongs}</Text>
            {songs.map((song) => {
              const on = pickedIds.includes(song._id);
              return (
                <TouchableOpacity
                  key={song._id}
                  style={[
                    s.pickItem,
                    {
                      borderColor: on ? C.sky : C.border,
                      backgroundColor: on ? C.skyPale : C.bg,
                    },
                  ]}
                  onPress={() => togglePick(song._id)}
                  activeOpacity={0.8}>
                  <View
                    style={[
                      s.pickCb,
                      {
                        borderColor: on ? C.sky : C.border,
                        backgroundColor: on ? C.sky : "transparent",
                      },
                    ]}>
                    {on && <Feather name="check" size={12} color={C.bg} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[s.pickName, { color: C.text }]}
                      numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={[s.pickSinger, { color: C.text2 }]}>
                      {song.singerName}
                    </Text>
                  </View>
                  <View style={[s.keyChip, { backgroundColor: C.skyPale }]}>
                    <Text style={[s.keyChipText, { color: C.sky }]}>
                      {song.key}
                    </Text>
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

const s = StyleSheet.create({
  addBtn: {
    borderRadius: Radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  addBtnText: { fontSize: 14, fontWeight: "700" },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHdr: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dateBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  dateText: { fontSize: 11, fontWeight: "700" },
  cardTheme: { fontSize: 14, fontWeight: "600", flex: 1 },
  cardCnt: { fontSize: 11 },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  songBorder: { borderBottomWidth: 1 },
  songNum: { fontSize: 11, fontWeight: "700", width: 16 },
  songName: { fontSize: 13, fontWeight: "500" },
  songSinger: { fontSize: 11 },
  cardActions: { flexDirection: "row", borderTopWidth: 1 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
  },
  actionDivider: { width: 1 },
  actionBtnText: { fontSize: 12, fontWeight: "600" },
  modalHdr: {
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
  pickLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 6,
  },
  pickItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: Radius.md,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  pickCb: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pickName: { fontSize: 14, fontWeight: "600" },
  pickSinger: { fontSize: 12, marginTop: 2 },
  keyChip: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4 },
  keyChipText: { fontSize: 11, fontWeight: "700" },
});
