import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useApp } from "../../lib/AppContext";
import { useTheme } from "../../lib/useTheme";
import { Loader, EmptyState } from "../../components/UI";
import { Spacing, Radius } from "../../theme";
import LyricsScreen, { type Song } from "../LyricsScreen";

// ── Lyrics parser ──────────────────────────────────────────────
function parseLyrics(raw: string): { s: string; t: string }[] {
  if (!raw.trim()) return [{ s: "", t: "" }];
  const chunks = raw
    .split(/\n\s*\n/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  if (chunks.length === 0) return [{ s: "", t: raw.trim() }];
  return chunks.map((chunk) => {
    const lines = chunk.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { s: "", t: "" };
    return { s: lines[0].trim(), t: lines.slice(1).join("\n").trim() };
  });
}

function serializeLyrics(lyrics: any): string {
  if (typeof lyrics === "string") return lyrics;
  if (Array.isArray(lyrics)) {
    return lyrics
      .map((item: any) => {
        if (item && typeof item === "object" && "s" in item && "t" in item) {
          const header = (item.s || "").trim();
          const text = (item.t || "").trim();
          return header ? `${header}\n${text}` : text;
        }
        return typeof item === "string" ? item : "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return String(lyrics ?? "");
}

// ── Simple field ────────────────────────────────────────────────
function SimpleField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  icon,
  hint,
  C,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  icon?: string;
  hint?: string;
  C: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fs.wrap}>
      <View style={fs.labelRow}>
        {icon && (
          <Feather
            name={icon as any}
            size={12}
            color={focused ? C.sky : C.text3}
          />
        )}
        <Text style={[fs.label, { color: focused ? C.sky : C.text3 }]}>
          {label}
        </Text>
        {hint && <Text style={[fs.hint, { color: C.text3 }]}>{hint}</Text>}
      </View>
      <TextInput
        style={[
          fs.input,
          multiline && fs.inputMulti,
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

const fs = StyleSheet.create({
  wrap: { marginBottom: 18 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    flex: 1,
  },
  hint: { fontSize: 10, fontStyle: "italic" },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  inputMulti: { minHeight: 130, paddingTop: 12 },
});

// ── MAIN COMPONENT ───────────────────────────────────────────────
export default function AdminSongsTab() {
  const { t } = useApp();
  const { C } = useTheme();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [singerFilter, setSingerFilter] = useState("All");
  const [singersRaw, setSingersRaw] = useState<string[]>([]);
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [modalSong, setModalSong] = useState<Song | null | undefined>(
    undefined,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formKey, setFormKey] = useState("");
  const [formSinger, setFormSinger] = useState("");
  const [formLyrics, setFormLyrics] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Clean, de-duplicated, guaranteed-non-blank singer list.
  // Fixes: pills rendering with no visible label when the API
  // returns empty/whitespace/duplicate singer names.
  const singers = useMemo(() => {
    const clean = singersRaw
      .map((s) => (s ?? "").trim())
      .filter((s) => s.length > 0);
    const unique = Array.from(new Set(clean));
    return ["All", ...unique];
  }, [singersRaw]);

  const load = useCallback(async () => {
    try {
      const [songsData, singersData] = await Promise.all([
        api.songs.getAll(),
        api.songs.getSingers(),
      ]);
      setSongs(songsData);
      setSingersRaw(singersData ?? []);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);
  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  function openModal(song?: Song) {
    setModalSong(song ?? null);
    setFormTitle(song?.title ?? "");
    setFormKey(song?.key ?? "");
    setFormSinger(song?.singerName ?? "");
    setFormLyrics(song ? serializeLyrics(song.lyrics) : "");
  }

  async function handleSave() {
    if (!formTitle.trim()) {
      Alert.alert("Error", "Song title is required.");
      return;
    }
    setSaving(true);
    const parsedLyrics = parseLyrics(formLyrics);
    const lyricsToSave =
      parsedLyrics.length > 0 ? parsedLyrics : [{ s: "", t: "" }];
    const payload = {
      title: formTitle.trim(),
      key: formKey || "C",
      tempo: "Medium",
      singerName: formSinger.trim() || "Unknown",
      category: "Worship",
      lyrics: lyricsToSave,
    };
    try {
      if (modalSong?._id) await api.songs.update(modalSong._id, payload);
      else await api.songs.create(payload);
      setModalSong(undefined);
      load();
    } catch (err: any) {
      Alert.alert("Save failed", err.message || "Could not save song.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(song: Song) {
    Alert.alert(
      "Delete song",
      `Delete "${song.title}"? This can't be undone.`,
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
            } catch (err: any) {
              Alert.alert("Error", err.message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  }

  if (loading) return <Loader />;

  const filtered = songs.filter(
    (s) =>
      (singerFilter === "All" || s.singerName === singerFilter) &&
      (!query || s.title.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── LIST VIEW — stays mounted behind the lyrics overlay
          so scroll position + filters survive opening a song ── */}
      <View style={[{ flex: 1 }, activeSong && styles.hidden]}>
        {/* ── SEARCH ──────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: Spacing.lg,
            paddingTop: Spacing.md,
            paddingBottom: 4,
          }}>
          <View
            style={[
              ss.searchBox,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}>
            <Feather name="search" size={17} color={C.sky} />
            <TextInput
              style={[ss.searchInput, { color: C.text }]}
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

        {/* ── SINGER PILLS — every pill now guaranteed a real
            label; no more blank pills from empty API data ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, paddingVertical: 12 }}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            gap: 8,
            flexGrow: 1,
          }}>
          {singers.map((sg) => {
            const active = singerFilter === sg;
            return (
              <TouchableOpacity
                key={sg}
                style={[
                  ss.pill,
                  {
                    borderColor: active ? "transparent" : C.border,
                    backgroundColor: active ? C.sky : C.surface,
                  },
                ]}
                onPress={() => setSingerFilter(sg)}
                activeOpacity={0.8}>
                <Text
                  style={[ss.pillText, { color: active ? C.bg : C.text2 }]}
                  numberOfLines={1}>
                  {sg}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Result count — small, helpful context when filtering */}
        {(query || singerFilter !== "All") && (
          <Text
            style={[
              ss.resultCount,
              { color: C.text3, paddingHorizontal: Spacing.lg },
            ]}>
            {filtered.length} {filtered.length === 1 ? "song" : "songs"} found
          </Text>
        )}

        {/* ── SONG LIST — each card is now one visually solid
            unit (stronger border + shared background) so it
            still reads as one card even when scroll position
            splits it across the top/bottom of the screen ── */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingTop: 8,
            paddingBottom: 4,
            gap: 12,
          }}
          renderItem={({ item, index }) => {
            const isDeleting = deletingId === item._id;
            return (
              <View
                style={[
                  ss.card,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.sky + "33", // subtle but visible tinted border
                    opacity: isDeleting ? 0.5 : 1,
                  },
                ]}>
                <TouchableOpacity
                  style={ss.cardTop}
                  onPress={() => setActiveSong(item)}
                  activeOpacity={0.7}
                  disabled={isDeleting}>
                  <View style={[ss.numBadge, { backgroundColor: C.skyPale }]}>
                    <Text style={[ss.numBadgeText, { color: C.sky }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={ss.si}>
                    <Text
                      style={[ss.siTitle, { color: C.text }]}
                      numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text
                      style={[ss.siMeta, { color: C.text2 }]}
                      numberOfLines={1}>
                      {item.singerName}
                    </Text>
                  </View>
                  <View style={[ss.keyChip, { backgroundColor: C.skyPale }]}>
                    <Text style={[ss.keyChipText, { color: C.sky }]}>
                      {item.key}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={C.text3} />
                </TouchableOpacity>

                <View style={[ss.cardBottom, { borderTopColor: C.border }]}>
                  <TouchableOpacity
                    style={[
                      ss.actionBtn,
                      { borderColor: C.border, backgroundColor: C.bg },
                    ]}
                    onPress={() => openModal(item)}
                    disabled={isDeleting}
                    activeOpacity={0.75}>
                    <Feather name="edit-2" size={13} color={C.text2} />
                    <Text style={[ss.actionBtnText, { color: C.text2 }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      ss.actionBtn,
                      { borderColor: C.danger + "55", backgroundColor: C.bg },
                    ]}
                    onPress={() => handleDelete(item)}
                    disabled={isDeleting}
                    activeOpacity={0.75}>
                    <Feather name="trash-2" size={13} color={C.danger} />
                    <Text style={[ss.actionBtnText, { color: C.danger }]}>
                      Delete
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
                  : "No songs yet."
              }
            />
          }
          ListFooterComponent={
            <View style={{ paddingTop: 6, paddingBottom: Spacing.lg }}>
              <TouchableOpacity
                style={[ss.addBtn, { backgroundColor: C.sky }]}
                onPress={() => openModal()}
                activeOpacity={0.85}>
                <Feather name="plus" size={18} color={C.bg} />
                <Text style={[ss.addBtnText, { color: C.bg }]}>
                  {t.addSong}
                </Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.sky}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* ── LYRICS OVERLAY ────────────────────────────────
          Sits on top of (not instead of) the list, so the
          list underneath never unmounts and keeps its scroll
          position when you go back. ────────────────────── */}
      {activeSong && (
        <View style={StyleSheet.absoluteFill}>
          <LyricsScreen song={activeSong} onBack={() => setActiveSong(null)} />
        </View>
      )}

      {/* ── ADD / EDIT MODAL ─────────────────────────────── */}
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
              ss.modalHdr,
              { borderBottomColor: C.border, backgroundColor: C.surface },
            ]}>
            <TouchableOpacity onPress={() => setModalSong(undefined)}>
              <Text style={[ss.modalCancel, { color: C.text2 }]}>
                {t.cancel}
              </Text>
            </TouchableOpacity>
            <Text style={[ss.modalTitle, { color: C.text }]}>
              {modalSong?._id ? t.editSong : t.newSong}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text
                style={[
                  ss.modalSave,
                  { color: C.sky },
                  saving && { opacity: 0.5 },
                ]}>
                {saving ? "Saving..." : t.save}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ backgroundColor: C.bg }}
            contentContainerStyle={{ padding: Spacing.lg }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <SimpleField
              label="Song Title"
              icon="music"
              C={C}
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder="e.g. How Great Is Our God"
            />
            <SimpleField
              label="Musical Key"
              icon="sliders"
              hint="optional"
              C={C}
              value={formKey}
              onChangeText={setFormKey}
              placeholder="e.g. C, G, Bb, A"
            />
            <SimpleField
              label="Singer"
              icon="user"
              C={C}
              value={formSinger}
              onChangeText={setFormSinger}
              placeholder="e.g. David Kebede"
            />

            <View style={[ss.divider, { backgroundColor: C.border }]} />

            <View style={[ss.hintCard, { backgroundColor: C.skyPale }]}>
              <Feather
                name="info"
                size={13}
                color={C.sky}
                style={{ marginTop: 1 }}
              />
              <Text style={[ss.hintText, { color: C.text2 }]}>
                Leave a{" "}
                <Text style={{ color: C.sky, fontWeight: "700" }}>
                  blank line
                </Text>{" "}
                between sections. The{" "}
                <Text style={{ color: C.sky, fontWeight: "700" }}>
                  first line
                </Text>{" "}
                of each block becomes the section label.
              </Text>
            </View>

            <SimpleField
              label="Lyrics"
              icon="align-left"
              multiline
              C={C}
              value={formLyrics}
              onChangeText={setFormLyrics}
              placeholder={"አዝማች\nህጻጻ ንላይቸ\n\nቁጥር 1\nዎንታይ ባሪ ማዚያደን"}
            />

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    display: "none",
  },
});

const ss = StyleSheet.create({
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  searchInput: { flex: 1, fontSize: 15 },

  resultCount: { fontSize: 11, fontWeight: "500", marginBottom: 4 },

  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: { fontSize: 13, fontWeight: "600" },

  // ── Song card — one clearly bounded unit; a tinted border
  // (instead of the near-invisible neutral one) so it reads
  // as a single card even when scroll splits it top/bottom.
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  numBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  numBadgeText: { fontSize: 13, fontWeight: "700" },
  si: { flex: 1, minWidth: 0 },
  siTitle: { fontSize: 15, fontWeight: "700" },
  siMeta: { fontSize: 12, marginTop: 2 },

  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  keyChip: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  keyChipText: { fontSize: 12, fontWeight: "700" },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 12, fontWeight: "600" },

  addBtn: {
    borderRadius: Radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  addBtnText: { fontSize: 14, fontWeight: "700" },

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
  divider: { height: 1, marginVertical: Spacing.md },
  hintCard: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  hintText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
