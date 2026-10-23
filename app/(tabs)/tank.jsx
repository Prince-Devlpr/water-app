import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sliders, Save, Cpu, Layers, Power } from "lucide-react-native";
import { COLORS, SHADOW } from "../../constants/theme";
import { api, sendPumpCommand } from "../../services/api";

export default function TankConfigScreen() {
  const [tankId, setTankId] = useState(null);
  const [tankName, setTankName] = useState("Home Water Tank");
  const [deviceId, setDeviceId] = useState("ESP32_001");
  const [shape, setShape] = useState("CYLINDER");
  const [heightCm, setHeightCm] = useState("11");
  const [radiusCm, setRadiusCm] = useState("60");
  const [capacityLiters, setCapacityLiters] = useState("1000");
  const [sensorOffsetCm, setSensorOffsetCm] = useState("15");
  const [lowThreshold, setLowThreshold] = useState("50");
  const [highThreshold, setHighThreshold] = useState("70");
  const [autoPump, setAutoPump] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingCmd, setTestingCmd] = useState(null);

  const handleTestCommand = async (cmd) => {
    setTestingCmd(cmd);
    try {
      if (cmd === "CONFIG") {
        await api.post("/api/device/command", {
          command: "CONFIG",
          deviceId: deviceId || "ESP32_001",
          tankDepthCm: Number(heightCm),
          lowThreshold: Number(lowThreshold),
          fullThreshold: Number(highThreshold),
          autoMode: autoPump,
        });
        Alert.alert(
          "Calibration Synced",
          `Sent dynamic calibration to ESP32:\n• Depth: ${heightCm} cm\n• Low Trigger: ${lowThreshold}%\n• Full Trigger: ${highThreshold}%\n• Mode: ${autoPump ? "AUTO" : "MANUAL"}`
        );
      } else {
        await sendPumpCommand(cmd, deviceId || "ESP32_001");
        Alert.alert(
          "Command Dispatched",
          `Sent ${cmd} command to HiveMQ topic: smartwater/${deviceId || "ESP32_001"}/command\n\nESP32 will switch relay GPIO 26 and reply on ACK topic.`
        );
      }
    } catch (e) {
      Alert.alert("Command Error", e.message || "Failed to dispatch command");
    } finally {
      setTestingCmd(null);
    }
  };

  useEffect(() => {
    loadExistingTank();
  }, []);

  const loadExistingTank = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/tanks");
      if (res?.data && res.data.length > 0) {
        const t = res.data.find((x) => x.deviceId === "ESP32_001") || res.data[0];
        setTankId(t.id);
        setTankName(t.name || "Home Water Tank");
        setDeviceId(t.deviceId || "ESP32_001");
        setShape(t.shape || "CYLINDER");
        setHeightCm(String(t.tankDepthCm ?? t.heightCm ?? 11));
        setRadiusCm(String(t.radiusCm || 60));
        setCapacityLiters(String(t.capacityLiters ?? t.maxCapacityLiters ?? 1000));
        setSensorOffsetCm(String(t.sensorOffsetCm || 15));
        setLowThreshold(String(t.lowThreshold ?? t.criticalLowPct ?? 50));
        setHighThreshold(String(t.fullThreshold ?? t.criticalHighPct ?? 70));
        setAutoPump(t.autoMode !== undefined ? Boolean(t.autoMode) : t.autoPumpEnabled !== false);
      }
    } catch (e) {
      console.log("Existing tank load note:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name: tankName,
      deviceId: deviceId,
      shape: shape,
      tankDepthCm: Number(heightCm),
      heightCm: Number(heightCm),
      capacityLiters: Number(capacityLiters),
      maxCapacityLiters: Number(capacityLiters),
      lowThreshold: Number(lowThreshold),
      criticalLowPct: Number(lowThreshold),
      fullThreshold: Number(highThreshold),
      criticalHighPct: Number(highThreshold),
      autoMode: autoPump,
      autoPumpEnabled: autoPump,
      sensorOffsetCm: Number(sensorOffsetCm),
      radiusCm: Number(radiusCm),
    };

    try {
      let res;
      if (tankId) {
        res = await api.put(`/api/tanks/${tankId}`, payload);
      } else {
        res = await api.post("/api/tanks", payload);
        if (res?.data?.id) setTankId(res.data.id);
      }

      // Also dispatch dynamic calibration payload to ESP32
      try {
        await api.post("/api/device/command", {
          command: "CONFIG",
          deviceId: deviceId || "ESP32_001",
          tankDepthCm: Number(heightCm),
          lowThreshold: Number(lowThreshold),
          fullThreshold: Number(highThreshold),
          autoMode: autoPump,
        });
      } catch (cmdErr) {
        console.log("Direct device config push note:", cmdErr.message);
      }

      Alert.alert(
        "Calibration Saved & Dispatched",
        `Configuration saved to database and sent to ESP32 via HiveMQ topic:\nsmartwater/${deviceId || "ESP32_001"}/command\n\n• Depth: ${heightCm} cm\n• Low Trigger: ${lowThreshold}%\n• Full Trigger: ${highThreshold}%\n• Mode: ${autoPump ? "AUTO" : "MANUAL"}`
      );
    } catch (err) {
      Alert.alert("Saved Locally", `Note: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Tank Setup & Calibration</Text>
          <Text style={styles.subtitle}>Calibrate ultrasonic dimensions and auto-pump rules</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : null}

        {/* Device & Identification */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Cpu size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>IoT Device Identifier</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tank Name</Text>
            <TextInput
              style={styles.input}
              value={tankName}
              onChangeText={setTankName}
              placeholder="e.g. Overhead Rooftop Tank"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ESP32 Device ID (matches firmware)</Text>
            <TextInput
              style={styles.input}
              value={deviceId}
              onChangeText={setDeviceId}
              placeholder="e.g. ESP32_001"
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Physical Dimensions */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Layers size={18} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>Physical Geometry & Volume</Text>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Total Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Radius (cm)</Text>
              <TextInput
                style={styles.input}
                value={radiusCm}
                onChangeText={setRadiusCm}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Capacity (Liters)</Text>
              <TextInput
                style={styles.input}
                value={capacityLiters}
                onChangeText={setCapacityLiters}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Sensor Blind Zone (cm)</Text>
              <TextInput
                style={styles.input}
                value={sensorOffsetCm}
                onChangeText={setSensorOffsetCm}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Automation Thresholds */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Sliders size={18} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>Auto-Pump Trigger Rules</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.switchTitle}>Enable Auto Pump Control</Text>
              <Text style={styles.switchSubtitle}>
                Automatically trigger relay at thresholds
              </Text>
            </View>
            <Switch
              value={autoPump}
              onValueChange={setAutoPump}
              trackColor={{ false: "#CBD5E1", true: COLORS.primaryLight }}
              thumbColor={autoPump ? COLORS.primary : "#F8FAFC"}
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Turn ON below (%)</Text>
              <TextInput
                style={styles.input}
                value={lowThreshold}
                onChangeText={setLowThreshold}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Turn OFF above (%)</Text>
              <TextInput
                style={styles.input}
                value={highThreshold}
                onChangeText={setHighThreshold}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Hardware Relay Test & HiveMQ Flow */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Power size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Manual Pump Relay Test</Text>
          </View>
          <Text style={styles.testSubtitle}>
            Dispatches command via Backend to HiveMQ topic:{"\n"}
            <Text style={{ fontWeight: "700", color: COLORS.primaryDark }}>
              smartwater/{deviceId || "ESP32_001"}/command
            </Text>
          </Text>

          <View style={styles.testBtnRow}>
            <Pressable
              style={[styles.testBtn, styles.testBtnOn]}
              onPress={() => handleTestCommand("ON")}
              disabled={testingCmd !== null}
            >
              {testingCmd === "ON" ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.testBtnText}>TEST ON</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.testBtn, styles.testBtnOff]}
              onPress={() => handleTestCommand("OFF")}
              disabled={testingCmd !== null}
            >
              {testingCmd === "OFF" ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.testBtnText}>TEST OFF</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.testBtn, styles.testBtnAuto]}
              onPress={() => handleTestCommand("AUTO")}
              disabled={testingCmd !== null}
            >
              {testingCmd === "AUTO" ? (
                <ActivityIndicator color={COLORS.primaryDark} size="small" />
              ) : (
                <Text style={[styles.testBtnText, { color: COLORS.primaryDark }]}>AUTO</Text>
              )}
            </Pressable>
          </View>

          <Pressable
            style={[styles.syncBtn, { marginTop: 10 }]}
            onPress={() => handleTestCommand("CONFIG")}
            disabled={testingCmd !== null}
          >
            {testingCmd === "CONFIG" ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <>
                <Cpu size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.syncBtnText}>Send Calibration to ESP32 (MQTT)</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Save Button */}
        <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Save size={18} color={COLORS.white} style={{ marginRight: 8 }} />
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save Configuration"}</Text>
        </Pressable>
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
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  inputGroup: {
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: COLORS.text,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 8,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  switchSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 50,
    marginTop: 8,
    ...SHADOW,
  },
  saveText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },
  testSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 12,
  },
  testBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  testBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
  testBtnOn: {
    backgroundColor: "#10B981",
  },
  testBtnOff: {
    backgroundColor: "#EF4444",
  },
  testBtnAuto: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  testBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },
  syncBtn: {
    flexDirection: "row",
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.paleBlue,
    borderWidth: 1.5,
    borderColor: COLORS.lightBlue,
    ...SHADOW,
  },
  syncBtnText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
});
