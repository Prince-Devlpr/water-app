import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react-native";
import { COLORS, SHADOW } from "../constants/theme";

export default function NotificationModal({
  visible,
  onClose,
  alerts = [],
  onMarkAsRead,
  onMarkAllAsRead,
}) {
  const [filter, setFilter] = useState("ALL"); // ALL, UNREAD, CRITICAL, WARNING, INFO

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "ALL") return true;
    if (filter === "UNREAD") return !a.isRead;
    if (filter === "CRITICAL") return a.severity === "CRITICAL" || a.severity === "DANGER";
    if (filter === "WARNING") return a.severity === "WARNING";
    if (filter === "INFO") return a.severity === "INFO" || a.severity === "NORMAL" || a.severity === "SUCCESS";
    return true;
  });

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Top Grab Bar */}
          <View style={styles.grabBar} />

          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <Bell size={20} color={COLORS.primary} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <View>
                <Text style={styles.title}>System Alerts & Notifications</Text>
                <Text style={styles.subtitle}>
                  {unreadCount > 0
                    ? `${unreadCount} unacknowledged alert${unreadCount > 1 ? "s" : ""}`
                    : "All alerts acknowledged"}
                </Text>
              </View>
            </View>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={20} color={COLORS.muted} />
            </Pressable>
          </View>

          {/* Filter Chips & Mark All Read */}
          <View style={styles.actionsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
              {["ALL", "UNREAD", "CRITICAL", "WARNING"].map((f) => (
                <Pressable
                  key={f}
                  style={[styles.chip, filter === f && styles.chipActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                    {f}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {alerts.length > 0 && (
              <Pressable style={styles.markAllButton} onPress={onMarkAllAsRead}>
                <CheckCheck size={15} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.markAllText}>Mark all read</Text>
              </Pressable>
            )}
          </View>

          {/* Alerts List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          >
            {filteredAlerts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <CheckCircle2 size={48} color={COLORS.success} />
                <Text style={styles.emptyTitle}>No Alerts to Display</Text>
                <Text style={styles.emptyText}>
                  Your water monitoring system is operating smoothly within safety limits.
                </Text>
              </View>
            ) : (
              filteredAlerts.map((item) => {
                let badgeBg = COLORS.infoBg;
                let badgeColor = COLORS.info;
                let IconComp = Info;

                if (item.severity === "CRITICAL" || item.severity === "DANGER") {
                  badgeBg = COLORS.dangerBg;
                  badgeColor = COLORS.danger;
                  IconComp = XCircle;
                } else if (item.severity === "WARNING") {
                  badgeBg = COLORS.warningBg;
                  badgeColor = COLORS.warning;
                  IconComp = AlertTriangle;
                } else if (item.severity === "NORMAL" || item.severity === "SUCCESS") {
                  badgeBg = COLORS.successBg;
                  badgeColor = COLORS.success;
                  IconComp = CheckCircle2;
                }

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.alertItem,
                      { borderLeftColor: badgeColor },
                      item.isRead && styles.alertItemRead,
                    ]}
                  >
                    <View style={[styles.alertIconBox, { backgroundColor: badgeBg }]}>
                      <IconComp size={20} color={badgeColor} />
                    </View>

                    <View style={styles.alertBody}>
                      <View style={styles.alertHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.alertTitle}>{item.title}</Text>
                          {!item.isRead && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.alertTime}>{item.time || "Just now"}</Text>
                      </View>

                      <Text style={styles.alertMessage}>{item.message}</Text>

                      {!item.isRead && onMarkAsRead && (
                        <Pressable
                          style={styles.ackButton}
                          onPress={() => onMarkAsRead(item.id)}
                        >
                          <Text style={styles.ackButtonText}>Acknowledge</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    minHeight: "55%",
    paddingBottom: 30,
    ...SHADOW,
  },
  grabBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.paleBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "900",
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  chipsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  alertItem: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },
  alertItemRead: {
    opacity: 0.65,
    backgroundColor: "#F8FAFC",
  },
  alertIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  alertBody: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  alertTime: {
    fontSize: 11,
    color: COLORS.muted,
  },
  alertMessage: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  ackButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.paleBlue,
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
  },
  ackButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 240,
    lineHeight: 18,
  },
});
