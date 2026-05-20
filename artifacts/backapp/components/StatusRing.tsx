import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { AppMode } from "@/contexts/MemberContext";

interface StatusRingProps {
  mode: AppMode;
  size?: number;
}

function modeColor(mode: AppMode, colors: ReturnType<typeof useColors>): string {
  if (mode === "emergency") return colors.emergency;
  if (mode === "trip") return colors.trip;
  return colors.idle;
}

export function StatusRing({ mode, size = 220 }: StatusRingProps) {
  const colors = useColors();
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const anim1 = useRef<Animated.CompositeAnimation | null>(null);
  const anim2 = useRef<Animated.CompositeAnimation | null>(null);
  const anim3 = useRef<Animated.CompositeAnimation | null>(null);

  const color = modeColor(mode, colors);
  const duration = mode === "emergency" ? 800 : mode === "trip" ? 1800 : 3500;

  useEffect(() => {
    const makeAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );

    anim1.current = makeAnim(pulse1, 0);
    anim2.current = makeAnim(pulse2, duration / 3);
    anim3.current = makeAnim(pulse3, (duration / 3) * 2);

    anim1.current.start();
    anim2.current.start();
    anim3.current.start();

    return () => {
      anim1.current?.stop();
      anim2.current?.stop();
      anim3.current?.stop();
    };
  }, [mode, duration, pulse1, pulse2, pulse3]);

  const ringStyle = (val: Animated.Value) => ({
    position: "absolute" as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 2,
    borderColor: color,
    opacity: val.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.8, 0.4, 0] }),
    transform: [
      {
        scale: val.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }),
      },
    ],
  });

  return (
    <View style={[styles.container, { width: size * 2.2, height: size * 2.2 }]}>
      <Animated.View style={ringStyle(pulse1)} />
      <Animated.View style={ringStyle(pulse2)} />
      <Animated.View style={ringStyle(pulse3)} />
      <View
        style={[
          styles.core,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: `${color}18`,
            borderColor: color,
          },
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              width: size * 0.55,
              height: size * 0.55,
              borderRadius: (size * 0.55) / 2,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  core: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  inner: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
});
