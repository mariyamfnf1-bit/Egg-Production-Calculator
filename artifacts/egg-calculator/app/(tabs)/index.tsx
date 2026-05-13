import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import DateTimePicker from "@react-native-community/datetimepicker";

const EGG_CATEGORIES = [
  { id: "small", label: "Small Egg", dot: "#F59E0B" },
  { id: "normal", label: "Normal Egg", dot: "#22C55E" },
  { id: "crack", label: "Crack Egg", dot: "#FB7185" },
  { id: "dirty", label: "Dirty Egg", dot: "#FB923C" },
  { id: "double_yolk", label: "Double Yolk", dot: "#A78BFA" },
  { id: "brown", label: "Brown Egg", dot: "#92400E" },
  { id: "liquid", label: "Liquid Egg", dot: "#60A5FA" },
] as const;

type CategoryId = (typeof EGG_CATEGORIES)[number]["id"];

const EGGS_PER_TRAY = 30;
const TRAYS_PER_CARTON = 12;
const EGGS_PER_CARTON = EGGS_PER_TRAY * TRAYS_PER_CARTON;

type Entry = { cartons: string; trays: string };

function toNum(s: string) {
  const n = parseInt(s, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

function calcTotals(entries: Record<CategoryId, Entry>) {
  let totalEggs = 0;
  for (const e of Object.values(entries)) {
    totalEggs +=
      toNum(e.cartons) * EGGS_PER_CARTON + toNum(e.trays) * EGGS_PER_TRAY;
  }
  const totalTrays = Math.floor(totalEggs / EGGS_PER_TRAY);
  const remainEggs = totalEggs % EGGS_PER_TRAY;
  const cartons = Math.floor(totalTrays / TRAYS_PER_CARTON);
  const remainTrays = totalTrays % TRAYS_PER_CARTON;
  return { totalEggs, totalTrays, cartons, remainTrays, remainEggs };
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const initEntries = (): Record<CategoryId, Entry> =>
  Object.fromEntries(
    EGG_CATEGORIES.map((c) => [c.id, { cartons: "", trays: "" }])
  ) as Record<CategoryId, Entry>;

export default function EggCalculator() {
  const insets = useSafeAreaInsets();
  const shotRef = useRef<ViewShot>(null);

  const [farmName, setFarmName] = useState("My Farm");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [entries, setEntries] = useState<Record<CategoryId, Entry>>(initEntries);
  const [sharing, setSharing] = useState(false);

  const update = useCallback(
    (id: CategoryId, field: "cartons" | "trays", val: string) => {
      const clean = val.replace(/[^0-9]/g, "");
      setEntries((prev) => ({ ...prev, [id]: { ...prev[id], [field]: clean } }));
    },
    []
  );

  const handleReset = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setEntries(initEntries());
  }, []);

  const handleShare = useCallback(async () => {
    if (!shotRef.current) return;
    setSharing(true);
    try {
      const uri: string = await (shotRef.current as any).capture();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share Egg Production Report",
        });
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === "granted") {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert("Saved!", "Report image saved to your photo gallery.");
        } else {
          Alert.alert(
            "Permission needed",
            "Allow photo access to save the image."
          );
        }
      }
    } catch {
      Alert.alert("Error", "Could not capture screen. Please try again.");
    } finally {
      setSharing(false);
    }
  }, []);

  const totals = calcTotals(entries);
  const topPad = Platform.OS === "web" ? 44 : insets.top;
  const botPad = Platform.OS === "web" ? 20 : insets.bottom + 8;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <StatusBar barStyle="light-content" backgroundColor="#7C2D12" />

      {/* ViewShot wraps only the report content (excludes action buttons) */}
      <ViewShot
        ref={shotRef}
        options={{ format: "png", quality: 1 }}
        style={styles.shotArea}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerSub}>FARM NAME</Text>
            <TextInput
              style={styles.farmInput}
              value={farmName}
              onChangeText={setFarmName}
              placeholder="Enter farm name"
              placeholderTextColor="rgba(254,243,199,0.5)"
              returnKeyType="done"
              maxLength={30}
            />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerSub}>DATE</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>{formatDate(date)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(_event: any, selected?: Date) => {
              setShowDatePicker(false);
              if (selected) setDate(selected);
            }}
          />
        )}

        {/* Column labels */}
        <View style={styles.colHeader}>
          <Text style={[styles.colLabel, { flex: 1 }]}>Category</Text>
          <Text style={[styles.colLabel, styles.colCenter]}>Cartons</Text>
          <Text style={[styles.colLabel, styles.colCenter]}>Trays</Text>
        </View>

        {/* Category rows */}
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 6 }}
        >
          {EGG_CATEGORIES.map((cat) => (
            <View key={cat.id} style={styles.row}>
              <View style={styles.rowLabel}>
                <View style={[styles.dot, { backgroundColor: cat.dot }]} />
                <Text style={styles.catText} numberOfLines={1}>
                  {cat.label}
                </Text>
              </View>
              <TextInput
                style={[styles.input, { borderColor: cat.dot + "60" }]}
                placeholder="0"
                placeholderTextColor="#A8A29E"
                value={entries[cat.id].cartons}
                onChangeText={(v) => update(cat.id, "cartons", v)}
                keyboardType="numeric"
                returnKeyType="next"
                selectTextOnFocus
                maxLength={5}
              />
              <TextInput
                style={[styles.input, { borderColor: cat.dot + "60" }]}
                placeholder="0"
                placeholderTextColor="#A8A29E"
                value={entries[cat.id].trays}
                onChangeText={(v) => update(cat.id, "trays", v)}
                keyboardType="numeric"
                returnKeyType="done"
                selectTextOnFocus
                maxLength={5}
              />
            </View>
          ))}
        </ScrollView>

        {/* Grand Total */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <TotalChip label="Total Eggs" value={totals.totalEggs.toLocaleString()} />
            <TotalChip label="Total Trays" value={totals.totalTrays.toLocaleString()} />
          </View>
          <View style={styles.resultRow}>
            <ResultBox value={totals.cartons} label="Cartons" />
            <Text style={styles.plus}>+</Text>
            <ResultBox value={totals.remainTrays} label="Trays" />
            {totals.remainEggs > 0 && (
              <>
                <Text style={styles.plus}>+</Text>
                <ResultBox value={totals.remainEggs} label="Eggs" />
              </>
            )}
          </View>
          <Text style={styles.formula}>
            {totals.cartons} Carton{totals.cartons !== 1 ? "s" : ""} +{" "}
            {totals.remainTrays} Tray{totals.remainTrays !== 1 ? "s" : ""}
            {totals.remainEggs > 0
              ? ` + ${totals.remainEggs} Egg${totals.remainEggs !== 1 ? "s" : ""}`
              : ""}
          </Text>
        </View>
      </ViewShot>

      {/* Action buttons — outside ViewShot so they don't appear in the captured image */}
      <View style={[styles.actionBar, { paddingBottom: botPad + 6 }]}>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Text style={styles.resetText}>↺  Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator color="#7C2D12" size="small" />
          ) : (
            <Text style={styles.shareText}>📸  Share as Image</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TotalChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

function ResultBox({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.resultBox}>
      <Text style={styles.resultValue}>{value}</Text>
      <Text style={styles.resultLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFBF0" },
  shotArea: { flex: 1, backgroundColor: "#FFFBF0" },
  header: {
    backgroundColor: "#7C2D12",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 12,
  },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: "flex-end" },
  headerSub: {
    color: "rgba(254,243,199,0.6)",
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 3,
  },
  farmInput: {
    color: "#FEF3C7",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(254,243,199,0.3)",
    minWidth: 120,
  },
  dateBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dateText: {
    color: "#FEF3C7",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  colHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#FEF3C7",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  colLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#92400E",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  colCenter: { width: 80, textAlign: "center" },
  scroll: { flex: 1, paddingHorizontal: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#FEF3C7",
    gap: 8,
  },
  rowLabel: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  catText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#1C1917",
    flexShrink: 1,
  },
  input: {
    width: 74,
    height: 36,
    borderWidth: 1.5,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#1C1917",
    backgroundColor: "#FFFFFF",
    paddingVertical: 0,
  },
  totalCard: {
    backgroundColor: "#7C2D12",
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  totalRow: { flexDirection: "row", gap: 10 },
  chip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  chipLabel: {
    color: "rgba(254,243,199,0.7)",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chipValue: {
    color: "#FEF3C7",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  resultBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    minWidth: 66,
  },
  resultValue: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FEF3C7",
    lineHeight: 30,
  },
  resultLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(254,243,199,0.75)",
  },
  plus: {
    fontSize: 16,
    color: "rgba(254,243,199,0.45)",
    fontFamily: "Inter_400Regular",
  },
  formula: {
    textAlign: "center",
    color: "rgba(254,243,199,0.55)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  actionBar: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: "#7C2D12",
  },
  resetBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  resetText: {
    color: "#FEF3C7",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  shareBtn: {
    flex: 2,
    backgroundColor: "#FEF3C7",
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: {
    color: "#7C2D12",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
