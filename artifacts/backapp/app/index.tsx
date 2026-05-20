import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import { useMember, type AppMode } from "@/contexts/MemberContext";
import { useColors } from "@/hooks/useColors";

function formatInterval(seconds: number): string {
  if (seconds >= 3600) return `every ${Math.round(seconds / 3600)}h`;
  if (seconds >= 60) return `every ${Math.round(seconds / 60)} min`;
  return `every ${seconds}s`;
}

function formatTime(date: Date | null): string {
  if (!date) return "";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function BigButton({
  mode,
  loading,
  onPress,
}: {
  mode: AppMode;
  loading: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const btnColor =
    mode === "emergency"
      ? "#c0392b"
      : mode === "trip"
      ? "#1e6fa8"
      : "#c0392b";

  useEffect(() => {
    animRef.current?.stop();
    const duration = mode === "emergency" ? 700 : mode === "trip" ? 1400 : 2800;
    animRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animRef.current.start();
    return () => { animRef.current?.stop(); };
  }, [mode, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 0.15, 0] });

  return (
    <Pressable
      style={({ pressed }) => [styles.bigBtnWrapper, { opacity: pressed ? 0.9 : 1 }]}
      onPress={onPress}
      disabled={loading}
    >
      <Animated.View
        style={[
          styles.bigBtnRing,
          {
            borderColor: btnColor,
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          },
        ]}
      />
      <View style={[styles.bigBtn, { backgroundColor: btnColor }]}>
        {loading ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <>
            <Text style={styles.bigBtnLabel}>BackApp</Text>
            {mode === "trip" && (
              <Text style={styles.bigBtnSub}>Tap to end trip</Text>
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setupPhone } = useMember();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const webTop = Platform.OS === "web" ? 67 : 0;

  async function handleSetup() {
    const cleaned = input.replace(/\s/g, "");
    if (cleaned.length < 9) { setError("Enter your full WhatsApp number"); return; }
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

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: "#fff" }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.setupContainer,
          { paddingTop: insets.top + webTop + 32, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require("../assets/images/eblockwatch-logo.jpeg")}
          style={styles.logoImg}
          contentFit="contain"
        />
        <Text style={styles.setupAppName}>BackApp</Text>
        <Text style={styles.setupTagline}>eblockwatch Cyber Shepherd</Text>

        <View style={styles.setupCard}>
          <Text style={styles.setupLabel}>YOUR WHATSAPP NUMBER</Text>
          <TextInput
            style={[styles.setupInput, error ? { borderColor: "#e74c3c" } : {}]}
            placeholder="+27 82 561 1065"
            placeholderTextColor="#aaa"
            value={input}
            onChangeText={(t) => { setInput(t); setError(""); }}
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={handleSetup}
            autoFocus
          />
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.setupHint}>Links you to your eblockwatch membership</Text>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [styles.setupButton, { opacity: pressed || loading ? 0.8 : 1 }]}
          onPress={handleSetup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.setupButtonText}>Connect</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { phone, memberName, mode, intervalSeconds, clearPhone } = useMember();
  const [confirming, setConfirming] = useState(false);
  const webTop = Platform.OS === "web" ? 67 : 0;

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#fff", zIndex: 100, paddingTop: insets.top + webTop }]}>
      <View style={styles.settingsHeader}>
        <Text style={styles.settingsTitle}>Setup</Text>
        <Pressable onPress={onClose} hitSlop={20}>
          <Feather name="x" size={24} color="#1a1f2e" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>MEMBER</Text>
          <Text style={styles.settingValue}>{memberName ?? phone ?? "—"}</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>WHATSAPP NUMBER</Text>
          <Text style={styles.settingValue}>{phone ?? "—"}</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>CURRENT MODE</Text>
          <Text style={styles.settingValue}>{mode.toUpperCase()} · {formatInterval(intervalSeconds)}</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>HOW IT WORKS</Text>
          <Text style={styles.settingValue}>
            {"Standing by: ping every 2h\nFollow Me (trip): ping every 1min\nEmergency: ping every 30s"}
          </Text>
        </View>

        {!confirming ? (
          <Pressable style={styles.unlinkBtn} onPress={() => setConfirming(true)}>
            <Text style={styles.unlinkText}>Unlink this device</Text>
          </Pressable>
        ) : (
          <View style={styles.confirmRow}>
            <Pressable style={[styles.confirmBtn, { backgroundColor: "#e74c3c" }]} onPress={async () => { await clearPhone(); onClose(); }}>
              <Text style={styles.confirmBtnText}>Yes, unlink</Text>
            </Pressable>
            <Pressable style={[styles.confirmBtn, { backgroundColor: "#f0f0f0" }]} onPress={() => setConfirming(false)}>
              <Text style={[styles.confirmBtnText, { color: "#333" }]}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function DestinationSheet({
  visible,
  onClose,
  onGo,
}: {
  visible: boolean;
  onClose: () => void;
  onGo: (dest: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [dest, setDest] = useState("");
  const webTop = Platform.OS === "web" ? 67 : 0;

  function handleGo() {
    const trimmed = dest.trim();
    if (!trimmed) return;
    onGo(trimmed);
    setDest("");
  }

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      style={[StyleSheet.absoluteFillObject, { backgroundColor: "#fff", zIndex: 200 }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.settingsHeader, { paddingTop: insets.top + webTop + 8 }]}>
        <Text style={styles.settingsTitle}>Where are you going?</Text>
        <Pressable onPress={onClose} hitSlop={20}>
          <Feather name="x" size={24} color="#1a1f2e" />
        </Pressable>
      </View>

      <View style={{ padding: 24, flex: 1 }}>
        <Text style={{ fontSize: 13, color: "#888", marginBottom: 10, fontFamily: "Inter_400Regular" }}>
          Type the name of your destination — suburb, restaurant, or address.
        </Text>
        <TextInput
          style={[styles.setupInput, { fontSize: 18, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 14 }]}
          placeholder="e.g. Sandton City, Latinos Sandton"
          placeholderTextColor="#bbb"
          value={dest}
          onChangeText={setDest}
          returnKeyType="go"
          onSubmitEditing={handleGo}
          autoFocus
        />

        <Pressable
          style={({ pressed }) => [
            styles.setupButton,
            { marginTop: 20, backgroundColor: dest.trim() ? "#c0392b" : "#ccc", opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={handleGo}
          disabled={!dest.trim()}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Feather name="navigation" size={18} color="#fff" />
            <Text style={styles.setupButtonText}>Let's Go</Text>
          </View>
        </Pressable>

        <Text style={{ fontSize: 12, color: "#bbb", marginTop: 16, textAlign: "center", fontFamily: "Inter_400Regular" }}>
          The Situation Room will receive your route, ETA, and live location updates.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { mode, intervalSeconds, lastPingAt, isTracking, setupComplete, startTrip, stopTrip, permissionGranted, requestLocationPermission } = useMember();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 15000);
    return () => clearInterval(t);
  }, []);

  if (!setupComplete) return <SetupScreen />;

  const webTop = Platform.OS === "web" ? 67 : 0;
  const isActive = mode === "trip" || mode === "emergency";

  async function handleBigButton() {
    if (isActive) {
      setActionLoading(true);
      try { await stopTrip(); } finally { setActionLoading(false); }
    } else {
      // Show destination sheet before starting
      if (!permissionGranted) await requestLocationPermission();
      setDestOpen(true);
    }
  }

  async function handleGo(dest: string) {
    setDestOpen(false);
    setActionLoading(true);
    try { await startTrip(dest); } finally { setActionLoading(false); }
  }

  return (
    <View style={[styles.flex, { backgroundColor: "#fff" }]}>
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <View style={[styles.topSafe, { paddingTop: insets.top + webTop }]}>
        <Image
          source={require("../assets/images/eblockwatch-logo.jpeg")}
          style={styles.headerLogo}
          contentFit="contain"
        />
        <Text style={styles.headerAppName}>BackApp</Text>
      </View>

      <Pressable
        style={[
          styles.followMeBar,
          isActive && styles.followMeBarActive,
        ]}
        onPress={handleBigButton}
        disabled={actionLoading}
      >
        <View style={styles.followMeLeft}>
          <Feather
            name="navigation"
            size={18}
            color={isActive ? "#fff" : "#1a3ca8"}
          />
          <Text style={[styles.followMeText, isActive && styles.followMeTextActive]}>
            {mode === "emergency" ? "Emergency Active" : isActive ? "Follow Me — Active" : "Follow Me"}
          </Text>
        </View>
        <Pressable onPress={() => setSettingsOpen(true)} hitSlop={16}>
          <Text style={[styles.setupLink, isActive && { color: "#ddd" }]}>Setup</Text>
        </Pressable>
      </Pressable>

      <View style={styles.body}>
        <BigButton mode={mode} loading={actionLoading} onPress={handleBigButton} />

        <View style={styles.statusRow}>
          {lastPingAt ? (
            <View style={styles.pingRow}>
              <Feather name="radio" size={13} color="#888" />
              <Text style={styles.pingText}>
                Last ping {formatTime(lastPingAt)} · {formatInterval(intervalSeconds)}
              </Text>
            </View>
          ) : (
            <View style={styles.pingRow}>
              <Feather name="radio" size={13} color="#bbb" />
              <Text style={[styles.pingText, { color: "#bbb" }]}>
                {isTracking ? "Acquiring location…" : "Tap BackApp to start tracking"}
              </Text>
            </View>
          )}
        </View>

        {mode === "emergency" && (
          <View style={styles.emergencyBanner}>
            <Feather name="alert-triangle" size={16} color="#c0392b" />
            <Text style={styles.emergencyText}>
              Emergency mode — your operator is monitoring you
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) }]}>
        <Text style={styles.footerText}>eblockwatch · Cyber Shepherd · 24/7 Protection</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  topSafe: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerLogo: {
    width: 200,
    height: 64,
    marginBottom: 2,
  },
  headerAppName: {
    fontSize: 13,
    color: "#888",
    fontFamily: "Inter_400Regular",
    letterSpacing: 1,
    textAlign: "right",
    alignSelf: "flex-end",
    marginRight: 4,
    marginTop: -6,
  },

  followMeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    borderWidth: 2,
    borderColor: "#1a3ca8",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    marginBottom: 4,
  },
  followMeBarActive: {
    backgroundColor: "#1a3ca8",
    borderColor: "#1a3ca8",
  },
  followMeLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  followMeText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#1a3ca8",
  },
  followMeTextActive: { color: "#fff" },
  setupLink: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#1a3ca8",
  },

  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  bigBtnWrapper: {
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  bigBtnRing: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 3,
  },
  bigBtn: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  bigBtnLabel: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  bigBtnSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
  },

  statusRow: { alignItems: "center", minHeight: 28 },
  pingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  pingText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#888" },

  emergencyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    backgroundColor: "#fdf0f0",
    borderColor: "#c0392b",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emergencyText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#c0392b",
    flex: 1,
  },

  footer: {
    paddingVertical: 12,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e5e5",
  },
  footerText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#ccc" },

  setupContainer: { paddingHorizontal: 24, alignItems: "center" },
  logoImg: { width: 220, height: 70, marginBottom: 8 },
  setupAppName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#1a1f2e", marginBottom: 4 },
  setupTagline: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#888", marginBottom: 36, textAlign: "center" },
  setupCard: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    gap: 12,
    backgroundColor: "#fafafa",
  },
  setupLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#999", letterSpacing: 1 },
  setupInput: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 10,
    color: "#1a1f2e",
  },
  setupHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#aaa" },
  errorText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#e74c3c" },
  setupButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#1a3ca8",
    marginBottom: 24,
  },
  setupButtonText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff" },

  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  settingsTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: "#1a1f2e" },
  settingRow: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fafafa",
    gap: 4,
  },
  settingLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#aaa", letterSpacing: 1 },
  settingValue: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#1a1f2e", lineHeight: 22 },
  unlinkBtn: { marginTop: 20, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: "#e74c3c", alignItems: "center" },
  unlinkText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#e74c3c" },
  confirmRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: "center" },
  confirmBtnText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#fff" },
});
