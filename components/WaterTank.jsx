import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants/theme";

export default function WaterTank({
  percentage = 70,
  currentLiters = 700,
  capacity = 1000,
  height = 200,
  width = 160,
  criticalLow = 20,
  criticalHigh = 90,
}) {
  const safePercentage = Math.min(100, Math.max(0, Number(percentage) || 0));
  const waterHeight = (safePercentage / 100) * (height - 16);

  // Determine water color based on levels
  let waterColor = COLORS.primary;
  let gradientTop = COLORS.primaryLight;
  if (safePercentage <= criticalLow) {
    waterColor = COLORS.danger;
    gradientTop = "#FCA5A5";
  } else if (safePercentage >= criticalHigh) {
    waterColor = "#0284C7";
    gradientTop = "#38BDF8";
  }

  return (
    <View style={[styles.container, { width }]}>
      {/* Tank Top Cap */}
      <View style={[styles.tankCap, { width: width * 0.45 }]} />

      {/* Tank Body Cylinder */}
      <View style={[styles.tankBody, { width, height }]}>
        {/* Threshold Markers */}
        <View style={[styles.markerLine, { top: `${100 - criticalHigh}%`, borderColor: COLORS.warning }]}>
          <Text style={[styles.markerText, { color: COLORS.warning }]}>{criticalHigh}% Max</Text>
        </View>
        <View style={[styles.markerLine, { top: `${100 - criticalLow}%`, borderColor: COLORS.danger }]}>
          <Text style={[styles.markerText, { color: COLORS.danger }]}>{criticalLow}% Min</Text>
        </View>

        {/* Water Volume Fill */}
        <View
          style={[
            styles.waterFill,
            {
              height: waterHeight,
              backgroundColor: waterColor,
            },
          ]}
        >
          {/* Wave/Highlight surface */}
          <View style={[styles.waterSurface, { backgroundColor: gradientTop }]} />
        </View>

        {/* Center Percentage & Liters Badge */}
        <View style={styles.centerBadge}>
          <Text style={styles.percentText}>{safePercentage.toFixed(1)}%</Text>
          <Text style={styles.volumeText}>
            {Math.round(currentLiters)} / {Math.round(capacity)} L
          </Text>
        </View>
      </View>

      {/* Tank Base Stand */}
      <View style={[styles.tankBase, { width: width * 0.85 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  tankCap: {
    height: 12,
    backgroundColor: "#94A3B8",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 2,
    borderColor: "#64748B",
  },
  tankBody: {
    borderWidth: 4,
    borderColor: "#CBD5E1",
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
    justifyContent: "flex-end",
    position: "relative",
  },
  markerLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderStyle: "dashed",
    zIndex: 5,
    paddingHorizontal: 6,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  markerText: {
    fontSize: 9,
    fontWeight: "700",
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 4,
    borderRadius: 4,
    top: -6,
  },
  waterFill: {
    width: "100%",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    position: "relative",
  },
  waterSurface: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    opacity: 0.8,
  },
  centerBadge: {
    position: "absolute",
    top: "38%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    paddingVertical: 6,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  percentText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
  },
  volumeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 2,
  },
  tankBase: {
    height: 8,
    backgroundColor: "#64748B",
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    marginTop: 2,
  },
});
