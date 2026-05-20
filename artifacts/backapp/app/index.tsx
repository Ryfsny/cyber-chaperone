import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusRing } from "@/components/StatusRing";
import { useMember, type AppMode } from "@/contexts/MemberContext";
import { useColors } from "@/hooks/useColors";

function formatInterval(seconds: number): string {
  if (seconds >= 3600) return `every ${Math.round(seconds / 3600)}h`;
  if (seconds >= 60) return `every ${Math.round(seconds / 60)}min`;
  return `every ${seconds}s`;
}

function formatTime(date: Date | null): string {
  if (!date) return "Not yet";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function modeLabel(mode: AppMode): string {
  if (mode === "emergency") return "EMERGENCY";
  if (mode === "trip") return "ON TRIP";
  return "STANDING BY";
}

function modeSubtitle(mode: AppMode, intervalSeconds: number): string {
  if (mode === "emergency") return `Pinging operator ${formatInterval(intervalSeconds)}`;
  if (mode === "trip") return `Location shared ${formatInterval(intervalSeconds)}`;
  return `Monitoring ${formatInterval(intervalSeconds)}`;
}

function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setupPhone } = useMember();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSetup() {
    const cleaned = input.replace(/\s/g, "");
    if (cleaned.length < 9) {
      setError("Enter your full WhatsApp number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await setupPhone(cleaned);
    } catch {
      setError("Could not connect — check your network");
    } finally {
      setLoading(false);
    }
  }

  const webTop = Platform.OS === "web" ? 67 : 0;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.setupContainer,
          { paddingTop: insets.top + 40 + webTop, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.setupLogoRow}>
          <View style={[styles.logoBox, { backgroundColor: colors.navy }]}>
            <Feather name="shield" size={48} color={colors.green} />
          </View>
        </View>

        <Text style={[styles.setupTitle, { color: colors.foreground }]}>BackApp</Text>
        <Text style={[styles.setupSubtitle, { color: colors.mutedForeground }]}>
          Cyber Shepherd — eblockwatch
        </Text>

        <View style={[styles.setupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.setupLabel, { color: colors.mutedForeground }]}>
            YOUR WHATSAPP NUMBER
          </Text>
          <TextInput
            style={[styles.setupInput, { color: colors.foreground, borderColor: error ? colors.destructive : colors.border }]}
            placeholder="+27 82 561 1065"
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={(t) => { setInput(t); setError(""); }}
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={handleSetup}
            autoFocus
          />
          {error ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          ) : (
            <Text style={[styles.setupHint, { color: colors.mutedForeground }]}>
              Links you to your eblockwatch membership
            </Text>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.setupButton,
            { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1 },
          ]}
          onPress={handleSetup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.setupButtonText, { color: colors.primaryForeground }]}>
              Connect
            </Text>
          )}
        </Pressable>

        <Text style={[styles.setupFooter, { color: colors.mutedForeground }]}>
          No app store needed. Runs quietly in the background.{"\n"}
          Your operator can see your location only when you tap Start Trip.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SettingsSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { phone, memberName, mode, intervalSeconds, clearPhone } = useMember();
  const [confirming, setConfirming] = useState(false);

  if (!visible) return null;

  const webTop = Platform.OS === "web" ? 67 : 0;

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: colors.background, zIndex: 100, paddingTop: insets.top + webTop },
      ]}
    >
      <View style={[styles.settingsHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.settingsTitle, { color: colors.foreground }]}>Settings</Text>
        <Pressable onPress={onClose} hitSlop={20}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}>
        <View style={[styles.settingsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="user" size={18} color={colors.mutedForeground} />
          <View style={styles.settingsRowText}>
            <Text style={[styles.settingsRowLabel, { color: colors.mutedForeground }]}>MEMBER</Text>
            <Text style={[styles.settingsRowValue, { color: colors.foreground }]}>
              {memberName ?? phone ?? "—"}
            </Text>
          </View>
        </View>
        <View style={[styles.settingsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="phone" size={18} color={colors.mutedForeground} />
          <View style={styles.settingsRowText}>
            <Text style={[styles.settingsRowLabel, { color: colors.mutedForeground }]}>WHATSAPP</Text>
            <Text style={[styles.settingsRowValue, { color: colors.foreground }]}>{phone ?? "—"}</Text>
          </View>
        </View>
        <View style={[styles.settingsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="radio" size={18} color={colors.mutedForeground} />
          <View style={styles.settingsRowText}>
            <Text style={[styles.settingsRowLabel, { color: colors.mutedForeground }]}>PING INTERVAL</Text>
            <Text style={[styles.settingsRowValue, { color: colors.foreground }]}>
              {formatInterval(intervalSeconds)} · {mode.toUpperCase()} mode
            </Text>
          </View>
        </View>
        <View style={[styles.settingsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="info" size={18} color={colors.mutedForeground} />
          <View style={styles.settingsRowText}>
            <Text style={[styles.settingsRowLabel, { color: colors.mutedForeground }]}>HOW IT WORKS</Text>
            <Text style={[styles.settingsRowValue, { color: colors.foreground }]}>
              Idle: ping every 2h{"\n"}On Trip: ping every 1min{"\n"}Emergency: ping every 30s
            </Text>
          </View>
        </View>

        {!confirming ? (
          <Pressable
            style={[styles.dangerButton, { borderColor: colors.destructive }]}
            onPress={() => setConfirming(true)}
          >
            <Text style={[styles.dangerButtonText, { color: colors.destructive }]}>
              Unlink this device
            </Text>
          </Pressable>
        ) : (
          <View style={styles.confirmRow}>
            <Pressable
              style={[styles.confirmButton, { backgroundColor: colors.destructive }]}
              onPress={async () => { await clearPhone(); onClose(); }}
            >
              <Text style={[styles.confirmButtonText, { color: "#fff" }]}>Yes, unlink</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => setConfirming(false)}
            >
              <Text style={[styles.confirmButtonText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { mode, intervalSeconds, lastPingAt, lastLat, lastLon, setupComplete, startTrip, stopTrip, permissionGranted, requestLocationPermission } = useMember();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 10000);
    return () => clearInterval(t);
  }, []);

  if (!setupComplete) return <SetupScreen />;

  const webTop = Platform.OS === "web" ? 67 : 0;
  const modeColor = mode === "emergency" ? colors.emergency : mode === "trip" ? colors.trip : colors.idle;

  async function handleAction() {
    setActionLoading(true);
    try {
      if (mode === "trip") {
        await stopTrip();
      } else {
        if (!permissionGranted) {
          await requestLocationPermission();
        }
        await startTrip();
      }
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + webTop,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.logoRow}>
          <Feather name="shield" size={20} color={colors.green} />
          <Text style={[styles.logoText, { color: colors.foreground }]}>BackApp</Text>
        </View>
        <Pressable onPress={() => setSettingsOpen(true)} hitSlop={20}>
          <Feather name="settings" size={22} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) }]}>
        <View style={styles.ringSection}>
          <StatusRing mode={mode} size={160} />
        </View>

        <View style={styles.statusSection}>
          <Text style={[styles.modeLabel, { color: modeColor }]}>
            {modeLabel(mode)}
          </Text>
          <Text style={[styles.modeSubtitle, { color: colors.mutedForeground }]}>
            {modeSubtitle(mode, intervalSeconds)}
          </Text>

          {lastPingAt && (
            <View style={[styles.pingBadge, { backgroundColor: colors.navyLight }]}>
              <Feather name="navigation" size={12} color={colors.mutedForeground} />
              <Text style={[styles.pingText, { color: colors.mutedForeground }]}>
                Last ping {formatTime(lastPingAt)}
                {lastLat != null ? ` · ${lastLat.toFixed(4)}, ${lastLon?.toFixed(4)}` : ""}
              </Text>
            </View>
          )}
        </View>

        {mode !== "emergency" && (
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: mode === "trip" ? colors.navyLight : colors.primary,
                borderColor: mode === "trip" ? colors.destructive : colors.primary,
                borderWidth: mode === "trip" ? 2 : 0,
                opacity: pressed || actionLoading ? 0.8 : 1,
              },
            ]}
            onPress={handleAction}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color={mode === "trip" ? colors.destructive : colors.primaryForeground} />
            ) : (
              <>
                <Feather
                  name={mode === "trip" ? "square" : "play"}
                  size={20}
                  color={mode === "trip" ? colors.destructive : colors.primaryForeground}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: mode === "trip" ? colors.destructive : colors.primaryForeground },
                  ]}
                >
                  {mode === "trip" ? "End Trip" : "Start Trip"}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {mode === "emergency" && (
          <View style={[styles.emergencyBanner, { backgroundColor: `${colors.emergency}18`, borderColor: colors.emergency }]}>
            <Feather name="alert-triangle" size={18} color={colors.emergency} />
            <Text style={[styles.emergencyText, { color: colors.emergency }]}>
              Emergency mode — your operator is monitoring you
            </Text>
          </View>
        )}

        <View style={styles.statusGrid}>
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="radio" size={16} color={colors.green} />
            <Text style={[styles.statusCardValue, { color: colors.foreground }]}>
              {formatInterval(intervalSeconds)}
            </Text>
            <Text style={[styles.statusCardLabel, { color: colors.mutedForeground }]}>interval</Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="navigation" size={16} color={colors.trip} />
            <Text style={[styles.statusCardValue, { color: colors.foreground }]}>
              {lastPingAt ? formatTime(lastPingAt) : "—"}
            </Text>
            <Text style={[styles.statusCardLabel, { color: colors.mutedForeground }]}>last ping</Text>
          </View>
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name={permissionGranted ? "check-circle" : "alert-circle"} size={16} color={permissionGranted ? colors.idle : colors.warning} />
            <Text style={[styles.statusCardValue, { color: colors.foreground }]}>
              {permissionGranted ? "On" : "Off"}
            </Text>
            <Text style={[styles.statusCardLabel, { color: colors.mutedForeground }]}>location</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  body: { flex: 1, paddingHorizontal: 24 },
  ringSection: { alignItems: "center", paddingVertical: 32 },
  statusSection: { alignItems: "center", gap: 8, marginBottom: 32 },
  modeLabel: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  modeSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  pingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  pingText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  actionButtonText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emergencyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  emergencyText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  statusGrid: { flexDirection: "row", gap: 12 },
  statusCard: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusCardValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  statusCardLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  setupContainer: { paddingHorizontal: 24, alignItems: "center" },
  setupLogoRow: { marginBottom: 24 },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  setupTitle: { fontSize: 32, fontFamily: "Inter_700Bold", marginBottom: 8 },
  setupSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 40, textAlign: "center" },
  setupCard: {
    width: "100%",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  setupLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  setupInput: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  setupHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  setupButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  setupButtonText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  setupFooter: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  settingsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  settingsRowText: { flex: 1, gap: 4 },
  settingsRowLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  settingsRowValue: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  dangerButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  dangerButtonText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  confirmRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
