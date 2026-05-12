import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

const EGG_CATEGORIES = [
  { id: "small", label: "Small Egg" },
  { id: "normal", label: "Normal Egg" },
  { id: "crack", label: "Crack Egg" },
  { id: "dirty", label: "Dirty Egg" },
  { id: "double_yolk", label: "Double Yolk Egg" },
  { id: "brown", label: "Brown Egg" },
  { id: "liquid", label: "Liquid Egg" },
] as const;

type CategoryId = (typeof EGG_CATEGORIES)[number]["id"];

const EGGS_PER_TRAY = 30;
const TRAYS_PER_CARTON = 12;
const EGGS_PER_CARTON = EGGS_PER_TRAY * TRAYS_PER_CARTON; // 360

function calculateTotals(counts: Record<CategoryId, number>) {
  const totalEggs = Object.values(counts).reduce((sum, v) => sum + v, 0);
  const totalTrays = Math.floor(totalEggs / EGGS_PER_TRAY);
  const remainingEggsInTray = totalEggs % EGGS_PER_TRAY;
  const cartons = Math.floor(totalTrays / TRAYS_PER_CARTON);
  const remainingTrays = totalTrays % TRAYS_PER_CARTON;
  return { totalEggs, totalTrays, cartons, remainingTrays, remainingEggsInTray };
}

const CATEGORY_COLORS: Record<CategoryId, { bg: string; dot: string }> = {
  small: { bg: "#FEF9EE", dot: "#F59E0B" },
  normal: { bg: "#F0FDF4", dot: "#22C55E" },
  crack: { bg: "#FFF1F2", dot: "#FB7185" },
  dirty: { bg: "#FFF7ED", dot: "#FB923C" },
  double_yolk: { bg: "#F5F3FF", dot: "#A78BFA" },
  brown: { bg: "#FEF3C7", dot: "#92400E" },
  liquid: { bg: "#EFF6FF", dot: "#60A5FA" },
};

export default function EggCalculator() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [counts, setCounts] = useState<Record<CategoryId, number>>(
    () =>
      Object.fromEntries(EGG_CATEGORIES.map((c) => [c.id, 0])) as Record<
        CategoryId,
        number
      >
  );

  const [inputValues, setInputValues] = useState<Record<CategoryId, string>>(
    () =>
      Object.fromEntries(EGG_CATEGORIES.map((c) => [c.id, "0"])) as Record<
        CategoryId,
        string
      >
  );

  const updateCount = useCallback(
    (id: CategoryId, value: number) => {
      const clamped = Math.max(0, value);
      setCounts((prev) => ({ ...prev, [id]: clamped }));
      setInputValues((prev) => ({ ...prev, [id]: String(clamped) }));
    },
    []
  );

  const handleIncrement = useCallback(
    (id: CategoryId) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateCount(id, counts[id] + 1);
    },
    [counts, updateCount]
  );

  const handleDecrement = useCallback(
    (id: CategoryId) => {
      if (counts[id] > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        updateCount(id, counts[id] - 1);
      }
    },
    [counts, updateCount]
  );

  const handleTextChange = useCallback(
    (id: CategoryId, text: string) => {
      setInputValues((prev) => ({ ...prev, [id]: text }));
      const parsed = parseInt(text, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        setCounts((prev) => ({ ...prev, [id]: parsed }));
      } else if (text === "" || text === "-") {
        setCounts((prev) => ({ ...prev, [id]: 0 }));
      }
    },
    []
  );

  const handleBlur = useCallback(
    (id: CategoryId) => {
      setInputValues((prev) => ({ ...prev, [id]: String(counts[id]) }));
    },
    [counts]
  );

  const handleReset = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const zero = Object.fromEntries(
      EGG_CATEGORIES.map((c) => [c.id, 0])
    ) as Record<CategoryId, number>;
    const zeroStr = Object.fromEntries(
      EGG_CATEGORIES.map((c) => [c.id, "0"])
    ) as Record<CategoryId, string>;
    setCounts(zero);
    setInputValues(zeroStr);
  }, []);

  const { totalEggs, totalTrays, cartons, remainingTrays, remainingEggsInTray } =
    calculateTotals(counts);

  const topPadding =
    Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#7C2D12" />

      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 12, backgroundColor: "#7C2D12" },
        ]}
      >
        <Text style={styles.headerTitle}>Egg Production</Text>
        <Text style={styles.headerSubtitle}>Daily Count Calculator</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Text style={styles.resetBtnText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              Platform.OS === "web" ? 34 + 20 : insets.bottom + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Info bar */}
        <View style={[styles.infoBar, { backgroundColor: "#FEF3C7" }]}>
          <InfoChip label="1 Tray" value="30 Eggs" />
          <View style={styles.infoDivider} />
          <InfoChip label="1 Carton" value="360 Eggs" />
          <View style={styles.infoDivider} />
          <InfoChip label="12 Trays" value="1 Carton" />
        </View>

        {/* Category inputs */}
        <View style={styles.categoriesSection}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            EGG CATEGORIES
          </Text>
          {EGG_CATEGORIES.map((cat) => {
            const catColors = CATEGORY_COLORS[cat.id];
            return (
              <View
                key={cat.id}
                style={[
                  styles.categoryRow,
                  { backgroundColor: catColors.bg, borderColor: catColors.dot + "40" },
                ]}
              >
                <View style={styles.categoryLeft}>
                  <View
                    style={[styles.categoryDot, { backgroundColor: catColors.dot }]}
                  />
                  <Text style={[styles.categoryLabel, { color: colors.foreground }]}>
                    {cat.label}
                  </Text>
                </View>
                <View style={styles.counterRow}>
                  <TouchableOpacity
                    style={[styles.counterBtn, styles.decrementBtn]}
                    onPress={() => handleDecrement(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.decrementBtnText}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.countInput, { color: colors.foreground }]}
                    value={inputValues[cat.id]}
                    onChangeText={(t) => handleTextChange(cat.id, t)}
                    onBlur={() => handleBlur(cat.id)}
                    keyboardType="numeric"
                    selectTextOnFocus
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={[
                      styles.counterBtn,
                      styles.incrementBtn,
                      { backgroundColor: catColors.dot },
                    ]}
                    onPress={() => handleIncrement(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.incrementBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Grand Total Card */}
        <View style={[styles.totalCard, { backgroundColor: "#7C2D12" }]}>
          <Text style={styles.totalTitle}>GRAND TOTAL</Text>

          <View style={styles.totalEggsRow}>
            <Text style={styles.totalEggsLabel}>Total Eggs</Text>
            <Text style={styles.totalEggsValue}>{totalEggs.toLocaleString()}</Text>
          </View>

          <View style={styles.totalDivider} />

          <View style={styles.totalEggsRow}>
            <Text style={styles.totalEggsLabel}>Total Trays</Text>
            <Text style={styles.totalEggsValue}>{totalTrays.toLocaleString()}</Text>
          </View>

          <View style={styles.totalDivider} />

          <View style={styles.resultSection}>
            <View style={styles.resultBox}>
              <Text style={styles.resultValue}>{cartons}</Text>
              <Text style={styles.resultUnit}>Cartons</Text>
            </View>
            <Text style={styles.resultPlus}>+</Text>
            <View style={styles.resultBox}>
              <Text style={styles.resultValue}>{remainingTrays}</Text>
              <Text style={styles.resultUnit}>Trays</Text>
            </View>
            {remainingEggsInTray > 0 && (
              <>
                <Text style={styles.resultPlus}>+</Text>
                <View style={styles.resultBox}>
                  <Text style={styles.resultValue}>{remainingEggsInTray}</Text>
                  <Text style={styles.resultUnit}>Eggs</Text>
                </View>
              </>
            )}
          </View>

          <Text style={styles.totalFormula}>
            {cartons} Carton{cartons !== 1 ? "s" : ""} ({cartons * TRAYS_PER_CARTON} Trays) + {remainingTrays} Tray{remainingTrays !== 1 ? "s" : ""}
            {remainingEggsInTray > 0 ? ` + ${remainingEggsInTray} Egg${remainingEggsInTray !== 1 ? "s" : ""}` : ""}
          </Text>
        </View>

        {/* Per-category summary */}
        {totalEggs > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              BREAKDOWN
            </Text>
            {EGG_CATEGORIES.filter((c) => counts[c.id] > 0).map((cat) => {
              const catColors = CATEGORY_COLORS[cat.id];
              const pct = totalEggs > 0 ? ((counts[cat.id] / totalEggs) * 100).toFixed(1) : "0";
              return (
                <View key={cat.id} style={styles.summaryRow}>
                  <View style={[styles.summaryDot, { backgroundColor: catColors.dot }]} />
                  <Text style={[styles.summaryLabel, { color: colors.foreground }]}>
                    {cat.label}
                  </Text>
                  <Text style={[styles.summaryCount, { color: colors.foreground }]}>
                    {counts[cat.id]}
                  </Text>
                  <Text style={[styles.summaryPct, { color: colors.mutedForeground }]}>
                    {pct}%
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoChip}>
      <Text style={styles.infoChipLabel}>{label}</Text>
      <Text style={styles.infoChipValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FEF3C7",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#FDE68A",
    marginTop: 2,
    opacity: 0.85,
  },
  resetBtn: {
    position: "absolute",
    right: 20,
    bottom: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  resetBtnText: {
    color: "#FEF3C7",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  infoBar: {
    flexDirection: "row",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "space-around",
  },
  infoChip: {
    alignItems: "center",
    flex: 1,
  },
  infoChipLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#92400E",
    opacity: 0.7,
  },
  infoChipValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#78350F",
    marginTop: 2,
  },
  infoDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#FDE68A",
  },
  categoriesSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 4,
    marginLeft: 2,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  counterBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  decrementBtn: {
    backgroundColor: "#FDE68A",
  },
  decrementBtnText: {
    fontSize: 20,
    color: "#92400E",
    lineHeight: 22,
    fontFamily: "Inter_600SemiBold",
  },
  incrementBtn: {},
  incrementBtnText: {
    fontSize: 20,
    color: "#FFFFFF",
    lineHeight: 22,
    fontFamily: "Inter_600SemiBold",
  },
  countInput: {
    width: 60,
    height: 34,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 8,
    paddingVertical: 0,
  },
  totalCard: {
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  totalTitle: {
    color: "#FDE68A",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  totalEggsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalEggsLabel: {
    color: "rgba(254,243,199,0.8)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  totalEggsValue: {
    color: "#FEF3C7",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  totalDivider: {
    height: 1,
    backgroundColor: "rgba(254,243,199,0.2)",
  },
  resultSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  resultBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 80,
  },
  resultValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#FEF3C7",
    lineHeight: 40,
  },
  resultUnit: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(254,243,199,0.75)",
    marginTop: 2,
  },
  resultPlus: {
    fontSize: 22,
    color: "rgba(254,243,199,0.5)",
    fontFamily: "Inter_400Regular",
  },
  totalFormula: {
    textAlign: "center",
    color: "rgba(254,243,199,0.65)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  summaryCount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    minWidth: 50,
    textAlign: "right",
  },
  summaryPct: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    minWidth: 42,
    textAlign: "right",
  },
});
