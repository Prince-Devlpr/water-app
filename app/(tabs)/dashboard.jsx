import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Cpu,
  Droplets,
  Gauge,
  MapPin,
  Power,
  RefreshCw,
  Ruler,
  ShieldCheck,
  Wifi,
  XCircle,
} from "lucide-react-native";
import WaterTank from "../../components/WaterTank";
import StatCard from "../../components/StatCard";
import AlertCard from "../../components/AlertCard";
import NotificationModal from "../../components/NotificationModal";
import { COLORS, SHADOW } from "../../constants/theme";
import { api, ensureAuthenticated, sendPumpCommand, pumpOn, pumpOff, autoMode } from "../../services/api";
import { subscribeToTank, unsubscribeFromTank } from "../../services/socket";

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [pumpLoading, setPumpLoading] = useState(false);
  const [commandInProgress, setCommandInProgress] = useState(null); // 'ON' | 'OFF' | 'AUTO' | null
  const [hardwareConfirmed, setHardwareConfirmed] = useState(true);
  const [deviceOnline, setDeviceOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("Just now");
  const [distanceCm, setDistanceCm] = useState(0);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Spin animation for the refresh button
  const spinValue = useRef(new Animated.Value(0)).current;

  const [tank, setTank] = useState({
    id: 1,
    name: "Home Tank",
    location: "Ultrasonic Sensor · ESP32_001",
    level: 0.0,
    currentLiters: 0,
    capacity: 1000,
    pump: false,
    mode: "AUTO",
    flowRate: 0.0,
    totalLiters: 0.0,
    tdsPpm: 220,
    criticalLow: 50,
    criticalHigh: 70,
  });

  const [alerts, setAlerts] = useState([
    {
      id: "init_1",
      title: "System Live Link Active",
      message: "Connected to HiveMQ Cloud TLS broker. Monitoring live packets.",
      severity: "SUCCESS",
      time: "Just now",
      isRead: true,
    },
  ]);

  const showToast = (title, message, severity = "INFO") => {
    setToastMessage({ title, message, severity });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const triggerSpin = () => {
    spinValue.setValue(0);
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 650,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Load tank telemetry, status, and alerts from backend
  const loadData = async (isManual = false) => {
    if (isManual) {
      triggerSpin();
    }
    try {
      await ensureAuthenticated();
      const tanksRes = await api.get("/api/tanks");
      if (tanksRes?.data && tanksRes.data.length > 0) {
        const activeTank =
          tanksRes.data.find((t) => t.deviceId === "ESP32_001" || t.deviceId === "ESP8266_001") || tanksRes.data[0];

        let currentStatus = null;
        try {
          const currentRes = await api.get(`/api/tanks/${activeTank.id}/current`);
          currentStatus = currentRes?.data;
        } catch (e) {
          // fallback
        }

        const reading = currentStatus?.current || activeTank.currentReading;
        const latestDistance = reading?.distanceCm ?? activeTank.currentDistanceCm ?? 0;
        const latestLevel = reading?.waterLevelPercent ?? reading?.levelPercent ?? activeTank.currentLevelPct ?? 0;
        const latestVolume = reading?.waterLevelLiters ?? reading?.volumeLiters ?? activeTank.currentVolumeLiters ?? 0;
        const latestPump = reading?.pumpStatus === true || reading?.pumpStatus === "ON" || activeTank.pumpStatus === "ON";
        const latestFlow = reading?.flowRate ?? activeTank.currentFlowRate ?? 0.0;
        const latestTotal = reading?.totalLiters ?? activeTank.currentTotalLiters ?? 0.0;
        const latestTds = reading?.tdsPpm ?? activeTank.currentTdsPpm ?? 220;
        const latestMode = reading?.mode ?? activeTank.currentMode ?? (activeTank.autoMode ? "AUTO" : "MANUAL") ?? "AUTO";

        setDistanceCm(latestDistance);

        setTank((prev) => ({
          ...prev,
          id: activeTank.id,
          name: activeTank.name || prev.name,
          location: `Device: ${activeTank.deviceId || "ESP32_001"}`,
          level: latestLevel,
          currentLiters: latestVolume,
          capacity: activeTank.capacityLiters ?? activeTank.maxCapacityLiters ?? prev.capacity,
          pump: latestPump,
          flowRate: latestFlow,
          totalLiters: latestTotal,
          tdsPpm: latestTds,
          mode: latestMode,
          criticalLow: activeTank.lowThreshold ?? activeTank.criticalLowPct ?? 50,
          criticalHigh: activeTank.fullThreshold ?? activeTank.criticalHighPct ?? 70,
        }));

        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

        // Fetch alerts
        try {
          const alertsRes = await api.get(`/api/tanks/${activeTank.id}/alerts`);
          if (alertsRes?.data && alertsRes.data.length > 0) {
            setAlerts(
              alertsRes.data.map((a) => ({
                id: a.id,
                title: a.type?.replace(/_/g, " ") || "Alert",
                message: a.message || "Water level notification",
                severity: a.severity || "WARNING",
                isRead: a.isRead || false,
                time: new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              }))
            );
          }
        } catch (e) {
          console.log("Alerts load notice:", e.message);
        }

        if (isManual) {
          showToast("Refreshed", "All metrics and sensor feeds synchronized", "SUCCESS");
        }
      }
    } catch (err) {
      console.log("Telemetry sync notice:", err.message);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to live Socket.IO events from ESP8266
    subscribeToTank(tank.id, {
      onTelemetry: (telemetry) => {
        setDeviceOnline(true);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        if (telemetry.distanceCm !== undefined) {
          setDistanceCm(telemetry.distanceCm);
        }
        setTank((prev) => ({
          ...prev,
          level:
            telemetry.waterLevelPercent !== undefined
              ? telemetry.waterLevelPercent
              : telemetry.percentage ?? prev.level,
          currentLiters:
            telemetry.waterLevelLiters !== undefined
              ? telemetry.waterLevelLiters
              : telemetry.volumeLiters ?? prev.currentLiters,
          pump: telemetry.pumpStatus !== undefined ? telemetry.pumpStatus : prev.pump,
          flowRate: telemetry.flowRate !== undefined ? telemetry.flowRate : prev.flowRate,
          totalLiters: telemetry.totalLiters !== undefined ? telemetry.totalLiters : prev.totalLiters,
          tdsPpm: telemetry.tdsPpm !== undefined ? telemetry.tdsPpm : (telemetry.tds ?? prev.tdsPpm),
          mode: telemetry.mode !== undefined ? telemetry.mode : prev.mode,
        }));
      },
      onAlert: (newAlert) => {
        const alertObj = {
          id: String(Date.now()),
          title: newAlert.type?.replace(/_/g, " ") || "System Alert",
          message: newAlert.message || "Threshold event detected",
          severity: newAlert.severity || "WARNING",
          isRead: false,
          time: "Just now",
        };
        setAlerts((prev) => [alertObj, ...prev]);
        showToast(alertObj.title, alertObj.message, alertObj.severity);
      },
      onPumpEvent: (event) => {
        setHardwareConfirmed(true);
        setTank((prev) => ({
          ...prev,
          pump: event.status === "ON",
        }));
        showToast(
          "Pump Relay Changed",
          `Pump switched to ${event.status} (${event.source || "AUTO"})`,
          event.status === "ON" ? "SUCCESS" : "INFO"
        );
      },
      onDeviceStatus: (status) => {
        setDeviceOnline(status.online !== false);
      },
      onModeChange: ({ mode }) => {
        setTank((prev) => ({ ...prev, mode }));
        showToast("Mode Changed", `Control mode switched to ${mode}`, "INFO");
      },
      onAck: (ack) => {
        setHardwareConfirmed(true);
        if (typeof ack.pumpOn === "boolean") {
          setTank((prev) => ({
            ...prev,
            pump: ack.pumpOn,
            mode: ack.autoMode ? "AUTO" : "MANUAL",
          }));
          showToast(
            "Hardware Confirmed (ACK)",
            `ESP32 Relay is ${ack.pumpOn ? "ON" : "OFF"} (${ack.autoMode ? "Auto Mode" : "Manual Mode"})`,
            ack.pumpOn ? "SUCCESS" : "INFO"
          );
        }
      },
    });

    const interval = setInterval(loadData, 5000);

    return () => {
      clearInterval(interval);
      unsubscribeFromTank(tank.id);
    };
  }, [tank.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const handleMarkAsRead = async (alertId) => {
    try {
      await api.put(`/api/alerts/${alertId}/read`, {});
    } catch (e) {
      console.log("Mark alert read notice:", e.message);
    }
    setAlerts((prev) =>
      prev.map((a) => (String(a.id) === String(alertId) ? { ...a, isRead: true } : a))
    );
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put(`/api/alerts/read-all`, { tankId: tank.id });
    } catch (e) {
      console.log("Mark all alerts read notice:", e.message);
    }
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    showToast("Notifications Read", "All alerts marked as read.", "SUCCESS");
  };

  /**
   * Two-way command flow:
   * App -> Backend (/api/device/command) -> HiveMQ -> ESP32 -> ACK / Telemetry confirmation
   */
  const handlePumpCommand = async (command) => {
    setCommandInProgress(command);
    setHardwareConfirmed(false);

    try {
      await sendPumpCommand(command, "ESP32_001");

      if (command === "ON") {
        setTank((prev) => ({ ...prev, pump: true, mode: "MANUAL" }));
        showToast(
          "Command Dispatched",
          "Pump ON sent via HiveMQ. Awaiting ESP32 GPIO 26 confirmation...",
          "INFO"
        );
      } else if (command === "OFF") {
        setTank((prev) => ({ ...prev, pump: false, mode: "MANUAL" }));
        showToast(
          "Command Dispatched",
          "Pump OFF sent via HiveMQ. Awaiting ESP32 GPIO 26 confirmation...",
          "INFO"
        );
      } else if (command === "AUTO") {
        setTank((prev) => ({ ...prev, mode: "AUTO" }));
        showToast(
          "Auto Mode Activated",
          "Threshold pump control restored on ESP32.",
          "SUCCESS"
        );
      }
    } catch (err) {
      showToast(
        "Command Failed",
        err.message || "Failed to publish MQTT command",
        "CRITICAL"
      );
    } finally {
      setCommandInProgress(null);
    }
  };

  const pumpOnAction = () => handlePumpCommand("ON");
  const pumpOffAction = () => handlePumpCommand("OFF");
  const autoModeAction = () => handlePumpCommand("AUTO");

  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Toast Alert Banner */}
      {toastMessage && (
        <View
          style={[
            styles.toastBanner,
            toastMessage.severity === "CRITICAL" && styles.toastCritical,
            toastMessage.severity === "WARNING" && styles.toastWarning,
            toastMessage.severity === "SUCCESS" && styles.toastSuccess,
          ]}
        >
          <View style={styles.toastIcon}>
            {toastMessage.severity === "CRITICAL" ? (
              <XCircle size={18} color={COLORS.danger} />
            ) : toastMessage.severity === "WARNING" ? (
              <AlertTriangle size={18} color={COLORS.warning} />
            ) : (
              <CheckCircle2 size={18} color={COLORS.success} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toastTitle}>{toastMessage.title}</Text>
            <Text style={styles.toastText}>{toastMessage.message}</Text>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header with Notification Badge & Tactile Refresh */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Smart Water Dashboard</Text>
            <Text style={styles.heading}>{tank.name}</Text>
            <View style={styles.location}>
              <MapPin size={14} color={COLORS.muted} />
              <Text style={styles.locationText}>{tank.location}</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {/* Notification Bell Button with Interactive Badge */}
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => setNotificationModalVisible(true)}
            >
              <Bell size={20} color={COLORS.primary} />
              {unreadAlertsCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadAlertsCount > 99 ? "99+" : unreadAlertsCount}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Tactile Refresh Button with Spin Animation */}
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => loadData(true)}
              disabled={refreshing}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RefreshCw size={19} color={COLORS.primary} />
              </Animated.View>
            </Pressable>
          </View>
        </View>

        {/* Device Connectivity Status */}
        <View style={styles.connectionRow}>
          <View
            style={[
              styles.onlineBadge,
              { backgroundColor: deviceOnline ? "#ECFDF5" : "#FEF2F2" },
            ]}
          >
            <Wifi size={14} color={deviceOnline ? COLORS.success : COLORS.danger} />
            <Text
              style={[
                styles.onlineText,
                { color: deviceOnline ? COLORS.success : COLORS.danger },
              ]}
            >
              {deviceOnline ? "ESP32 Online (Receiving Data)" : "Device Standby"}
            </Text>
          </View>
          <Text style={styles.updatedText}>Synced: {lastUpdated}</Text>
        </View>

        {/* Main Water Tank Visual Card */}
        <View style={styles.levelCard}>
          <Text style={styles.cardTitle}>LIVE WATER LEVEL</Text>
          <WaterTank
            percentage={tank.level}
            currentLiters={tank.currentLiters}
            capacity={tank.capacity}
            criticalLow={tank.criticalLow}
            criticalHigh={tank.criticalHigh}
          />

          {/* Two-Way Pump Command Flow & Live Relay Confirmation */}
          <View style={styles.hardwareStatusRow}>
            {!hardwareConfirmed ? (
              <>
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.hardwarePendingText}>
                  Awaiting ESP32 hardware acknowledgement (ACK)...
                </Text>
              </>
            ) : (
              <>
                <CheckCircle2
                  size={14}
                  color={tank.pump ? COLORS.success : COLORS.muted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.hardwareConfirmedText,
                    { color: tank.pump ? COLORS.success : COLORS.textMuted },
                  ]}
                >
                  Hardware State: Relay GPIO 26 is {tank.pump ? "ON" : "OFF"} • Mode: {tank.mode}
                </Text>
              </>
            )}
          </View>

          {/* Three Command Buttons: Pump ON / Pump OFF / Auto Mode */}
          <View style={styles.controlsRow}>
            {/* 1. Pump ON */}
            <Pressable
              style={[
                styles.pumpActionBtn,
                styles.btnPumpOn,
                tank.pump && tank.mode !== "AUTO" && styles.btnPumpOnActive,
              ]}
              onPress={pumpOnAction}
              disabled={commandInProgress !== null}
            >
              {commandInProgress === "ON" ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Power size={16} color={COLORS.white} style={{ marginRight: 4 }} />
                  <Text style={styles.btnText}>PUMP ON</Text>
                </>
              )}
            </Pressable>

            {/* 2. Pump OFF */}
            <Pressable
              style={[
                styles.pumpActionBtn,
                styles.btnPumpOff,
                !tank.pump && tank.mode !== "AUTO" && styles.btnPumpOffActive,
              ]}
              onPress={pumpOffAction}
              disabled={commandInProgress !== null}
            >
              {commandInProgress === "OFF" ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Power size={16} color={COLORS.white} style={{ marginRight: 4 }} />
                  <Text style={styles.btnText}>PUMP OFF</Text>
                </>
              )}
            </Pressable>

            {/* 3. Auto Mode */}
            <Pressable
              style={[
                styles.pumpActionBtn,
                styles.btnAuto,
                tank.mode === "AUTO" && styles.btnAutoActive,
              ]}
              onPress={autoModeAction}
              disabled={commandInProgress !== null}
            >
              {commandInProgress === "AUTO" ? (
                <ActivityIndicator
                  color={tank.mode === "AUTO" ? COLORS.white : COLORS.primaryDark}
                  size="small"
                />
              ) : (
                <>
                  <Cpu
                    size={16}
                    color={tank.mode === "AUTO" ? COLORS.white : COLORS.primaryDark}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.btnText,
                      tank.mode !== "AUTO" && { color: COLORS.primaryDark },
                    ]}
                  >
                    AUTO
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Real-Time Sensor Telemetry Grid (6 Metrics) */}
        <View style={styles.grid}>
          <StatCard
            icon={<Ruler size={22} color={COLORS.primary} />}
            label="SENSOR DISTANCE"
            value={`${Number(distanceCm).toFixed(1)} cm`}
            subtext="Tank depth: 11.0 cm"
            color={COLORS.primary}
          />
          <StatCard
            icon={<Power size={22} color={tank.pump ? COLORS.success : COLORS.muted} />}
            label="PUMP RELAY"
            value={tank.pump ? "ACTIVE (ON)" : "STANDBY (OFF)"}
            valueColor={tank.pump ? COLORS.success : COLORS.textMuted}
            color={tank.pump ? COLORS.success : COLORS.secondary}
          />
          <StatCard
            icon={<Gauge size={22} color={COLORS.cyan} />}
            label="WATER FLOW RATE"
            value={`${Number(tank.flowRate || 0).toFixed(1)} L/m`}
            subtext={tank.flowRate > 0 ? "Flow active (YF-S402)" : "Idle / No flow"}
            color={COLORS.cyan}
          />
          <StatCard
            icon={<Droplets size={22} color={COLORS.primary} />}
            label="TOTAL PUMPED"
            value={`${Number(tank.totalLiters || 0).toFixed(1)} L`}
            subtext="Cumulative volume"
            color={COLORS.primary}
          />
          <StatCard
            icon={<ShieldCheck size={22} color={tank.tdsPpm > 500 ? COLORS.danger : COLORS.success} />}
            label="WATER QUALITY (TDS)"
            value={`${tank.tdsPpm || 220} ppm`}
            valueColor={tank.tdsPpm > 500 ? COLORS.danger : COLORS.success}
            subtext={tank.tdsPpm > 500 ? "⚠️ High TDS Alarm" : "Ideal (200–230 ppm)"}
            color={tank.tdsPpm > 500 ? COLORS.danger : COLORS.success}
          />
          <StatCard
            icon={<Activity size={22} color={COLORS.accent} />}
            label="CONTROL MODE"
            value={tank.mode}
            valueColor={COLORS.accent}
            subtext={tank.mode === "AUTO" ? "Auto pump rule" : "Manual override"}
            color={COLORS.accent}
          />
        </View>

        {/* Alerts Section with Quick View All */}
        <View style={styles.alertSection}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={styles.sectionTitle}>System Alerts</Text>
              {unreadAlertsCount > 0 && (
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{unreadAlertsCount} new</Text>
                </View>
              )}
            </View>
            <Pressable onPress={() => setNotificationModalVisible(true)}>
              <Text style={styles.viewAllText}>View all ({alerts.length})</Text>
            </Pressable>
          </View>

          {alerts.slice(0, 3).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setNotificationModalVisible(true)}
            >
              <AlertCard
                title={item.title}
                message={item.message}
                severity={item.severity}
                time={item.time}
                isRead={item.isRead}
              />
            </Pressable>
          ))}
        </View>

        {/* Water Conservation Banner */}
        <View style={styles.conservationCard}>
          <Droplets size={26} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.conservationTitle}>Real-Time Sensor Link</Text>
            <Text style={styles.conservationText}>
              Receiving live telemetry from HiveMQ topic:{" "}
              <Text style={{ fontWeight: "bold" }}>
                {`smartwater/${tank.location?.includes("ESP32") ? "ESP32_001" : "ESP32_001"}/telemetry`}
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Premium Notification Modal Sheet */}
      <NotificationModal
        visible={notificationModalVisible}
        onClose={() => setNotificationModalVisible(false)}
        alerts={alerts}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  toastBanner: {
    position: "absolute",
    top: 10,
    left: 16,
    right: 16,
    zIndex: 999,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },
  toastCritical: {
    borderLeftColor: COLORS.danger,
    backgroundColor: "#FEF2F2",
  },
  toastWarning: {
    borderLeftColor: COLORS.warning,
    backgroundColor: "#FFFBEB",
  },
  toastSuccess: {
    borderLeftColor: COLORS.success,
    backgroundColor: "#ECFDF5",
  },
  toastIcon: {
    marginRight: 10,
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  toastText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 35,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  greeting: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  heading: {
    color: COLORS.primaryDark,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  locationText: {
    color: COLORS.muted,
    fontSize: 12,
    marginLeft: 4,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    position: "relative",
    ...SHADOW,
  },
  bellBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#EF4444",
    borderRadius: 11,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: COLORS.white,
    zIndex: 99,
    elevation: 5,
  },
  bellBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "900",
  },
  connectionRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },
  updatedText: {
    color: COLORS.muted,
    fontSize: 11,
  },
  levelCard: {
    marginTop: 16,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },
  cardTitle: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  hardwareStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  hardwarePendingText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
  },
  hardwareConfirmedText: {
    fontSize: 11,
    fontWeight: "700",
  },
  controlsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginTop: 12,
  },
  pumpActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 12,
    ...SHADOW,
  },
  btnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  btnPumpOn: {
    backgroundColor: "#10B981",
  },
  btnPumpOnActive: {
    backgroundColor: "#059669",
    borderWidth: 2,
    borderColor: "#A7F3D0",
  },
  btnPumpOff: {
    backgroundColor: "#EF4444",
  },
  btnPumpOffActive: {
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FECACA",
  },
  btnAuto: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  btnAutoActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 16,
  },
  alertSection: {
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
  },
  sectionBadge: {
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  sectionBadgeText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: "800",
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  conservationCard: {
    flexDirection: "row",
    backgroundColor: COLORS.paleBlue,
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    gap: 12,
    alignItems: "center",
  },
  conservationTitle: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  conservationText: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
});
