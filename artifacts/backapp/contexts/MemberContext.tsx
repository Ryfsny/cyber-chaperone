import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

export type AppMode = "idle" | "trip" | "emergency";

interface MemberState {
  phone: string | null;
  memberName: string | null;
  mode: AppMode;
  intervalSeconds: number;
  lastPingAt: Date | null;
  lastLat: number | null;
  lastLon: number | null;
  isTracking: boolean;
  permissionGranted: boolean;
  setupComplete: boolean;
}

interface MemberActions {
  setupPhone: (phone: string) => Promise<void>;
  startTrip: () => Promise<void>;
  stopTrip: () => Promise<void>;
  requestLocationPermission: () => Promise<boolean>;
  clearPhone: () => Promise<void>;
}

const MemberContext = createContext<(MemberState & MemberActions) | null>(null);

const BASE_URL = `https://${process.env["EXPO_PUBLIC_DOMAIN"]}`;
const INTERVALS: Record<AppMode, number> = {
  idle: 7200,
  trip: 60,
  emergency: 30,
};

async function sendPing(phone: string, lat: number, lon: number, accuracy?: number) {
  try {
    const res = await fetch(`${BASE_URL}/api/backapp/ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, lat, lon, accuracy }),
    });
    if (res.ok) {
      const data = (await res.json()) as { mode: AppMode; intervalSeconds: number };
      return data;
    }
  } catch {
    // best-effort — network may be offline
  }
  return null;
}

async function getLocationNative(): Promise<{ lat: number; lon: number; accuracy: number | null } | null> {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      lat: loc.coords.latitude,
      lon: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
    };
  } catch {
    return null;
  }
}

function getLocationWeb(): Promise<{ lat: number; lon: number; accuracy: number | null } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { timeout: 10000, maximumAge: 30000 },
    );
  });
}

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const [phone, setPhone] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string | null>(null);
  const [mode, setMode] = useState<AppMode>("idle");
  const [intervalSeconds, setIntervalSeconds] = useState<number>(INTERVALS.idle);
  const [lastPingAt, setLastPingAt] = useState<Date | null>(null);
  const [lastLat, setLastLat] = useState<number | null>(null);
  const [lastLon, setLastLon] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef<AppMode>("idle");
  const intervalRef = useRef<number>(INTERVALS.idle);
  const phoneRef = useRef<string | null>(null);

  modeRef.current = mode;
  intervalRef.current = intervalSeconds;
  phoneRef.current = phone;

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") {
      const granted = await new Promise<boolean>((resolve) => {
        navigator.permissions
          .query({ name: "geolocation" })
          .then((result) => resolve(result.state !== "denied"))
          .catch(() => resolve(true));
      });
      setPermissionGranted(granted);
      return granted;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    const ok = status === "granted";
    setPermissionGranted(ok);
    return ok;
  }, []);

  const doPing = useCallback(async () => {
    const currentPhone = phoneRef.current;
    if (!currentPhone) return;

    const loc = Platform.OS === "web"
      ? await getLocationWeb()
      : await getLocationNative();

    if (!loc) return;

    setLastLat(loc.lat);
    setLastLon(loc.lon);
    setLastPingAt(new Date());

    const result = await sendPing(currentPhone, loc.lat, loc.lon, loc.accuracy ?? undefined);
    if (result) {
      if (result.mode !== modeRef.current) setMode(result.mode);
      if (result.intervalSeconds !== intervalRef.current) {
        setIntervalSeconds(result.intervalSeconds);
      }
    }
  }, []);

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await doPing();
      scheduleNext();
    }, intervalRef.current * 1000);
  }, [doPing]);

  const startTracking = useCallback(async () => {
    setIsTracking(true);
    await doPing();
    scheduleNext();
  }, [doPing, scheduleNext]);

  const stopTracking = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setIsTracking(false);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("backapp_phone").then((stored) => {
      if (stored) {
        setPhone(stored);
        phoneRef.current = stored;
        setSetupComplete(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!setupComplete || !phone) return;
    fetch(`${BASE_URL}/api/backapp/mode?phone=${encodeURIComponent(phone)}`)
      .then((r) => r.json())
      .then((data: { mode: AppMode; intervalSeconds: number; name?: string }) => {
        setMode(data.mode);
        setIntervalSeconds(data.intervalSeconds);
        if (data.name) setMemberName(data.name);
      })
      .catch(() => {});
  }, [setupComplete, phone]);

  useEffect(() => {
    if (!setupComplete || !phone) return;
    requestLocationPermission().then((ok) => {
      if (ok) startTracking();
    });
    return () => { stopTracking(); };
  }, [setupComplete, phone, requestLocationPermission, startTracking, stopTracking]);

  useEffect(() => {
    if (!isTracking) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    scheduleNext();
  }, [intervalSeconds, isTracking, scheduleNext]);

  const setupPhone = useCallback(async (rawPhone: string) => {
    const cleaned = rawPhone.replace(/\s/g, "");
    await AsyncStorage.setItem("backapp_phone", cleaned);
    setPhone(cleaned);
    phoneRef.current = cleaned;
    setSetupComplete(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = await fetch(`${BASE_URL}/api/backapp/mode?phone=${encodeURIComponent(cleaned)}`).then((r) => r.json()).catch(() => null) as { mode: AppMode; intervalSeconds: number; name?: string } | null;
    if (data) {
      setMode(data.mode);
      setIntervalSeconds(data.intervalSeconds);
      if (data.name) setMemberName(data.name);
    }
  }, []);

  const startTrip = useCallback(async () => {
    if (!phone) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setMode("trip");
    setIntervalSeconds(INTERVALS.trip);
    try {
      // Get current location to attach to the new trip card
      const loc = Platform.OS === "web" ? await getLocationWeb() : await getLocationNative();
      await fetch(`${BASE_URL}/api/backapp/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          lat: loc?.lat,
          lon: loc?.lon,
        }),
      });
    } catch { /* best-effort */ }
    await doPing();
  }, [phone, doPing]);

  const stopTrip = useCallback(async () => {
    if (!phone) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMode("idle");
    setIntervalSeconds(INTERVALS.idle);
    try {
      await fetch(`${BASE_URL}/api/backapp/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
    } catch { /* best-effort */ }
  }, [phone]);

  const clearPhone = useCallback(async () => {
    await AsyncStorage.removeItem("backapp_phone");
    setPhone(null);
    phoneRef.current = null;
    setSetupComplete(false);
    setMode("idle");
    setMemberName(null);
    stopTracking();
  }, [stopTracking]);

  return (
    <MemberContext.Provider
      value={{
        phone,
        memberName,
        mode,
        intervalSeconds,
        lastPingAt,
        lastLat,
        lastLon,
        isTracking,
        permissionGranted,
        setupComplete,
        setupPhone,
        startTrip,
        stopTrip,
        requestLocationPermission,
        clearPhone,
      }}
    >
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error("useMember must be used inside MemberProvider");
  return ctx;
}
