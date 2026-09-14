import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  CheckCircle2,
  Cloud,
  Globe,
  LogOut,
  Radio,
  Server,
  Shield,
  User,
  Wifi,
} from "lucide-react-native";
import { COLORS, SHADOW } from "../../constants/theme";
import { api, getApiBaseUrl, setApiBaseUrl, setAuthToken } from "../../services/api";

export default function SettingsScreen() {
  const router = useRouter();
  const [backendUrl, setBackendUrl] = useState(getApiBaseUrl());
  const [userProfile, setUserProfile] = useState({ name: "Prince (Admin)", email: "prince@example.com" });
  const [healthStatus, setHealthStatus] = useState({ database: "connected", mqtt: "connected", status: "ok" });
  const [loadingHealth, setLoadingHealth] = useState(false);

  useEffect(() => {
    loadHealthAndProfile();
  }, [backendUrl]);

  const loadHealthAndProfile = async () => {
    setLoadingHealth(true);
    try {
      // 1. Check health
      const health = await api.get("/health");
      if (health?.services) {
        setHealthStatus({
          database: health.services.database || "connected",
          mqtt: health.services.mqtt || "connected",
          status: health.status || "ok",
        });
      }

      // 2. Check profile
      try {
        const me = await api.get("/api/auth/me");
        if (me?.data) {
          setUserProfile({
            name: me.data.name || "Prince (Admin)",
            email: me.data.email || "prince@example.com",
          });
        }
      } catch (e) {
        // user might be in demo session
      }
    } catch (err) {
      console.log("Health check note:", err.message);
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleUpdateUrl = (url) => {
    setBackendUrl(url);
    setApiBaseUrl(url);
    Alert.alert("Backend URL Updated", `App is now communicating with:\n${url}`);
  };

  const handleLogout = () => {
    setAuthToken(null);
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>System Settings</Text>
          <Text style={styles.subtitle}>Cloud connectivity and hardware status</Text>
        </View>

        {/* Backend Environment Selector */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Server size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Backend API Target</Text>
          </View>

          <Text style={styles.cardDesc}>Select which backend your app communicates with:</Text>

          <Pressable
            style={[
              styles.presetButton,
              backendUrl === "https://water-p.onrender.com" && styles.presetButtonActive,
            ]}
            onPress={() => handleUpdateUrl("https://water-p.onrender.com")}
          >
            <Cloud
              size={18}
              color={
                backendUrl === "https://water-p.onrender.com"
                  ? COLORS.primary
                  : COLORS.muted
              }
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.presetName}>Render Live Cloud</Text>
              <Text style={styles.presetUrl}>https://water-p.onrender.com</Text>
            </View>
            {backendUrl === "https://water-p.onrender.com" && (
              <CheckCircle2 size={18} color={COLORS.success} />
            )}
          </Pressable>

          <Pressable
            style={[
              styles.presetButton,
              backendUrl === "http://localhost:5000" && styles.presetButtonActive,
            ]}
            onPress={() => handleUpdateUrl("http://localhost:5000")}
          >
            <Globe
              size={18}
              color={
                backendUrl === "http://localhost:5000" ? COLORS.primary : COLORS.muted
              }
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.presetName}>Local Development Server</Text>
              <Text style={styles.presetUrl}>http://localhost:5000</Text>
            </View>
            {backendUrl === "http://localhost:5000" && (
              <CheckCircle2 size={18} color={COLORS.success} />
            )}
          </Pressable>

          <View style={styles.customUrlWrapper}>
            <Text style={styles.inputLabel}>Custom Host / IP Address:</Text>
            <TextInput
              style={styles.input}
              value={backendUrl}
              onChangeText={setBackendUrl}
              placeholder="e.g. http://192.168.1.50:5000"
              autoCapitalize="none"
              onEndEditing={() => setApiBaseUrl(backendUrl)}
            />
          </View>
        </View>

        {/* Live Infrastructure Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Radio size={18} color={COLORS.secondary} />
            <Text style={styles.cardTitle}>Live Infrastructure Status</Text>
            {loadingHealth && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: "auto" }} />}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Database (PostgreSQL)</Text>
            <Text style={[styles.infoValue, { color: healthStatus.database === "connected" ? COLORS.success : COLORS.danger }]}>
              {healthStatus.database === "connected" ? "🟢 Connected" : "🔴 Disconnected"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>HiveMQ Cloud MQTT</Text>
            <Text style={[styles.infoValue, { color: healthStatus.mqtt === "connected" ? COLORS.success : COLORS.danger }]}>
              {healthStatus.mqtt === "connected" ? "🟢 TLS 8883 Connected" : "🔴 Disconnected"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telemetry Topic</Text>
            <Text style={styles.infoValue}>smartwater/+/telemetry</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Relay Command Topic</Text>
            <Text style={styles.infoValue}>smartwater/+/command/pump</Text>
          </View>
        </View>

        {/* User Profile / Logout */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={18} color={COLORS.accent} />
            <Text style={styles.cardTitle}>Security & Account</Text>
          </View>

          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <User size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{userProfile.name}</Text>
              <Text style={styles.userEmail}>{userProfile.email}</Text>
            </View>
          </View>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={16} color={COLORS.danger} style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Sign Out / Switch User</Text>
          </Pressable>
        </View>
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
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 12,
  },
  presetButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: 10,
  },
  presetButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.paleBlue,
  },
  presetName: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  presetUrl: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  customUrlWrapper: {
    marginTop: 6,
  },
  inputLabel: {
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
    height: 42,
    fontSize: 13,
    color: COLORS.text,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    paddingVertical: 6,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.paleBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.muted,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.dangerBg,
    borderRadius: 14,
    height: 44,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "800",
  },
});
