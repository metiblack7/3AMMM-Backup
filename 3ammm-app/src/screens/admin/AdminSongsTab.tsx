import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useApp } from "../../lib/AppContext";
import { useTheme } from "../../lib/useTheme";
import { Loader, EmptyState } from "../../components/UI";
import { Spacing, Radius } from "../../theme";
import LyricsScreen, { type Song } from "../LyricsScreen";

function parseLyrics(raw: string): { s: string; t: string }[] {
  if (!raw.trim()) return [{ s: "", t: "" }];
  const chunks = raw
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  return chunks.map((chunk) => {
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return {
      s: lines[0] ?? "",
      t: lines.slice(1).join("\n") ?? "",
    };
  });
}

function serializeLyrics(lyrics: any): string {
  if (typeof lyrics === "string") return lyrics;
  if (Array.isArray(lyrics)) {
    return lyrics
      .map((item) => {
        if (item && typeof item === "object" && "s" in item && "t" in item) {
          return [item.s || "", item.t || ""].filter(Boolean).join("\n");
        }
        return typeof item === "string" ? item : "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return String(lyrics ?? "");
}

type SongForm = {
  title: string;
  key: string;
  singerName: string;
  lyrics: string;
};

function FieldInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  icon,
  C,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  icon?: string;
  C: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrapper}>
      <View style={styles.fieldLabelRow}>
        {icon && (
          <Feather
            name={icon as any}
            size={12}
            color={focused ? C.sky : C.text3}
          />
        )}
        <Text style={[styles.fieldLabel, { color: focused ? C.sky : C.text3 }]}>
          {label}
        </Text>
      </View>
      <TextInput
        style={[
          styles.fieldInput,
          multiline && styles.fieldInputLarge,
          {
            color: C.text,
            backgroundColor: C.surface,
            borderColor: focused ? C.sky : C.border,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.text3}
        multiline={multiline}
        numberOfLines={multiline ? 6 : 1}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize={multiline ? "sentences" : "words"}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

export default function AdminSongsTab() {
  const { t } = useApp();
  const { C } = useTheme();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [singerFilter, setSingerFilter] = useState("All");
  const [singersRaw, setSingersRaw] = useState<string[]>([]);
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [modalSong, setModalSong] = useState<Song | null | undefined>(
    undefined,
  );
  const [form, setForm] = useState<SongForm>({
    title: "",
    key: "",
    singerName: "",
    lyrics: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const singers = useMemo(() => {
    const clean = singersRaw.map((s) => (s ?? "").trim()).filter(Boolean);
    return ["All", ...Array.from(new Set(clean))];
  }, [singersRaw]);

  const load = useCallback(async () => {
    try {
      const [songsData, singerData] = await Promise.all([
        api.songs.getAll(),
        api.songs.getSingers(),
      ]);
      setSongs(songsData);
      setSingersRaw(singerData ?? []);
    } catch (error) {
      console.error("Songs load failed", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredSongs = songs.filter((song) => {
    const matchesQuery =
      !query || song.title.toLowerCase().includes(query.toLowerCase());
    const matchesSinger =
      singerFilter === "All" || song.singerName === singerFilter;
    return matchesQuery && matchesSinger;
  });

  function openForm(song?: Song) {
    const lyricsText = song ? serializeLyrics(song.lyrics) : "";
    setModalSong(song ?? null);
    setForm({
      title: song?.title ?? "",
      key: song?.key ?? "",
      singerName: song?.singerName ?? "",
      lyrics: lyricsText,
    });
  }

  async function handleSave() {
    if (!form.title.trim()) {
      Alert.alert("Validation", "Song title is required.");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      key: form.key.trim() || "C",
      singerName: form.singerName.trim() || "Unknown",
      tempo: "Medium",
      category: "Worship",
      lyrics: parseLyrics(form.lyrics),
    };
    try {
      if (modalSong && modalSong._id) {
        await api.songs.update(modalSong._id, payload);
      } else {
        await api.songs.create(payload);
      }
      setModalSong(undefined);
      load();
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Could not save song.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(song: Song) {
    Alert.alert(
      "Delete song",
      `Delete "${song.title}"? This cannot be undone.`,
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.delete,
          style: "destructive",
          onPress: async () => {
            setDeletingId(song._id);
            try {
              await api.songs.delete(song._id);
              load();
            } catch (error: any) {
              Alert.alert(
                "Delete failed",
                error?.message || "Could not remove song.",
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  }

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={styles.topBar}>
        <View style={styles.searchWrapper}>
          <Feather name="search" size={17} color={C.sky} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder={t.search ?? "Search songs..."}
            placeholderTextColor={C.text3}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x" size={15} color={C.text3} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={{ flexGrow: 0, marginTop: 10 }}>
        {singers.map((singer) => {
          const active = singerFilter === singer;
          return (
            <TouchableOpacity
              key={singer}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? C.sky : C.surface,
                  borderColor: active ? C.sky : C.border,
                },
              ]}
              onPress={() => setSingerFilter(singer)}
              activeOpacity={0.8}>
              <Text
                style={[styles.pillText, { color: active ? C.bg : C.text2 }]}>
                {singer}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }}>
        <FlatList
          data={filteredSongs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            padding: Spacing.lg,
            paddingBottom: 110,
            gap: 12,
          }}
          renderItem={({ item, index }) => {
            const deleting = deletingId === item._id;
            return (
              <View
                style={[
                  styles.songCard,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.border,
                    opacity: deleting ? 0.5 : 1,
                  },
                ]}>
                <TouchableOpacity
                  style={styles.songTop}
                  onPress={() => setActiveSong(item)}
                  activeOpacity={0.75}
                  disabled={deleting}>
                  <View
                    style={[styles.songNumber, { backgroundColor: C.skyPale }]}>
                    <Text style={[styles.songNumberText, { color: C.sky }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.songInfo}>
                    <Text
                      style={[styles.songTitle, { color: C.text }]}
                      numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.songSinger, { color: C.text2 }]}
                      numberOfLines={1}>
                      {item.singerName}
                    </Text>
                  </View>
                  <View
                    style={[styles.songKey, { backgroundColor: C.skyPale }]}>
                    <Text style={[styles.songKeyText, { color: C.sky }]}>
                      {item.key}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={C.text3} />
                </TouchableOpacity>

                <View style={[styles.actionRow, { borderTopColor: C.border }]}>
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: C.border }]}
                    onPress={() => openForm(item)}
                    disabled={deleting}
                    activeOpacity={0.75}>
                    <Feather name="edit-2" size={13} color={C.text2} />
                    <Text style={[styles.actionText, { color: C.text2 }]}>
                      {t.editSong}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { borderColor: C.danger + "55" },
                    ]}
                    onPress={() => handleDelete(item)}
                    disabled={deleting}
                    activeOpacity={0.75}>
                    <Feather name="trash-2" size={13} color={C.danger} />
                    <Text style={[styles.actionText, { color: C.danger }]}>
                      {t.delete}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<Feather name="music" size={22} color={C.sky} />}
              text={
                query || singerFilter !== "All"
                  ? "No songs match your search."
                  : "No songs have been added yet."
              }
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={C.sky}
            />
          }
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.fabArea} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.fabButton, { backgroundColor: C.sky }]}
            onPress={() => openForm()}
            activeOpacity={0.85}>
            <Feather name="plus" size={18} color={C.bg} />
            <Text style={[styles.fabText, { color: C.bg }]}>
              {t.addSong ?? "Add song"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeSong && (
        <View style={styles.overlay}>
          <LyricsScreen
            song={activeSong}
            onBack={() => setActiveSong(null)}
            pageNumber={0}
            allSongs={songs}
            onNavigateToSong={(song) => setActiveSong(song)}
          />
        </View>
      )}

      <Modal
        visible={modalSong !== undefined}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalSong(undefined)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: C.bg }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: C.border, backgroundColor: C.surface },
            ]}>
            <TouchableOpacity onPress={() => setModalSong(undefined)}>
              <Text style={[styles.modalCancel, { color: C.text2 }]}>
                {t.cancel}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: C.text }]}>
              {modalSong?._id ? t.editSong : t.newSong}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text
                style={[
                  styles.modalSave,
                  { color: C.sky, opacity: saving ? 0.5 : 1 },
                ]}>
                {saving ? "Saving..." : t.save}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1, backgroundColor: C.bg }}
            contentContainerStyle={{ padding: Spacing.lg }}
            keyboardShouldPersistTaps="handled">
            <FieldInput
              label="Song title"
              icon="music"
              C={C}
              value={form.title}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, title: value }))
              }
              placeholder="e.g. How Great Is Our God"
            />
            <FieldInput
              label="Key"
              icon="sliders"
              C={C}
              value={form.key}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, key: value }))
              }
              placeholder="e.g. C"
            />
            <FieldInput
              label="Singer"
              icon="user"
              C={C}
              value={form.singerName}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, singerName: value }))
              }
              placeholder="e.g. David Kebede"
            />
            <View style={[styles.notice, { backgroundColor: C.skyPale }]}>
              <Feather name="info" size={13} color={C.sky} />
              <Text style={[styles.noticeText, { color: C.text2 }]}>
                Separate lyric sections with a blank line. The first line
                becomes the heading.
              </Text>
            </View>
            <FieldInput
              label="Lyrics"
              icon="align-left"
              C={C}
              multiline
              value={form.lyrics}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, lyrics: value }))
              }
              placeholder="First section
Lyrics...

Chorus
Lyrics..."
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#0000",
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterRow: { paddingLeft: Spacing.lg, paddingRight: Spacing.lg, gap: 10 },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  pillText: { fontSize: 13, fontWeight: "600" },
  songCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  songTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
  },
  songNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  songNumberText: { fontSize: 12, fontWeight: "700" },
  songInfo: { flex: 1, minWidth: 0 },
  songTitle: { fontSize: 15, fontWeight: "700" },
  songSinger: { fontSize: 12, marginTop: 2 },
  songKey: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  songKeyText: { fontSize: 12, fontWeight: "700" },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
  },
  actionText: { fontSize: 12, fontWeight: "700" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === "ios" ? 52 : 14,
  },
  modalCancel: { fontSize: 15 },
  modalTitle: { fontSize: 15, fontWeight: "700" },
  modalSave: { fontSize: 15, fontWeight: "700" },
  fieldWrapper: { marginBottom: 18 },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  fieldInput: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  fieldInputLarge: { minHeight: 120, paddingTop: 12 },
  notice: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  fabArea: {
    position: "absolute",
    right: Spacing.lg,
    bottom: Spacing.lg,
    alignItems: "flex-end",
    width: "100%",
  },
  fabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { fontSize: 13, fontWeight: "700" },
});
