import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react-native";
import { COLORS, SHADOW } from "../constants/theme";

export default function AlertCard({
  title,
  message,
  severity = "INFO",
  time,
  isRead = false,
}) {
  let borderColor = COLORS.info;
  let bgColor = COLORS.infoBg;
  let IconComponent = Info;
  let iconColor = COLORS.info;

  if (severity === "CRITICAL" || severity === "DANGER") {
    borderColor = COLORS.danger;
    bgColor = COLORS.dangerBg;
    IconComponent = XCircle;
    iconColor = COLORS.danger;
  } else if (severity === "WARNING") {
    borderColor = COLORS.warning;
    bgColor = COLORS.warningBg;
    IconComponent = AlertTriangle;
    iconColor = COLORS.warning;
  } else if (severity === "NORMAL" || severity === "SUCCESS") {
    borderColor = COLORS.success;
    bgColor = COLORS.successBg;
    IconComponent = CheckCircle2;
    iconColor = COLORS.success;
  }

  return (
    <View
      style={[
        styles.card,
        { borderLeftColor: borderColor },
        isRead && styles.cardRead,
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
        <IconComponent size={20} color={iconColor} />
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.title}>{title}</Text>
            {!isRead && <View style={[styles.glowDot, { backgroundColor: iconColor }]} />}
          </View>
          {time ? <Text style={styles.time}>{time}</Text> : null}
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },
  cardRead: {
    opacity: 0.75,
    backgroundColor: "#F8FAFC",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  glowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  time: {
    fontSize: 11,
    color: COLORS.muted,
  },
  message: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 18,
  },
});
