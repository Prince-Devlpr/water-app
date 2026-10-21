import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart3, Calendar, Droplet, History, TrendingDown, TrendingUp } from "lucide-react-native";
import { COLORS, SHADOW } from "../../constants/theme";
import { api } from "../../services/api";
import { subscribeToTank, unsubscribeFromTank } from "../../services/socket";

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState("WEEKLY"); // DAILY, WEEKLY, MONTHLY
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [tankLabel, setTankLabel] = useState("ESP32_001");
  const [totalUsage, setTotalUsage] = useState("0 L");
  const [avgUsage, setAvgUsage] = useState("0 L / day");
  const [pumpRunTime, setPumpRunTime] = useState("0m");
  const [pumpCycles, setPumpCycles] = useState("0 times");
  const [refillRate, setRefillRate] = useState("1.8 L/min");
  const [pumpHistory, setPumpHistory] = useState([]);

  const [chartData, setChartData] = useState([
    { label: "Mon", liters: 120, height: 60 },
    { label: "Tue", liters: 145, height: 75 },
    { label: "Wed", liters: 110, height: 55 },
    { label: "Thu", liters: 160, height: 85 },
    { label: "Fri", liters: 130, height: 65 },
    { label: "Sat", liters: 185, height: 95 },
    { label: "Sun", liters: 140, height: 70 },
  ]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const tanksRes = await api.get("/api/tanks");
      if (tanksRes?.data && tanksRes.data.length > 0) {
        const targetTank = tanksRes.data.find((t) => t.deviceId === "ESP32_001") || tanksRes.data[0];
        const tankId = targetTank.id;
        setTankLabel(`${targetTank.name || "Tank"} (${targetTank.deviceId || "ESP32"})`);

        // Fetch period analytics from backend: /api/tanks/:id/analytics/daily | weekly | monthly
        const endpoint = period.toLowerCase();
        const res = await api.get(`/api/tanks/${tankId}/analytics/${endpoint}`);
        if (res?.data) {
          if (res.data.totalConsumptionLiters !== undefined) {
            setTotalUsage(`${Math.round(res.data.totalConsumptionLiters)} L`);
          }

          if (period === "DAILY") {
            setAvgUsage(`${Math.round((res.data.totalConsumptionLiters || 0) / 24)} L / hr`);
          } else if (res.data.avgDailyLiters !== undefined) {
            setAvgUsage(`${Math.round(res.data.avgDailyLiters)} L / day`);
          } else {
            const days = period === "WEEKLY" ? 7 : 30;
            setAvgUsage(`${Math.round((res.data.totalConsumptionLiters || 0) / days)} L / day`);
          }

          if (res.data.pumpRunTimeFormatted) {
            setPumpRunTime(res.data.pumpRunTimeFormatted);
          }

          if (res.data.pumpActivations !== undefined) {
            setPumpCycles(`${res.data.pumpActivations} times`);
          }

          if (res.data.avgRefillRate) {
            setRefillRate(res.data.avgRefillRate);
          }

          if (res.data.breakdown && res.data.breakdown.length > 0) {
            const maxVal = Math.max(...res.data.breakdown.map((b) => b.liters || 10), 10);
            setChartData(
              res.data.breakdown.map((b) => ({
                label: b.label || b.day || b.hour || "P",
                liters: Math.round(b.liters),
                height: Math.max(15, Math.min(100, Math.round(((b.liters || 1) / maxVal) * 100))),
              }))
            );
          }
        }

        // Fetch real pump event history from backend
        try {
          const histRes = await api.get(`/api/tanks/${tankId}/pump/history`);
          if (histRes?.data && Array.isArray(histRes.data)) {
            setPumpHistory(histRes.data.slice(0, 6));
            if (!res?.data?.pumpActivations) {
              setPumpCycles(`${histRes.data.length} times`);
            }
          }
        } catch (e) {
          console.log("Pump history fetch note:", e.message);
        }
      }
    } catch (err) {
      console.log("Analytics fetch note:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  // Real-time Socket.IO live sync for pump events and new telemetry data
  useEffect(() => {
    let activeTankId = null;
    const initLiveSync = async () => {
      try {
        const tanksRes = await api.get("/api/tanks");
        if (tanksRes?.data && tanksRes.data.length > 0) {
          const target = tanksRes.data.find((t) => t.deviceId === "ESP32_001") || tanksRes.data[0];
          activeTankId = target.id;
          subscribeToTank(activeTankId, {
            onPumpEvent: () => {
              loadAnalytics();
            },
          });
        }
      } catch (e) {
        // quiet fallback
      }
    };
    initLiveSync();
    return () => {
      if (activeTankId) unsubscribeFromTank(activeTankId);
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Water Analytics</Text>
          <Text style={styles.subtitle}>{tankLabel} · Telemetry & Usage Analytics</Text>
        </View>

        {/* Period Selector Tabs */}
        <View style={styles.tabContainer}>
          {["DAILY", "WEEKLY", "MONTHLY"].map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tabButton, period === tab && styles.tabButtonActive]}
              onPress={() => setPeriod(tab)}
            >
              <Text style={[styles.tabText, period === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Consumption Overview Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Total Water Consumption ({period})</Text>
              <Text style={styles.summaryValue}>{totalUsage}</Text>
            </View>
            <View style={styles.badgeSuccess}>
              <TrendingDown size={14} color={COLORS.success} />
              <Text style={styles.badgeText}>Active</Text>
            </View>
          </View>
          <Text style={styles.summarySubtext}>
            Average: <Text style={{ fontWeight: "700" }}>{avgUsage}</Text> · Nominal flow pattern
          </Text>
        </View>

        {/* Bar Chart Visualization */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Consumption Breakdown (Liters)</Text>
            <Calendar size={16} color={COLORS.muted} />
          </View>

          {loading ? (
            <View style={{ height: 160, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : (
            <View style={styles.barsRow}>
              {chartData.map((item, index) => (
                <View key={index} style={styles.barColumn}>
                  <Text style={styles.barValue}>{item.liters}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${item.height}%` }]} />
                  </View>
                  <Text style={styles.barLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Pump Performance & Cycle Log */}
        <View style={styles.pumpMetricCard}>
          <Text style={styles.cardTitle}>Pump Operational Summary</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Total Run Time</Text>
              <Text style={styles.metricValue}>{pumpRunTime}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Pump Activations</Text>
              <Text style={styles.metricValue}>{pumpCycles}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Avg Refill Rate</Text>
              <Text style={styles.metricValue}>{refillRate}</Text>
            </View>
          </View>
        </View>

        {/* Recent Pump Activity Events */}
        {pumpHistory.length > 0 && (
          <View style={[styles.pumpMetricCard, { marginTop: 14 }]}>
            <View style={styles.chartHeader}>
              <Text style={styles.cardTitle}>Recent Pump Events</Text>
              <History size={16} color={COLORS.muted} />
            </View>
            {pumpHistory.map((ev, i) => (
              <View key={ev.id || i} style={styles.eventRow}>
                <View style={[styles.eventDot, { backgroundColor: ev.status === "ON" ? COLORS.success : COLORS.muted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>Pump {ev.status} ({ev.source || 'AUTO'})</Text>
                  <Text style={styles.eventSub}>{ev.reason || 'Threshold trigger'}</Text>
                </View>
                <Text style={styles.eventTime}>{new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 35,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: COLORS.white,
    ...SHADOW,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.text,
    marginTop: 2,
  },
  badgeSuccess: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.success,
    marginLeft: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  barsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 160,
    paddingTop: 20,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
  },
  barValue: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.muted,
    marginBottom: 4,
  },
  barTrack: {
    width: 22,
    height: 110,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginTop: 6,
  },
  pumpMetricCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricBox: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "700",
    textAlign: "center",
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.primaryDark,
    marginTop: 4,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  eventSub: {
    fontSize: 11,
    color: COLORS.muted,
  },
  eventTime: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "700",
  },
});
