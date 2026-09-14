import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, SHADOW } from "../constants/theme";

export default function StatCard({ icon, label, value, subtext, color = COLORS.primary, valueColor }) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
        {icon}
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor || COLORS.text }]}>{value}</Text>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 12,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  subtext: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
});
